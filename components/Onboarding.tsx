"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { Locale } from "@/content/types";
import { PROVIDER_CATEGORIES, PROVIDER_CATEGORY_LABELS } from "@/lib/providerCategories";
import { useSession } from "@/components/console/useSession";
import OtpInput from "./OtpInput";
import styles from "./Onboarding.module.scss";

type Stage = "account" | "code" | "company" | "exists" | "profile" | "done";
type IdType = "juridica" | "fisica";

const LANGS = ["es", "en", "fr", "de", "pt", "it", "zh"] as const;
const LANG_LABELS: Record<(typeof LANGS)[number], Record<Locale, string>> = {
  es: { en: "Spanish", es: "Español" },
  en: { en: "English", es: "Inglés" },
  fr: { en: "French", es: "Francés" },
  de: { en: "German", es: "Alemán" },
  pt: { en: "Portuguese", es: "Portugués" },
  it: { en: "Italian", es: "Italiano" },
  zh: { en: "Chinese", es: "Chino" },
};

const COPY = {
  en: {
    tabs: ["Account", "Company", "Profile"],
    accountTitle: "Register your company",
    accountLead: "Three short steps, under three minutes. No password: you sign in with a code sent to your email.",
    name: "Full name",
    email: "Work email",
    terms: "I accept the terms of use and the privacy policy.",
    termsLinks: ["Terms", "Privacy"],
    sendCode: "Send me a code",
    codeTitle: "Check your email",
    codeLead: (e: string) => `We sent a 6-digit code to ${e}.`,
    code: "Code",
    verify: "Continue",
    otherEmail: "Use another email",
    companyTitle: (n: string) => `Welcome, ${n}.`,
    companyLead: "Which company do you represent? Your profile, seal and leads belong to the company, not to one person.",
    idType: "I represent",
    juridica: "A company (cédula jurídica)",
    fisica: "Myself, as an independent professional (cédula física)",
    legalId: "Legal id number",
    legalIdHint: { juridica: "10 digits, e.g. 3-101-123456", fisica: "9 digits, e.g. 1-1234-5678" },
    check: "Continue",
    existsTitle: "This company is already registered",
    existsLead: (n: string) =>
      `${n} already has a CR-CIPI profile. Ask for access and the CR-CIPI team will confirm it with the company.`,
    note: "Your role at the company (optional)",
    requestAccess: "Request access",
    requested: "Request sent. We'll email you when it's approved.",
    mineTitle: "You already manage this company",
    goDashboard: "Go to my dashboard",
    tryOther: "Enter a different id",
    profileTitle: "The basics",
    profileLead: "This is what investors see first. You can add a logo, photos and a translation later.",
    legalName: "Registered legal name (optional)",
    tradeName: "Trade name",
    category: "Main service",
    location: "Canton and province",
    locationPh: "Escazú, San José",
    languages: "Languages you serve clients in",
    leadsEmail: "Email for consultation requests",
    description: "What you help international clients with",
    descriptionHint: "Two or three sentences. Minimum 30 characters.",
    finish: "Create my profile",
    doneTitle: "Your company is on CR-CIPI",
    doneLead: "Next: get the trust seal. Verified members are listed first and receive more requests.",
    doneCta: "Open my dashboard",
    signedInAs: (e: string) => `Signed in as ${e}`,
    errors: {
      name: "Enter your name.",
      email: "Enter a valid email.",
      terms: "Please accept to continue.",
      code: "That code is wrong or expired.",
      legalId: "Check the number: it doesn't match the expected format.",
      tradeName: "Enter the trade name.",
      category: "Choose a service.",
      languages: "Choose at least one language.",
      description: "Write at least 30 characters.",
      leadsEmail: "Enter a valid email.",
      generic: "Something went wrong. Please try again.",
      rate: "Too many attempts. Wait a few minutes and try again.",
    },
  },
  es: {
    tabs: ["Cuenta", "Empresa", "Perfil"],
    accountTitle: "Registre su empresa",
    accountLead: "Tres pasos cortos, menos de tres minutos. Sin contraseña: ingresa con un código enviado a su correo.",
    name: "Nombre completo",
    email: "Correo de trabajo",
    terms: "Acepto los términos de uso y la política de privacidad.",
    termsLinks: ["Términos", "Privacidad"],
    sendCode: "Enviarme un código",
    codeTitle: "Revise su correo",
    codeLead: (e: string) => `Enviamos un código de 6 dígitos a ${e}.`,
    code: "Código",
    verify: "Continuar",
    otherEmail: "Usar otro correo",
    companyTitle: (n: string) => `Bienvenido(a), ${n}.`,
    companyLead: "¿Qué empresa representa? Su perfil, sello y contactos pertenecen a la empresa, no a una persona.",
    idType: "Represento a",
    juridica: "Una empresa (cédula jurídica)",
    fisica: "Mí mismo(a), como profesional independiente (cédula física)",
    legalId: "Número de cédula",
    legalIdHint: { juridica: "10 dígitos, p. ej. 3-101-123456", fisica: "9 dígitos, p. ej. 1-1234-5678" },
    check: "Continuar",
    existsTitle: "Esta empresa ya está registrada",
    existsLead: (n: string) =>
      `${n} ya tiene un perfil en CR-CIPI. Solicite acceso y el equipo de CR-CIPI lo confirmará con la empresa.`,
    note: "Su cargo en la empresa (opcional)",
    requestAccess: "Solicitar acceso",
    requested: "Solicitud enviada. Le escribiremos cuando sea aprobada.",
    mineTitle: "Usted ya administra esta empresa",
    goDashboard: "Ir a mi panel",
    tryOther: "Ingresar otra cédula",
    profileTitle: "Datos básicos",
    profileLead: "Es lo primero que ven los inversionistas. Puede agregar logo, fotos y traducción después.",
    legalName: "Razón social (opcional)",
    tradeName: "Nombre comercial",
    category: "Servicio principal",
    location: "Cantón y provincia",
    locationPh: "Escazú, San José",
    languages: "Idiomas en que atiende",
    leadsEmail: "Correo para recibir solicitudes",
    description: "En qué ayuda a clientes internacionales",
    descriptionHint: "Dos o tres oraciones. Mínimo 30 caracteres.",
    finish: "Crear mi perfil",
    doneTitle: "Su empresa ya está en CR-CIPI",
    doneLead: "Siguiente: obtenga el sello de confianza. Los miembros verificados aparecen primero y reciben más solicitudes.",
    doneCta: "Abrir mi panel",
    signedInAs: (e: string) => `Sesión iniciada como ${e}`,
    errors: {
      name: "Indique su nombre.",
      email: "Indique un correo válido.",
      terms: "Acepte para continuar.",
      code: "El código es incorrecto o venció.",
      legalId: "Revise el número: no coincide con el formato esperado.",
      tradeName: "Indique el nombre comercial.",
      category: "Elija un servicio.",
      languages: "Elija al menos un idioma.",
      description: "Escriba al menos 30 caracteres.",
      leadsEmail: "Indique un correo válido.",
      generic: "Algo salió mal. Inténtelo de nuevo.",
      rate: "Demasiados intentos. Espere unos minutos e inténtelo de nuevo.",
    },
  },
} as const;

