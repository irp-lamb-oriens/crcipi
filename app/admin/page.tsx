"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.scss";

type Stage = "email" | "code";

// Admin sign-in page: email-code (passwordless) auth.
export default function AdminPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentNotice, setSentNotice] = useState(false);

  // If already authed, go straight to the site.
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: { authed: boolean }) => {
        if (data.authed) router.push("/en");
      })
      .catch(() => {});
  }, [router]);

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error === "invalid_email" ? "Enter a valid email." : "Something went wrong.");
        setBusy(false);
        return;
      }
      setSentNotice(true);
      setStage("code");
      setBusy(false);
    } catch {
      setError("Network error. Try again.");
      setBusy(false);
    }
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(
          data.error === "invalid_code"
            ? "Wrong code."
            : data.error === "expired"
              ? "Code expired. Request a new one."
              : "Could not verify the code."
        );
        setBusy(false);
        return;
      }
      router.push("/en");
    } catch {
      setError("Network error. Try again.");
      setBusy(false);
    }
  }

  const back = () => {
    setStage("email");
    setCode("");
    setError(null);
    setSentNotice(false);
  };

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <h1 className={styles.title}>CR-CIPI admin</h1>

        {stage === "email" ? (
          <form onSubmit={requestCode} className={styles.form}>
            <label className={styles.label} htmlFor="email">
              Admin email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="you@example.com"
            />
            {error ? <p className={styles.error}>{error}</p> : null}
            <button type="submit" className={styles.button} disabled={busy}>
              {busy ? "Sending\u2026" : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className={styles.form}>
            <p className={styles.notice}>
              Code sent to <strong>{email}</strong>. Check your inbox.
            </p>
            <label className={styles.label} htmlFor="code">
              6-digit code
            </label>
            <input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className={styles.input}
              placeholder="000000"
            />
            {sentNotice ? (
              <p className={styles.notice} role="status">
                If that email is authorized, a code is on its way.
              </p>
            ) : null}
            {error ? <p className={styles.error}>{error}</p> : null}
            <button type="submit" className={styles.button} disabled={busy}>
              {busy ? "Verifying\u2026" : "Verify code"}
            </button>
            <button type="button" className={styles.link} onClick={back}>
              Use a different email
            </button>
          </form>
        )}
      </div>
    </main>
  );
}