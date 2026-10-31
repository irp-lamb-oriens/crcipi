"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Seal from "@/components/brand/Seal";
import logo from "@/app/logo.png";
import styles from "./page.module.scss";

type Stage = "email" | "code";
type Lang = "en" | "es";

const RESEND_SECONDS = 30;

const T = {
  en: {
    side: "Members of CR-CIPI sign in with a one-time code. No passwords to remember, none to leak.",
    title: "Sign in",
    lead: "Enter the email you registered with. We'll send you a 6-digit code.",
    email: "Work email",
    send: "Email me a code",
    sending: "Sending…",
    codeTitle: "Check your inbox",
    codeLead: (e: string) => `We sent a 6-digit code to ${e}. It expires in 10 minutes.`,
    code: "6-digit code",
    verify: "Sign in",
    verifying: "Checking…",
    resendIn: (s: number) => `Resend code in ${s}s`,
    resend: "Resend code",
    resent: "A new code is on its way.",
    other: "Use a different email",
    noAccount: "No account yet?",
    join: "Join CR-CIPI",
    errInvalidEmail: "Enter a valid email address.",
    errWrong: "That code doesn't match. Check the latest email and try again.",
    errExpired: "That code expired. Send a new one.",
    errMany: "Too many attempts. Request a new code.",
    errNetwork: "Connection problem. Try again.",
    errGeneric: "Something went wrong. Try again.",
    back: "Back to the site",
  },
  es: {
    side: "Los miembros de CR-CIPI ingresan con un código de un solo uso. Sin contraseñas que recordar ni filtrar.",
    title: "Iniciar sesión",
    lead: "Ingrese el correo con el que se registró. Le enviaremos un código de 6 dígitos.",
    email: "Correo de trabajo",
    send: "Enviarme un código",
    sending: "Enviando…",
    codeTitle: "Revise su correo",
    codeLead: (e: string) => `Enviamos un código de 6 dígitos a ${e}. Vence en 10 minutos.`,
    code: "Código de 6 dígitos",
    verify: "Ingresar",
    verifying: "Verificando…",
    resendIn: (s: number) => `Reenviar código en ${s}s`,
    resend: "Reenviar código",
    resent: "Le enviamos un código nuevo.",
    other: "Usar otro correo",
    noAccount: "¿Aún no tiene cuenta?",
    join: "Únase a CR-CIPI",
    errInvalidEmail: "Ingrese un correo válido.",
    errWrong: "El código no coincide. Revise el correo más reciente e intente de nuevo.",
    errExpired: "El código venció. Solicite uno nuevo.",
    errMany: "Demasiados intentos. Solicite un código nuevo.",
    errNetwork: "Problema de conexión. Intente de nuevo.",
    errGeneric: "Algo salió mal. Intente de nuevo.",
    back: "Volver al sitio",
  },
};

