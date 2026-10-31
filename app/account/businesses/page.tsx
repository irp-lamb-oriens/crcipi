"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import ConsoleGate from "@/components/console/ConsoleGate";
import ModuleGuide from "@/components/console/ModuleGuide";
import FileUpload from "@/components/console/FileUpload";
import StatusBadge from "@/components/console/StatusBadge";
import { useSession } from "@/components/console/useSession";
import {
  PROVIDER_CATEGORIES,
  PROVIDER_CATEGORY_LABELS,
  type ProviderCategory,
} from "@/lib/providerCategories";
import styles from "@/components/console/Console.module.scss";
import biz from "./page.module.scss";

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
  approved: boolean;
  verified: boolean;
  memberSince: number;
};

type Form = {
  name: string;
  category: ProviderCategory | "";
  descriptionEn: string;
  descriptionEs: string;
  website: string;
  email: string;
  phone: string;
  location: string;
  logoUrl: string;
};

const EMPTY: Form = {
  name: "",
  category: "",
  descriptionEn: "",
  descriptionEs: "",
  website: "",
  email: "",
  phone: "",
  location: "",
  logoUrl: "",
};

const MESSAGES: Record<string, Record<string, string>> = {
  name: { required: "Enter the business name." },
  category: { invalid: "Choose a category." },
  descriptionEn: { required: "Write the English description." },
  descriptionEs: { required: "Write the Spanish description." },
  email: { invalid: "Enter a valid email address." },
  website: { invalid: "Enter a valid web address, e.g. yourfirm.cr" },
  logoUrl: { invalid: "Upload an image or paste a link that starts with https://" },
};

function toForm(p: OwnProvider): Form {
  return {
    name: p.name,
    category: p.category,
    descriptionEn: p.descriptionEn,
    descriptionEs: p.descriptionEs,
    website: p.website ?? "",
    email: p.email ?? "",
    phone: p.phone ?? "",
    location: p.location ?? "",
    logoUrl: p.logoUrl ?? "",
  };
}

