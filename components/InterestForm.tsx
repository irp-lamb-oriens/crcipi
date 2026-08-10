"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormContent } from "@/content/types";
import styles from "./InterestForm.module.scss";

interface Props {
  form: FormContent;
  locale: string;
  page: string;
}

interface FormState {
  firstName: string;
  lastName: string;
  company: string;
  profession: string;
  email: string;
  phone: string;
  linkedin: string;
  expertise: string[];
  participation: string[];
  reason: string;
  preferredLanguage: string;
  consent: boolean;
  sourcePage: string;
  language: string;
  utm: Record<string, string>;
}

const emptyState: FormState = {
  firstName: "",
  lastName: "",
  company: "",
  profession: "",
  email: "",
  phone: "",
  linkedin: "",
  expertise: [],
  participation: [],
  reason: "",
  preferredLanguage: "en",
  consent: false,
  sourcePage: "",
  language: "",
  utm: {},
};

type Status = "idle" | "submitting" | "success" | "error";

const STEP_LABELS: Record<string, string[]> = {
  en: ["About you", "Contact", "Involvement"],
  es: ["Sobre ti", "Contacto", "Participación"],
};

const STEP_ACTIONS: Record<string, { back: string; next: string; submit: string }> = {
  en: { back: "Back", next: "Continue", submit: "Submit application" },
  es: { back: "Atrás", next: "Continuar", submit: "Enviar solicitud" },
};

const STEP_META: Record<string, { title: string; description: string }[]> = {
  en: [
    { title: "About you", description: "Tell us who you are and what you do." },
    { title: "Contact", description: "How can we reach you?" },
    { title: "Involvement", description: "Where you'd like to contribute." },
  ],
  es: [
    { title: "Sobre ti", description: "Cuéntanos quién eres y a qué te dedicas." },
    { title: "Contacto", description: "¿Cómo podemos contactarte?" },
    { title: "Participación", description: "Dónde te gustaría aportar." },
  ],
};

