import "server-only";

import { randomUUID } from "crypto";
import { getStorage } from "firebase-admin/storage";
import { adminApp } from "@/lib/firebaseAdmin";

// ============================================================
// File uploads (Firebase Cloud Storage via the Admin SDK).
//
// Every object stays private in the bucket. Two prefixes exist:
//   private/...  -> KYC documents, CVs. Only reachable through short-lived
//                   signed URLs minted for an authorized viewer.
//   public/...   -> images meant for the public site (logos, article covers),
//                   streamed through /api/media/public/... by our own server
//                   so the bucket never needs public ACLs.
//
// Uploads are validated by size AND by magic bytes, never by the
// client-declared MIME type alone.
// Requires FIREBASE_STORAGE_BUCKET; without it uploads report "disabled"
// instead of crashing the request.
// ============================================================

// Netlify functions cap request bodies at ~6 MB, so stay under that.
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export type UploadKind = "document" | "image";

export const ACCEPTED_TYPES: Record<UploadKind, readonly string[]> = {
  document: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
  image: ["image/jpeg", "image/png", "image/webp"],
};

const EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export interface StoredFile {
  path: string;
  name: string;
  contentType: string;
  size: number;
  uploadedAt: number;
}

export function uploadsEnabled(): boolean {
  return !!process.env.FIREBASE_STORAGE_BUCKET;
}

function bucket() {
  const name = process.env.FIREBASE_STORAGE_BUCKET;
  if (!name) throw new Error("uploads_disabled");
  return getStorage(adminApp).bucket(name);
}

// Detects the real content type from the file's leading bytes.
export function sniffContentType(bytes: Uint8Array): string | null {
  const starts = (...sig: number[]) => sig.every((b, i) => bytes[i] === b);
  if (starts(0x25, 0x50, 0x44, 0x46)) return "application/pdf"; // %PDF
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (starts(0x89, 0x50, 0x4e, 0x47)) return "image/png";
  if (
    starts(0x52, 0x49, 0x46, 0x46) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export type UploadError = "disabled" | "too_large" | "empty" | "unsupported_type";

export type UploadResult =
  | { ok: true; file: StoredFile }
  | { ok: false; error: UploadError };

function safeName(name: string): string {
  return name.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "file";
}

// Stores a validated file under `${visibility}/${folder}/${uuid}.${ext}`.
export async function storeUpload(
  file: File,
  options: { kind: UploadKind; visibility: "private" | "public"; folder: string }
): Promise<UploadResult> {
  if (!uploadsEnabled()) return { ok: false, error: "disabled" };
  if (file.size === 0) return { ok: false, error: "empty" };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "too_large" };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = sniffContentType(bytes);
  if (!contentType || !ACCEPTED_TYPES[options.kind].includes(contentType)) {
    return { ok: false, error: "unsupported_type" };
  }

  const folder = options.folder.replace(/[^\w\-/]/g, "").replace(/^\/+|\/+$/g, "");
  const path = `${options.visibility}/${folder}/${randomUUID()}.${EXTENSIONS[contentType]}`;
  await bucket()
    .file(path)
    .save(Buffer.from(bytes), {
      contentType,
      resumable: false,
      metadata: { cacheControl: "private, max-age=0" },
    });

  return {
    ok: true,
    file: {
      path,
      name: safeName(file.name),
      contentType,
      size: file.size,
      uploadedAt: Date.now(),
    },
  };
}

// Short-lived download link for an authorized viewer of a private file.
export async function signedUrl(path: string, minutes = 10): Promise<string | null> {
  if (!uploadsEnabled() || !path.startsWith("private/")) return null;
  try {
    const [url] = await bucket()
      .file(path)
      .getSignedUrl({ action: "read", expires: Date.now() + minutes * 60 * 1000 });
    return url;
  } catch (error) {
    console.error("storage: failed to sign url", error);
    return null;
  }
}

export async function readPublicFile(
  path: string
): Promise<{ data: Buffer; contentType: string } | null> {
  if (!uploadsEnabled() || !path.startsWith("public/") || path.includes("..")) return null;
  try {
    const file = bucket().file(path);
    const [[data], [metadata]] = await Promise.all([file.download(), file.getMetadata()]);
    return { data, contentType: String(metadata.contentType ?? "application/octet-stream") };
  } catch {
    return null;
  }
}

export async function deleteStoredFile(path: string): Promise<void> {
  if (!uploadsEnabled()) return;
  await bucket()
    .file(path)
    .delete({ ignoreNotFound: true })
    .catch((error) => console.error("storage: delete failed", error));
}

export function publicMediaUrl(path: string): string {
  return `/api/media/${path}`;
}
