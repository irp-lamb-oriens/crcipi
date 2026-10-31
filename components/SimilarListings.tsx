"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/content/types";
import styles from "./SimilarListings.module.scss";

export type OwnerState = "you" | "member" | "none" | "missing" | "test" | "seeded";
export interface ListingMatch {
  id: string;
  name: string;
  location: string | null;
  verified: boolean;
  owner: OwnerState;
  reasons: ("name" | "website" | "email")[];
}

const T = {
  en: {
    title: "This business may already be listed",
    lead: "Choose what to do so the directory doesn't end up with two copies.",
    reasons: { name: "same name", website: "same website", email: "same email" },
    owner: {
      you: "You already manage this listing.",
      member: "Managed by another member.",
      none: "Unclaimed: nobody manages it yet.",
      missing: "Unclaimed: its manager's account no longer exists.",
      test: "Unclaimed: held by a test account.",
      seeded: "Unclaimed: example listing added by CR-CIPI.",
    },
    open: "Open it",
    claim: "Claim this listing",
    request: "Request access",
    sent: "Request sent. CR-CIPI will confirm it and email you.",
    distinct: "None of these is my business. Publish mine",
    cancel: "Go back and edit",
    verified: "Verified",
  },
  es: {
    title: "Puede que esta empresa ya esté en el directorio",
    lead: "Elija qué hacer para que el directorio no termine con dos copias.",
    reasons: { name: "mismo nombre", website: "mismo sitio web", email: "mismo correo" },
    owner: {
      you: "Usted ya administra este perfil.",
      member: "Lo administra otro miembro.",
      none: "Sin reclamar: nadie lo administra todavía.",
      missing: "Sin reclamar: la cuenta de quien lo administraba ya no existe.",
      test: "Sin reclamar: está a nombre de una cuenta de prueba.",
      seeded: "Sin reclamar: perfil de ejemplo agregado por CR-CIPI.",
    },
    open: "Abrirlo",
    claim: "Reclamar este perfil",
    request: "Solicitar acceso",
    sent: "Solicitud enviada. CR-CIPI la confirmará y le escribirá.",
    distinct: "Ninguna es mi empresa. Publicar la mía",
    cancel: "Volver a editar",
    verified: "Verificada",
  },
} as const;

// Shown when a new listing looks like one that already exists. Every way
// out is explicit: open your own, claim an unclaimed (placeholder) one, ask
// for access to someone else's, or confirm yours is different.
export default function SimilarListings({
  matches,
  locale = "en",
  onOpenMine,
  onConfirmDistinct,
  onCancel,
  busy,
}: {
  matches: ListingMatch[];
  locale?: Locale;
  onOpenMine: (id: string) => void;
  onConfirmDistinct: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const t = T[locale];
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [failed, setFailed] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Bring the warning fully into view and announce it.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    headingRef.current?.closest("section")?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  async function ask(id: string) {
    setFailed(false);
    const res = await fetch("/api/member/onboarding/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId: id }),
    }).catch(() => null);
    if (res?.ok) setSent((s) => ({ ...s, [id]: true }));
    else setFailed(true);
  }

  const onlyMine = matches.every((m) => m.owner === "you");

  return (
    <section className={styles.box} role="alert" aria-labelledby="similar-title">
      <h3 id="similar-title" ref={headingRef} tabIndex={-1} className={styles.title}>
        {t.title}
      </h3>
      <p className={styles.lead}>{t.lead}</p>
      <ul className={styles.list}>
        {matches.map((m) => (
          <li key={m.id} className={styles.item}>
            <div className={styles.main}>
              <p className={styles.name}>
                {m.name}
                {m.verified ? <span className={styles.verified}> · ✓ {t.verified}</span> : null}
              </p>
              <p className={styles.meta}>
                {[m.location, m.reasons.map((r) => t.reasons[r]).join(", ")].filter(Boolean).join(" · ")}
              </p>
              <p className={`${styles.owner} ${m.owner !== "you" && m.owner !== "member" ? styles.unclaimed : ""}`}>
                {t.owner[m.owner]}
              </p>
            </div>
            {m.owner === "you" ? (
              <button type="button" className={styles.action} onClick={() => onOpenMine(m.id)}>
                {t.open}
                <span className="srOnly">: {m.name}</span>
              </button>
            ) : sent[m.id] ? (
              <p className={styles.sent} role="status">{t.sent}</p>
            ) : (
              <button type="button" className={styles.action} onClick={() => void ask(m.id)}>
                {m.owner === "member" ? t.request : t.claim}
                <span className="srOnly">: {m.name}</span>
              </button>
            )}
          </li>
        ))}
      </ul>
      {failed ? <p className={styles.error}>{locale === "en" ? "That didn't go through. Try again." : "No se pudo enviar. Inténtelo de nuevo."}</p> : null}
      <div className={styles.foot}>
        {!onlyMine ? (
          <button type="button" className={styles.distinct} onClick={onConfirmDistinct} disabled={busy}>
            {t.distinct}
          </button>
        ) : null}
        <button type="button" className={styles.cancel} onClick={onCancel}>
          {t.cancel}
        </button>
      </div>
    </section>
  );
}
