// Repairs business listings damaged by the old "My businesses" form.
//
// Usage:
//   node scripts/repair-providers.mjs           # preview only, changes nothing
//   node scripts/repair-providers.mjs --apply   # write the repairs
//
// What it fixes (with --apply):
//   1. Logos saved as "https:///api/media/..." (an uploaded file with
//      "https://" glued on) are restored to "/api/media/...".
//   2. Optional fields saved as empty strings are removed.
//
// New duplicates are prevented at creation ("already listed?" warning), and
// unclaimed/placeholder listings are shown in Admin → Members → Unclaimed.
// For a read-only overview of existing listings: npm run audit:providers
//
// Reads the Firebase service account the same way the app does.

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const APPLY = process.argv.includes("--apply");
const OPTIONAL = ["website", "email", "phone", "location", "logoUrl"];

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) return process.env.FIREBASE_SERVICE_ACCOUNT;
  const filePath = join(root, "serviceAccountKey.json");
  if (existsSync(filePath)) return readFileSync(filePath, "utf8");
  throw new Error("Firebase service account not found. Set FIREBASE_SERVICE_ACCOUNT or add serviceAccountKey.json.");
}

async function main() {
  let db;
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    db = getFirestore(initializeApp({ projectId: process.env.GCLOUD_PROJECT || "demo-crcipi" }));
  } else {
    const raw = loadServiceAccount();
    let sa;
    try {
      sa = JSON.parse(raw);
    } catch {
      sa = JSON.parse(raw.replace(/\\n/g, "\n"));
    }
    db = getFirestore(initializeApp({ credential: cert(sa) }));
  }

  const snap = await db.collection("providers").get();
  let repaired = 0;

  for (const doc of snap.docs) {
    const d = doc.data() ?? {};
    const patch = {};
    if (typeof d.logoUrl === "string" && /^https?:\/\/\/api\/media\//.test(d.logoUrl)) {
      patch.logoUrl = d.logoUrl.replace(/^https?:\/\//, "");
    }
    for (const key of OPTIONAL) {
      if (d[key] === "" || d[key] === null) patch[key] = FieldValue.delete();
    }
    if (Object.keys(patch).length) {
      repaired += 1;
      console.log(`${APPLY ? "Repaired" : "Would repair"} ${d.name ?? doc.id}: ${Object.keys(patch).join(", ")}`);
      if (APPLY) await doc.ref.set(patch, { merge: true });
    }

  }

  console.log(`\n${repaired} listing(s) ${APPLY ? "repaired" : "need repair (run with --apply)"}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
