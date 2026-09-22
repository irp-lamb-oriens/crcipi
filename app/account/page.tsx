"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PROVIDER_CATEGORIES,
  PROVIDER_CATEGORY_LABELS,
  type ProviderCategory,
} from "@/lib/providerCategories";
import styles from "./page.module.scss";

type OwnProvider = {
  id: string;
  name: string;
  category: ProviderCategory;
  descriptionEn: string;
  descriptionEs: string;
  website?: string;
  email?: string;
  phone?: string;
  location?: string;
  logoUrl?: string;
  featured: boolean;
  approved: boolean;
  memberSince: number;
};

type ProviderForm = {
  name: string;
  category: ProviderCategory;
  descriptionEn: string;
  descriptionEs: string;
  website: string;
  email: string;
  phone: string;
  location: string;
  logoUrl: string;
};

const EMPTY_FORM: ProviderForm = {
  name: "",
  category: "other",
  descriptionEn: "",
  descriptionEs: "",
  website: "",
  email: "",
  phone: "",
  location: "",
  logoUrl: "",
};

export default function AccountPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [providers, setProviders] = useState<OwnProvider[]>([]);
  const [form, setForm] = useState<ProviderForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedReviews, setSelectedReviews] = useState<
    {
      id: string;
      rating: number;
      reviewerName: string;
      reviewerEmail: string | null;
      comment: string;
      createdAt: number;
    }[]
  >([]);

  const loadReviews = useCallback(async (providerId: string) => {
    const res = await fetch(`/api/member/providers/${providerId}/reviews`);
    if (!res.ok) {
      setSelectedReviews([]);
      return;
    }
    const data = await res.json();
    setSelectedReviews((data.reviews as never[]) ?? []);
  }, []);

  const loadProviders = useCallback(async () => {
    const res = await fetch("/api/member/providers");
    if (!res.ok) return;
    const data = await res.json();
    setProviders((data.providers as OwnProvider[]) ?? []);
  }, []);

  const [role, setRole] = useState<string | null>(null);

  const loadMe = useCallback(async () => {
    const res = await fetch("/api/auth/me");
    const data = await res.json();
    setAuthed(data.authed === true);
    setEmail(data.email ?? null);
    setRole(data.authed ? (data.role ?? null) : null);
    return data.authed === true;
  }, []);

  useEffect(() => {
    void (async () => {
      const ok = await loadMe();
      if (ok) void loadProviders();
    })();
  }, [loadMe, loadProviders]);

  useEffect(() => {
    if (authed === false) router.replace("/admin");
  }, [authed, router]);

  // This dashboard is the member surface. Admins belong in the admin console.
  useEffect(() => {
    if (authed && role === "admin") router.replace("/admin/providers");
  }, [authed, role, router]);

  function set<K extends keyof ProviderForm>(key: K, value: ProviderForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function fieldError(key: keyof ProviderForm): string | null {
    const code = fieldErrors[key];
    if (!code) return null;
    if (code === "required") return "This field is required.";
    if (key === "email") return "Enter a valid email address.";
    if (key === "website" || key === "logoUrl") return "Enter a valid URL.";
    if (code === "invalid") return "Enter a valid value.";
    return code;
  }

  function startNew() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError(null);
    setFieldErrors({});
    setSelectedReviews([]);
  }

  function startEdit(provider: OwnProvider) {
    setEditingId(provider.id);
    setForm({
      name: provider.name,
      category: provider.category,
      descriptionEn: provider.descriptionEn,
      descriptionEs: provider.descriptionEs,
      website: provider.website ?? "",
      email: provider.email ?? "",
      phone: provider.phone ?? "",
      location: provider.location ?? "",
      logoUrl: provider.logoUrl ?? "",
    });
    setError(null);
    setFieldErrors({});
    void loadReviews(provider.id);
  }

  async function save() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const payload = {
        ...form,
        website: form.website || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        location: form.location || undefined,
        logoUrl: form.logoUrl || undefined,
      };
      const path =
        editingId === null
          ? "/api/member/providers"
          : `/api/member/providers/${editingId}`;
      const res = await fetch(path, {
        method: editingId === null ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          errors?: Record<string, string>;
        } | null;
        const errors = body?.errors;
        if (errors && Object.keys(errors).length > 0) {
          setFieldErrors(errors);
          setError(null);
        } else {
          setError("Save failed. Check the fields and try again.");
        }
        return;
      }
      setFieldErrors({});
      setNotice(editingId === null ? "Your business is live." : "Your business was saved.");
      startNew();
      void loadProviders();
    } catch {
      setError("Save failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this business? This cannot be undone.")) return;
    await fetch(`/api/member/providers/${id}`, { method: "DELETE" });
    if (editingId === id) startNew();
    void loadProviders();
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
  }

  if (authed === null) {
    return (
      <main className={styles.main}>
        <p className={styles.hint}>Loading…</p>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>My business</h1>
            <p className={styles.subtitle}>
              {email ? <>Signed in as <strong>{email}</strong>. </> : null}
              Add your business or update your listing.
            </p>
          </div>
          <div className={styles.headerActions}>
            <a className={styles.back} href="/en/directory">
              View directory
            </a>
            <button type="button" className={styles.link} onClick={() => void signOut()}>
              Sign out
            </button>
          </div>
        </header>

        <div className={styles.columns}>
          <section className={styles.listPane}>
            <div className={styles.listHead}>
              <h2 className={styles.paneTitle}>My businesses</h2>
              <button type="button" className={styles.primary} onClick={startNew}>
                Add business
              </button>
            </div>

            {providers.length === 0 ? (
              <p className={styles.hint}>No businesses yet. Add your first one.</p>
            ) : (
              <ul className={styles.list}>
                {providers.map((provider) => (
                  <li key={provider.id} className={styles.row}>
                    <button
                      type="button"
                      className={styles.rowMain}
                      onClick={() => startEdit(provider)}
                    >
                      <span className={styles.rowName}>
                        {provider.name}
                        {!provider.approved ? (
                          <span className={styles.badgeMuted}>Pending review</span>
                        ) : (
                          <span className={styles.badgeLive}>Live</span>
                        )}
                      </span>
                      <span className={styles.rowMeta}>
                        {PROVIDER_CATEGORY_LABELS[provider.category].en} /{" "}
                        {PROVIDER_CATEGORY_LABELS[provider.category].es}
                      </span>
                    </button>
                    <button
                      type="button"
                      className={styles.danger}
                      onClick={() => void remove(provider.id)}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.formPane}>
            <h2 className={styles.paneTitle}>
              {editingId === null ? "Add business" : "Edit business"}
            </h2>

            {notice ? <p className={styles.notice}>{notice}</p> : null}
            {error ? <p className={styles.error}>{error}</p> : null}

            <div className={styles.field}>
              <label className={styles.label} htmlFor="m-name">Business name</label>
              <input
                id="m-name"
                className={styles.input}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
              {fieldError("name") ? (
                <p className={styles.fieldError}>{fieldError("name")}</p>
              ) : null}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="m-category">Category</label>
              <select
                id="m-category"
                className={styles.input}
                value={form.category}
                onChange={(e) => set("category", e.target.value as ProviderCategory)}
              >
                {PROVIDER_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {PROVIDER_CATEGORY_LABELS[category].en} /{" "}
                    {PROVIDER_CATEGORY_LABELS[category].es}
                  </option>
                ))}
              </select>
              {fieldError("category") ? (
                <p className={styles.fieldError}>{fieldError("category")}</p>
              ) : null}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="m-desc-en">
                Description (English)
              </label>
              <textarea
                id="m-desc-en"
                className={styles.input}
                rows={3}
                value={form.descriptionEn}
                onChange={(e) => set("descriptionEn", e.target.value)}
              />
              {fieldError("descriptionEn") ? (
                <p className={styles.fieldError}>{fieldError("descriptionEn")}</p>
              ) : null}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="m-desc-es">
                Description (Español)
              </label>
              <textarea
                id="m-desc-es"
                className={styles.input}
                rows={3}
                value={form.descriptionEs}
                onChange={(e) => set("descriptionEs", e.target.value)}
              />
              {fieldError("descriptionEs") ? (
                <p className={styles.fieldError}>{fieldError("descriptionEs")}</p>
              ) : null}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="m-website">Website</label>
              <input
                id="m-website"
                className={styles.input}
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                placeholder="https://"
              />
              {fieldError("website") ? (
                <p className={styles.fieldError}>{fieldError("website")}</p>
              ) : null}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="m-email">Email</label>
              <input
                id="m-email"
                className={styles.input}
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
              {fieldError("email") ? (
                <p className={styles.fieldError}>{fieldError("email")}</p>
              ) : null}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="m-phone">Phone</label>
              <input
                id="m-phone"
                className={styles.input}
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="m-location">Location</label>
              <input
                id="m-location"
                className={styles.input}
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="m-logo">Logo URL</label>
              <input
                id="m-logo"
                className={styles.input}
                value={form.logoUrl}
                onChange={(e) => set("logoUrl", e.target.value)}
                placeholder="https://"
              />
              {fieldError("logoUrl") ? (
                <p className={styles.fieldError}>{fieldError("logoUrl")}</p>
              ) : null}
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primary}
                onClick={() => void save()}
                disabled={busy}
              >
                {busy ? "Saving…" : "Save business"}
              </button>
              {editingId !== null ? (
                <button type="button" className={styles.ghost} onClick={startNew}>
                  Cancel
                </button>
              ) : null}
            </div>
          </section>
        </div>

        {editingId !== null && selectedReviews.length > 0 ? (
          <section className={styles.reviewsPane}>
            <h2 className={styles.paneTitle}>Reviews for your business</h2>
            <p className={styles.hint}>Reviewer emails are visible only to you.</p>
            <ul className={styles.reviewList}>
              {selectedReviews.map((review) => (
                <li key={review.id} className={styles.reviewRow}>
                  <div className={styles.reviewHead}>
                    <span className={styles.reviewName}>{review.reviewerName}</span>
                    <span className={styles.reviewStars}>
                      {"★".repeat(review.rating)}
                      {"☆".repeat(5 - review.rating)}
                    </span>
                  </div>
                  {review.reviewerEmail ? (
                    <p className={styles.reviewEmail}>{review.reviewerEmail}</p>
                  ) : null}
                  {review.comment ? (
                    <p className={styles.reviewComment}>{review.comment}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}
