"use client";

import { useEffect } from "react";
import { useCms } from "./CmsProvider";
import styles from "./AdminBar.module.scss";

// Floating CMS control bar.
//
// - Signed out: shows a compact "Sign in" link to /admin.
// - Signed in but not editing: shows "Edit" plus status.
// - Editing: shows Save/Undo/Redo/Done/Logout plus save state.
export default function AdminBar() {
  const {
    authed,
    email,
    editMode,
    saveState,
    canUndo,
    canRedo,
    setEditMode,
    undo,
    redo,
    saveNow,
    logout,
  } = useCms();

  // Escape exits edit mode without saving a focused field.
  useEffect(() => {
    if (!editMode) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setEditMode(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editMode, setEditMode]);

  // `authed` is admin-only (see CmsProvider), so a member or anonymous visitor
  // gets no CMS chrome at all. Sign-in lives in the site header instead.
  if (!authed) return null;

  const dashboardLink = (
    <a className={styles.link} href="/admin/dashboard">
      Dashboard
    </a>
  );

  const providersLink = (
    <a className={styles.link} href="/admin/providers">
      Providers
    </a>
  );

  const usersLink = (
    <a className={styles.link} href="/admin/users">
      Users
    </a>
  );

  return (
    <div className={styles.bar}>
      <span className={styles.brand}>
        CR-CIPI CMS
        {email ? <span className={styles.email}>{email}</span> : null}
      </span>

      {dashboardLink}
      {providersLink}
      {usersLink}

      {!editMode ? (
        <button
          type="button"
          className={styles.primary}
          onClick={() => setEditMode(true)}
        >
          Edit page
        </button>
      ) : (
        <>
          <button type="button" className={styles.btn} onClick={undo} disabled={!canUndo}>
            Undo
          </button>
          <button type="button" className={styles.btn} onClick={redo} disabled={!canRedo}>
            Redo
          </button>
          <button
            type="button"
            className={styles.primary}
            onClick={() => void saveNow()}
            disabled={saveState === "saving"}
          >
            {saveState === "saving"
              ? "Saving\u2026"
              : saveState === "saved"
                ? "Saved"
                : "Save"}
          </button>
          {saveState === "error" ? <span className={styles.error}>Save failed</span> : null}
          <button
            type="button"
            className={styles.btn}
            onClick={() => setEditMode(false)}
          >
            Done
          </button>
        </>
      )}

      <button type="button" className={styles.ghost} onClick={() => void logout()}>
        Log out
      </button>
    </div>
  );
}