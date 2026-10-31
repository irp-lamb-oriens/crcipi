"use client";

import { useEffect, useState } from "react";
import type { LegalContent } from "@/content/types";
import EditableText from "@/components/cms/EditableText";
import { site } from "@/content/site";
import styles from "./LegalPage.module.scss";

// Utility reading mode for policies: a sticky table of contents that tracks
// the section in view, a reading-progress hairline, numbered sections with
// anchor links, and the contact line where people look for it. Every string
// stays CMS-editable so counsel's revisions don't need a deploy.
export default function LegalPage({ content, prefix }: { content: LegalContent; prefix: "privacy" | "terms" }) {
  const [active, setActive] = useState(0);
  const contents = content.updated.startsWith("Last") ? "Contents" : "Contenido";

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-legal-section]"));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(Number(visible[0].target.getAttribute("data-legal-section")));
      },
      { rootMargin: "-20% 0px -65% 0px" }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [content.sections.length]);

  return (
    <article className={styles.page}>
      <div className={styles.progress} aria-hidden="true" />
      <header className={styles.head}>
        <EditableText path={`${prefix}.eyebrow`} as="p" className="eyebrow">
          {content.eyebrow}
        </EditableText>
        <h1 className={styles.title}>
          <span className="lineMask">
            <EditableText path={`${prefix}.heading`} as="span">
              {content.heading}
            </EditableText>
          </span>
        </h1>
        <EditableText path={`${prefix}.updated`} as="p" className={styles.updated}>
          {content.updated}
        </EditableText>
      </header>

      <div className={styles.layout}>
        <nav className={styles.toc} aria-label={contents}>
          <p className={styles.tocTitle}>{contents}</p>
          <ol>
            {content.sections.map((section, i) => (
              <li key={i}>
                <a href={`#s-${i + 1}`} aria-current={active === i ? "true" : undefined}>
                  {section.heading}
                </a>
              </li>
            ))}
          </ol>
          <p className={styles.contact}>
            <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
          </p>
        </nav>

        <div className={styles.body}>
          <EditableText path={`${prefix}.intro`} as="p" multiline className={styles.intro}>
            {content.intro}
          </EditableText>
          {content.sections.map((section, i) => (
            <section key={i} id={`s-${i + 1}`} data-legal-section={i} className={styles.section}>
              <h2 className={styles.h2}>
                <EditableText path={`${prefix}.sections.${i}.heading`} as="span">
                  {section.heading}
                </EditableText>
                <a href={`#s-${i + 1}`} className={styles.anchor} aria-label={`Link to ${section.heading}`}>
                  #
                </a>
              </h2>
              {section.paragraphs.map((paragraph, j) => (
                <EditableText key={j} path={`${prefix}.sections.${i}.paragraphs.${j}`} as="p" multiline>
                  {paragraph}
                </EditableText>
              ))}
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}
