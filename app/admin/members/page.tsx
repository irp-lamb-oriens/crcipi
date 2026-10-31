"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ConsoleGate from "@/components/console/ConsoleGate";
import ModuleGuide from "@/components/console/ModuleGuide";
import { useSession } from "@/components/console/useSession";
import { PROVIDER_CATEGORY_LABELS, type ProviderCategory } from "@/lib/providerCategories";
import styles from "@/components/console/Console.module.scss";
import t from "./page.module.scss";

type Pillar = "legal" | "profile" | "responsiveness" | "reviews" | "activity";
type Member = {
  id: string;
  name: string;
  category: ProviderCategory;
  approved: boolean;
  verified: boolean;
  kycStatus: string;
  ownerEmail: string | null;
  owner: "member" | "none" | "missing" | "test" | "seeded";
  score: number;
  pillars: Record<Pillar, number>;
  replyHours: number | null;
  leads: { total: number; waiting: number; won: number };
  rating: number | null;
  reviews: number;
  lastActivity: number;
};
type Summary = { total: number; verified: number; waiting: number; medianScore: number | null; unclaimed: number };

// Why a listing counts as unclaimed (a placeholder), in plain words.
const OWNER_LABEL: Record<Member["owner"], string> = {
  member: "",
  none: "Unclaimed · no manager",
  missing: "Unclaimed · manager's account no longer exists",
  test: "Unclaimed · held by a test account",
  seeded: "Placeholder · example data",
};

const PILLARS: { key: Pillar; short: string }[] = [
  { key: "legal", short: "Legal" },
  { key: "profile", short: "Profile" },
  { key: "responsiveness", short: "Replies" },
  { key: "reviews", short: "Reviews" },
  { key: "activity", short: "Activity" },
];

type Sort = "score" | "waiting" | "name" | "activity";
type Filter = "all" | "verified" | "unverified" | "attention" | "unclaimed" | "hidden";

function daysAgo(t0: number) {
  const d = Math.floor((Date.now() - t0) / 86_400_000);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
}

