"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ConsoleGate from "@/components/console/ConsoleGate";
import StatusBadge from "@/components/console/StatusBadge";
import { useSession } from "@/components/console/useSession";
import { formatDate, kycTone, KYC_STATUS_LABELS } from "@/components/console/labels";
import styles from "@/components/console/Console.module.scss";
import {
  KYC_DOCUMENT_LABELS,
  LEGAL_ID_LABELS,
  REGULATOR_LABELS,
  REQUIRED_REGULATOR,
  yearsInBusiness,
  type KycData,
  type KycDocument,
  type KycStatus,
} from "@/lib/kycOptions";
import { PROVIDER_CATEGORY_LABELS, type ProviderCategory } from "@/lib/providerCategories";

type Row = {
  id: string;
  name: string;
  category: ProviderCategory;
  kycStatus: KycStatus;
  verified: boolean;
  ownerEmail: string | null;
};

type Detail = Omit<KycData, "documents"> & {
  status: KycStatus;
  submittedAt: number | null;
  reviewedAt: number | null;
  reviewedBy: string | null;
  reviewNote: string | null;
  documents: (KycDocument & { url: string | null })[];
};

const FILTERS: KycStatus[] = ["submitted", "verified", "rejected", "draft", "none"];

export default function AdminVerificationPage() {
  const session = useSession();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState<KycStatus>("submitted");
  const [selected, setSelected] = useState<string | null>(null);

  // Deep link from the review inbox: ?provider=<id> opens that item.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("provider");
    if (id) setSelected(id);
  }, []);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "notice" | "error"; text: string } | null>(null);

  const loadList = useCallback(async () => {
    const res = await fetch("/api/admin/kyc");
    if (!res.ok) {
      setRows([]);
      setMessage({ kind: "error", text: "You don't have the Review verifications permission." });
      return;
    }
    const data = await res.json();
    setRows(data.providers as Row[]);
  }, []);

  useEffect(() => {
    if (session.status === "admin") void loadList();
  }, [session.status, loadList]);

  useEffect(() => {
    if (!selected) return setDetail(null);
    setNote("");
    fetch(`/api/admin/kyc/${selected}`)
      .then((res) => res.json())
      .then((data) => setDetail(data.ok ? (data.kyc as Detail) : null))
      .catch(() => setDetail(null));
  }, [selected]);

  const counts = useMemo(() => {
    const out = Object.fromEntries(FILTERS.map((f) => [f, 0])) as Record<KycStatus, number>;
    rows?.forEach((row) => (out[row.kycStatus] += 1));
    return out;
  }, [rows]);

  const gate = <ConsoleGate session={session} role="admin" />;
  if (session.status !== "admin") return gate;

  const visible = (rows ?? []).filter((row) => row.kycStatus === filter);
  const current = rows?.find((row) => row.id === selected) ?? null;

  async function decide(decision: "verify" | "reject") {
    if (!selected) return;
    if (decision === "reject" && !note.trim()) {
      setMessage({ kind: "error", text: "Add a note so the member knows what to fix." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/kyc/${selected}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note }),
      });
      if (!res.ok) {
        setMessage({ kind: "error", text: "Couldn't save the decision." });
        return;
      }
      setMessage({
        kind: "notice",
        text: decision === "verify" ? "Verified. The owner was emailed." : "Sent back with your note.",
      });
      setSelected(null);
      void loadList();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>KYC</p>
            <h1 className={styles.title}>Provider verification</h1>
            <p className={styles.subtitle}>
              Check each business&apos;s legal identity, regulator registration and
              documents before it earns the Verified badge.
            </p>
          </div>
        </header>

        {message ? <p className={styles[message.kind]}>{message.text}</p> : null}

        <div className={styles.tabs}>
          {FILTERS.map((status) => (
            <button key={status} type="button"
              className={`${styles.tab} ${filter === status ? styles.tabActive : ""}`}
              onClick={() => { setFilter(status); setSelected(null); }}>
              {KYC_STATUS_LABELS[status]}<span>{counts[status]}</span>
            </button>
          ))}
        </div>

        <div className={styles.grid2}>
          <section className={styles.card}>
            {rows === null ? (
              <p className={styles.hint}>Loading…</p>
            ) : visible.length === 0 ? (
              <p className={styles.empty}>Nothing here.</p>
            ) : (
              <ul className={styles.list}>
                {visible.map((row) => (
                  <li key={row.id} className={styles.row}>
                    <div className={styles.rowMain}>
                      <div className={styles.rowTitle}>{row.name}</div>
                      <div className={styles.rowMeta}>
                        {PROVIDER_CATEGORY_LABELS[row.category].en} · {row.ownerEmail ?? "No owner"}
                      </div>
                    </div>
                    <button type="button" className={styles.small} onClick={() => setSelected(row.id)}>
                      {row.id === selected ? "Open" : "Review"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.card}>
            {!current ? (
              <p className={styles.empty}>Select a business to review.</p>
            ) : !detail ? (
              <p className={styles.hint}>Loading…</p>
            ) : (
              <div className={styles.form}>
                <div className={styles.cardHead}>
                  <h2 className={styles.cardTitle}>{current.name}</h2>
                  <StatusBadge tone={kycTone(detail.status)}>{KYC_STATUS_LABELS[detail.status]}</StatusBadge>
                </div>
                <table className={styles.table}>
                  <tbody>
                    <tr><th>Legal name</th><td>{detail.legalName || "—"}</td></tr>
                    <tr><th>{LEGAL_ID_LABELS[detail.legalIdType]}</th><td>{detail.legalId || "—"}</td></tr>
                    <tr><th>Representative</th><td>{detail.legalRepresentative || "—"}</td></tr>
                    <tr>
                      <th>Founded</th>
                      <td>
                        {detail.foundedYear ?? "—"}
                        {detail.foundedYear ? ` (${yearsInBusiness(detail.foundedYear)} years)` : ""}
                      </td>
                    </tr>
                    <tr><th>Employees</th><td>{detail.employees ?? "—"}</td></tr>
                    <tr><th>Submitted</th><td>{formatDate(detail.submittedAt)}</td></tr>
                    {detail.reviewedAt ? (
                      <tr><th>Last review</th><td>{formatDate(detail.reviewedAt)} by {detail.reviewedBy}</td></tr>
                    ) : null}
                  </tbody>
                </table>

                <div>
                  <h3 className={styles.label}>Licenses</h3>
                  {REQUIRED_REGULATOR[current.category] ? (
                    <p className={styles.help}>
                      Category requires {REGULATOR_LABELS[REQUIRED_REGULATOR[current.category]!]}.
                      Check the number against the regulator&apos;s public registry.
                    </p>
                  ) : null}
                  {detail.licenses.length === 0 ? (
                    <p className={styles.hint}>None.</p>
                  ) : (
                    <ul className={styles.fileList}>
                      {detail.licenses.map((license, i) => (
                        <li key={i}><span>{REGULATOR_LABELS[license.regulator]}</span><strong>{license.number}</strong></li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <h3 className={styles.label}>Documents</h3>
                  {detail.documents.length === 0 ? (
                    <p className={styles.hint}>None.</p>
                  ) : (
                    <ul className={styles.fileList}>
                      {detail.documents.map((doc) => (
                        <li key={doc.path}>
                          <span><strong>{KYC_DOCUMENT_LABELS[doc.kind]}</strong> — {doc.name}</span>
                          {doc.url ? (
                            <a href={doc.url} target="_blank" rel="noopener noreferrer">Open</a>
                          ) : (
                            <span className={styles.hint}>Unavailable</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className={styles.help}>Links expire after 10 minutes. Reopen the business to refresh them.</p>
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="kyc-note">Note to the member</label>
                  <textarea id="kyc-note" className={styles.input} rows={3} value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Required when sending back. Say exactly what to fix." />
                </div>

                <div className={styles.actions}>
                  <button type="button" className={styles.primary} disabled={busy || detail.status === "none"}
                    onClick={() => void decide("verify")}>Verify</button>
                  <button type="button" className={styles.danger} disabled={busy || detail.status === "none"}
                    onClick={() => void decide("reject")}>Send back</button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
