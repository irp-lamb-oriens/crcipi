"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/content/types";
import styles from "./ShareBar.module.scss";

// Share kit: the phone's own share sheet when there is one, plus direct
// LinkedIn / WhatsApp / X / email links and copy-link. No third-party
// scripts, no tracking pixels: every button is a plain URL.
export default function ShareBar({
  url,
  title,
  locale,
  label,
}: {
  url: string;
  title: string;
  locale: Locale;
  label?: string;
}) {
  const [canNative, setCanNative] = useState(false);
  const [copied, setCopied] = useState(false);
  const en = locale === "en";

  useEffect(() => {
    setCanNative(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const e = encodeURIComponent;
  const links = [
    { name: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${e(url)}` },
    { name: "WhatsApp", href: `https://wa.me/?text=${e(`${title} ${url}`)}` },
    { name: "X", href: `https://x.com/intent/post?text=${e(title)}&url=${e(url)}` },
    { name: en ? "Email" : "Correo", href: `mailto:?subject=${e(title)}&body=${e(url)}` },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the links still work */
    }
  }

  return (
    <div className={styles.bar} role="group" aria-label={label ?? (en ? "Share" : "Compartir")}>
      <span className={styles.label}>{label ?? (en ? "Share" : "Compartir")}</span>
      {canNative ? (
        <button type="button" className={styles.item} onClick={() => void navigator.share({ title, url }).catch(() => {})}>
          {en ? "Share…" : "Compartir…"}
        </button>
      ) : null}
      {links.map((l) => (
        <a key={l.name} className={styles.item} href={l.href} target="_blank" rel="noopener noreferrer">
          {l.name}
          <span className="srOnly"> {en ? "(opens in a new tab)" : "(abre en una pestaña nueva)"}</span>
        </a>
      ))}
      <button type="button" className={styles.item} onClick={() => void copy()}>
        {copied ? (en ? "Link copied" : "Enlace copiado") : en ? "Copy link" : "Copiar enlace"}
      </button>
      <span className="srOnly" role="status">{copied ? (en ? "Link copied" : "Enlace copiado") : ""}</span>
    </div>
  );
}
