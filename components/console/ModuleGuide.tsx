"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ADMIN_GUIDES, MEMBER_GUIDES, type Guide } from "@/lib/guides";
import styles from "./ModuleGuide.module.scss";

type Area = "member" | "admin";

// One fetch per area per page load, shared by every guide on the page.
const cache: Partial<Record<Area, Promise<Record<string, boolean>>>> = {};
function loadProgress(area: Area) {
  cache[area] ??= fetch(area === "member" ? "/api/member/progress" : "/api/admin/progress")
    .then((r) => (r.ok ? r.json() : { progress: {} }))
    .then((b: { progress?: Record<string, boolean> }) => b.progress ?? {})
    .catch(() => ({}));
  return cache[area]!;
}

export function findGuide(area: Area, id: string): Guide<string> | undefined {
  return (area === "member" ? MEMBER_GUIDES : ADMIN_GUIDES).find((g) => g.id === id) as Guide<string> | undefined;
}

// "How it works" for one module: a button in the page header that opens a
// side sheet with a self-ticking checklist, how-tos and FAQ.
export default function ModuleGuide({ area, id }: { area: Area; id: string }) {
  const guide = findGuide(area, id);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [progress, setProgress] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    let alive = true;
    void loadProgress(area).then((p) => alive && setProgress(p));
    return () => {
      alive = false;
    };
  }, [area]);

  // Opens by itself once: on the overview right after onboarding.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("welcome") === "1") dialogRef.current?.showModal();
  }, []);

  if (!guide) return null;
  const done = progress ? guide.checklist.filter((c) => progress[c.key]).length : 0;

  function open() {
    dialogRef.current?.showModal();
  }

  return (
    <>
      <button type="button" className={styles.trigger} onClick={open} aria-haspopup="dialog">
        <span className={styles.ring} aria-hidden="true">
          <svg viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="16" className={styles.track} />
            <circle
              cx="18"
              cy="18"
              r="16"
              className={styles.fill}
              style={{ strokeDashoffset: 100.5 - (100.5 * done) / guide.checklist.length }}
            />
          </svg>
          <span>?</span>
        </span>
        How it works
        {progress ? (
          <span className={styles.count}>
            {done}/{guide.checklist.length}
          </span>
        ) : null}
      </button>

      <dialog
        ref={dialogRef}
        className={styles.sheet}
        aria-labelledby={`guide-${id}-title`}
        onClick={(e) => {
          // Click on the backdrop (the dialog box itself, outside content) closes.
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        <div className={styles.inner}>
          <header className={styles.head}>
            <p className={styles.eyebrow}>How it works</p>
            <h2 id={`guide-${id}-title`} className={styles.title}>
              {guide.title}
            </h2>
            <button type="button" className={styles.close} onClick={() => dialogRef.current?.close()} aria-label="Close">
              ×
            </button>
          </header>
          <p className={styles.summary}>{guide.summary}</p>

          <section aria-labelledby={`guide-${id}-check`}>
            <h3 id={`guide-${id}-check`} className={styles.h3}>
              Checklist <span className={styles.count}>{done}/{guide.checklist.length}</span>
            </h3>
            <ol className={styles.checklist}>
              {guide.checklist.map((item) => {
                const ok = progress?.[item.key] === true;
                return (
                  <li key={item.key} className={ok ? styles.ok : ""}>
                    <span className={styles.box} aria-hidden="true">{ok ? "✓" : ""}</span>
                    {item.href && !ok ? <Link href={item.href}>{item.label}</Link> : <span>{item.label}</span>}
                    <span className="srOnly">{ok ? " (done)" : " (to do)"}</span>
                  </li>
                );
              })}
            </ol>
            <p className={styles.note}>Items tick themselves when the platform sees them done.</p>
          </section>

          {guide.howtos.map((howto) => (
            <section key={howto.title} className={styles.howto}>
              <h3 className={styles.h3}>{howto.title}</h3>
              <ol className={styles.steps}>
                {howto.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </section>
          ))}

          {guide.faq.length ? (
            <section>
              <h3 className={styles.h3}>Questions</h3>
              {guide.faq.map((f) => (
                <details key={f.q} className={styles.faq}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </section>
          ) : null}

          <Link href={area === "member" ? "/account/help" : "/admin/help"} className={styles.all}>
            All guides →
          </Link>
        </div>
      </dialog>
    </>
  );
}
