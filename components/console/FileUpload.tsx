"use client";

import { useId, useRef, useState } from "react";
import styles from "./Console.module.scss";

export interface UploadedFile {
  path: string;
  name: string;
  contentType: string;
  size: number;
  uploadedAt: number;
  url?: string;
}

const ERRORS: Record<string, string> = {
  disabled: "File uploads are not enabled on this site yet.",
  too_large: "The file is larger than 5 MB.",
  empty: "The file is empty.",
  unsupported_type: "Unsupported file type. Use PDF, JPG, PNG or WebP.",
  rate_limited: "Too many uploads. Wait a minute and try again.",
  unauthorized: "Your session expired. Sign in again.",
};

// Uploads each file the moment it is chosen (no separate "upload" step), then
// reports the stored file to the parent.
export default function FileUpload({
  kind,
  label,
  accept,
  onUploaded,
  disabled,
}: {
  kind: "document" | "image";
  label: string;
  accept?: string;
  onUploaded: (file: UploadedFile) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setState("uploading");
    setError(null);
    const body = new FormData();
    body.append("file", file);
    body.append("kind", kind);
    try {
      const res = await fetch("/api/member/uploads", { method: "POST", body });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setState("error");
        setError(ERRORS[data?.error as string] ?? "Upload failed. Try again.");
        return;
      }
      onUploaded(data.file as UploadedFile);
      setState("idle");
    } catch {
      setState("error");
      setError("Upload failed. Check your connection.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <div className={styles.upload}>
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept ?? (kind === "image" ? "image/jpeg,image/png,image/webp" : "application/pdf,image/jpeg,image/png,image/webp")}
          disabled={disabled || state === "uploading"}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <span className={styles.help} aria-live="polite">
          {state === "uploading" ? "Uploading…" : "Max 5 MB. Uploads automatically."}
        </span>
      </div>
      {error ? <p className={styles.fieldError}>{error}</p> : null}
    </div>
  );
}
