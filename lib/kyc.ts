import "server-only";

import { db } from "@/lib/firebaseAdmin";
import type { ProviderCategory } from "@/lib/providerCategories";
import {
  EMPLOYEE_RANGES,
  EMPTY_KYC,
  KYC_DOCUMENT_KINDS,
  LEGAL_ID_TYPES,
  REGULATORS,
  REQUIRED_REGULATOR,
  requiredDocuments,
  type EmployeeRange,
  type KycData,
  type KycDocument,
  type KycDocumentKind,
  type KycLicense,
  type KycStatus,
  type LegalIdType,
  type Regulator,
} from "@/lib/kycOptions";

// ============================================================
// Provider verification (KYC).
//
// Legal data and documents are sensitive, so they live in a private
// sub-document that no public read path touches:
//   providers/{id}/private/kyc -> KycRecord
// The provider document only carries the public outcome:
//   providers/{id}.verified  (badge in the directory)
//   providers/{id}.kycStatus (admin queue filter)
//
// Any member re-submission puts the record back to "submitted" and removes
// the badge until an admin reviews it again, so verified data can't drift.
// ============================================================

export interface KycRecord extends KycData {
  status: KycStatus;
  submittedAt: number | null;
  reviewedAt: number | null;
  reviewedBy: string | null;
  reviewNote: string | null;
  updatedAt: number;
}

function kycDoc(providerId: string) {
  return db.collection("providers").doc(providerId).collection("private").doc("kyc");
}