// "My businesses": the member's listings. Saving keeps you on the business you
// saved (it never resets to an empty "Add" form), fields you empty are really
// removed, and the same business can't be created twice.
export default function BusinessesPage() {
  const session = useSession();
  const [providers, setProviders] = useState<OwnProvider[] | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saved, setSaved] = useState<Form>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ kind: "notice" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  // Guards against a double-click firing two saves before the button disables.
  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const load = useCallback(async (): Promise<OwnProvider[]> => {
    const res = await fetch("/api/member/providers", { cache: "no-store" });
    if (!res.ok) {
      setProviders([]);
      setMessage({ kind: "error", text: "Couldn't load your businesses. Refresh to try again." });
      return [];
    }
    const list = ((await res.json()).providers as OwnProvider[]) ?? [];
    setProviders(list);
    return list;
  }, []);

  useEffect(() => {
    if (session.status !== "member") return;
    void load().then((list) => {
      // Open the first business straight away: most members have one.
      const wanted = new URLSearchParams(window.location.search).get("provider");
      const first = list.find((p) => p.id === wanted) ?? list[0];
      if (first) open(first);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.status, load]);

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  function open(p: OwnProvider) {
    const f = toForm(p);
    setEditingId(p.id);
    setForm(f);
    setSaved(f);
    setErrors({});
  }

  function startNew() {
    setEditingId(null);
    setForm(EMPTY);
    setSaved(EMPTY);
    setErrors({});
    setMessage(null);
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLInputElement>("input")?.focus());
  }

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const creating = editingId === null;
      const res = await fetch(creating ? "/api/member/providers" : `/api/member/providers/${editingId}`, {
        method: creating ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        // Empty strings are sent as-is: the server removes fields left empty.
        body: JSON.stringify(form),
      });
      const body = (await res.json().catch(() => null)) as {
        errors?: Record<string, string>;
        provider?: { id: string; name: string };
      } | null;

      if (res.status === 409 && body?.provider) {
        const list = await load();
        const existing = list.find((p) => p.id === body.provider!.id);
        if (existing) open(existing);
        setMessage({
          kind: "notice",
          text: `You already have “${body.provider.name}”. It's open below so you can edit it instead of creating a copy.`,
        });
        return;
      }
      if (res.status === 422 && body?.errors) {
        setErrors(body.errors);
        setMessage({ kind: "error", text: "Some fields need attention." });
        requestAnimationFrame(() =>
          formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
        );
        return;
      }
      if (!res.ok) {
        setMessage({ kind: "error", text: "Save failed. Your changes are still here; try again." });
        return;
      }

      const list = await load();
      const id = creating ? body?.provider?.id : editingId;
      const fresh = list.find((p) => p.id === id);
      if (fresh) open(fresh);
      setMessage({
        kind: "notice",
        text: creating ? `“${form.name}” is live in the directory.` : "Changes saved.",
      });
    } catch {
      setMessage({ kind: "error", text: "Save failed. Check your connection; your changes are still here." });
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function remove(p: OwnProvider) {
    if (!window.confirm(`Delete “${p.name}”? Its profile, reviews and verification are removed. This cannot be undone.`)) return;
    const res = await fetch(`/api/member/providers/${p.id}`, { method: "DELETE" });
    if (!res.ok) {
      setMessage({ kind: "error", text: "Delete failed. Try again." });
      return;
    }
    const list = await load();
    if (editingId === p.id) (list[0] ? open(list[0]) : startNew());
    setMessage({ kind: "notice", text: `“${p.name}” was deleted.` });
  }

  const gate = <ConsoleGate session={session} role="member" />;
  if (session.status !== "member") return gate;

  const current = providers?.find((p) => p.id === editingId) ?? null;
  const err = (key: keyof Form) => {
    const code = errors[key];
    if (!code) return null;
    return (
      <p className={styles.fieldError} id={`err-${key}`}>
        {MESSAGES[key]?.[code] ?? "Check this field."}
      </p>
    );
  };
  const inv = (key: keyof Form) =>
    errors[key] ? { "aria-invalid": true as const, "aria-describedby": `err-${key}` } : {};

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Directory listing</p>
            <h1 className={styles.title}>My businesses</h1>
            <p className={styles.subtitle}>What investors see on your public profile. Changes go live when you save.</p>
          </div>
          <div className={styles.actions}>
            <ModuleGuide area="member" id="businesses" />
          </div>
        </header>

        {message ? (
          <p className={styles[message.kind]} role={message.kind === "error" ? "alert" : "status"}>
            {message.text}
          </p>
        ) : null}

        <div className={biz.columns}>
          <section className={styles.card} aria-labelledby="list-title">
            <div className={styles.cardHead}>
              <h2 id="list-title" className={styles.cardTitle}>Your listings</h2>
              <button type="button" className={styles.small} onClick={startNew}>
                + Add
              </button>
            </div>
            {providers === null ? (
              <p className={styles.hint}>Loading…</p>
            ) : providers.length === 0 ? (
              <p className={styles.empty}>No businesses yet. Fill in the form to list your first one.</p>
            ) : (
              <ul className={biz.list}>
                {providers.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className={`${biz.item} ${p.id === editingId ? biz.itemOn : ""}`}
                      aria-current={p.id === editingId ? "true" : undefined}
                      onClick={() => {
                        if (dirty && !window.confirm("Discard your unsaved changes?")) return;
                        open(p);
                        setMessage(null);
                      }}
                    >
                      <span className={biz.itemName}>{p.name}</span>
                      <span className={biz.itemMeta}>
                        {PROVIDER_CATEGORY_LABELS[p.category].en}
                        {p.verified ? " · ✓ Verified" : ""}
                      </span>
                      <StatusBadge tone={p.approved ? "good" : "warn"}>{p.approved ? "Live" : "Hidden"}</StatusBadge>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.card} aria-labelledby="form-title">
            <div className={styles.cardHead}>
              <h2 id="form-title" className={styles.cardTitle}>
                {editingId === null ? "New business" : form.name || "Edit business"}
              </h2>
              {current?.approved ? (
                <Link href={`/en/directory/${current.id}`} target="_blank" className={styles.small}>
                  View public profile ↗
                </Link>
              ) : null}
            </div>

            {current && !current.approved ? (
              <p className={styles.warn}>
                CR-CIPI has hidden this listing from the directory. Write to the Chamber if you think this is a mistake.
              </p>
            ) : null}
            {current?.verified ? (
              <p className={styles.hint} style={{ marginBottom: "1rem" }}>
                This business is verified. Keep the name matching your legal registration.
              </p>
            ) : null}

            <form ref={formRef} className={styles.form} onSubmit={save} noValidate>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="b-name">Business name</label>
                  <input id="b-name" className={styles.input} value={form.name} autoComplete="organization"
                    onChange={(e) => set("name", e.target.value)} {...inv("name")} />
                  {err("name")}
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="b-category">Category</label>
                  <select id="b-category" className={styles.input} value={form.category}
                    onChange={(e) => set("category", e.target.value as ProviderCategory)} {...inv("category")}>
                    <option value="" disabled>Choose a category…</option>
                    {PROVIDER_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {PROVIDER_CATEGORY_LABELS[c].en} / {PROVIDER_CATEGORY_LABELS[c].es}
                      </option>
                    ))}
                  </select>
                  {err("category")}
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="b-en">Description (English)</label>
                  <textarea id="b-en" className={styles.input} rows={5} value={form.descriptionEn}
                    onChange={(e) => set("descriptionEn", e.target.value)} {...inv("descriptionEn")} />
                  {err("descriptionEn")}
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="b-es">Descripción (Español)</label>
                  <textarea id="b-es" className={styles.input} rows={5} value={form.descriptionEs}
                    onChange={(e) => set("descriptionEs", e.target.value)} {...inv("descriptionEs")} />
                  {err("descriptionEs")}
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="b-web">Website</label>
                  <input id="b-web" className={styles.input} value={form.website} inputMode="url" placeholder="yourfirm.cr"
                    onChange={(e) => set("website", e.target.value)} {...inv("website")} />
                  {err("website")}
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="b-email">Email for consultation requests</label>
                  <input id="b-email" className={styles.input} type="email" value={form.email}
                    onChange={(e) => set("email", e.target.value)} {...inv("email")} />
                  {err("email")}
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="b-phone">Phone</label>
                  <input id="b-phone" className={styles.input} type="tel" value={form.phone} autoComplete="tel"
                    onChange={(e) => set("phone", e.target.value)} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="b-loc">Location</label>
                  <input id="b-loc" className={styles.input} value={form.location} placeholder="Escazú, San José"
                    onChange={(e) => set("location", e.target.value)} />
                </div>
              </div>

              <fieldset className={`${styles.field} ${biz.logo}`}>
                <legend className={styles.label}>Logo</legend>
                <div className={biz.logoRow}>
                  <span className={biz.preview} aria-hidden="true">
                    {form.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.logoUrl} alt="" />
                    ) : (
                      <span>{form.name.slice(0, 1).toUpperCase() || "?"}</span>
                    )}
                  </span>
                  <div className={biz.logoControls}>
                    <FileUpload kind="image" label="Upload a logo (JPG, PNG or WebP, max 5 MB)"
                      accept="image/png,image/jpeg,image/webp"
                      onUploaded={(file) => file.url && set("logoUrl", file.url)} />
                    {form.logoUrl.startsWith("/api/media/") ? (
                      <p className={styles.help}>Uploaded image in use.</p>
                    ) : (
                      <>
                        <label className={styles.help} htmlFor="b-logo">…or paste a link</label>
                        <input id="b-logo" className={styles.input} value={form.logoUrl} placeholder="https://"
                          onChange={(e) => set("logoUrl", e.target.value)} {...inv("logoUrl")} />
                      </>
                    )}
                    {form.logoUrl ? (
                      <button type="button" className={styles.small} onClick={() => set("logoUrl", "")}>
                        Remove logo
                      </button>
                    ) : null}
                  </div>
                </div>
                {err("logoUrl")}
              </fieldset>

              <div className={styles.actions}>
                <button type="submit" className={styles.primary} disabled={busy || (!dirty && editingId !== null)}>
                  {busy ? "Saving…" : editingId === null ? "Publish business" : "Save changes"}
                </button>
                {dirty && editingId !== null ? (
                  <button type="button" className={styles.ghost} onClick={() => setForm(saved)}>
                    Undo changes
                  </button>
                ) : null}
                {!dirty && editingId !== null ? <span className={styles.hint}>All changes saved.</span> : null}
                {current ? (
                  <button type="button" className={`${styles.danger} ${biz.delete}`} onClick={() => void remove(current)}>
                    Delete business
                  </button>
                ) : null}
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
