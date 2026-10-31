// READ-ONLY audit of business listings and their owners. Never writes.
//
// Usage:
//   node scripts/audit-providers.mjs
//
// Classifies every listing so the Chamber can see which ones are real:
//   - owner: a real member account, a missing account (owner id points
//     nowhere), a test/placeholder account, or none at all
//   - placeholder signals: seeded example data (example.com websites,
//     ".example" emails, ids from scripts/seed-providers.mjs), test domains
//   - possible duplicates: same normalised name, or same legal id hash
// Personal emails are masked in the output.

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function db() {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    return getFirestore(initializeApp({ projectId: process.env.GCLOUD_PROJECT || "demo-crcipi" }));
  }
  const raw =
    process.env.FIREBASE_SERVICE_ACCOUNT ??
    (existsSync(join(root, "serviceAccountKey.json")) ? readFileSync(join(root, "serviceAccountKey.json"), "utf8") : null);
  if (!raw) throw new Error("No service account.");
  let sa;
  try {
    sa = JSON.parse(raw);
  } catch {
    sa = JSON.parse(raw.replace(/\\n/g, "\n"));
  }
  return getFirestore(initializeApp({ credential: cert(sa) }));
}

const mask = (email) => {
  if (!email) return "—";
  const [u, d] = String(email).split("@");
  return `${u.slice(0, 1)}***@${d ?? ""}`;
};
const nameKey = (n) =>
  String(n ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const SEED_IDS = new Set(
  [...readFileSync(join(root, "scripts/seed-providers.mjs"), "utf8").matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1])
);
const TEST = /(example\.|\.example\b|@test\.|test@|demo|placeholder|lorem|asdf|prueba)/i;

const store = db();
const [providers, users] = await Promise.all([store.collection("providers").get(), store.collection("users").get()]);
const userById = new Map(users.docs.map((d) => [d.id, d.data()]));

const rows = providers.docs.map((doc) => {
  const p = doc.data() ?? {};
  const owner = p.ownerId ? userById.get(p.ownerId) : null;
  const ownerState = !p.ownerId
    ? "none"
    : !owner
      ? "missing-account"
      : TEST.test(owner.email ?? "")
        ? "test-account"
        : owner.status === "suspended"
          ? "suspended"
          : owner.role === "admin"
            ? "admin"
            : "member";
  const signals = [];
  if (SEED_IDS.has(doc.id)) signals.push("seed id");
  if (TEST.test(`${p.website ?? ""} ${p.email ?? ""}`)) signals.push("example/test contact");
  if (TEST.test(p.name ?? "")) signals.push("test-like name");
  if (!p.descriptionEn && !p.descriptionEs) signals.push("no description");
  return {
    id: doc.id,
    name: p.name ?? "(no name)",
    key: nameKey(p.name),
    legal: p.legalIdKey ?? null,
    approved: p.approved !== false,
    verified: p.verified === true,
    reviews: p.ratingsCount ?? 0,
    created: p.memberSince ? new Date(p.memberSince).toISOString().slice(0, 10) : "?",
    ownerState,
    ownerEmail: owner?.email ?? null,
    signals,
  };
});

const byState = {};
for (const r of rows) (byState[r.ownerState] ??= []).push(r);
console.log(`${rows.length} listings · ${users.size} user accounts\n`);
for (const [state, list] of Object.entries(byState)) {
  console.log(`== owner: ${state} (${list.length})`);
  for (const r of list.sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(
      `  ${r.name}  [${r.id}]  ${r.approved ? "listed" : "hidden"}${r.verified ? " ✓verified" : ""}  reviews ${r.reviews}  created ${r.created}  owner ${mask(r.ownerEmail)}${r.signals.length ? "  ⚑ " + r.signals.join(", ") : ""}`
    );
  }
  console.log("");
}
const groups = new Map();
for (const r of rows) {
  for (const k of [r.key && `name:${r.key}`, r.legal && `legal:${r.legal}`].filter(Boolean)) {
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
}
const dupes = [...groups.entries()].filter(([, g]) => g.length > 1);
console.log(`== possible duplicates (${dupes.length})`);
for (const [k, g] of dupes) {
  console.log(`  ${k.startsWith("legal") ? "same legal id" : "same name"}: ${g.map((r) => `${r.name} [${r.id}] owner:${r.ownerState}`).join("  |  ")}`);
}
