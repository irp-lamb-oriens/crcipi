"use client";

import EditableText from "@/components/cms/EditableText";
import ScrollWords from "@/components/motion/ScrollWords";
import Seal from "@/components/brand/Seal";
import styles from "./MissionBlock.module.scss";

interface Props {
  eyebrow: string;
  heading: string;
  body: string;
}

// "We believe": the mission as one full-viewport sentence that brightens as
// it is read, with the seal pressed into the page beneath it.
export default function MissionBlock({ eyebrow, heading, body }: Props) {
  return (
    <section className={styles.section} aria-labelledby="mission-title">
      <Seal id="mission" size="lg" tone="ink" className={styles.watermark} label="" />
      <div className={styles.inner}>
        <p className="eyebrow">
          <EditableText path="about.mission.eyebrow" as="span">
            {eyebrow}
          </EditableText>
        </p>
        <EditableText path="about.mission.heading" as="h2" className="srOnly" id="mission-title">
          {heading}
        </EditableText>
        <ScrollWords path="about.mission.body" text={body} as="p" className={styles.statement} />
      </div>
    </section>
  );
}