export default function InterestForm({ form, locale, page }: Props) {
  const [values, setValues] = useState<FormState>(emptyState);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [serverError, setServerError] = useState("");
  const [step, setStep] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportHeight, setViewportHeight] = useState<number | undefined>(undefined);

  const stepLabels = STEP_LABELS[locale] ?? STEP_LABELS.en;
  const stepActions = STEP_ACTIONS[locale] ?? STEP_ACTIONS.en;
  const totalSteps = stepLabels.length;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
      const value = params.get(key);
      if (value) utm[key] = value;
    }

    setValues((prev) => ({
      ...prev,
      sourcePage: page,
      language: locale,
      preferredLanguage: locale,
      utm,
    }));
  }, [locale, page]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const panel = viewport.querySelector<HTMLElement>(`.${styles.stepPanel}`);
    if (panel) {
      setViewportHeight(panel.offsetHeight);
    }
  }, []);

  const setField = useCallback((name: keyof FormState, value: string | boolean | string[]) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const toggleArray = useCallback((name: "expertise" | "participation", value: string) => {
    setValues((prev) => {
      const current = prev[name];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [name]: next };
    });
  }, []);

  const validateStep = useCallback(
    (s: number): Record<string, string> => {
      const errors: Record<string, string> = {};
      if (s === 0) {
        if (!values.firstName.trim()) errors.firstName = form.errors.required;
        if (!values.lastName.trim()) errors.lastName = form.errors.required;
        if (!values.profession.trim()) errors.profession = form.errors.required;
      }
      if (s === 1) {
        if (!values.email.trim()) {
          errors.email = form.errors.required;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
          errors.email = form.errors.email;
        }
      }
      if (s === 2) {
        if (values.expertise.length === 0) errors.expertise = form.errors.required;
        if (values.participation.length === 0) errors.participation = form.errors.required;
        if (!values.reason.trim()) errors.reason = form.errors.required;
        if (!values.consent) errors.consent = form.errors.consent;
      }
      return errors;
    },
    [values, form]
  );

  const focusFirstInPanel = useCallback((s: number) => {
    requestAnimationFrame(() => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const panels = viewport.querySelectorAll<HTMLElement>(`.${styles.stepPanel}`);
      const panel = panels[s];
      if (!panel) return;
      const first = panel.querySelector<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      first?.focus({ preventScroll: true });
    });
  }, []);

  const goNext = useCallback(() => {
    const errors = validateStep(step);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    const next = Math.min(step + 1, totalSteps - 1);
    setStep(next);
    focusFirstInPanel(next);
  }, [step, validateStep, totalSteps, focusFirstInPanel]);

  const goBack = useCallback(() => {
    setFieldErrors({});
    const prev = Math.max(step - 1, 0);
    setStep(prev);
    focusFirstInPanel(prev);
  }, [step, focusFirstInPanel]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLFormElement>) => {
      if (e.key !== "Tab") return;
      const viewport = viewportRef.current;
      if (!viewport) return;
      const panels = viewport.querySelectorAll<HTMLElement>(`.${styles.stepPanel}`);
      const panel = panels[step];
      if (!panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [step]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateStep(2);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setStatus("submitting");
    setServerError("");

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: values.firstName,
          lastName: values.lastName,
          company: values.company,
          profession: values.profession,
          email: values.email,
          phone: values.phone,
          linkedin: values.linkedin,
          expertise: values.expertise,
          participation: values.participation,
          reason: values.reason,
          preferredLanguage: values.preferredLanguage,
          consent: values.consent,
          sourcePage: values.sourcePage,
          language: values.language,
          utm: values.utm,
        }),
      });

      if (res.ok) {
        setStatus("success");
      } else {
        setStatus("error");
        setServerError(form.errors.generic);
      }
    } catch {
      setStatus("error");
      setServerError(form.errors.generic);
    }
  };

  const progress = useMemo(() => ((step + 1) / totalSteps) * 100, [step, totalSteps]);
  // Each panel is 1/totalSteps of the track width (track is totalSteps * 100% wide).
  // translateX % is relative to the track's own width, so one slide = -(step * 100) / totalSteps.
  const trackOffset = useMemo(() => -(step * 100) / totalSteps, [step, totalSteps]);

  if (status === "success") {
    return (
      <div className={styles.success} role="status" aria-live="polite">
        <div className={styles.successMark} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h3 className={styles.successTitle}>{form.success.title}</h3>
        <p className={styles.successBody}>{form.success.body}</p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate onKeyDown={handleKeyDown}>
      {status === "error" && (
        <p className={styles.errorBanner} role="alert">
          {serverError}
        </p>
      )}

      <div className={styles.progress} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
        <div className={styles.steps}>
          {stepLabels.map((label, i) => (
            <div key={label} className={`${styles.step} ${i === step ? styles.stepActive : ""} ${i < step ? styles.stepDone : ""}`}>
              <span className={styles.stepDot}>{i < step ? "✓" : i + 1}</span>
              <span className={styles.stepLabel}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.actions}>
        {step > 0 && (
          <button type="button" className={styles.back} onClick={goBack}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            {stepActions.back}
          </button>
        )}
        {step < totalSteps - 1 ? (
          <button type="button" className={styles.next} onClick={goNext}>
            {stepActions.next}
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <button type="submit" className={styles.next} disabled={status === "submitting"}>
            {status === "submitting" ? form.fields.submitting : stepActions.submit}
          </button>
        )}
      </div>

      <div className={styles.viewport} ref={viewportRef} style={viewportHeight ? { height: viewportHeight } : undefined}>
        <div className={styles.track} style={{ transform: `translateX(${trackOffset}%)` }}>
          {/* Step 1 */}
          <div
            className={styles.stepPanel}
            aria-hidden={step !== 0}
            ref={(el) => {
              if (el) {
                if (step === 0) el.removeAttribute("inert");
                else el.setAttribute("inert", "");
              }
            }}
          >
            <div className={styles.stepHeader}>
              <span className={styles.stepNumber}>01</span>
              <div>
                <h4 className={styles.stepTitle}>{STEP_META[locale][0].title}</h4>
                <p className={styles.stepDescription}>{STEP_META[locale][0].description}</p>
              </div>
            </div>
            <div className={styles.field}>
              <div className={styles.float}>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  className={styles.input}
                  value={values.firstName}
                  onChange={(e) => setField("firstName", e.target.value)}
                  placeholder=" "
                  aria-invalid={!!fieldErrors.firstName}
                  aria-describedby={fieldErrors.firstName ? "firstName-error" : undefined}
                />
                <label htmlFor="firstName" className={styles.label}>
                  {form.fields.firstName} <span className={styles.required} aria-hidden="true">*</span>
                </label>
              </div>
              {fieldErrors.firstName && (
                <span id="firstName-error" className={styles.error}>
                  {fieldErrors.firstName}
                </span>
              )}
            </div>

            <div className={styles.field}>
              <div className={styles.float}>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  className={styles.input}
                  value={values.lastName}
                  onChange={(e) => setField("lastName", e.target.value)}
                  placeholder=" "
                  aria-invalid={!!fieldErrors.lastName}
                  aria-describedby={fieldErrors.lastName ? "lastName-error" : undefined}
                />
                <label htmlFor="lastName" className={styles.label}>
                  {form.fields.lastName} <span className={styles.required} aria-hidden="true">*</span>
                </label>
              </div>
              {fieldErrors.lastName && (
                <span id="lastName-error" className={styles.error}>
                  {fieldErrors.lastName}
                </span>
              )}
            </div>

            <div className={styles.field}>
              <div className={styles.float}>
                <input
                  id="company"
                  name="company"
                  type="text"
                  className={styles.input}
                  value={values.company}
                  onChange={(e) => setField("company", e.target.value)}
                  placeholder=" "
                />
                <label htmlFor="company" className={styles.label}>
                  {form.fields.company}
                </label>
              </div>
            </div>

            <div className={styles.field}>
              <div className={styles.float}>
                <input
                  id="profession"
                  name="profession"
                  type="text"
                  className={styles.input}
                  value={values.profession}
                  onChange={(e) => setField("profession", e.target.value)}
                  placeholder=" "
                  aria-invalid={!!fieldErrors.profession}
                  aria-describedby={fieldErrors.profession ? "profession-error" : undefined}
                />
                <label htmlFor="profession" className={styles.label}>
                  {form.fields.profession} <span className={styles.required} aria-hidden="true">*</span>
                </label>
              </div>
              {fieldErrors.profession && (
                <span id="profession-error" className={styles.error}>
                  {fieldErrors.profession}
                </span>
              )}
            </div>
          </div>

          {/* Step 2 */}
          <div
            className={styles.stepPanel}
            aria-hidden={step !== 1}
            ref={(el) => {
              if (el) {
                if (step === 1) el.removeAttribute("inert");
                else el.setAttribute("inert", "");
              }
            }}
          >
            <div className={styles.stepHeader}>
              <span className={styles.stepNumber}>02</span>
              <div>
                <h4 className={styles.stepTitle}>{STEP_META[locale][1].title}</h4>
                <p className={styles.stepDescription}>{STEP_META[locale][1].description}</p>
              </div>
            </div>
            <div className={styles.field}>
              <div className={styles.float}>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className={styles.input}
                  value={values.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder=" "
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? "email-error" : undefined}
                />
                <label htmlFor="email" className={styles.label}>
                  {form.fields.email} <span className={styles.required} aria-hidden="true">*</span>
                </label>
              </div>
              {fieldErrors.email && (
                <span id="email-error" className={styles.error}>
                  {fieldErrors.email}
                </span>
              )}
            </div>

            <div className={styles.field}>
              <div className={styles.float}>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  className={styles.input}
                  value={values.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  placeholder=" "
                />
                <label htmlFor="phone" className={styles.label}>
                  {form.fields.phone}
                </label>
              </div>
            </div>

            <div className={styles.field}>
              <div className={styles.float}>
                <input
                  id="linkedin"
                  name="linkedin"
                  type="url"
                  className={styles.input}
                  value={values.linkedin}
                  onChange={(e) => setField("linkedin", e.target.value)}
                  placeholder=" "
                />
                <label htmlFor="linkedin" className={styles.label}>
                  {form.fields.linkedin}
                </label>
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.groupLabel}>{form.fields.language}</span>
              <div className={styles.segmented} role="radiogroup" aria-label={form.fields.language}>
                {form.languageOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={values.preferredLanguage === option.value}
                    className={`${styles.segment} ${values.preferredLanguage === option.value ? styles.segmentActive : ""}`}
                    onClick={() => setField("preferredLanguage", option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div
            className={styles.stepPanel}
            aria-hidden={step !== 2}
            ref={(el) => {
              if (el) {
                if (step === 2) el.removeAttribute("inert");
                else el.setAttribute("inert", "");
              }
            }}
          >
            <div className={styles.stepHeader}>
              <span className={styles.stepNumber}>03</span>
              <div>
                <h4 className={styles.stepTitle}>{STEP_META[locale][2].title}</h4>
                <p className={styles.stepDescription}>{STEP_META[locale][2].description}</p>
              </div>
            </div>
            <fieldset className={styles.fieldset}>
              <legend className={styles.groupLabel}>
                {form.fields.expertise} <span className={styles.required} aria-hidden="true">*</span>
              </legend>
              <div className={styles.chips}>
                {form.expertiseOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={values.expertise.includes(option.value)}
                    className={`${styles.chip} ${values.expertise.includes(option.value) ? styles.chipActive : ""}`}
                    onClick={() => toggleArray("expertise", option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {fieldErrors.expertise && <span className={styles.error}>{fieldErrors.expertise}</span>}
            </fieldset>

            <fieldset className={styles.fieldset}>
              <legend className={styles.groupLabel}>
                {form.fields.participation} <span className={styles.required} aria-hidden="true">*</span>
              </legend>
              <div className={styles.chips}>
                {form.participationOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={values.participation.includes(option.value)}
                    className={`${styles.chip} ${values.participation.includes(option.value) ? styles.chipActive : ""}`}
                    onClick={() => toggleArray("participation", option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {fieldErrors.participation && (
                <span className={styles.error}>{fieldErrors.participation}</span>
              )}
            </fieldset>

            <div className={styles.field}>
              <div className={styles.float}>
                <textarea
                  id="reason"
                  name="reason"
                  rows={4}
                  className={`${styles.input} ${styles.textarea}`}
                  value={values.reason}
                  onChange={(e) => setField("reason", e.target.value)}
                  placeholder=" "
                  aria-invalid={!!fieldErrors.reason}
                  aria-describedby={fieldErrors.reason ? "reason-error" : undefined}
                />
                <label htmlFor="reason" className={styles.label}>
                  {form.fields.reason} <span className={styles.required} aria-hidden="true">*</span>
                </label>
              </div>
              {fieldErrors.reason && (
                <span id="reason-error" className={styles.error}>
                  {fieldErrors.reason}
                </span>
              )}
            </div>

            <div className={styles.consentField}>
              <button
                type="button"
                role="switch"
                aria-checked={values.consent}
                className={`${styles.switch} ${values.consent ? styles.switchOn : ""}`}
                onClick={() => setField("consent", !values.consent)}
                aria-invalid={!!fieldErrors.consent}
                aria-describedby={fieldErrors.consent ? "consent-error" : undefined}
              >
                <span className={styles.switchTrack}>
                  <span className={styles.switchThumb} />
                </span>
                <span className={styles.switchLabel}>
                  {form.fields.consent} <span className={styles.required} aria-hidden="true">*</span>
                </span>
              </button>
              {fieldErrors.consent && (
                <span id="consent-error" className={styles.error}>
                  {fieldErrors.consent}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

    </form>
  );
}