// Miembros: every company with its health at a glance.
export default function AdminMembers() {
  const session = useSession();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [failed, setFailed] = useState(false);
  const [sort, setSort] = useState<Sort>("score");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (session.status !== "admin") return;
    fetch("/api/admin/members")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((b: { members: Member[]; summary: Summary }) => {
        setMembers(b.members);
        setSummary(b.summary);
      })
      .catch(() => setFailed(true));
  }, [session.status]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (members ?? [])
      .filter((m) =>
        filter === "hidden"
          ? !m.approved
          : m.approved &&
            (filter === "all" ||
              (filter === "verified" && m.verified) ||
              (filter === "unverified" && !m.verified) ||
              (filter === "unclaimed" && m.owner !== "member") ||
              (filter === "attention" && (m.leads.waiting > 0 || m.score < 40)))
      )
      .filter((m) => !q || m.name.toLowerCase().includes(q) || (m.ownerEmail ?? "").includes(q))
      .sort((a, b) =>
        sort === "name"
          ? a.name.localeCompare(b.name)
          : sort === "waiting"
            ? b.leads.waiting - a.leads.waiting || a.score - b.score
            : sort === "activity"
              ? b.lastActivity - a.lastActivity
              : b.score - a.score
      );
  }, [members, filter, sort, query]);

  const gate = <ConsoleGate session={session} role="admin" />;
  if (session.status !== "admin") return gate;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Miembros</p>
            <h1 className={styles.title}>Members</h1>
            <p className={styles.subtitle}>
              Every company with its trust score, reply time and activity.{" "}
              <Link href="/admin/providers">Edit listings</Link>
            </p>
          </div>
          <ModuleGuide area="admin" id="members" />
        </header>

        {failed ? <p className={styles.error}>Couldn&apos;t load members. You may need the “Manage providers” permission.</p> : null}

        {summary ? (
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Listed</span>
              <span className={styles.statValue}>{summary.total}</span>
              <span className={styles.statHint}>companies in the directory</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>With the seal</span>
              <span className={styles.statValue}>
                {summary.total ? Math.round((summary.verified / summary.total) * 100) : 0}%
              </span>
              <span className={styles.statHint}>target: 60%</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Median trust score</span>
              <span className={styles.statValue}>{summary.medianScore ?? "—"}</span>
              <span className={styles.statHint}>out of 100</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Investors waiting</span>
              <span className={styles.statValue}>{summary.waiting}</span>
              <span className={styles.statHint}>requests over 24 h old</span>
            </div>
          </div>
        ) : null}

        <div className={t.controls}>
          <label className={t.search}>
            <span className="srOnly">Search members</span>
            <input
              className={styles.input}
              type="search"
              placeholder="Search by company or email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className={styles.tabs} role="group" aria-label="Filter">
            {(
              [
                ["all", "All"],
                ["attention", "Needs attention"],
                ["verified", "Verified"],
                ["unverified", "Not verified"],
                ["unclaimed", `Unclaimed${summary ? ` (${summary.unclaimed})` : ""}`],
                ["hidden", "Hidden"],
              ] as [Filter, string][]
            ).map(([key, label]) => (
              <button key={key} type="button" aria-pressed={filter === key}
                className={`${styles.tab} ${filter === key ? styles.tabActive : ""}`} onClick={() => setFilter(key)}>
                {label}
              </button>
            ))}
          </div>
          <label className={t.sort}>
            Sort by
            <select className={styles.input} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="score">Trust score</option>
              <option value="waiting">Waiting investors</option>
              <option value="activity">Recent activity</option>
              <option value="name">Name</option>
            </select>
          </label>
        </div>

        {members === null && !failed ? <p className={styles.hint}>Loading…</p> : null}
        {members && rows.length === 0 ? <p className={styles.empty}>No members match.</p> : null}

        {rows.length > 0 ? (
          <ol className={t.list}>
            {rows.map((m) => (
              <li key={m.id} className={t.row}>
                <div className={t.who}>
                  <a href={`/en/directory/${m.id}`} target="_blank" rel="noopener noreferrer" className={t.name}>
                    {m.name}
                  </a>
                  <p className={t.meta}>
                    {PROVIDER_CATEGORY_LABELS[m.category].en}
                    {m.owner === "member" && m.ownerEmail ? ` · ${m.ownerEmail}` : ""}
                    {m.verified ? <span className={t.sealed}> · ✓ Seal</span> : ` · ${m.kycStatus === "none" ? "not started" : m.kycStatus}`}
                  </p>
                  {m.owner !== "member" ? <p className={t.unclaimed}>{OWNER_LABEL[m.owner]}{m.ownerEmail ? ` (${m.ownerEmail})` : ""}</p> : null}
                </div>

                <div className={t.score} aria-label={`Trust score ${m.score} out of 100`}>
                  <strong>{m.score}</strong>
                  <span className={t.bars} aria-hidden="true">
                    {PILLARS.map((p) => (
                      <span key={p.key} title={`${p.short}: ${m.pillars[p.key]}/20`}>
                        <span style={{ transform: `scaleY(${m.pillars[p.key] / 20})` }} />
                      </span>
                    ))}
                  </span>
                </div>

                <dl className={t.facts}>
                  <div>
                    <dt>Replies</dt>
                    <dd>{m.replyHours === null ? "—" : m.replyHours < 24 ? `${Math.max(1, Math.round(m.replyHours))} h` : `${Math.round(m.replyHours / 24)} d`}</dd>
                  </div>
                  <div>
                    <dt>Leads</dt>
                    <dd>
                      {m.leads.total}
                      {m.leads.waiting > 0 ? <span className={t.late}> · {m.leads.waiting} waiting</span> : null}
                    </dd>
                  </div>
                  <div>
                    <dt>Reviews</dt>
                    <dd>{m.rating !== null ? `${m.rating.toFixed(1)} ★ (${m.reviews})` : "—"}</dd>
                  </div>
                  <div>
                    <dt>Active</dt>
                    <dd>{daysAgo(m.lastActivity)}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </main>
  );
}
