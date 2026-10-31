"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import ConsoleGate from "@/components/console/ConsoleGate";
import ModuleGuide from "@/components/console/ModuleGuide";
import { useSession } from "@/components/console/useSession";
import styles from "@/components/console/Console.module.scss";
import inbox from "./page.module.scss";

type Kyc = { id: string; name: string; ownerEmail: string | null; legalName: string; documents: number; since: number };
type ArticleItem = { id: string; title: string; authorName: string; providerName: string | null; reasons: string[]; since: number };
type Access = { id: string; providerId: string; providerName: string; name: string; email: string; note: string; ownerEmail: string | null; since: number };
type Stale = { providerId: string; providerName: string; ownerEmail: string | null; count: number; since: number };
type Data = { kyc: Kyc[] | null; articles: ArticleItem[] | null; access: Access[] | null; staleLeads: Stale[] | null };

function age(since: number) {
  const h = (Date.now() - since) / 3600_000;
  if (h < 1) return "under an hour";
  if (h < 48) return `${Math.round(h)} h`;
  return `${Math.round(h / 24)} days`;
}

// Revisiones: everything waiting on a person at the Chamber, oldest first.
export default function AdminReviews() {
  const session = useSession();
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "notice" | "error"; text: string } | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/reviews")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((b: Data) => setData(b))
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    if (session.status === "admin") load();
  }, [session.status, load]);

  async function decide(item: Access, decision: "approve" | "decline") {
    // Approving moves a managed business to someone else: ask once, inline.
    if (decision === "approve" && item.ownerEmail && confirming !== item.id) {
      setConfirming(item.id);
      return;
    }
    setConfirming(null);
    setBusy(item.id);
    setMessage(null);
    const res = await fetch(`/api/admin/access/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    }).catch(() => null);
    setBusy(null);
    if (!res?.ok) return setMessage({ kind: "error", text: "That didn't save. Try again." });
    setMessage({
      kind: "notice",
      text: decision === "approve" ? `${item.providerName} is now managed by ${item.email}.` : "Request declined.",
    });
    load();
  }

  const gate = <ConsoleGate session={session} role="admin" />;
  if (session.status !== "admin") return gate;

  const total =
    (data?.kyc?.length ?? 0) + (data?.articles?.length ?? 0) + (data?.access?.length ?? 0) + (data?.staleLeads?.length ?? 0);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Revisiones</p>
            <h1 className={styles.title}>Reviews</h1>
            <p className={styles.subtitle}>
              Everything waiting on the Chamber, oldest first.{" "}
              {data ? (total === 0 ? "Nothing is waiting." : `${total} item${total === 1 ? "" : "s"} waiting.`) : null}
            </p>
          </div>
          <ModuleGuide area="admin" id="reviews" />
        </header>

        {message ? <p className={styles[message.kind]} role="status">{message.text}</p> : null}
        {failed ? <p className={styles.error}>Couldn&apos;t load the inbox. Refresh to try again.</p> : null}
        {!data && !failed ? <p className={styles.hint}>Loading…</p> : null}

        {data ? (
          <div className={inbox.lanes}>
            {data.kyc ? (
              <Lane title="Verifications" count={data.kyc.length} more={{ href: "/admin/verification", label: "All verifications" }}>
                {data.kyc.map((k) => (
                  <li key={k.id} className={inbox.item}>
                    <div className={inbox.main}>
                      <p className={inbox.what}>{k.name}</p>
                      <p className={inbox.meta}>
                        {k.legalName || "Legal name not given"} · {k.documents} document{k.documents === 1 ? "" : "s"}
                        {k.ownerEmail ? ` · ${k.ownerEmail}` : ""}
                      </p>
                    </div>
                    <span className={inbox.age}>{age(k.since)}</span>
                    <Link href={`/admin/verification?provider=${k.id}`} className={styles.ghost}>Review</Link>
                  </li>
                ))}
              </Lane>
            ) : null}

            {data.articles ? (
              <Lane title="Articles for an editor" count={data.articles.length} more={{ href: "/admin/articles", label: "All articles" }}>
                {data.articles.map((a) => (
                  <li key={a.id} className={inbox.item}>
                    <div className={inbox.main}>
                      <p className={inbox.what}>{a.title}</p>
                      <p className={inbox.meta}>
                        {a.authorName}
                        {a.providerName ? ` · ${a.providerName}` : ""}
                        {a.reasons[0] ? ` · ${a.reasons[0]}` : ""}
                      </p>
                    </div>
                    <span className={inbox.age}>{age(a.since)}</span>
                    <Link href={`/admin/articles?article=${a.id}`} className={styles.ghost}>Decide</Link>
                  </li>
                ))}
              </Lane>
            ) : null}

            {data.access ? (
              <Lane title="Access requests" count={data.access.length}>
                {data.access.map((r) => (
                  <li key={r.id} className={inbox.item}>
                    <div className={inbox.main}>
                      <p className={inbox.what}>
                        {r.name} → {r.providerName}
                      </p>
                      <p className={inbox.meta}>
                        {r.email}
                        {r.note ? ` · “${r.note}”` : ""} ·{" "}
                        {r.ownerEmail ? `currently managed by ${r.ownerEmail}` : "no current manager"}
                      </p>
                    </div>
                    <span className={inbox.age}>{age(r.since)}</span>
                    <div className={styles.actions}>
                      {confirming === r.id ? (
                        <span className={inbox.warn} role="alert">
                          This moves {r.providerName} away from {r.ownerEmail}.
                        </span>
                      ) : null}
                      <button type="button" className={styles.ghost} disabled={busy === r.id} onClick={() => void decide(r, "approve")}>
                        {confirming === r.id ? "Confirm transfer" : "Approve"}
                      </button>
                      <button type="button" className={styles.danger} disabled={busy === r.id} onClick={() => void decide(r, "decline")}>
                        Decline
                      </button>
                    </div>
                  </li>
                ))}
              </Lane>
            ) : null}

            {data.staleLeads ? (
              <Lane title="Investors waiting over 24 h" count={data.staleLeads.length} more={{ href: "/admin/members", label: "Members" }}>
                {data.staleLeads.map((s) => (
                  <li key={s.providerId} className={inbox.item}>
                    <div className={inbox.main}>
                      <p className={inbox.what}>{s.providerName}</p>
                      <p className={inbox.meta}>
                        {s.count} unanswered request{s.count === 1 ? "" : "s"}
                        {s.ownerEmail ? ` · ${s.ownerEmail}` : " · no manager"}
                      </p>
                    </div>
                    <span className={inbox.age}>{age(s.since)}</span>
                    {s.ownerEmail ? (
                      <a
                        className={styles.ghost}
                        href={`mailto:${s.ownerEmail}?subject=${encodeURIComponent("Solicitudes pendientes en CR-CIPI")}&body=${encodeURIComponent(
                          `Hola, ${s.providerName} tiene ${s.count} solicitud(es) de consulta sin responder en CR-CIPI. Puede verlas en https://crcipi.org/account/leads`
                        )}`}
                      >
                        Nudge
                      </a>
                    ) : null}
                  </li>
                ))}
              </Lane>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}

function Lane({
  title,
  count,
  more,
  children,
}: {
  title: string;
  count: number;
  more?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section className={inbox.lane} aria-label={title}>
      <div className={inbox.laneHead}>
        <h2 className={inbox.laneTitle}>
          {title} <span>{count}</span>
        </h2>
        {more ? <Link href={more.href} className={inbox.more}>{more.label} →</Link> : null}
      </div>
      {count === 0 ? <p className={inbox.clear}>Clear.</p> : <ul className={inbox.list}>{children}</ul>}
    </section>
  );
}
