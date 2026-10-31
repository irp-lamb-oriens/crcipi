"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ConsoleGate from "@/components/console/ConsoleGate";
import ModuleGuide from "@/components/console/ModuleGuide";
import TrustPanel from "@/components/console/TrustPanel";
import FileUpload, { type UploadedFile } from "@/components/console/FileUpload";
import StatusBadge from "@/components/console/StatusBadge";
import { useSession } from "@/components/console/useSession";
import styles from "@/components/console/Console.module.scss";
import {
  EMPLOYEE_RANGES,
  EMPTY_KYC,
  KYC_DOCUMENT_KINDS,
  KYC_DOCUMENT_LABELS,
  LEGAL_ID_LABELS,
  LEGAL_ID_TYPES,
  REGULATORS,
  REGULATOR_LABELS,
  REQUIRED_REGULATOR,
  requiredDocuments,
  type KycData,
  type KycDocument,
  type KycDocumentKind,
  type KycStatus,
  type LegalIdType,
  type Regulator,
} from "@/lib/kycOptions";
import type { ProviderCategory } from "@/lib/providerCategories";
import { kycTone, KYC_STATUS_LABELS } from "@/components/console/labels";

type OwnProvider = { id: string; name: string; category: ProviderCategory; kycStatus: KycStatus };
type Record_ = KycData & {
  status: KycStatus;
  reviewNote: string | null;
  documents: (KycDocument & { url?: string | null })[];
};

function describeError(key: string, code: string): string {
  if (code === "required") return "Required.";
  if (key === "legalId") return "Check the number format for the ID type you selected.";
  if (key === "foundedYear") return "Enter a valid year.";
  if (code.startsWith("missing:")) {
    const kinds = code.slice(8).split(",") as KycDocumentKind[];
    return `Attach: ${kinds.map((k) => KYC_DOCUMENT_LABELS[k]).join(", ")}.`;
  }
  if (code.startsWith("required:")) {
    return `Your category requires: ${REGULATOR_LABELS[code.slice(9) as Regulator]}.`;
  }
  if (code === "number_required") return "Each license needs its number.";
  if (code === "invalid_file") return "One of the files is not yours. Re-upload it.";
  return "Check this field.";
}

