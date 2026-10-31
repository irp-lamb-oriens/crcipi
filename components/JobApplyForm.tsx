"use client";

import { useState } from "react";
import Link from "next/link";
import type { JobsContent, Locale } from "@/content/types";
import styles from "./JobApplyForm.module.scss";

export default function JobApplyForm({
  jobId,
  locale,
  copy,
  privacyLabel,
  pass,
}: {
  jobId: string;
  locale: Locale;
  copy: JobsContent["apply"];
  privacyLabel: string;
  /** Boarding-pass stub: what this application is for. */
  pass: { role: string; company: string; destination: string };
}) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    form.set("consent", form.get("consent") ? "true" : "false");
    setState("sending");
    try {
      const res = await fetch(`/api/jobs/${jobId}/apply`, { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setState("sent");
        return;
      }
      setState("idle");
      const errors = (data?.errors ?? {}) as Record<string, string>;
      if (res.status === 429) setError(copy.errorRateLimited);
      else if (errors.cv) setError(copy.errorCv);
      else if (errors.email) setError(copy.errorEmail);
      else if (errors.message) setError(copy.errorMessage);
      else if (Object.keys(errors).length > 0) setError(copy.errorRequired);
      else setError(copy.errorGeneric);
    } catch {
      setState("idle");
      setError(copy.errorGeneric);
    }
  }

  if (state === "sent") {
    return (
      <div className={styles.panel} id="apply">
      <div className={styles.stub} aria-hidden="true">
        <span className={styles.stubBrand}>CR-CIPI · {locale === "en" ? "Boarding pass" : "Pase de abordar"}</span>
        <span className={styles.stubRoute}>
          <span>
            <small>{locale === "en" ? "From" : "Desde"}</small>
            {locale === "en" ? "You" : "Usted"}
          </span>
          <span className={styles.stubPlane}>→</span>
          <span>
            <small>{locale === "en" ? "To" : "Hacia"}</small>
            {pass.company}
          </span>
        </span>
        <span className={styles.stubMeta}>
          {pass.role} · {pass.destination}
        </span>
      </div>
        <h2 className={styles.panelTitle}>{copy.heading}</h2>
        <p className={styles.success} role="status" style={{ marginTop: "1rem" }}>{copy.success}</p>
      </div>
    );
  }

  return (
    <div className={styles.panel} id="apply">
      <div className={styles.stub} aria-hidden="true">
        <span className={styles.stubBrand}>CR-CIPI · {locale === "en" ? "Boarding pass" : "Pase de abordar"}</span>
        <span className={styles.stubRoute}>
          <span>
            <small>{locale === "en" ? "From" : "Desde"}</small>
            {locale === "en" ? "You" : "Usted"}
          </span>
          <span className={styles.stubPlane}>→</span>
          <span>
            <small>{locale === "en" ? "To" : "Hacia"}</small>
            {pass.company}
          </span>
        </span>
        <span className={styles.stubMeta}>
          {pass.role} · {pass.destination}
        </span>
      </div>
      <h2 className={styles.panelTitle}>{copy.heading}</h2>
      <p className={styles.hint}>{copy.intro}</p>
      <form className={styles.form} onSubmit={(e) => void submit(e)} noValidate>
        <div className={styles.field}>
          <label htmlFor="a-name">{copy.name} *</label>
          <input id="a-name" name="name" required autoComplete="name" maxLength={120} />
        </div>
        <div className={styles.field}>
          <label htmlFor="a-email">{copy.email} *</label>
          <input id="a-email" name="email" type="email" required autoComplete="email" maxLength={254} />
        </div>
        <div className={styles.field}>
          <label htmlFor="a-phone">{copy.phone}</label>
          <input id="a-phone" name="phone" type="tel" autoComplete="tel" maxLength={40} />
        </div>
        <div className={styles.field}>
          <label htmlFor="a-linkedin">{copy.linkedin}</label>
          <input id="a-linkedin" name="linkedin" maxLength={300} />
        </div>
        <div className={styles.field}>
          <label htmlFor="a-message">{copy.message} *</label>
          <textarea id="a-message" name="message" rows={5} required minLength={20} maxLength={4000} />
          <span className={styles.hint}>{copy.messageHint}</span>
        </div>
        <div className={styles.field}>
          <label htmlFor="a-cv">{copy.cv}</label>
          <input id="a-cv" name="cv" type="file" accept="application/pdf,image/jpeg,image/png" />
          <span className={styles.hint}>{copy.cvHint}</span>
        </div>
        <div className={styles.honeypot} aria-hidden="true">
          <label htmlFor="a-website">Website</label>
          <input id="a-website" name="website" tabIndex={-1} autoComplete="off" />
        </div>
        <label className={styles.check}>
          <input type="checkbox" name="consent" required />
          <span>
            {copy.consent}{" "}
            <Link href={locale === "en" ? "/en/privacy" : "/es/privacidad"} target="_blank">
              {privacyLabel}
            </Link>
          </span>
        </label>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <button type="submit" className={`btn btn--primary ${styles.submit}`} disabled={state === "sending"}>
          {state === "sending" ? copy.submitting : copy.submit}
        </button>
      </form>
    </div>
  );
}
