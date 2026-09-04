// Seeds the member provider directory with realistic CR-CIPI example members.
//
// Usage:
//   node scripts/seed-providers.mjs
//
// Idempotent: each provider uses a stable slug-derived document id, so re-running
// updates the seeded entries instead of duplicating them.
//
// IMPORTANT: these are EXAMPLE entries to make the directory usable on first
// run. Replace them with the Chamber's real member providers from the admin UI
// (/admin/providers) or by editing the SEED list below and re-running.
//
// Ratings are seeded pre-approved and the provider's ratingsCount/ratingsSum are
// set to match, so star averages render without any moderation step.

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

// Slug -> provider document. Ratings are defined inline; the aggregate fields
// are derived from them so star averages are always consistent.
const SEED = [
  {
    slug: "solis-asociados",
    name: "Solís & Asociados",
    category: "law",
    featured: true,
    descriptionEn:
      "Full-service law firm serving international residents and investors, from residency and corporate matters to real estate transactions.",
    descriptionEs:
      "Bufete de servicio completo para residentes e inversionistas internacionales: residencia, asuntos corporativos y transacciones inmobiliarias.",
    website: "https://example.com/solis",
    email: "contacto@solisasociados.example",
    phone: "+506 2222 1111",
    location: "San José, Costa Rica",
    ratings: [
      { rating: 5, reviewerName: "María G.", comment: "Clear, thorough and responsive throughout our residency process." },
      { rating: 5, reviewerName: "Robert T.", comment: "Made buying property feel straightforward." },
      { rating: 4, reviewerName: "Andrés P.", comment: "Very professional team." },
    ],
  },
  {
    slug: "costarica-residency-group",
    name: "Costa Rica Residency Group",
    category: "immigration",
    featured: true,
    descriptionEn:
      "Immigration specialists guiding investors, rentistas, pensionados and families through Costa Rican residency.",
    descriptionEs:
      "Especialistas en migración que acompañan a inversionistas, rentistas, pensionados y familias en su residencia en Costa Rica.",
    website: "https://example.com/residency",
    email: "hola@residencycr.example",
    phone: "+506 2222 2222",
    location: "Escazú, Costa Rica",
    ratings: [
      { rating: 5, reviewerName: "Linda H.", comment: "Patient and knowledgeable from start to finish." },
    ],
  },
  {
    slug: "pacifico-realty",
    name: "Pacífico Realty",
    category: "real-estate",
    featured: false,
    descriptionEn:
      "Coastal and mountain real estate brokerage for international buyers and families relocating to Costa Rica.",
    descriptionEs:
      "Correduría inmobiliaria de costa y montaña para compradores internacionales y familias que se mudan a Costa Rica.",
    website: "https://example.com/pacifico",
    email: "info@pacificorealty.example",
    phone: "+506 2222 3333",
    location: "Santa Teresa, Costa Rica",
    ratings: [
      { rating: 5, reviewerName: "David K.", comment: "Found us exactly the property we were hoping for." },
      { rating: 4, reviewerName: "Sofía R.", comment: "Good market knowledge and honest advice." },
    ],
  },
  {
    slug: "tico-tax-advisors",
    name: "TicoTax Advisors",
    category: "tax",
    featured: false,
    descriptionEn:
      "Accounting and tax advisory for international investors, digital nomads and new residents.",
    descriptionEs:
      "Contabilidad y asesoría fiscal para inversionistas internacionales, nómadas digitales y nuevos residentes.",
    website: "https://example.com/ticotax",
    email: "info@ticotax.example",
    phone: "+506 2222 4444",
    location: "San José, Costa Rica",
    ratings: [
      { rating: 4, reviewerName: "Elena M.", comment: "Clear on the tax obligations before I committed." },
    ],
  },
  {
    slug: "monteverde-capital",
    name: "Monteverde Capital",
    category: "investments",
    featured: false,
    descriptionEn:
      "Investment advisory for private capital, real estate funds and wealth planning.",
    descriptionEs:
      "Asesoría de inversiones para capital privado, fondos inmobiliarios y planificación patrimonial.",
    website: "https://example.com/monteverde",
    email: "info@monteverdecapital.example",
    phone: "+506 2222 5555",
    location: "San José, Costa Rica",
    ratings: [],
  },
  {
    slug: "puravida-relocation",
    name: "Pura Vida Relocation",
    category: "relocation",
    featured: false,
    descriptionEn:
      "End-to-end relocation services: housing, schooling, paperwork and settling in.",
    descriptionEs:
      "Servicios de relocalización integral: vivienda, educación, trámites y adaptación.",
    website: "https://example.com/puravida",
    email: "hola@puravidarelocation.example",
    phone: "+506 2222 6666",
    location: "Tamarindo, Costa Rica",
    ratings: [],
  },
  {
    slug: "volcan-insurance",
    name: "Volcán Insurance Brokers",
    category: "insurance",
    featured: false,
    descriptionEn:
      "Health, property and life insurance for international residents and families.",
    descriptionEs:
      "Seguros de salud, propiedad y vida para residentes internacionales y familias.",
    website: "https://example.com/volcan",
    email: "info@volcaninsurance.example",
    phone: "+506 2222 7777",
    location: "Heredia, Costa Rica",
    ratings: [],
  },
  {
    slug: "sendero-healthcare",
    name: "Sendero Healthcare",
    category: "healthcare",
    featured: true,
    descriptionEn:
      "Private healthcare coordination and bilingual care for the expat and investor community.",
    descriptionEs:
      "Coordinación de salud privada y atención bilingüe para la comunidad de expatriados e inversionistas.",
    website: "https://example.com/sendero",
    email: "info@senderohealth.example",
    phone: "+506 2222 8888",
    location: "Escazú, Costa Rica",
    ratings: [
      { rating: 5, reviewerName: "James W.", comment: "Outstanding bilingual care." },
      { rating: 5, reviewerName: "Paula L.", comment: "Fast, kind and professional." },
    ],
  },
];

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

  let created = 0;
  let updated = 0;

  for (const seed of SEED) {
    const { ratings, ...fields } = seed;
    const now = Date.now();
    const id = seed.slug;
    const existing = await providers.doc(id).get();

    // Upsert seed reviews. Seed review ids are stable (`seed-N`), so re-running
    // refreshes them without duplicating. Hand-added reviews are never touched.
    for (let i = 0; i < ratings.length; i++) {
      const rating = ratings[i];
      const ratingRef = providers.doc(id).collection("ratings").doc(`seed-${i + 1}`);
      await ratingRef.set({
        rating: rating.rating,
        reviewerName: rating.reviewerName,
        comment: rating.comment ?? null,
        approved: true,
        createdAt: now,
      });
    }

    // Recompute the aggregate from the REAL subcollection (every approved review,
    // including any an admin added since the last seed) so the seed never clobbers
    // hand-approved reviews or their counts.
    const approvedSnap = await providers
      .doc(id)
      .collection("ratings")
      .where("approved", "==", true)
      .get();
    const ratingsCount = approvedSnap.size;
    const ratingsSum = approvedSnap.docs.reduce(
      (sum, doc) => sum + Number(doc.data().rating ?? 0),
      0
    );

    // Create: write the full field set. Update: only refresh the editable content
    // fields and the derived aggregate, and preserve anything an admin changed
    // (approved, featured, logoUrl, memberSince) so the seed is non-destructive.
    const data = existing.exists
      ? {
          name: fields.name,
          category: fields.category,
          descriptionEn: fields.descriptionEn,
          descriptionEs: fields.descriptionEs,
          website: fields.website,
          email: fields.email,
          phone: fields.phone,
          location: fields.location,
          ratingsCount,
          ratingsSum,
        }
      : {
          name: fields.name,
          category: fields.category,
          descriptionEn: fields.descriptionEn,
          descriptionEs: fields.descriptionEs,
          website: fields.website,
          email: fields.email,
          phone: fields.phone,
          location: fields.location,
          featured: fields.featured,
          approved: true,
          memberSince: now,
          ratingsCount,
          ratingsSum,
        };

    await providers.doc(id).set(data, { merge: true });

    if (existing.exists) updated += 1;
    else created += 1;
    console.log(
      `${existing.exists ? "Updated" : "Created"} ${fields.name} (${ratingsCount} ratings, avg ${
        ratingsCount ? (ratingsSum / ratingsCount).toFixed(1) : "n/a"
      })`
    );
  }

  console.log(`\nDone. ${created} created, ${updated} updated.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});