export default function VerificationPage() {
  const session = useSession();
  const [providers, setProviders] = useState<OwnProvider[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState<KycData>(EMPTY_KYC);
  const [record, setRecord] = useState<Record_ | null>(null);
  const [category, setCategory] = useState<ProviderCategory>("other");
  const [docKind, setDocKind] = useState<KycDocumentKind>("incorporation");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    if (session.status !== "member") return;
    fetch("/api/member/providers")
      .then((res) => res.json())
      .then((data) => {
        const list = (data.providers ?? []) as OwnProvider[];
        setProviders(list);
        const fromQuery = new URLSearchParams(window.location.search).get("provider");
        setSelected(list.find((p) => p.id === fromQuery)?.id ?? list[0]?.id ?? null);
      })
      .catch(() => setProviders([]));
  }, [session.status]);

  const load = useCallback(async (id: string) => {
    setNotice(null);
    setFailure(null);
    setErrors({});
    const res = await fetch(`/api/member/providers/${id}/kyc`);
    if (!res.ok) return setFailure("Couldn't load this business.");
    const data = await res.json();
    const kyc = data.kyc as Record_;
    setRecord(kyc);
    setCategory(data.category as ProviderCategory);
    setForm({
      legalName: kyc.legalName,
      legalIdType: kyc.legalIdType,
      legalId: kyc.legalId,
      legalRepresentative: kyc.legalRepresentative,
      foundedYear: kyc.foundedYear,
      employees: kyc.employees,
      licenses: kyc.licenses,
      documents: kyc.documents,
      declaration: kyc.declaration,
    });
  }, []);

  useEffect(() => {
    if (selected) void load(selected);
  }, [selected, load]);

  const gate = <ConsoleGate session={session} role="member" />;
  if (session.status !== "member") return gate;

  function set<K extends keyof KycData>(key: K, value: KycData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addDocument(file: UploadedFile) {
    set("documents", [...form.documents, { kind: docKind, ...file }]);
  }

  async function save(submit: boolean) {
    if (!selected) return;
    setBusy(true);
    setNotice(null);
    setFailure(null);
    try {
      const res = await fetch(`/api/member/providers/${selected}/kyc`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, submit }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErrors((data?.errors as Record<string, string>) ?? {});
        setFailure(data?.errors ? "Some fields need attention." : "Save failed. Try again.");
        return;
      }
      setErrors({});
      setNotice(submit ? "Submitted. We'll email you when it's reviewed." : "Draft saved.");
      void load(selected);
      setProviders((prev) =>
        prev?.map((p) => (p.id === selected ? { ...p, kycStatus: data.kyc.status } : p)) ?? prev
      );
    } catch {
      setFailure("Save failed. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  const err = (key: string) =>
    errors[key] ? <p className={styles.fieldError}>{describeError(key, errors[key])}</p> : null;
  const requiredRegulator = REQUIRED_REGULATOR[category];
  const neededDocs = requiredDocuments(form.legalIdType);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Sello de confianza</p>
            <h1 className={styles.title}>Trust seal</h1>
            <p className={styles.subtitle}>
              Verified businesses get a badge in the public directory. We check legal
              existence, who represents the business and, for regulated trades, the
              license. Documents are private: only CR-CIPI reviewers can open them.
            </p>
          </div>
          <ModuleGuide area="member" id="verification" />
        </header>

        {providers === null ? (
          <p className={styles.hint}>Loading…</p>
        ) : providers.length === 0 ? (
          <div className={styles.empty}>
            Add a business first, then verify it.{" "}
            <Link href="/account/businesses">Add a business</Link>
          </div>
        ) : (
          <>
            <div className={styles.tabs} role="tablist" aria-label="Businesses">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  role="tab"
                  aria-selected={provider.id === selected}
                  className={`${styles.tab} ${provider.id === selected ? styles.tabActive : ""}`}
                  onClick={() => setSelected(provider.id)}
                >
                  {provider.name}
                  <span>{KYC_STATUS_LABELS[provider.kycStatus]}</span>
                </button>
              ))}
            </div>

            {selected ? <TrustPanel providerId={selected} refreshKey={record?.status} /> : null}

            {record ? (
              <div className={styles.card}>
                <div className={styles.cardHead}>
                  <h2 className={styles.cardTitle}>Status</h2>
                  <StatusBadge tone={kycTone(record.status)}>
                    {KYC_STATUS_LABELS[record.status]}
                  </StatusBadge>
                </div>
                {record.status === "rejected" && record.reviewNote ? (
                  <p className={styles.warn}>Reviewer&apos;s note: {record.reviewNote}</p>
                ) : null}
                {record.status === "verified" ? (
                  <p className={styles.hint}>
                    Changing and re-submitting these details removes the badge until we
                    review them again.
                  </p>
                ) : null}
              </div>
            ) : null}

            <form
              className={`${styles.card} ${styles.form}`}
              onSubmit={(event) => {
                event.preventDefault();
                void save(true);
              }}
            >
              {notice ? <p className={styles.notice}>{notice}</p> : null}
              {failure ? <p className={styles.error}>{failure}</p> : null}

              <h2 className={styles.cardTitle}>Legal identity</h2>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="k-name">Registered legal name</label>
                  <input id="k-name" className={styles.input} value={form.legalName}
                    onChange={(e) => set("legalName", e.target.value)} />
                  {err("legalName")}
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="k-rep">Legal representative</label>
                  <input id="k-rep" className={styles.input} value={form.legalRepresentative}
                    onChange={(e) => set("legalRepresentative", e.target.value)} />
                  {err("legalRepresentative")}
                </div>
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="k-idtype">ID type</label>
                  <select id="k-idtype" className={styles.input} value={form.legalIdType}
                    onChange={(e) => set("legalIdType", e.target.value as LegalIdType)}>
                    {LEGAL_ID_TYPES.map((type) => (
                      <option key={type} value={type}>{LEGAL_ID_LABELS[type]}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="k-id">ID number</label>
                  <input id="k-id" className={styles.input} value={form.legalId}
                    placeholder={form.legalIdType === "juridica" ? "3-101-123456" : ""}
                    onChange={(e) => set("legalId", e.target.value)} />
                  {err("legalId")}
                </div>
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="k-year">Year founded</label>
                  <input id="k-year" className={styles.input} inputMode="numeric"
                    value={form.foundedYear ?? ""}
                    onChange={(e) => set("foundedYear", e.target.value ? Number(e.target.value) || null : null)} />
                  {err("foundedYear")}
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="k-emp">Employees</label>
                  <select id="k-emp" className={styles.input} value={form.employees ?? ""}
                    onChange={(e) => set("employees", (e.target.value || null) as KycData["employees"])}>
                    <option value="">Select…</option>
                    {EMPLOYEE_RANGES.map((range) => (
                      <option key={range} value={range}>{range}</option>
                    ))}
                  </select>
                  {err("employees")}
                </div>
              </div>

              <h2 className={styles.cardTitle}>Licenses & registrations</h2>
              <p className={styles.help}>
                {requiredRegulator
                  ? `Required for your category: ${REGULATOR_LABELS[requiredRegulator]}.`
                  : "Add any license or regulator registration that applies to your trade."}
              </p>
              {form.licenses.map((license, i) => (
                <div key={i} className={styles.fieldRow}>
                  <select aria-label="Regulator" className={styles.input} value={license.regulator}
                    onChange={(e) => set("licenses", form.licenses.map((l, j) =>
                      j === i ? { ...l, regulator: e.target.value as Regulator } : l))}>
                    {REGULATORS.map((r) => <option key={r} value={r}>{REGULATOR_LABELS[r]}</option>)}
                  </select>
                  <div className={styles.actions}>
                    <input aria-label="License number" className={styles.input} style={{ flex: 1 }}
                      value={license.number} placeholder="Number / code"
                      onChange={(e) => set("licenses", form.licenses.map((l, j) =>
                        j === i ? { ...l, number: e.target.value } : l))} />
                    <button type="button" className={styles.small}
                      onClick={() => set("licenses", form.licenses.filter((_, j) => j !== i))}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              <div>
                <button type="button" className={styles.small} disabled={form.licenses.length >= 10}
                  onClick={() => set("licenses", [...form.licenses,
                    { regulator: requiredRegulator ?? "other", number: "" }])}>
                  + Add license
                </button>
              </div>
              {err("licenses")}

              <h2 className={styles.cardTitle}>Documents</h2>
              <p className={styles.help}>
                Required: {neededDocs.map((k) => KYC_DOCUMENT_LABELS[k]).join(" · ")}. Also
                helpful: CCSS good-standing and Hacienda registration.
              </p>
              {form.documents.length > 0 ? (
                <ul className={styles.fileList}>
                  {form.documents.map((doc, i) => (
                    <li key={doc.path}>
                      <span>
                        <strong>{KYC_DOCUMENT_LABELS[doc.kind]}</strong> — {doc.name}
                      </span>
                      <span className={styles.actions}>
                        {"url" in doc && doc.url ? (
                          <a href={doc.url as string} target="_blank" rel="noopener noreferrer">View</a>
                        ) : null}
                        <button type="button" className={styles.small}
                          onClick={() => set("documents", form.documents.filter((_, j) => j !== i))}>
                          Remove
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="k-dockind">Document type</label>
                  <select id="k-dockind" className={styles.input} value={docKind}
                    onChange={(e) => setDocKind(e.target.value as KycDocumentKind)}>
                    {KYC_DOCUMENT_KINDS.map((kind) => (
                      <option key={kind} value={kind}>{KYC_DOCUMENT_LABELS[kind]}</option>
                    ))}
                  </select>
                </div>
                <FileUpload kind="document" label="File (PDF or image)" onUploaded={addDocument}
                  disabled={form.documents.length >= 15} />
              </div>
              {err("documents")}

              <label className={styles.check}>
                <input type="checkbox" checked={form.declaration}
                  onChange={(e) => set("declaration", e.target.checked)} />
                <span>
                  I declare this information is true, I&apos;m authorized to represent this
                  business, and I consent to CR-CIPI processing these documents to verify
                  it, as described in the <Link href="/en/privacy">privacy policy</Link>.
                </span>
              </label>
              {err("declaration")}

              <div className={styles.actions}>
                <button type="submit" className={styles.primary} disabled={busy}>
                  {busy ? "Saving…" : "Submit for verification"}
                </button>
                <button type="button" className={styles.ghost} disabled={busy}
                  onClick={() => void save(false)}>
                  Save draft
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
