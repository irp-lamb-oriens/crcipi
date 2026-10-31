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
// What it only reports (a person decides; nothing is deleted):
//   3. Duplicate businesses: same owner and same name (ignoring case, accents
//      and spacing). Keep the one with reviews/verification, delete the rest
//      from "My businesses" or the admin Providers screen.
//   4. Listings without an owner, which no member can see in their dashboard.
//      Assign them in Admin → Users → Provider ownership.
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

function nameKey(name) {
  return String(name ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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
  const users = new Map((await db.collection("users").get()).docs.map((d) => [d.id, d.data().email]));
  let repaired = 0;
  const groups = new Map();
  const ownerless = [];

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

    if (!d.ownerId) ownerless.push(d.name ?? doc.id);
    else {
      const key = `${d.ownerId}::${nameKey(d.name)}`;
      groups.set(key, [...(groups.get(key) ?? []), { id: doc.id, ...d }]);
    }
  }

  const dupes = [...groups.values()].filter((g) => g.length > 1);
  console.log(`\n${repaired} listing(s) ${APPLY ? "repaired" : "need repair (run with --apply)"}.`);
  console.log(`\n${dupes.length} duplicate group(s):`);
  for (const g of dupes) {
    console.log(`  ${g[0].name} — owner ${users.get(g[0].ownerId) ?? g[0].ownerId}`);
    for (const p of g.sort((a, b) => (a.memberSince ?? 0) - (b.memberSince ?? 0))) {
      console.log(
        `    ${p.id}  created ${new Date(p.memberSince ?? 0).toISOString().slice(0, 10)}  reviews ${p.ratingsCount ?? 0}  ${p.verified ? "verified" : p.kycStatus ?? "none"}`
      );
    }
  }
  console.log(`\n${ownerless.length} listing(s) without an owner${ownerless.length ? ": " + ownerless.join(", ") : ""}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
