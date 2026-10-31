"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ConsoleGate from "./ConsoleGate";
import { useSession } from "./useSession";
import { ADMIN_GUIDES, MEMBER_GUIDES, SITE_EDITING_HOWTO, type Guide } from "@/lib/guides";
import styles from "./Console.module.scss";
import help from "./HelpIndex.module.scss";

// Every module guide on one page: the members' (or the Chamber's) manual.
// "Save as PDF" prints it with a print stylesheet, so the manual is always
// generated from the same text as the in-module help.
export default function HelpIndex({ area }: { area: "member" | "admin" }) {
  const session = useSession();
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const guides = (area === "member" ? MEMBER_GUIDES : ADMIN_GUIDES) as Guide<string>[];

  useEffect(() => {
    if (session.status !== area) return;
    fetch(area === "member" ? "/api/member/progress" : "/api/admin/progress")
      .then((r) => (r.ok ? r.json() : { progress: {} }))
      .then((b) => setProgress(b.progress ?? {}))
      .catch(() => {});
  }, [session.status, area]);

  const gate = <ConsoleGate session={session} role={area} />;
  if (session.status !== area) return gate;

  const items = guides.flatMap((g) => g.checklist);
  const unique = Array.from(new Map(items.map((i) => [i.key, i])).values());
  const done = unique.filter((i) => progress[i.key]).length;

  return (
    <main className={styles.page}>
      <div className={`${styles.shell} ${help.shell}`}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>{area === "member" ? "Member manual" : "Chamber manual"}</p>
            <h1 className={styles.title}>Guides</h1>
            <p className={styles.subtitle}>
              Each module has the same help behind its &ldquo;How it works&rdquo; button. You have completed{" "}
              {done} of {unique.length} steps.
            </p>
          </div>
          <div className={`${styles.actions} ${help.noPrint}`}>
            <button type="button" className={styles.ghost} onClick={() => window.print()}>
              Save as PDF
            </button>
          </div>
        </header>

        <nav aria-label="Guides" className={`${help.toc} ${help.noPrint}`}>
          {guides.map((g, i) => (
            <a key={g.id} href={`#guide-${g.id}`}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              {g.title}
            </a>
          ))}
        </nav>

        {guides.map((g, i) => {
          const d = g.checklist.filter((c) => progress[c.key]).length;
          return (
            <section key={g.id} id={`guide-${g.id}`} className={help.guide} aria-labelledby={`h-${g.id}`}>
              <div className={help.guideHead}>
                <span className={help.num} aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h2 id={`h-${g.id}`} className={help.h2}>{g.title}</h2>
                  <p className={help.summary}>{g.summary}</p>
                </div>
                <Link href={g.href} className={`${help.open} ${help.noPrint}`}>
                  Open module →
                </Link>
              </div>

              <div className={help.cols}>
                <div>
                  <h3 className={help.h3}>
                    Checklist <span>{d}/{g.checklist.length}</span>
                  </h3>
                  <ul className={help.checks}>
                    {g.checklist.map((c) => (
                      <li key={c.key} className={progress[c.key] ? help.ok : ""}>
                        <span aria-hidden="true">{progress[c.key] ? "✓" : ""}</span>
                        {c.label}
                        <span className="srOnly">{progress[c.key] ? " (done)" : " (to do)"}</span>
                      </li>
                    ))}
                  </ul>
                  {g.faq.length ? (
                    <>
                      <h3 className={help.h3}>Questions</h3>
                      <dl className={help.faq}>
                        {g.faq.map((f) => (
                          <div key={f.q}>
                            <dt>{f.q}</dt>
                            <dd>{f.a}</dd>
                          </div>
                        ))}
                      </dl>
                    </>
                  ) : null}
                </div>
                <div>
                  {g.howtos.map((h) => (
                    <div key={h.title} className={help.howto}>
                      <h3 className={help.h3}>{h.title}</h3>
                      <ol>
                        {h.steps.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ol>
                    </div>
                  ))}
                  {area === "admin" && g.id === "routine" ? (
                    <div className={help.howto}>
                      <h3 className={help.h3}>{SITE_EDITING_HOWTO.title}</h3>
                      <ol>
                        {SITE_EDITING_HOWTO.steps.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