function asString(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function toRecord(data: Record<string, unknown> | undefined): KycRecord {
  const d = data ?? {};
  return {
    ...EMPTY_KYC,
    legalName: asString(d.legalName, 200),
    legalIdType: (LEGAL_ID_TYPES as readonly unknown[]).includes(d.legalIdType)
      ? (d.legalIdType as LegalIdType)
      : "juridica",
    legalId: asString(d.legalId, 40),
    legalRepresentative: asString(d.legalRepresentative, 160),
    foundedYear: typeof d.foundedYear === "number" ? d.foundedYear : null,
    employees: (EMPLOYEE_RANGES as readonly unknown[]).includes(d.employees)
      ? (d.employees as EmployeeRange)
      : null,
    licenses: Array.isArray(d.licenses) ? (d.licenses as KycLicense[]) : [],
    documents: Array.isArray(d.documents) ? (d.documents as KycDocument[]) : [],
    declaration: d.declaration === true,
    status: (["draft", "submitted", "verified", "rejected"] as const).includes(
      d.status as "draft"
    )
      ? (d.status as KycStatus)
      : "none",
    submittedAt: typeof d.submittedAt === "number" ? d.submittedAt : null,
    reviewedAt: typeof d.reviewedAt === "number" ? d.reviewedAt : null,
    reviewedBy: typeof d.reviewedBy === "string" ? d.reviewedBy : null,
    reviewNote: typeof d.reviewNote === "string" ? d.reviewNote : null,
    updatedAt: typeof d.updatedAt === "number" ? d.updatedAt : 0,
  };
}

export async function getKyc(providerId: string): Promise<KycRecord> {
  const snap = await kycDoc(providerId).get();
  return toRecord(snap.exists ? (snap.data() as Record<string, unknown>) : undefined);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const ID_RULES: Record<LegalIdType, { pattern: RegExp; digitsOnly: boolean }> = {
  juridica: { pattern: /^3\d{9}$/, digitsOnly: true }, // 3-101-123456
  fisica: { pattern: /^\d{9}$/, digitsOnly: true }, // 1-1234-5678
  dimex: { pattern: /^\d{11,12}$/, digitsOnly: true },
  passport: { pattern: /^[A-Z0-9]{5,20}$/, digitsOnly: false },
};

export function normalizeLegalId(type: LegalIdType, raw: string): string {
  const upper = raw.toUpperCase().replace(/[\s-]/g, "");
  return ID_RULES[type].digitsOnly ? upper.replace(/\D/g, "") : upper;
}

export type KycValidation =
  | { ok: true; data: KycData }
  | { ok: false; errors: Record<string, string> };

// `submit` applies the completeness rules; a draft only needs well-formed data.
// `ownerFolder` pins documents to files the caller uploaded themselves.
export function validateKyc(
  raw: unknown,
  options: { submit: boolean; category: ProviderCategory; ownerFolder: string }
): KycValidation {
  const body = (raw ?? {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const legalIdType = (LEGAL_ID_TYPES as readonly unknown[]).includes(body.legalIdType)
    ? (body.legalIdType as LegalIdType)
    : "juridica";
  const legalName = asString(body.legalName, 200);
  const legalId = normalizeLegalId(legalIdType, asString(body.legalId, 40));
  const legalRepresentative = asString(body.legalRepresentative, 160);

  const yearRaw = body.foundedYear;
  const thisYear = new Date().getFullYear();
  let foundedYear: number | null = null;
  if (yearRaw !== null && yearRaw !== undefined && yearRaw !== "") {
    const year = Number(yearRaw);
    if (!Number.isInteger(year) || year < 1850 || year > thisYear) errors.foundedYear = "invalid";
    else foundedYear = year;
  }

  const employees = (EMPLOYEE_RANGES as readonly unknown[]).includes(body.employees)
    ? (body.employees as EmployeeRange)
    : null;

  const licenses: KycLicense[] = [];
  if (Array.isArray(body.licenses)) {
    for (const item of body.licenses.slice(0, 10)) {
      const entry = (item ?? {}) as Record<string, unknown>;
      const regulator = entry.regulator as Regulator;
      const number = asString(entry.number, 80);
      if (!(REGULATORS as readonly string[]).includes(regulator)) continue;
      if (!number) {
        errors.licenses = "number_required";
        continue;
      }
      licenses.push({ regulator, number });
    }
  }

  const documents: KycDocument[] = [];
  if (Array.isArray(body.documents)) {
    for (const item of body.documents.slice(0, 15)) {
      const entry = (item ?? {}) as Record<string, unknown>;
      const path = asString(entry.path, 300);
      const kind = entry.kind as KycDocumentKind;
      if (!(KYC_DOCUMENT_KINDS as readonly string[]).includes(kind)) continue;
      // Only files this member uploaded into their own private folder.
      if (!path.startsWith(`${options.ownerFolder}/`) || path.includes("..")) {
        errors.documents = "invalid_file";
        continue;
      }
      documents.push({
        kind,
        path,
        name: asString(entry.name, 120) || "document",
        contentType: asString(entry.contentType, 60),
        size: Number(entry.size) || 0,
        uploadedAt: Number(entry.uploadedAt) || Date.now(),
      });
    }
  }

  const declaration = body.declaration === true;

  if (legalId && !ID_RULES[legalIdType].pattern.test(legalId)) errors.legalId = "invalid";

  if (options.submit) {
    if (!legalName) errors.legalName = "required";
    if (!legalId) errors.legalId = "required";
    if (!legalRepresentative) errors.legalRepresentative = "required";
    if (foundedYear === null && !errors.foundedYear) errors.foundedYear = "required";
    if (!employees) errors.employees = "required";
    const missing = requiredDocuments(legalIdType).filter(
      (kind) => !documents.some((doc) => doc.kind === kind)
    );
    if (missing.length > 0) errors.documents = `missing:${missing.join(",")}`;
    const regulator = REQUIRED_REGULATOR[options.category];
    if (regulator && !licenses.some((license) => license.regulator === regulator)) {
      errors.licenses = `required:${regulator}`;
    }
    if (!declaration) errors.declaration = "required";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      legalName,
      legalIdType,
      legalId,
      legalRepresentative,
      foundedYear,
      employees,
      licenses,
      documents,
      declaration,
    },
  };
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function saveKyc(
  providerId: string,
  data: KycData,
  submit: boolean
): Promise<KycRecord> {
  const now = Date.now();
  const providerRef = db.collection("providers").doc(providerId);
  const status: KycStatus = submit ? "submitted" : "draft";

  await db.runTransaction(async (tx) => {
    const current = await tx.get(kycDoc(providerId));
    const previous = toRecord(current.exists ? (current.data() as Record<string, unknown>) : undefined);
    // Saving a draft over a submitted/verified record must not silently
    // withdraw it from review; only an explicit submit changes the status.
    const nextStatus = !submit && previous.status !== "none" && previous.status !== "draft"
      ? previous.status
      : status;
    const verified = nextStatus === "verified";

    tx.set(kycDoc(providerId), {
      ...data,
      status: nextStatus,
      submittedAt: submit ? now : previous.submittedAt,
      reviewedAt: submit ? null : previous.reviewedAt,
      reviewedBy: submit ? null : previous.reviewedBy,
      reviewNote: submit ? null : previous.reviewNote,
      updatedAt: now,
    });
    tx.set(providerRef, { kycStatus: nextStatus, verified }, { merge: true });
  });

  return getKyc(providerId);
}

export async function reviewKyc(
  providerId: string,
  decision: "verify" | "reject",
  reviewer: string,
  note: string
): Promise<KycRecord | null> {
  const providerRef = db.collection("providers").doc(providerId);
  const ok = await db.runTransaction(async (tx) => {
    const snap = await tx.get(kycDoc(providerId));
    if (!snap.exists) return false;
    const status: KycStatus = decision === "verify" ? "verified" : "rejected";
    tx.set(
      kycDoc(providerId),
      {
        status,
        reviewedAt: Date.now(),
        reviewedBy: reviewer,
        reviewNote: note.trim().slice(0, 1000) || null,
      },
      { merge: true }
    );
    tx.set(providerRef, { kycStatus: status, verified: status === "verified" }, { merge: true });
    return true;
  });
  return ok ? getKyc(providerId) : null;
}
