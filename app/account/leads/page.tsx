"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ConsoleGate from "@/components/console/ConsoleGate";
import { useSession } from "@/components/console/useSession";
import styles from "@/components/console/Console.module.scss";
import inbox from "./page.module.scss";
import { LOST_REASON_LABELS, NEED_LABELS, TIMELINE_LABELS } from "@/lib/leadCopy";

type Status = "new" | "talking" | "won" | "lost";
type LostReason = keyof typeof LOST_REASON_LABELS;

type Lead = {
  id: string;
  providerId: string;
  providerName: string;
  name: string;
  email: string;
  country: string;
  need: keyof typeof NEED_LABELS;
  timeline: keyof typeof TIMELINE_LABELS;
  message: string;
  locale: "en" | "es";
  status: Status;
  createdAt: number;
  firstResponseAt: number | null;
  closedAt: number | null;
  lostReason: LostReason | null;
  reviewRequestedAt: number | null;
};

type Business = { id: string; name: string; responseHoursMedian: number | null; responseSample: number };

const TABS: { key: Status; label: string }[] = [
  { key: "new", label: "New" },
  { key: "talking", label: "In conversation" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

const TARGET_HOURS = 24;
const HOUR = 3600_000;

function ago(time: number, now: number) {
  const h = (now - time) / HOUR;
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min ago`;
  if (h < 48) return `${Math.round(h)} h ago`;
  return `${Math.round(h / 24)} days ago`;
}

function hoursLabel(h: number) {
  return h < 1 ? "under 1 h" : h < 48 ? `${Math.round(h)} h` : `${Math.round(h / 24)} days`;
}

export default function LeadsPage() {
  const session = useSession();
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [tab, setTab] = useState<Status>("new");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lostReason, setLostReason] = useState<LostReason>("no-reply");
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    const res = await fetch("/api/member/leads");
    if (!res.ok) {
      setError("Couldn't load your contacts. Refresh to try again.");
      setLeads([]);
      return;
    }
    const body = (await res.json()) as { leads: Lead[]; businesses: Business[] };
    setLeads(body.leads);
    setBusinesses(body.businesses);
    setNow(Date.now());
    // Deep link from the notification email: /account/leads?lead=…
    const wanted = new URLSearchParams(window.location.search).get("lead");
    const target = body.leads.find((l) => l.id === wanted);
    if (target) {
      setTab(target.status);
      setSelectedId(target.id);
    }
  }, []);

  useEffect(() => {
    if (session.status === "member") void load();
  }, [session.status, load]);

  const counts = useMemo(() => {
    const c: Record<Status, number> = { new: 0, talking: 0, won: 0, lost: 0 };
    (leads ?? []).forEach((l) => (c[l.status] += 1));
    return c;
  }, [leads]);

  // New leads are a queue: longest-waiting first. Other tabs: most recent first.
  const visible = useMemo(() => {
    const rows = (leads ?? []).filter((l) => l.status === tab);
    return tab === "new" ? [...rows].sort((a, b) => a.createdAt - b.createdAt) : rows;
  }, [leads, tab]);
  const selected =
    visible.find((l) => l.id === selectedId) ?? (visible.length > 0 ? visible[0] : null);

  async function act(lead: Lead, body: Record<string, string>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/member/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const { lead: next } = (await res.json()) as { lead: Lead };
      setLeads((all) => (all ?? []).map((l) => (l.id === next.id ? next : l)));
      setSelectedId(next.id);
      setTab(next.status);
      if (next.firstResponseAt && !lead.firstResponseAt) void refreshBusinesses();
    } catch {
      setError("That didn't save. Try again.");
    }
    setBusy(false);
  }

  async function refreshBusinesses() {
    const res = await fetch("/api/member/leads");
    if (res.ok) setBusinesses(((await res.json()) as { businesses: Business[] }).businesses);
  }

  const gate = <ConsoleGate session={session} role="member" />;
  if (session.status !== "member") return gate;

  const overdue = (leads ?? []).filter(
    (l) => l.status === "new" && (now - l.createdAt) / HOUR > TARGET_HOURS
  ).length;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Contactos</p>
            <h1 className={styles.title}>Leads</h1>
            <p className={styles.subtitle}>
              People who asked for a consultation from your public profile. Reply within{" "}
              {TARGET_HOURS} hours: your reply time is shown to investors.
            </p>
          </div>
        </header>

        {businesses.length > 0 ? (
          <div className={inbox.clocks}>
            {businesses.map((b) => (
              <div key={b.id} className={inbox.clock}>
                <span className={inbox.clockLabel}>{b.name}</span>
                <span className={inbox.clockValue}>
                  {b.responseHoursMedian !== null && b.responseSample > 0
                    ? hoursLabel(b.responseHoursMedian)
                    : "—"}
                </span>
                <span className={inbox.clockHint}>
                  {b.responseSample > 0
                    ? `median reply time, last ${b.responseSample} lead${b.responseSample === 1 ? "" : "s"}`
                    : "no replies measured yet"}
                </span>
              </div>
            ))}
            {overdue > 0 ? (
              <div className={`${inbox.clock} ${inbox.clockLate}`}>
                <span className={inbox.clockLabel}>Waiting over {TARGET_HOURS} h</span>
                <span className={inbox.clockValue}>{overdue}</span>
                <span className={inbox.clockHint}>reply now to protect your reply time</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? <p className={styles.error} role="alert">{error}</p> : null}

        <div className={styles.tabs} role="tablist" aria-label="Lead status">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={`${styles.tab} ${tab === t.key ? styles.tabActive : ""}`}
              onClick={() => {
                setTab(t.key);
                setSelectedId(null);
              }}
            >
              {t.label}
              <span>{counts[t.key]}</span>
            </button>
          ))}
        </div>

        {leads === null ? (
          <p className={styles.hint}>Loading…</p>
        ) : businesses.length === 0 ? (
          <div className={styles.card}>
            <p className={styles.empty}>
              Leads arrive once you have a business in the directory.{" "}
              <Link href="/account/businesses">List your business</Link>.
            </p>
          </div>
        ) : visible.length === 0 ? (
          <div className={styles.card}>
            <p className={styles.empty}>
              {tab === "new"
                ? "No new leads. Complete your profile and get verified: verified members are listed first."
                : "Nothing here yet."}
            </p>
          </div>
        ) : (
          <div className={inbox.split}>
            <ul className={inbox.list} aria-label="Leads">
              {visible.map((lead) => {
                const late = lead.status === "new" && (now - lead.createdAt) / HOUR > TARGET_HOURS;
                const active = selected?.id === lead.id;
                return (
                  <li key={lead.id}>
                    <button
                      type="button"
                      className={`${inbox.item} ${active ? inbox.itemActive : ""}`}
                      aria-current={active ? "true" : undefined}
                      onClick={() => setSelectedId(lead.id)}
                    >
                      <span className={inbox.itemName}>
                        {lead.name}
                        {lead.country ? <span> · {lead.country}</span> : null}
                      </span>
                      <span className={inbox.itemNeed}>
                        {NEED_LABELS[lead.need].en} · {TIMELINE_LABELS[lead.timeline].en.toLowerCase()}
                      </span>
                      <span className={`${inbox.itemTime} ${late ? inbox.late : ""}`}>
                        {ago(lead.createdAt, now)}
                        {late ? " · reply today" : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {selected ? (
              <section className={inbox.detail} aria-labelledby="lead-name">
                <div className={inbox.detailHead}>
                  <div>
                    <h2 id="lead-name" className={styles.cardTitle}>{selected.name}</h2>
                    <p className={styles.rowMeta}>
                      <a href={`mailto:${selected.email}`}>{selected.email}</a>
                      {selected.country ? ` · ${selected.country}` : ""} ·{" "}
                      {selected.locale === "es" ? "Español" : "English"}
                    </p>
                  </div>
                  <span className={inbox.status} data-status={selected.status}>
                    {selected.status === "new"
                      ? `Waiting ${hoursLabel((now - selected.createdAt) / HOUR)}`
                      : selected.status === "talking"
                        ? `Replied in ${hoursLabel(((selected.firstResponseAt ?? now) - selected.createdAt) / HOUR)}`
                        : selected.status === "won"
                          ? "Won"
                          : `Lost · ${LOST_REASON_LABELS[selected.lostReason ?? "other"].en}`}
                  </span>
                </div>

                <dl className={inbox.facts}>
                  <dt>Needs</dt>
                  <dd>{NEED_LABELS[selected.need].en}</dd>
                  <dt>When</dt>
                  <dd>{TIMELINE_LABELS[selected.timeline].en}</dd>
                  <dt>For</dt>
                  <dd>{selected.providerName}</dd>
                  <dt>Received</dt>
                  <dd>{new Date(selected.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</dd>
                </dl>

                <blockquote className={inbox.message}>{selected.message}</blockquote>

                {selected.status === "new" || selected.status === "talking" ? (
                  <>
                    <div className={styles.actions}>
                      <a
                        className={styles.primary}
                        href={`mailto:${selected.email}?subject=${encodeURIComponent(
                          selected.locale === "es"
                            ? `Su consulta con ${selected.providerName}`
                            : `Your consultation with ${selected.providerName}`
                        )}`}
                        onClick={() => {
                          if (selected.status === "new") void act(selected, { action: "responded" });
                        }}
                      >
                        Reply by email
                      </a>
                      {selected.status === "new" ? (
                        <button type="button" className={styles.ghost} disabled={busy}
                          onClick={() => void act(selected, { action: "responded" })}>
                          I already replied
                        </button>
                      ) : null}
                      <button type="button" className={styles.ghost} disabled={busy}
                        onClick={() => void act(selected, { action: "won" })}>
                        Mark won
                      </button>
                    </div>
                    <div className={inbox.lost}>
                      <label className={styles.label} htmlFor="lost-reason">Not going ahead?</label>
                      <div className={styles.actions}>
                        <select id="lost-reason" className={styles.input} value={lostReason}
                          onChange={(e) => setLostReason(e.target.value as LostReason)}>
                          {(Object.keys(LOST_REASON_LABELS) as LostReason[]).map((r) => (
                            <option key={r} value={r}>{LOST_REASON_LABELS[r].en}</option>
                          ))}
                        </select>
                        <button type="button" className={styles.danger} disabled={busy}
                          onClick={() => void act(selected, { action: "lost", reason: lostReason })}>
                          Mark lost
                        </button>
                      </div>
                    </div>
                    <p className={styles.hint}>
                      When you mark a lead won, CR-CIPI asks {selected.name.split(" ")[0]} for a
                      verified review of {selected.providerName}.
                    </p>
                  </>
                ) : (
                  <div className={styles.actions}>
                    {selected.status === "won" ? (
                      <p className={styles.hint}>
                        {selected.reviewRequestedAt
                          ? `Review request sent ${new Date(selected.reviewRequestedAt).toLocaleDateString("en-US", { dateStyle: "medium" })}.`
                          : "No review request sent."}
                      </p>
                    ) : null}
                    <button type="button" className={styles.ghost} disabled={busy}
                      onClick={() => void act(selected, { action: "reopen" })}>
                      Reopen
                    </button>
                  </div>
                )}
              </section>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}
