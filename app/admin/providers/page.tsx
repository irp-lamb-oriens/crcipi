"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PROVIDER_CATEGORIES,
  PROVIDER_CATEGORY_LABELS,
  type ProviderCategory,
} from "@/lib/providerCategories";
import styles from "./page.module.scss";

type AdminProviderSummary = {
  id: string;
  name: string;
  category: ProviderCategory;
  featured: boolean;
  approved: boolean;
  ratingsCount: number;
  ratingsSum: number;
};

type AdminProviderDetail = AdminProviderSummary & {
  descriptionEn: string;
  descriptionEs: string;
  website?: string;
  email?: string;
  phone?: string;
  location?: string;
  logoUrl?: string;
  ratings: AdminRating[];
};

type AdminRating = {
  id: string;
  rating: number;
  reviewerName: string;
  comment?: string;
  approved: boolean;
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
  featured: boolean;
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
  featured: false,
};

export default function AdminProvidersPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [providers, setProviders] = useState<AdminProviderSummary[]>([]);
  const [selected, setSelected] = useState<AdminProviderDetail | null>(null);
  const [form, setForm] = useState<ProviderForm>(EMPTY_FORM);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadProviders = useCallback(async () => {
    const res = await fetch("/api/admin/providers");
    if (!res.ok) return;
    const data = await res.json();
    setProviders(data.providers as AdminProviderSummary[]);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: { authed: boolean }) => setAuthed(data.authed))
      .catch(() => setAuthed(false));
  }, []);

  useEffect(() => {
    if (authed) void loadProviders();
  }, [authed, loadProviders]);

  function set<K extends keyof ProviderForm>(key: K, value: ProviderForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function openEdit(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/providers/${id}`);
      if (!res.ok) throw new Error("load_failed");
      const data = await res.json();
      const provider = data.provider as AdminProviderDetail;
      setSelected(provider);
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
        featured: provider.featured,
      });
      setFormMode("edit");
    } catch {
      setError("Could not load the provider.");
    } finally {
      setBusy(false);
    }
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setFormMode("create");
    setSelected(null);
    setError(null);
  }

  async function save() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const payload = {
        ...form,
        // Only send optional fields when populated.
        website: form.website || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        location: form.location || undefined,
        logoUrl: form.logoUrl || undefined,
      };
      const path =
        formMode === "create"
          ? "/api/admin/providers"
          : `/api/admin/providers/${selected?.id}`;
      const res = await fetch(path, {
        method: formMode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setError("Save failed. Check the fields and try again.");
        return;
      }
      setNotice(formMode === "create" ? "Provider created." : "Provider saved.");
      setSelected(null);
      setForm(EMPTY_FORM);
      setFormMode("create");
      void loadProviders();
    } catch {
      setError("Save failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleApproved(provider: AdminProviderSummary) {
    await fetch(`/api/admin/providers/${provider.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: !provider.approved }),
    });
    void loadProviders();
  }

  async function removeProvider(id: string) {
    if (!window.confirm("Delete this provider permanently?")) return;
    await fetch(`/api/admin/providers/${id}`, { method: "DELETE" });
    if (selected?.id === id) resetForm();
    void loadProviders();
  }

  async function reviewAction(
    providerId: string,
    ratingId: string,
    action: "approve" | "reject"
  ) {
    await fetch(`/api/admin/providers/${providerId}/ratings/${ratingId}`, {
      method: action === "approve" ? "POST" : "DELETE",
    });
    void loadProviders();
    if (selected) void openEdit(providerId);
  }

  if (authed === null) {
    return (
      <main className={styles.main}>
        <p className={styles.hint}>Loading…</p>
      </main>
    );
  }

  if (authed === false) {
    return (
      <main className={styles.main}>
        <div className={styles.card}>
          <h1 className={styles.title}>Provider directory admin</h1>
          <p className={styles.hint}>
            You must be signed in to manage providers.{" "}
            <a href="/admin">Sign in</a>.
          </p>
        </div>
      </main>
    );
  }

  const pendingCount = selected
    ? selected.ratings.filter((rating) => !rating.approved).length
    : 0;

  return (
    <main className={styles.main}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Member provider directory</h1>
            <p className={styles.subtitle}>
              Manage member providers and moderate their reviews.
            </p>
          </div>
          <a className={styles.back} href="/en/directory">
            View public directory
          </a>
        </header>

        <div className={styles.columns}>
          <section className={styles.listPane}>
            <div className={styles.listHead}>
              <h2 className={styles.paneTitle}>Providers</h2>
              <button
                type="button"
                className={styles.primary}
                onClick={resetForm}
              >
                New provider
              </button>
            </div>

            {providers.length === 0 ? (
              <p className={styles.hint}>No providers yet. Create the first one.</p>
            ) : (
              <ul className={styles.list}>
                {providers.map((provider) => (
                  <li key={provider.id} className={styles.row}>
                    <button
                      type="button"
                      className={styles.rowMain}
                      onClick={() => void openEdit(provider.id)}
                    >
                      <span className={styles.rowName}>
                        {provider.name}
                        {provider.featured ? (
                          <span className={styles.badge}>Featured</span>
                        ) : null}
                        {!provider.approved ? (
                          <span className={styles.badgeMuted}>Hidden</span>
                        ) : null}
                      </span>
                      <span className={styles.rowMeta}>
                        {PROVIDER_CATEGORY_LABELS[provider.category].en} ·{" "}
                        {PROVIDER_CATEGORY_LABELS[provider.category].es} ·{" "}
                        {provider.ratingsCount} reviews
                      </span>
                    </button>
                    <button
                      type="button"
                      className={styles.smallButton}
                      onClick={() => void toggleApproved(provider)}
                    >
                      {provider.approved ? "Hide" : "Show"}
                    </button>
                    <button
                      type="button"
                      className={styles.danger}
                      onClick={() => void removeProvider(provider.id)}
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
              {formMode === "create" ? "Create provider" : "Edit provider"}
            </h2>

            {notice ? <p className={styles.notice}>{notice}</p> : null}
            {error ? <p className={styles.error}>{error}</p> : null}

            <div className={styles.field}>
              <label className={styles.label} htmlFor="p-name">Name</label>
              <input
                id="p-name"
                className={styles.input}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="p-category">Category</label>
              <select
                id="p-category"
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
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="p-desc-en">
                Description (English)
              </label>
              <textarea
                id="p-desc-en"
                className={styles.input}
                rows={3}
                value={form.descriptionEn}
                onChange={(e) => set("descriptionEn", e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="p-desc-es">
                Description (Español)
              </label>
              <textarea
                id="p-desc-es"
                className={styles.input}
                rows={3}
                value={form.descriptionEs}
                onChange={(e) => set("descriptionEs", e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="p-website">Website</label>
              <input
                id="p-website"
                className={styles.input}
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                placeholder="https://"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="p-email">Email</label>
              <input
                id="p-email"
                className={styles.input}
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="p-phone">Phone</label>
              <input
                id="p-phone"
                className={styles.input}
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="p-location">Location</label>
              <input
                id="p-location"
                className={styles.input}
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="p-logo">Logo URL</label>
              <input
                id="p-logo"
                className={styles.input}
                value={form.logoUrl}
                onChange={(e) => set("logoUrl", e.target.value)}
                placeholder="https://"
              />
            </div>

            <label className={styles.check}>
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => set("featured", e.target.checked)}
              />
              <span>Featured (pinned first)</span>
            </label>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primary}
                onClick={() => void save()}
                disabled={busy}
              >
                {busy ? "Saving…" : "Save provider"}
              </button>
              {formMode === "edit" ? (
                <button type="button" className={styles.ghost} onClick={resetForm}>
                  Cancel
                </button>
              ) : null}
            </div>
          </section>
        </div>

        {selected ? (
          <section className={styles.reviewsPane}>
            <h2 className={styles.paneTitle}>
              Reviews for {selected.name}{" "}
              {pendingCount > 0 ? (
                <span className={styles.badge}>{pendingCount} pending</span>
              ) : null}
            </h2>
            {selected.ratings.length === 0 ? (
              <p className={styles.hint}>No reviews submitted yet.</p>
            ) : (
              <ul className={styles.reviews}>
                {selected.ratings.map((rating) => (
                  <li key={rating.id} className={styles.review}>
                    <div className={styles.reviewHead}>
                      <span className={styles.reviewName}>
                        {rating.reviewerName}
                      </span>
                      <span className={styles.stars}>
                        {"★".repeat(rating.rating)}
                        {"☆".repeat(5 - rating.rating)}
                      </span>
                      <span className={styles.reviewStatus}>
                        {rating.approved ? "Approved" : "Pending"}
                      </span>
                    </div>
                    {rating.comment ? (
                      <p className={styles.reviewComment}>{rating.comment}</p>
                    ) : null}
                    {!rating.approved ? (
                      <div className={styles.reviewActions}>
                        <button
                          type="button"
                          className={styles.smallButton}
                          onClick={() => void reviewAction(selected.id, rating.id, "approve")}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className={styles.danger}
                          onClick={() => void reviewAction(selected.id, rating.id, "reject")}
                        >
                          Reject
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}