const ID_PATTERN: Record<IdType, RegExp> = { juridica: /^3\d{9}$/, fisica: /^\d{9}$/ };

// Company-first onboarding: account → which company → the basics.
export default function Onboarding({ locale }: { locale: Locale }) {
  const t = COPY[locale];
  const router = useRouter();
  const session = useSession();
  const uid = useId();
  const [stage, setStage] = useState<Stage>("account");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [terms, setTerms] = useState(false);
  const [code, setCode] = useState("");
  const [idType, setIdType] = useState<IdType>("juridica");
  const [legalId, setLegalId] = useState("");
  const [found, setFound] = useState<{ id: string; name: string; mine: boolean } | null>(null);
  const [note, setNote] = useState("");
  const [requested, setRequested] = useState(false);
  const [langs, setLangs] = useState<string[]>(locale === "es" ? ["es"] : ["es", "en"]);
  const [category, setCategory] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  // Already signed in (or just verified): skip straight to the company.
  useEffect(() => {
    if (stage === "account" && session.status === "member") setStage("company");
    if (session.status === "admin") router.replace("/admin/dashboard");
  }, [session.status, stage, router]);

  useEffect(() => {
    const preset = new URLSearchParams(window.location.search).get("email");
    if (preset) setEmail(preset);
  }, []);

  // Move focus to each new step's heading so screen readers announce it.
  useEffect(() => {
    if (stage === "code") codeRef.current?.focus();
    else headingRef.current?.focus();
  }, [stage]);

  // After a failed submit, move focus to the first invalid field.
  useEffect(() => {
    if (Object.keys(errors).length === 0) return;
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(`.${styles.sheet} [aria-invalid="true"]`)?.focus()
    );
  }, [errors]);

  const tabIndex = stage === "account" || stage === "code" ? 0 : stage === "company" || stage === "exists" ? 1 : 2;
  const displayName = (session.name || name).split(" ")[0];

  async function post(url: string, body: unknown) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { res, data };
  }

  function guard<T>(fn: () => Promise<T>) {
    return async () => {
      setBusy(true);
      setBanner(null);
      try {
        await fn();
      } catch {
        setBanner(t.errors.generic);
      }
      setBusy(false);
    };
  }

  async function onAccount(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = t.errors.name;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = t.errors.email;
    if (!terms) errs.terms = t.errors.terms;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    await guard(async () => {
      const { res } = await post("/api/auth/signup", { name: name.trim(), email: email.trim() });
      if (res.status === 429) return setBanner(t.errors.rate);
      if (!res.ok) return setBanner(t.errors.generic);
      setStage("code");
    })();
  }

  async function verify(value: string) {
    await guard(async () => {
      const { res, data } = await post("/api/auth/verify-code", { email: email.trim(), code: value });
      if (!res.ok || !data.ok) {
        setErrors({ code: res.status === 429 ? t.errors.rate : t.errors.code });
        setCode("");
        codeRef.current?.focus();
        return;
      }
      if (data.role === "admin") return router.replace("/admin/dashboard");
      setErrors({});
      setStage("company");
    })();
  }

  async function onCompany(e: FormEvent) {
    e.preventDefault();
    const digits = legalId.replace(/\D/g, "");
    if (!ID_PATTERN[idType].test(digits)) return setErrors({ legalId: t.errors.legalId });
    setErrors({});
    await guard(async () => {
      const { res, data } = await post("/api/member/onboarding/lookup", { legalIdType: idType, legalId: digits });
      if (res.status === 429) return setBanner(t.errors.rate);
      if (res.status === 422) return setErrors({ legalId: t.errors.legalId });
      if (!res.ok) return setBanner(t.errors.generic);
      if (data.exists) {
        const p = data.provider as { id: string; name: string };
        setFound({ ...p, mine: data.mine === true });
        setStage("exists");
      } else {
        setStage("profile");
      }
    })();
  }

  async function onRequest() {
    if (!found) return;
    await guard(async () => {
      const { res } = await post("/api/member/onboarding/access", { providerId: found.id, note });
      if (!res.ok) return setBanner(t.errors.generic);
      setRequested(true);
    })();
  }

  async function onProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const tradeName = String(form.get("tradeName") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const leadsEmail = String(form.get("leadsEmail") ?? "").trim();
    const errs: Record<string, string> = {};
    if (!tradeName) errs.tradeName = t.errors.tradeName;
    if (!category) errs.category = t.errors.category;
    if (langs.length === 0) errs.languages = t.errors.languages;
    if (description.length < 30) errs.description = t.errors.description;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadsEmail)) errs.leadsEmail = t.errors.leadsEmail;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    await guard(async () => {
      const { res, data } = await post("/api/member/onboarding/company", {
        legalIdType: idType,
        legalId: legalId.replace(/\D/g, ""),
        legalName: form.get("legalName"),
        name: tradeName,
        category,
        location: form.get("location"),
        languages: langs,
        email: leadsEmail,
        description,
        locale,
      });
      if (res.status === 409) {
        setFound({ ...(data.provider as { id: string; name: string }), mine: false });
        return setStage("exists");
      }
      if (res.status === 422) {
        const server = (data.errors ?? {}) as Record<string, string>;
        const mapped: Record<string, string> = {};
        if (server.name) mapped.tradeName = t.errors.tradeName;
        if (server.category) mapped.category = t.errors.category;
        if (server.email) mapped.leadsEmail = t.errors.leadsEmail;
        if (server.description || server.descriptionEn) mapped.description = t.errors.description;
        if (server.languages) mapped.languages = t.errors.languages;
        if (server.legalId) mapped.tradeName = t.errors.legalId;
        return setErrors(mapped);
      }
      if (!res.ok) return setBanner(t.errors.generic);
      setStage("done");
    })();
  }

  const err = (key: string) =>
    errors[key] ? (
      <p className={styles.error} id={`${uid}-${key}-e`}>
        {errors[key]}
      </p>
    ) : null;
  const inv = (key: string) =>
    errors[key] ? { "aria-invalid": true as const, "aria-describedby": `${uid}-${key}-e` } : {};
  const terms_ = locale === "en" ? ["/en/terms", "/en/privacy"] : ["/es/terminos", "/es/privacidad"];

  return (
    <div className={styles.wrap}>
      <ol className={styles.tabs} aria-label={locale === "en" ? "Progress" : "Progreso"}>
        {t.tabs.map((label, i) => (
          <li
            key={label}
            className={`${styles.tab} ${i === tabIndex ? styles.tabNow : ""} ${i < tabIndex || stage === "done" ? styles.tabDone : ""}`}
            aria-current={i === tabIndex && stage !== "done" ? "step" : undefined}
          >
            <span className={styles.tabNum}>{String(i + 1).padStart(2, "0")}</span>
            {label}
          </li>
        ))}
      </ol>

      <div className={styles.sheet} key={stage}>
        {banner ? (
          <p className={styles.banner} role="alert">
            {banner}
          </p>
        ) : null}

        {stage === "account" ? (
          <form className={styles.form} onSubmit={onAccount} noValidate>
            <h1 className={styles.title} ref={headingRef} tabIndex={-1}>
              {t.accountTitle}
            </h1>
            <p className={styles.lead}>{t.accountLead}</p>
            <Field id={`${uid}-name`} label={t.name} error={err("name")}>
              <input id={`${uid}-name`} className={styles.input} autoComplete="name" value={name}
                onChange={(e) => setName(e.target.value)} {...inv("name")} />
            </Field>
            <Field id={`${uid}-email`} label={t.email} error={err("email")}>
              <input id={`${uid}-email`} className={styles.input} type="email" inputMode="email" autoComplete="email"
                value={email} onChange={(e) => setEmail(e.target.value)} {...inv("email")} />
            </Field>
            <div>
              <label className={styles.check}>
                <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} {...inv("terms")} />
                <span>
                  {t.terms}{" "}
                  <a href={terms_[0]} target="_blank" rel="noopener noreferrer">{t.termsLinks[0]}</a> ·{" "}
                  <a href={terms_[1]} target="_blank" rel="noopener noreferrer">{t.termsLinks[1]}</a>
                </span>
              </label>
              {err("terms")}
            </div>
            <button type="submit" className={`btn btn--primary ${styles.submit}`} disabled={busy}>
              {t.sendCode} <span className="btn__arrow" aria-hidden="true">→</span>
            </button>
            <p className={styles.alt}>
              {locale === "en" ? "Already a member?" : "¿Ya es miembro?"} <Link href="/admin">{locale === "en" ? "Sign in" : "Ingresar"}</Link>
            </p>
          </form>
        ) : null}

        {stage === "code" ? (
          <form className={styles.form} noValidate onSubmit={(e) => { e.preventDefault(); if (code.length === 6) void verify(code); }}>
            <h1 className={styles.title} ref={headingRef} tabIndex={-1}>{t.codeTitle}</h1>
            <p className={styles.lead}>{t.codeLead(email)}</p>
            <label className={styles.label} htmlFor={`${uid}-code`}>{t.code}</label>
            <OtpInput ref={codeRef} id={`${uid}-code`} value={code} invalid={!!errors.code}
              describedBy={errors.code ? `${uid}-code-e` : undefined} disabled={busy}
              onChange={(digits) => { setCode(digits); setErrors({}); if (digits.length === 6 && !busy) void verify(digits); }} />
            {err("code")}
            <button type="submit" className={`btn btn--primary ${styles.submit}`} disabled={busy || code.length < 6}>
              {t.verify}
            </button>
            <button type="button" className={styles.link} onClick={() => { setStage("account"); setCode(""); setErrors({}); }}>
              {t.otherEmail}
            </button>
          </form>
        ) : null}

        {stage === "company" ? (
          <form className={styles.form} onSubmit={onCompany} noValidate>
            <h1 className={styles.title} ref={headingRef} tabIndex={-1}>{t.companyTitle(displayName || "")}</h1>
            <p className={styles.lead}>{t.companyLead}</p>
            {session.email ? <p className={styles.meta}>{t.signedInAs(session.email)}</p> : null}
            <fieldset className={styles.fieldset}>
              <legend className={styles.label}>{t.idType}</legend>
              {(["juridica", "fisica"] as const).map((type) => (
                <label key={type} className={`${styles.option} ${idType === type ? styles.optionOn : ""}`}>
                  <input type="radio" name="idType" value={type} checked={idType === type} onChange={() => setIdType(type)} />
                  <span>{t[type]}</span>
                </label>
              ))}
            </fieldset>
            <Field id={`${uid}-legal`} label={t.legalId} error={err("legalId")} hint={t.legalIdHint[idType]} hintId={`${uid}-legal-h`}>
              <input id={`${uid}-legal`} className={`${styles.input} ${styles.idInput}`} inputMode="numeric"
                value={legalId} onChange={(e) => setLegalId(e.target.value)}
                aria-invalid={errors.legalId ? true : undefined}
                aria-describedby={[errors.legalId ? `${uid}-legalId-e` : "", `${uid}-legal-h`].filter(Boolean).join(" ")} />
            </Field>
            <button type="submit" className={`btn btn--primary ${styles.submit}`} disabled={busy}>
              {t.check} <span className="btn__arrow" aria-hidden="true">→</span>
            </button>
          </form>
        ) : null}

        {stage === "exists" && found ? (
          <div className={styles.form}>
            <h1 className={styles.title} ref={headingRef} tabIndex={-1}>{found.mine ? t.mineTitle : t.existsTitle}</h1>
            <p className={styles.found}>{found.name}</p>
            {found.mine ? (
              <Link href="/account" className={`btn btn--primary ${styles.submit}`}>{t.goDashboard}</Link>
            ) : requested ? (
              <p className={styles.success} role="status">{t.requested}</p>
            ) : (
              <>
                <p className={styles.lead}>{t.existsLead(found.name)}</p>
                <Field id={`${uid}-note`} label={t.note}>
                  <input id={`${uid}-note`} className={styles.input} value={note} onChange={(e) => setNote(e.target.value)} />
                </Field>
                <button type="button" className={`btn btn--primary ${styles.submit}`} disabled={busy} onClick={() => void onRequest()}>
                  {t.requestAccess}
                </button>
              </>
            )}
            <button type="button" className={styles.link} onClick={() => { setStage("company"); setFound(null); setRequested(false); }}>
              {t.tryOther}
            </button>
          </div>
        ) : null}

        {stage === "profile" ? (
          <form className={styles.form} onSubmit={onProfile} noValidate>
            <h1 className={styles.title} ref={headingRef} tabIndex={-1}>{t.profileTitle}</h1>
            <p className={styles.lead}>{t.profileLead}</p>
            {idType === "juridica" ? (
              <Field id={`${uid}-ln`} label={t.legalName}>
                <input id={`${uid}-ln`} name="legalName" className={styles.input} autoComplete="organization" />
              </Field>
            ) : null}
            <Field id={`${uid}-tn`} label={t.tradeName} error={err("tradeName")}>
              <input id={`${uid}-tn`} name="tradeName" className={styles.input} {...inv("tradeName")} />
            </Field>
            <div className={styles.pair}>
              <Field id={`${uid}-cat`} label={t.category} error={err("category")}>
                <select id={`${uid}-cat`} className={styles.input} value={category} onChange={(e) => setCategory(e.target.value)} {...inv("category")}>
                  <option value="" disabled>—</option>
                  {PROVIDER_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{PROVIDER_CATEGORY_LABELS[c][locale]}</option>
                  ))}
                </select>
              </Field>
              <Field id={`${uid}-loc`} label={t.location}>
                <input id={`${uid}-loc`} name="location" className={styles.input} placeholder={t.locationPh} />
              </Field>
            </div>
            <fieldset className={styles.fieldset} aria-describedby={errors.languages ? `${uid}-languages-e` : undefined}>
              <legend className={styles.label}>{t.languages}</legend>
              <div className={styles.chips}>
                {LANGS.map((l) => {
                  const on = langs.includes(l);
                  return (
                    <button key={l} type="button" aria-pressed={on}
                      aria-invalid={errors.languages && l === LANGS[0] ? true : undefined} className={`${styles.chip} ${on ? styles.chipOn : ""}`}
                      onClick={() => setLangs((all) => (on ? all.filter((x) => x !== l) : [...all, l]))}>
                      {LANG_LABELS[l][locale]}
                    </button>
                  );
                })}
              </div>
              {err("languages")}
            </fieldset>
            <Field id={`${uid}-le`} label={t.leadsEmail} error={err("leadsEmail")}>
              <input id={`${uid}-le`} name="leadsEmail" type="email" className={styles.input}
                defaultValue={session.email ?? email} {...inv("leadsEmail")} />
            </Field>
            <Field id={`${uid}-d`} label={t.description} error={err("description")} hint={t.descriptionHint} hintId={`${uid}-d-h`}>
              <textarea id={`${uid}-d`} name="description" rows={4} className={`${styles.input} ${styles.textarea}`}
                aria-invalid={errors.description ? true : undefined}
                aria-describedby={[errors.description ? `${uid}-description-e` : "", `${uid}-d-h`].filter(Boolean).join(" ")} />
            </Field>
            <button type="submit" className={`btn btn--primary ${styles.submit}`} disabled={busy}>
              {t.finish} <span className="btn__arrow" aria-hidden="true">→</span>
            </button>
          </form>
        ) : null}

        {stage === "done" ? (
          <div className={`${styles.form} ${styles.done}`}>
            <span className={styles.stamp} aria-hidden="true">
              <span>CR-CIPI</span>
              <strong>{locale === "en" ? "Registered" : "Registrada"}</strong>
              <span>{new Date().toLocaleDateString(locale === "en" ? "en-US" : "es-CR", { day: "2-digit", month: "short", year: "numeric" })}</span>
            </span>
            <h1 className={styles.title} ref={headingRef} tabIndex={-1}>{t.doneTitle}</h1>
            <p className={styles.lead}>{t.doneLead}</p>
            <Link href="/account?welcome=1" className={`btn btn--primary ${styles.submit}`}>
              {t.doneCta} <span className="btn__arrow" aria-hidden="true">→</span>
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  hintId,
  children,
}: {
  id: string;
  label: string;
  error?: React.ReactNode;
  hint?: string;
  hintId?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {children}
      {hint ? (
        <p className={styles.hint} id={hintId}>
          {hint}
        </p>
      ) : null}
      {error}
    </div>
  );
}
