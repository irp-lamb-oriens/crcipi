"use client";

import { useCms } from "./CmsProvider";
import EditableText from "./EditableText";
import styles from "./AnnouncementBanner.module.scss";

// Live-stream / announcement banner shown above the fold.
//
// Reads `announcement.*` from CMS state. In view mode it renders only when
// `announcement.enabled` is true; in edit mode it always renders so the admin
// can edit and toggle it. The destination URL and label are editable only in
// edit mode.
export default function AnnouncementBanner() {
  const { editMode, getValue, update } = useCms();

  const enabled = Boolean(getValue("announcement.enabled"));
  const linkUrl = String(getValue("announcement.linkUrl") ?? "");
  const linkLabel = String(getValue("announcement.linkLabel") ?? "");

  if (!enabled && !editMode) return null;

  const toggle = (event: React.MouseEvent) => {
    event.preventDefault();
    update("announcement.enabled", !enabled);
  };

  return (
    <aside className={styles.banner}>
      <div className={styles.inner}>
        <div className={styles.content}>
          <span className={styles.eyebrow}>
            <EditableText path="announcement.eyebrow" as="span">
              {String(getValue("announcement.eyebrow") ?? "")}
            </EditableText>
          </span>
          <strong className={styles.title}>
            <EditableText path="announcement.title" as="span">
              {String(getValue("announcement.title") ?? "")}
            </EditableText>
          </strong>
          <span className={styles.body}>
            <EditableText path="announcement.body" as="span">
              {String(getValue("announcement.body") ?? "")}
            </EditableText>
          </span>
        </div>

        <div className={styles.right}>
          {editMode ? (
            <div className={styles.urlRow}>
              <span className={styles.urlLabel}>Link URL</span>
              <EditableText path="announcement.linkUrl" as="span" className={styles.urlHint}>
                {linkUrl || "(no link)"}
              </EditableText>
            </div>
          ) : null}

          {linkUrl ? (
            <a className={styles.link} href={linkUrl} target="_blank" rel="noopener noreferrer">
              {linkLabel}
            </a>
          ) : null}

          {editMode ? (
            <button type="button" className={styles.toggle} onClick={toggle}>
              {enabled ? "Visible to visitors" : "Hidden from visitors"}
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  );
}