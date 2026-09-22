// Approves every provider in the directory, so businesses uploaded by members
// appear immediately without admin review.
//
// Usage:
//   node scripts/approve-all-providers.mjs
//
// Non-destructive: only sets `approved: true` on documents where it is false.
// No other field is touched.

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

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

async function main() {
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
  const providers = db.collection("providers");

  const snap = await providers.get();
  let approved = 0;

  for (const doc of snap.docs) {
    const data = doc.data() ?? {};
    if (data.approved === false) {
      await providers.doc(doc.id).update({ approved: true });
      approved += 1;
      console.log(`Approved ${data.name ?? doc.id}`);
    }
  }

  console.log(`\nDone. Approved ${approved} provider(s) out of ${snap.size}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});