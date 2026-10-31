"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ConsoleGate from "@/components/console/ConsoleGate";
import StatusBadge, { type BadgeTone } from "@/components/console/StatusBadge";
import { useSession } from "@/components/console/useSession";
import { formatDate } from "@/components/console/labels";
import styles from "@/components/console/Console.module.scss";
import {
  ARTICLE_CATEGORY_LABELS,
  ARTICLE_STATUS_LABELS,
  type ArticleCategory,
  type ArticleStatus,
} from "@/lib/articleOptions";

type Article = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  language: "en" | "es";
  category: ArticleCategory;
  authorName: string;
  providerName: string | null;
  status: ArticleStatus;
  moderation: { decision: string; reasons: string[]; flags: string[]; source: string; model: string | null } | null;
  humanReview: { decision: string; by: string; note: string | null; at: number } | null;
  updatedAt: number;
  viewsCount: number;
};

const TONE: Record<ArticleStatus, BadgeTone> = {
  draft: "warn",
  in_review: "info",
  published: "good",
  rejected: "bad",
  archived: "neutral",
};

const FILTERS: ArticleStatus[] = ["in_review", "published", "rejected", "archived", "draft"];

export default function AdminArticlesPage() {
  const session = useSession();
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [filter, setFilter] = useState<ArticleStatus>("in_review");
  const [selected, setSelected] = useState<string | null>(null);

  // Deep link from the review inbox: ?article=<id> opens that item.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("article");
    if (id) setSelected(id);
  }, []);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "notice" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/articles");
    if (!res.ok) {
      setArticles([]);
      setMessage({ kind: "error", text: "You don't have the Moderate articles permission." });
      return;
    }
    setArticles((await res.json()).articles as Article[]);
  }, []);

  useEffect(() => {
    if (session.status === "admin") void load();
  }, [session.status, load]);

  const counts = useMemo(() => {
    const out = Object.fromEntries(FILTERS.map((f) => [f, 0])) as Record<ArticleStatus, number>;
    articles?.forEach((a) => (out[a.status] += 1));
    return out;
  }, [articles]);

  const gate = <ConsoleGate session={session} role="admin" />;
  if (session.status !== "admin") return gate;

  const visible = (articles ?? []).filter((a) => a.status === filter);
  const current = articles?.find((a) => a.id === selected) ?? null;

  async function act(action: "approve" | "reject" | "archive" | "rerun") {
    if (!current) return;
    if (action === "reject" && !note.trim()) {
      setMessage({ kind: "error", text: "Add a note so the author knows what to change." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/articles/${current.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      if (!res.ok) {
        setMessage({ kind: "error", text: "Action failed." });
        return;
      }
      const updated = (await res.json()).article as Article;
      setMessage({ kind: "notice", text: `Now: ${ARTICLE_STATUS_LABELS[updated.status]}.` });
      setNote("");
      void load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Editorial</p>
            <h1 className={styles.title}>Member articles</h1>
            <p className={styles.subtitle}>
              The AI editor publishes clear passes and rejects clear violations. You decide the
              borderline cases and can override any decision.
            </p>
          </div>
        </header>

        {message ? <p className={styles[message.kind]}>{message.text}</p> : null}

        <div className={styles.tabs}>
          {FILTERS.map((status) => (
            <button key={status} type="button"
              className={`${styles.tab} ${filter === status ? styles.tabActive : ""}`}
              onClick={() => { setFilter(status); setSelected(null); }}>
              {ARTICLE_STATUS_LABELS[status]}<span>{counts[status]}</span>
            </button>
          ))}
        </div>

        <div className={styles.grid2}>
          <section className={styles.card}>
            {articles === null ? (
              <p className={styles.hint}>Loading…</p>
            ) : visible.length === 0 ? (
              <p className={styles.empty}>Nothing here.</p>
            ) : (
              <ul className={styles.list}>
                {visible.map((a) => (
                  <li key={a.id} className={styles.row}>
                    <div className={styles.rowMain}>
                      <div className={styles.rowTitle}>{a.title || "Untitled"}</div>
                      <div className={styles.rowMeta}>
                        {a.authorName}{a.providerName ? ` · ${a.providerName}` : ""} · {a.language.toUpperCase()} · {formatDate(a.updatedAt)}
                      </div>
                    </div>
                    <button type="button" className={styles.small} onClick={() => { setSelected(a.id); setNote(""); }}>
                      Open
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.card}>
            {!current ? (
              <p className={styles.empty}>Select an article.</p>
            ) : (
              <div className={styles.form}>
                <div className={styles.cardHead}>
                  <h2 className={styles.cardTitle}>{current.title}</h2>
                  <StatusBadge tone={TONE[current.status]}>{ARTICLE_STATUS_LABELS[current.status]}</StatusBadge>
                </div>
                <p className={styles.hint}>
                  {ARTICLE_CATEGORY_LABELS[current.category].en} · {current.viewsCount} views
                  {current.status === "published" ? (
                    <> · <a href={`/${current.language}/blog/${current.slug}`} target="_blank" rel="noopener noreferrer">Open live</a></>
                  ) : null}
                </p>

                <div className={current.moderation?.decision === "approve" ? styles.notice : styles.warn}>
                  <strong>
                    AI review:{" "}
                    {current.moderation
                      ? `${current.moderation.decision}${current.moderation.source !== "ai" ? ` (${current.moderation.source})` : ""}`
                      : "not run"}
                  </strong>
                  {current.moderation?.flags.length ? <div>Flags: {current.moderation.flags.join(", ")}</div> : null}
                  {current.moderation?.reasons.length ? (
                    <ul className={styles.reasons}>{current.moderation.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
                  ) : null}
                </div>
                {current.humanReview ? (
                  <p className={styles.hint}>
                    Editor: {current.humanReview.decision} by {current.humanReview.by} on {formatDate(current.humanReview.at)}
                    {current.humanReview.note ? ` — “${current.humanReview.note}”` : ""}
                  </p>
                ) : null}

                <p><strong>{current.excerpt}</strong></p>
                <div className={styles.prose}>{current.body}</div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="ed-note">Note to the author</label>
                  <textarea id="ed-note" className={styles.input} rows={3} value={note}
                    onChange={(e) => setNote(e.target.value)} placeholder="Required when sending back." />
                </div>
                <div className={styles.actions}>
                  {current.status !== "published" ? (
                    <button type="button" className={styles.primary} disabled={busy} onClick={() => void act("approve")}>Publish</button>
                  ) : null}
                  {current.status !== "rejected" ? (
                    <button type="button" className={styles.danger} disabled={busy} onClick={() => void act("reject")}>Send back</button>
                  ) : null}
                  {current.status !== "archived" ? (
                    <button type="button" className={styles.small} disabled={busy} onClick={() => void act("archive")}>Archive</button>
                  ) : null}
                  <button type="button" className={styles.small} disabled={busy} onClick={() => void act("rerun")}>Re-run AI review</button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