// One sign-in for members and admins (neutral wording, role decides the
// landing). The code is ONE input (autofill, paste and screen readers all
// work) drawn as six slots; it submits by itself on the sixth digit.
export default function SignInPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("en");
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);
  const t = T[lang];

  useEffect(() => {
    if (navigator.language?.toLowerCase().startsWith("es") || document.referrer.includes("/es")) setLang("es");
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: { authed: boolean; role: string | null }) => {
        if (data.authed) router.replace(data.role === "admin" ? "/admin/dashboard" : "/account");
      })
      .catch(() => {});
  }, [router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const sendCode = useCallback(async () => {
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
        setError(data.error === "invalid_email" ? t.errInvalidEmail : t.errGeneric);
        return false;
      }
      if (data.needsSignup) {
        router.push(lang === "es" ? "/es/unete" : "/en/join");
        return false;
      }
      setCooldown(RESEND_SECONDS);
      return true;
    } catch {
      setError(t.errNetwork);
      return false;
    } finally {
      setBusy(false);
    }
  }, [email, lang, router, t]);

  async function onEmail(event: React.FormEvent) {
    event.preventDefault();
    if (await sendCode()) {
      setStage("code");
      setTimeout(() => codeRef.current?.focus(), 50);
    }
  }

  async function verify(value: string) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: value }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(
          data.error === "expired" ? t.errExpired : data.error === "too_many_attempts" ? t.errMany : data.error === "rate_limited" ? t.errMany : t.errWrong
        );
        setCode("");
        codeRef.current?.focus();
        return;
      }
      router.replace(data.role === "admin" ? "/admin/dashboard" : "/account");
    } catch {
      setError(t.errNetwork);
    } finally {
      setBusy(false);
    }
  }

  function onCode(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    setError(null);
    if (digits.length === 6 && !busy) void verify(digits);
  }

  return (
    <main className={styles.main} lang={lang}>
      <aside className={styles.side}>
        <Link href={lang === "es" ? "/es" : "/en"} className={styles.home}>
          <Image src={logo} alt="CR-CIPI" className={styles.logo} priority />
        </Link>
        <Seal id="signin" size="lg" tone="on-dark" spin={false} className={styles.seal} label="" />
        <p className={styles.sideText}>{t.side}</p>
      </aside>

      <section className={styles.panel}>
        <div className={styles.topbar}>
          <Link href={lang === "es" ? "/es" : "/en"} className={styles.back}>
            ← {t.back}
          </Link>
          <div className={styles.lang} role="group" aria-label="Language">
            {(["en", "es"] as const).map((l) => (
              <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.body}>
          {stage === "email" ? (
            <form onSubmit={onEmail} className={styles.form} noValidate>
              <p className="eyebrow">01 / 02</p>
              <h1 className={styles.title}>{t.title}</h1>
              <p className={styles.lead}>{t.lead}</p>
              <label className={styles.label} htmlFor="email">
                {t.email}
              </label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                placeholder="you@company.cr"
                aria-invalid={!!error}
                aria-describedby={error ? "auth-error" : undefined}
              />
              {error ? (
                <p id="auth-error" className={styles.error} role="alert">
                  {error}
                </p>
              ) : null}
              <button type="submit" className={`btn btn--primary ${styles.submit}`} disabled={busy || !email}>
                {busy ? t.sending : t.send}
                <span className="btn__arrow" aria-hidden="true">→</span>
              </button>
              <p className={styles.alt}>
                {t.noAccount} <Link href={lang === "es" ? "/es/unete" : "/en/join"}>{t.join}</Link>
              </p>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (code.length === 6) void verify(code);
              }}
              className={styles.form}
              noValidate
            >
              <p className="eyebrow">02 / 02</p>
              <h1 className={styles.title}>{t.codeTitle}</h1>
              <p className={styles.lead}>{t.codeLead(email)}</p>
              <label className={styles.label} htmlFor="code">
                {t.code}
              </label>
              <div className={styles.otp}>
                <input
                  ref={codeRef}
                  id="code"
                  className={styles.otpInput}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => onCode(e.target.value)}
                  aria-invalid={!!error}
                  aria-describedby={error ? "auth-error" : undefined}
                  disabled={busy}
                />
                <div className={styles.slots} aria-hidden="true">
                  {Array.from({ length: 6 }, (_, i) => (
                    <span
                      key={i}
                      className={`${styles.slot} ${code[i] ? styles.filled : ""} ${i === code.length ? styles.caret : ""} ${error ? styles.bad : ""}`}
                    >
                      {code[i] ?? ""}
                    </span>
                  ))}
                </div>
              </div>
              {error ? (
                <p id="auth-error" className={styles.error} role="alert">
                  {error}
                </p>
              ) : null}
              {notice ? (
                <p className={styles.notice} role="status">
                  {notice}
                </p>
              ) : null}
              <button type="submit" className={`btn btn--primary ${styles.submit}`} disabled={busy || code.length < 6}>
                {busy ? t.verifying : t.verify}
              </button>
              <div className={styles.row}>
                <button
                  type="button"
                  className={styles.linkBtn}
                  disabled={cooldown > 0 || busy}
                  onClick={async () => {
                    setNotice(null);
                    if (await sendCode()) setNotice(t.resent);
                  }}
                >
                  {cooldown > 0 ? t.resendIn(cooldown) : t.resend}
                </button>
                <button
                  type="button"
                  className={styles.linkBtn}
                  onClick={() => {
                    setStage("email");
                    setCode("");
                    setError(null);
                    setNotice(null);
                  }}
                >
                  {t.other}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
