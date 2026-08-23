// Adds one or more admin emails to the CMS auth allowlist.
//
// Usage:
//   node scripts/seed-admin.mjs you@example.com
//   node scripts/seed-admin.mjs you@example.com another@example.com
//
// Reads the Firebase service account exactly the way the app does:
//   1. FIREBASE_SERVICE_ACCOUNT env var, or
//   2. serviceAccountKey.json in the project root.
//
// Admin emails are stored hashed (SHA-256) under:
//   auth/adminEmails/emails/{sha256(normalized-email)}

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function emailKey(email) {
  return createHash("sha256").update(normalizeEmail(email)).digest("hex");
}

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return process.env.FIREBASE_SERVICE_ACCOUNT;
  }
  const filePath = join(root, "serviceAccountKey.json");
  if (existsSync(filePath)) {
    return readFileSync(filePath, "utf8");
  }
  throw new Error(
    "Firebase service account not found. Set FIREBASE_SERVICE_ACCOUNT or add serviceAccountKey.json in the project root."
  );
}

const emails = process.argv.slice(2).filter(Boolean);
if (emails.length === 0) {
  console.error(
    "Usage: node scripts/seed-admin.mjs you@example.com [another@example.com]"
  );
  process.exit(1);
}

let raw;
try {
  raw = loadServiceAccount();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(raw);
} catch {
  serviceAccount = JSON.parse(raw.replace(/\\n/g, "\n"));
}

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);
const col = db.collection("auth").doc("adminEmails").collection("emails");

for (const email of emails) {
  const normalized = normalizeEmail(email);
  await col.doc(emailKey(normalized)).set({
    email: normalized,
    createdAt: Date.now(),
  });
  console.log(`Added admin: ${normalized}`);
}

console.log("Done.");
process.exit(0);