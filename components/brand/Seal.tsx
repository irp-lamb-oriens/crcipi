import styles from "./Seal.module.scss";

interface Props {
  /** Unique per page (SVG ids are document-global). */
  id: string;
  label?: string;
  ring?: string;
  size?: "sm" | "md" | "lg";
  tone?: "ink" | "trust" | "on-dark";
  /** Rotate with page scroll (CSS scroll-driven; static under reduced motion). */
  spin?: boolean;
  className?: string;
}

// The brand mark: an embossed passport stamp. Text sits on a circular path
// so it stays real, selectable, translatable text.
export default function Seal({
  id,
  label = "CR-CIPI trust seal",
  ring = "CR-CIPI · SELLO DE CONFIANZA · COSTA RICA · ",
  size = "md",
  tone = "trust",
  spin = true,
  className,
}: Props) {
  const pathId = `seal-path-${id}`;
  return (
    <span
      className={`${styles.seal} ${styles[size]} ${styles[tone.replace("-", "")]} ${spin ? styles.spin : ""} ${className ?? ""}`}
      role={label ? "img" : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
    >
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <defs>
          <path id={pathId} d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
        </defs>
        <circle cx="100" cy="100" r="97" className={styles.outer} />
        <circle cx="100" cy="100" r="62" className={styles.inner} />
        <g className={styles.ringText}>
          <text>
            <textPath href={`#${pathId}`} textLength="488" lengthAdjust="spacing">
              {ring}
            </textPath>
          </text>
        </g>
        <g className={styles.core}>
          <text x="100" y="96" textAnchor="middle" className={styles.mono}>
            CR
          </text>
          <text x="100" y="128" textAnchor="middle" className={styles.year}>
            ✓ VERIFICADO
          </text>
        </g>
      </svg>
    </span>
  );
}
