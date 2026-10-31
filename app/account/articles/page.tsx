"use client";

import { useCallback, useEffect, useState } from "react";
import ConsoleGate from "@/components/console/ConsoleGate";
import ModuleGuide from "@/components/console/ModuleGuide";
import FileUpload from "@/components/console/FileUpload";
import StatusBadge, { type BadgeTone } from "@/components/console/StatusBadge";
import { useSession } from "@/components/console/useSession";
import { formatDate } from "@/components/console/labels";
import styles from "@/components/console/Console.module.scss";
import {
  ARTICLE_CATEGORIES,
  ARTICLE_CATEGORY_LABELS,
  ARTICLE_LIMITS,
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
  coverUrl: string | null;
  providerId: string | null;
  status: ArticleStatus;
  moderation: { decision: string; reasons: string[]; source: string } | null;
  humanReview: { decision: string; note: string | null } | null;
  updatedAt: number;
  viewsCount: number;
};

type Form = Pick<Article, "title" | "excerpt" | "body" | "language" | "category" | "coverUrl" | "providerId">;

const EMPTY: Form = { title: "", excerpt: "", body: "", language: "en", category: "living", coverUrl: null, providerId: null };

const STATUS_TONE: Record<ArticleStatus, BadgeTone> = {
  draft: "warn",
  in_review: "info",
  published: "good",
  rejected: "bad",
  archived: "neutral",
};

const FIELD_ERRORS: Record<string, string> = {
  required: "Required.",
  too_short: `Write at least ${ARTICLE_LIMITS.bodyMin} characters.`,
  invalid: "Upload the cover again.",
  not_yours: "Choose one of your businesses.",
};

