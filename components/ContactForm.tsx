"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import type { Locale } from "@/content/types";
import { CONTACT_COPY, NEED_LABELS, TIMELINE_LABELS } from "@/lib/leadCopy";
import styles from "./ContactForm.module.scss";

const NEEDS = Object.keys(NEED_LABELS) as (keyof typeof NEED_LABELS)[];
const TIMELINES = Object.keys(TIMELINE_LABELS) as (keyof typeof TIMELINE_LABELS)[];

type Errors = Partial<Record<"name" | "email" | "need" | "timeline" | "message" | "consent", string>>;

// Consultation request: a letter of introduction to one member. One form,
// no account. Needs and timelines are chips so the whole thing works with
// thumbs; the letter folds into a sealed envelope on success.
export default function ContactForm({
  providerId,
  providerName,
  locale,
  privacyHref,
}: {
  providerId: string;
  providerName: string;
  locale: Locale;
  privacyHref: string;
}) {
  const copy = CONTACT_COPY[locale];
  const uid = useId();
  const [need, setNeed] = useState<string>("");
  const [timeline, setTimeline] = useState<string>("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const formRef = useRef<HTMLFormElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);

  function validate(form: FormData): Errors {
    const next: Errors = {};
    if (!need) next.need = copy.errors.need;
    if (!timeline) next.timeline = copy.errors.timeline;
    if (!String(form.get("name") ?? "").trim()) next.name = copy.errors.name;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(form.get("email") ?? "").trim())) next.email = copy.errors.email;
    if (String(form.get("message") ?? "").trim().length < 10) next.message = copy.errors.message;
    if (!consent) next.consent = copy.errors.consent;
    return next;
  }

  function focusFirst(errs: Errors) {
    const first = (["need", "timeline", "name", "email", "message", "consent"] as const).find((k) => errs[k]);
    if (!first) return;
    formRef.current?.querySelector<HTMLElement>(`[data-field="${first}"]`)?.focus();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const errs = validate(form);
    setErrors(errs);
    setBanner(null);
    if (Object.keys(errs).length) {
      focusFirst(errs);
      return;
    }
    setState("sending");
    try {
      const res = await fetch(`/api/providers/${providerId}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          country: form.get("country"),
          message: form.get("message"),
          company: form.get("company"),
          need,
          timeline,
          consent,
          locale,
          source: "profile",
        }),
      });
      if (res.ok) {
        setState("sent");
        requestAnimationFrame(() => doneRef.current?.focus());
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { errors?: Record<string, string> };
      if (res.status === 422 && body.errors) {
        const mapped: Errors = {};
        for (const key of Object.keys(body.errors) as (keyof Errors)[]) {
          if (key in copy.errors) mapped[key] = copy.errors[key];
        }
        setErrors(mapped);
        focusFirst(mapped);
      } else {
        setBanner(res.status === 429 ? copy.errors.rate : copy.errors.generic);
      }
    } catch {
      setBanner(copy.errors.generic);
    }
    setState("idle");
  }

  if (state === "sent") {
    return (
      <div className={styles.letter}>
        <div className={styles.done} ref={doneRef} tabIndex={-1} role="status">
          <span className={styles.envelope} aria-hidden="true">
            <svg viewBox="0 0 64 44" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="1" y="1" width="62" height="42" rx="2" />
              <path d="M1 3l31 22L63 3" />
            </svg>
          </span>
          <h2 className={styles.title}>{copy.successTitle}</h2>
          <p className={styles.body}>{copy.successBody(providerName)}</p>
        </div>
      </div>
    );
  }

  const err = (key: keyof Errors) =>
    errors[key] ? (
      <p className={styles.error} id={`${uid}-${key}-err`}>
        {errors[key]}
      </p>
    ) : null;
  const described = (key: keyof Errors, hint?: string) =>
    [errors[key] ? `${uid}-${key}-err` : "", hint ?? ""].filter(Boolean).join(" ") || undefined;

  return (
    <div className={styles.letter}>
      <p className={styles.to}>
        <span>{locale === "en" ? "To" : "Para"}</span> {providerName}
      </p>
      <h2 className={styles.title}>{copy.heading}</h2>
      <p className={styles.body}>{copy.intro}</p>

      <form ref={formRef} className={styles.form} onSubmit={submit} noValidate>
        {banner ? (
          <p className={styles.banner} role="alert">
            {banner}
          </p>
        ) : null}

        <fieldset className={styles.fieldset} aria-describedby={described("need")}>
          <legend className={styles.legend}>{copy.need}</legend>
          <div className={styles.chips}>
            {NEEDS.map((key, i) => (
              <button
                key={key}
                type="button"
                data-field={i === 0 ? "need" : undefined}
                className={`${styles.chip} ${need === key ? styles.chipOn : ""}`}
                aria-pressed={need === key}
                onClick={() => setNeed(key)}
              >
                {NEED_LABELS[key][locale]}
              </button>
            ))}
          </div>
          {err("need")}
        </fieldset>

        <fieldset className={styles.fieldset} aria-describedby={described("timeline")}>
          <legend className={styles.legend}>{copy.timeline}</legend>
          <div className={styles.chips}>
            {TIMELINES.map((key, i) => (
              <button
                key={key}
                type="button"
                data-field={i === 0 ? "timeline" : undefined}
                className={`${styles.chip} ${timeline === key ? styles.chipOn : ""}`}
                aria-pressed={timeline === key}
                onClick={() => setTimeline(key)}
              >
                {TIMELINE_LABELS[key][locale]}
              </button>
            ))}
          </div>
          {err("timeline")}
        </fieldset>

        {(
          [
            ["name", copy.name, "text", "name"],
            ["email", copy.email, "email", "email"],
            ["country", copy.country, "text", "country-name"],
          ] as const
        ).map(([key, label, type, auto]) => (
          <div className={styles.field} key={key}>
            <div className={styles.float}>
              <input
                id={`${uid}-${key}`}
                name={key}
                type={type}
                autoComplete={auto}
                placeholder=" "
                data-field={key}
                className={styles.input}
                aria-invalid={key !== "country" && errors[key] ? true : undefined}
                aria-describedby={key !== "country" ? described(key) : undefined}
                required={key !== "country"}
              />
              <label htmlFor={`${uid}-${key}`} className={styles.label}>
                {label}
              </label>
            </div>
            {key !== "country" ? err(key) : null}
          </div>
        ))}

        <div className={styles.field}>
          <div className={styles.float}>
            <textarea
              id={`${uid}-message`}
              name="message"
              rows={4}
              placeholder=" "
              data-field="message"
              className={`${styles.input} ${styles.textarea}`}
              aria-invalid={errors.message ? true : undefined}
              aria-describedby={described("message", `${uid}-message-hint`)}
              required
            />
            <label htmlFor={`${uid}-message`} className={styles.label}>
              {copy.message}
            </label>
          </div>
          <p className={styles.hint} id={`${uid}-message-hint`}>
            {copy.messageHint}
          </p>
          {err("message")}
        </div>

        {/* Honeypot: hidden from people and assistive tech. */}
        <div className={styles.trap} aria-hidden="true">
          <label>
            Company
            <input name="company" tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        <div className={styles.field}>
          <label className={styles.consent}>
            <input
              type="checkbox"
              checked={consent}
              data-field="consent"
              onChange={(e) => setConsent(e.target.checked)}
              aria-invalid={errors.consent ? true : undefined}
              aria-describedby={described("consent")}
            />
            <span>
              {copy.consent}{" "}
              <a href={privacyHref} target="_blank" rel="noopener noreferrer">
                {copy.privacy}
              </a>
            </span>
          </label>
          {err("consent")}
        </div>

        <button type="submit" className={`btn btn--primary ${styles.submit}`} disabled={state === "sending"}>
          {state === "sending" ? copy.sending : copy.submit}
          <span className="btn__arrow" aria-hidden="true">→</span>
        </button>
      </form>
    </div>
  );
}
