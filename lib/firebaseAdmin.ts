import "server-only";

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Loads the Firebase service account from the local file (development) or
// from the FIREBASE_SERVICE_ACCOUNT env var (production, e.g. Netlify).
//
// TODO: set the FIREBASE_SERVICE_ACCOUNT environment variable on the host
// to the JSON contents of serviceAccountKey.json before going live.
function loadServiceAccount(): string {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return process.env.FIREBASE_SERVICE_ACCOUNT;
  }

  // Local development: read the gitignored service account file.
  const filePath = join(process.cwd(), "serviceAccountKey.json");
  if (existsSync(filePath)) {
    return readFileSync(filePath, "utf8");
  }

  throw new Error(
    "Firebase service account not found. Set FIREBASE_SERVICE_ACCOUNT or add serviceAccountKey.json."
  );
}

function getApp() {
  const existing = getApps()[0];
  if (existing) {
    return existing;
  }

  // Parse the service account JSON. The same single-line string is pasted
  // into both the local .env and the Netlify dashboard, but macOS and
  // Netlify's Linux servers can disagree on whether "\n" arrives as a literal
  // backslash-n or as a real newline. Strategy:
  //   1. Try JSON.parse directly. This works for the local serviceAccountKey.json
  //      file (valid JSON, private key uses \n escapes) and for env vars that
  //      arrive already-correct.
  //   2. If that fails, the env var likely arrived with literal "\n" sequences
  //      that must become real newlines before parsing. Normalize and retry.
  const raw = loadServiceAccount();
  let serviceAccount: Record<string, unknown>;
  try {
    serviceAccount = JSON.parse(raw);
  } catch {
    serviceAccount = JSON.parse(raw.replace(/\\n/g, "\n"));
  }

  return initializeApp({
    credential: cert(serviceAccount),
  });
}

export const adminApp = getApp();
export const db = getFirestore(adminApp);