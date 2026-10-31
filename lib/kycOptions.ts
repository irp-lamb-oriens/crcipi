import type { ProviderCategory } from "@/lib/providerCategories";

// Client-safe KYC ("know your client") vocabulary, shared by the member form,
// the admin review screen and the server validator.
//
// Modeled on what Costa Rican trust programs (e.g. esencial COSTA RICA /
// PROCOMER licensing) ask a company to prove: legal existence, a legal
// representative, social-security standing, tax registration and, where the
// trade is regulated, a current license.

export const KYC_STATUSES = ["none", "draft", "submitted", "verified", "rejected"] as const;
export type KycStatus = (typeof KYC_STATUSES)[number];

export const LEGAL_ID_TYPES = ["juridica", "fisica", "dimex", "passport"] as const;
export type LegalIdType = (typeof LEGAL_ID_TYPES)[number];

export const LEGAL_ID_LABELS: Record<LegalIdType, string> = {
  juridica: "Cédula jurídica (company)",
  fisica: "Cédula física (individual)",
  dimex: "DIMEX (resident foreigner)",
  passport: "Passport (non-resident)",
};

export const EMPLOYEE_RANGES = ["1", "2-9", "10-49", "50-249", "250+"] as const;
export type EmployeeRange = (typeof EMPLOYEE_RANGES)[number];

export const REGULATORS = [
  "sugef",
  "sugeval",
  "sugese",
  "supen",
  "colegio-abogados",
  "colegio-contadores",
  "cfia",
  "ict",
  "ministerio-salud",
  "other",
] as const;
export type Regulator = (typeof REGULATORS)[number];

export const REGULATOR_LABELS: Record<Regulator, string> = {
  sugef: "SUGEF – Ley 8204, art. 15 bis registration",
  sugeval: "SUGEVAL – securities",
  sugese: "SUGESE – insurance",
  supen: "SUPEN – pensions",
  "colegio-abogados": "Colegio de Abogados y Abogadas",
  "colegio-contadores": "Colegio de Contadores Públicos",
  cfia: "CFIA – engineers & architects",
  ict: "ICT – tourism declaration",
  "ministerio-salud": "Ministerio de Salud – health permit",
  other: "Other license or registration",
};

// Trades that are regulated in Costa Rica: the matching registration is
// required before a provider in that category can be verified.
export const REQUIRED_REGULATOR: Partial<Record<ProviderCategory, Regulator>> = {
  "real-estate": "sugef",
  law: "colegio-abogados",
  accounting: "colegio-contadores",
  insurance: "sugese",
};

export const KYC_DOCUMENT_KINDS = [
  "incorporation",
  "legal_rep_id",
  "ccss",
  "tax",
  "license",
  "other",
] as const;
export type KycDocumentKind = (typeof KYC_DOCUMENT_KINDS)[number];

export const KYC_DOCUMENT_LABELS: Record<KycDocumentKind, string> = {
  incorporation: "Personería jurídica / registry certificate",
  legal_rep_id: "Legal representative's ID",
  ccss: "CCSS good-standing certificate",
  tax: "Hacienda tax registration",
  license: "Professional license / regulator registration",
  other: "Other supporting document",
};

// Documents every applicant must attach. Companies (cédula jurídica) also
// prove legal existence.
export function requiredDocuments(idType: LegalIdType): KycDocumentKind[] {
  return idType === "juridica" ? ["incorporation", "legal_rep_id"] : ["legal_rep_id"];
}

export interface KycLicense {
  regulator: Regulator;
  number: string;
}

export interface KycDocument {
  kind: KycDocumentKind;
  path: string;
  name: string;
  contentType: string;
  size: number;
  uploadedAt: number;
}

export interface KycData {
  legalName: string;
  legalIdType: LegalIdType;
  legalId: string;
  legalRepresentative: string;
  foundedYear: number | null;
  employees: EmployeeRange | null;
  licenses: KycLicense[];
  documents: KycDocument[];
  declaration: boolean;
}

export const EMPTY_KYC: KycData = {
  legalName: "",
  legalIdType: "juridica",
  legalId: "",
  legalRepresentative: "",
  foundedYear: null,
  employees: null,
  licenses: [],
  documents: [],
  declaration: false,
};

export function yearsInBusiness(foundedYear: number | null, now = new Date()): number | null {
  return foundedYear ? Math.max(now.getFullYear() - foundedYear, 0) : null;
}