export default function MemberArticlesPage() {
  const session = useSession();
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [providers, setProviders] = useState<{ id: string; name: string }[]>([]);
  const [editing, setEditing] = useState<Article | "new" | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "notice" | "error" | "warn"; text: string } | null>(null);

  const load = useCallback(async () => {
    const [aRes, pRes] = await Promise.all([fetch("/api/member/articles"), fetch("/api/member/providers")]);
    if (aRes.ok) setArticles((await aRes.json()).articles as Article[]);
    if (pRes.ok) setProviders((await pRes.json()).providers ?? []);
  }, []);

  useEffect(() => {
    if (session.status === "member") void load();
  }, [session.status, load]);

  const gate = <ConsoleGate session={session} role="member" />;
  if (session.status !== "member") return gate;

  function open(article: Article | "new") {
    setEditing(article);
    setErrors({});
    setMessage(null);
    setForm(article === "new" ? EMPTY : {
      title: article.title, excerpt: article.excerpt, body: article.body, language: article.language,
      category: article.category, coverUrl: article.coverUrl, providerId: article.providerId,
    });
  }

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save(submit: boolean) {
    if (!editing) return;
    setBusy(true);
    setMessage(submit ? { kind: "notice", text: "Reviewing your article… this takes a few seconds." } : null);
    try {
      const res = await fetch(editing === "new" ? "/api/member/articles" : `/api/member/articles/${editing.id}`, {
        method: editing === "new" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, submit }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErrors((data?.errors as Record<string, string>) ?? {});
        const text =
          data?.error === "rate_limited" ? "You've submitted a lot today. Try again tomorrow."
          : data?.error === "awaiting_editor" ? "An editor is reviewing this article. You can edit it after their decision."
          : data?.errors ? "Some fields need attention." : "Save failed. Try again.";
        setMessage({ kind: "error", text });
        return;
      }
      const article = data.article as Article;
      setErrors({});
      if (!submit) setMessage({ kind: "notice", text: "Draft saved." });
      else if (article.status === "published") setMessage({ kind: "notice", text: "Approved and published." });
      else if (article.status === "rejected") setMessage({ kind: "warn", text: "Not published yet. See the reviewer's notes below and edit." });
      else setMessage({ kind: "notice", text: "Sent to an editor for a final check. We'll email you." });
      setEditing(article.status === "rejected" ? article : null);
      void load();
    } catch {
      setMessage({ kind: "error", text: "Save failed. Check your connection." });
    } finally {
      setBusy(false);
    }
  }

  async function remove(article: Article) {
    if (!window.confirm(`Delete "${article.title}"?`)) return;
    await fetch(`/api/member/articles/${article.id}`, { method: "DELETE" });
    if (editing !== "new" && editing?.id === article.id) setEditing(null);
    void load();
  }

  const err = (key: string) =>
    errors[key] ? <p className={styles.fieldError}>{FIELD_ERRORS[errors[key]] ?? "Check this field."}</p> : null;
  const current = editing && editing !== "new" ? editing : null;
  const reasons = current?.humanReview?.note
    ? [current.humanReview.note]
    : current?.moderation?.reasons ?? [];

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Insights</p>
            <h1 className={styles.title}>Your articles</h1>
            <p className={styles.subtitle}>
              Share practical knowledge with people investing and living in Costa Rica. An AI
              editor checks relevance and neutrality (no political or religious content, no pure
              ads); anything borderline goes to a human editor.
            </p>
          </div>
          <div className={styles.actions}>
            <ModuleGuide area="member" id="articles" />
            <button type="button" className={styles.primary} onClick={() => open("new")}>+ New article</button>
          </div>
        </header>

        {message ? <p className={styles[message.kind]}>{message.text}</p> : null}

        {editing ? (
          <form className={`${styles.card} ${styles.form}`} onSubmit={(e) => { e.preventDefault(); void save(true); }}>
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitle}>{editing === "new" ? "New article" : "Edit article"}</h2>
              <button type="button" className={styles.small} onClick={() => setEditing(null)}>Cancel</button>
            </div>
            {current && reasons.length > 0 && (current.status === "rejected" || current.status === "in_review") ? (
              <div className={styles.warn}>
                <strong>Reviewer notes</strong>
                <ul className={styles.reasons}>{reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
              </div>
            ) : null}
            {current?.status === "published" ? (
              <p className={styles.hint}>This article is live. Saving changes sends it through review again.</p>
            ) : null}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="ar-title">Title</label>
              <input id="ar-title" className={styles.input} value={form.title} maxLength={ARTICLE_LIMITS.title}
                onChange={(e) => set("title", e.target.value)} />
              {err("title")}
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="ar-excerpt">Summary</label>
              <textarea id="ar-excerpt" className={styles.input} rows={2} value={form.excerpt} maxLength={ARTICLE_LIMITS.excerpt}
                onChange={(e) => set("excerpt", e.target.value)} />
              <span className={styles.help}>One or two sentences shown on the blog list and in search results.</span>
              {err("excerpt")}
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="ar-lang">Language</label>
                <select id="ar-lang" className={styles.input} value={form.language}
                  onChange={(e) => set("language", e.target.value as "en" | "es")}>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="ar-cat">Topic</label>
                <select id="ar-cat" className={styles.input} value={form.category}
                  onChange={(e) => set("category", e.target.value as ArticleCategory)}>
                  {ARTICLE_CATEGORIES.map((c) => <option key={c} value={c}>{ARTICLE_CATEGORY_LABELS[c].en}</option>)}
                </select>
              </div>
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="ar-prov">Published on behalf of</label>
                <select id="ar-prov" className={styles.input} value={form.providerId ?? ""}
                  onChange={(e) => set("providerId", e.target.value || null)}>
                  <option value="">Just me</option>
                  {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {err("providerId")}
              </div>
              <div className={styles.field}>
                {form.coverUrl ? (
                  <>
                    <span className={styles.label}>Cover image</span>
                    <div className={styles.actions}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={form.coverUrl} alt="" style={{ width: 120, aspectRatio: "16/9", objectFit: "cover", borderRadius: 6 }} />
                      <button type="button" className={styles.small} onClick={() => set("coverUrl", null)}>Remove</button>
                    </div>
                  </>
                ) : (
                  <FileUpload kind="image" label="Cover image (optional)" onUploaded={(file) => set("coverUrl", file.url ?? null)} />
                )}
                {err("coverUrl")}
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="ar-body">Article</label>
              <textarea id="ar-body" className={styles.input} rows={18} value={form.body}
                onChange={(e) => set("body", e.target.value)} />
              <span className={styles.help}>
                {form.body.trim().length} / {ARTICLE_LIMITS.bodyMin}+ characters. Blank line = new paragraph,
                &quot;## &quot; = heading, &quot;- &quot; = bullet.
              </span>
              {err("body")}
            </div>
            <div className={styles.actions}>
              <button type="submit" className={styles.primary} disabled={busy}>
                {busy ? "Working…" : "Submit for review"}
              </button>
              {current?.status !== "published" ? (
                <button type="button" className={styles.ghost} disabled={busy} onClick={() => void save(false)}>Save draft</button>
              ) : null}
            </div>
          </form>
        ) : null}

        <section className={styles.card}>
          {articles === null ? (
            <p className={styles.hint}>Loading…</p>
          ) : articles.length === 0 ? (
            <p className={styles.empty}>No articles yet. Your first one could be a guide to the question clients ask you most.</p>
          ) : (
            <ul className={styles.list}>
              {articles.map((article) => (
                <li key={article.id} className={styles.row}>
                  <div className={styles.rowMain}>
                    <div className={styles.rowTitle}>
                      {article.title || "Untitled"}
                      <StatusBadge tone={STATUS_TONE[article.status]}>{ARTICLE_STATUS_LABELS[article.status]}</StatusBadge>
                    </div>
                    <div className={styles.rowMeta}>
                      {ARTICLE_CATEGORY_LABELS[article.category].en} · {article.language.toUpperCase()} · updated{" "}
                      {formatDate(article.updatedAt)} · {article.viewsCount} views
                    </div>
                  </div>
                  <div className={styles.rowActions}>
                    {article.status === "published" ? (
                      <a className={styles.small} href={`/${article.language}/blog/${article.slug}`} target="_blank" rel="noopener noreferrer">View</a>
                    ) : null}
                    {article.status !== "archived" ? (
                      <button type="button" className={styles.small} onClick={() => open(article)}>Edit</button>
                    ) : null}
                    <button type="button" className={styles.danger} onClick={() => void remove(article)}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
