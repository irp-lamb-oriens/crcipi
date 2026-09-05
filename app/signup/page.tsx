"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.scss";

type Stage = "details" | "code";

// Member sign-up: create an account with a name and email, then verify the
// emailed code. This creates a member account (not an admin). After verifying,
// the member is sent to their own dashboard.
export default function SignupPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in? Go to the account area.
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: { authed: boolean }) => {
        if (data.authed) router.push("/account");
      })
      .catch(() => {});
  }, [router]);

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(
          data.error === "invalid_email"
            ? "Enter a valid email."
            : data.error === "name_required"
              ? "Enter your name."
              : "Something went wrong."
        );
        setBusy(false);
        return;
      }
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
      router.push("/account");
    } catch {
      setError("Network error. Try again.");
      setBusy(false);
    }
  }

  const back = () => {
    setStage("details");
    setCode("");
    setError(null);
  };

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <h1 className={styles.title}>Register your business</h1>

        {stage === "details" ? (
          <form onSubmit={requestCode} className={styles.form}>
            <label className={styles.label} htmlFor="name">
              Your name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={styles.input}
              placeholder="Your name"
            />
            <label className={styles.label} htmlFor="email">
              Email
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
              {busy ? "Sending\u2026" : "Create account"}
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
            {error ? <p className={styles.error}>{error}</p> : null}
            <button type="submit" className={styles.button} disabled={busy}>
              {busy ? "Verifying\u2026" : "Verify code"}
            </button>
            <button type="button" className={styles.link} onClick={back}>
              Use different details
            </button>
          </form>
        )}
      </div>
    </main>
  );
}