"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import type { DirectoryContent } from "@/content/types";
import styles from "./ReviewModal.module.scss";

type Step = "identity" | "code" | "form" | "success";

interface Props {
  providerId: string;
  providerName: string;
  copy: DirectoryContent["rating"];
  onClose: () => void;
  onSubmitted: (average: number | null, count: number) => void;
}

export default function ReviewModal({
  providerId,
  providerName,
  copy,
  onClose,
  onSubmitted,
}: Props) {
  const [step, setStep] = useState<Step>("identity");
  const [dir, setDir] = useState<1 | -1>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [already, setAlready] = useState(false);
  const [newsletter, setNewsletter] = useState<"idle" | "saving" | "done">("idle");

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  // Modal contract: focus inside, Escape closes, page behind is inert and
  // does not scroll, focus returns to the trigger on close.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    nameRef.current?.focus();
    const main = document.getElementById("main");
    const header = document.querySelector<HTMLElement>("header");
    [main, header].forEach((el) => el && (el.inert = true));
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      [main, header].forEach((el) => el && (el.inert = false));
      document.documentElement.style.overflow = "";
      trigger?.focus();
    };
  }, []);

  function advance(next: Step) {
    setDir(1);
    setStep(next);
  }

  function back(next: Step) {
    setDir(-1);
    setStep(next);
  }

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError(copy.errors.name);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(copy.errors.email);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId, email: email.trim() }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(copy.errors.generic);
        return;
      }
      advance("code");
      setTimeout(() => codeRef.current?.focus(), 30);
    } catch {
      setError(copy.errors.generic);
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError(copy.errors.code);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId, email: email.trim(), code }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error === "expired" ? copy.errors.code : copy.errors.code);
        return;
      }
      setToken(data.token);
      if (data.existing) {
        setAlready(true);
        setRating(data.existing.rating);
        setComment(data.existing.comment ?? "");
      }
      advance("form");
    } catch {
      setError(copy.errors.generic);
    } finally {
      setBusy(false);
    }
  }

  async function submitReview(event: React.FormEvent) {
    event.preventDefault();
    if (rating < 1) {
      setError(copy.errors.rating);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId,
          token,
          email,
          name: name.trim(),
          rating,
          comment,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(copy.errors.generic);
        return;
      }
      onSubmitted(data.aggregate.average, data.aggregate.count);
      advance("success");
    } catch {
      setError(copy.errors.generic);
    } finally {
      setBusy(false);
    }
  }

  async function subscribeNewsletter() {
    setNewsletter("saving");
    try {
      await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      setNewsletter("done");
    } catch {
      setNewsletter("idle");
    }
  }

  // Portalled to <body> so no ancestor stacking context (sticky bars,
  // isolated rows) can paint over it.
  return createPortal(
    <div className={styles.overlay} onMouseDown={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={copy.heading}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
          ×
        </button>

        <div className={styles.head}>
          <h3 className={styles.title}>{copy.heading}</h3>
          <p className={styles.provider}>{providerName}</p>
        </div>

        <div key={step} className={`${styles.step} ${dir === 1 ? styles.stepEnt : styles.stepBack}`}>
          {step === "identity" ? (
            <form onSubmit={requestCode} className={styles.form} noValidate>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="r-name">{copy.nameLabel}</label>
                <input
                  id="r-name"
                  ref={nameRef}
                  className={styles.input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="r-email">{copy.emailLabel}</label>
                <input
                  id="r-email"
                  ref={emailRef}
                  type="email"
                  className={styles.input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <p className={styles.note}>{copy.emailNote}</p>
              </div>
              {error ? <p className={styles.error}>{error}</p> : null}
              <button type="submit" className={styles.primary} disabled={busy}>
                {busy ? copy.submitting : copy.sendCode}
              </button>
            </form>
          ) : null}

          {step === "code" ? (
            <form onSubmit={verifyCode} className={styles.form} noValidate>
              <p className={styles.note}>{copy.codeSent}</p>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="r-code">{copy.codeLabel}</label>
                <input
                  id="r-code"
                  ref={codeRef}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  className={styles.input}
                  value={code}
                  placeholder={copy.codePlaceholder}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                />
              </div>
              {error ? <p className={styles.error}>{error}</p> : null}
              <button type="submit" className={styles.primary} disabled={busy}>
                {busy ? copy.submitting : copy.verify}
              </button>
              <button type="button" className={styles.link} onClick={() => back("identity")}>
                ←
              </button>
            </form>
          ) : null}

          {step === "form" ? (
            <form onSubmit={submitReview} className={styles.form} noValidate>
              {already ? (
                <div className={styles.already}>
                  <p className={styles.alreadyTitle}>{copy.alreadyTitle}</p>
                  <p className={styles.note}>{copy.alreadyIntro}</p>
                </div>
              ) : null}

              <div className={styles.field}>
                <span className={styles.label}>{copy.ratingLabel}</span>
                <div className={styles.stars} role="radiogroup" aria-label={copy.ratingLabel}>
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={rating === v}
                      aria-label={`${v}`}
                      className={`${styles.star} ${v <= (hovered || rating) ? styles.starOn : ""}`}
                      onMouseEnter={() => setHovered(v)}
                      onMouseLeave={() => setHovered(0)}
                      onClick={() => setRating(v)}
                    >
                      <svg viewBox="0 0 24 24" width="26" height="26" fill={v <= (hovered || rating) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 3.5 14.6 9l6 .8-4.4 4.2 1.1 5.9L12 17l-5.3 2.9 1.1-5.9L3.4 9.8l6-.8L12 3.5z" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="r-comment">{copy.commentLabel}</label>
                <textarea
                  id="r-comment"
                  className={`${styles.input} ${styles.textarea}`}
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              {error ? <p className={styles.error}>{error}</p> : null}
              <button type="submit" className={styles.primary} disabled={busy}>
                {busy ? copy.submitting : already ? copy.changeReview : copy.submit}
              </button>
            </form>
          ) : null}

          {step === "success" ? (
            <div className={styles.success}>
              <div className={styles.check} aria-hidden="true">
                <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <p className={styles.successTitle}>{copy.success}</p>
              <p className={styles.note}>{copy.pending}</p>

              <div className={styles.newsletter}>
                <p className={styles.label}>{copy.newsletterPrompt}</p>
                {newsletter === "done" ? (
                  <p className={styles.note}>✓</p>
                ) : (
                  <button
                    type="button"
                    className={styles.primary}
                    onClick={() => void subscribeNewsletter()}
                    disabled={newsletter === "saving"}
                  >
                    {newsletter === "saving" ? copy.submitting : copy.newsletterYes}
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}