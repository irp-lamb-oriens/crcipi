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

  const serviceAccount = JSON.parse(loadServiceAccount());

  return initializeApp({
    credential: cert(serviceAccount),
  });
}

export const adminApp = getApp();
export const db = getFirestore(adminApp);