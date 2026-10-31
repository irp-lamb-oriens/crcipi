// Full platform round-trip against the Firebase emulators. NEVER point at production.
//   1. npx firebase-tools emulators:start --only firestore,storage --project demo-crcipi
//   2. FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199 \
//      FIREBASE_STORAGE_BUCKET=demo-crcipi.appspot.com SMTP_USER= SMTP_PASS= npm run build && npx next start -p 3100
//   3. FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/checks/platform.e2e.mjs
// End-to-end check against the Firestore + Storage emulators (never production).
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { createRequire } from "node:module";
const require = createRequire(process.cwd() + "/package.json");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

assert.ok(process.env.FIRESTORE_EMULATOR_HOST, "emulator only");
const db = getFirestore(initializeApp({ projectId: "demo-crcipi" }));
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const sha = (v) => createHash("sha256").update(v).digest("hex");

async function seedUser(email, role, permissions = []) {
  const id = sha(email);
  await db.collection("users").doc(id).set({ email, name: email.split("@")[0], role, permissions, status: "active", createdAt: Date.now() });
  const token = randomBytes(16).toString("hex");
  await db.collection("auth").doc("sessions").collection("tokens").doc(token).set({ userId: id, email, role, expiresAt: Date.now() + 3600e3 });
  return { id, cookie: `crcipi_cms_session=${token}` };
}

async function call(path, { method = "GET", cookie, json, form, ip } = {}) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  if (json) headers["content-type"] = "application/json";
  headers["x-forwarded-for"] = ip ?? `10.0.0.${Math.floor(Math.random() * 250)}`;
  const res = await fetch(BASE + path, { method, headers, body: json ? JSON.stringify(json) : form, redirect: "manual" });
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

const results = [];
async function step(name, fn) {
  try { await fn(); results.push(["PASS", name]); }
  catch (e) { results.push(["FAIL", name, e.message]); }
}

// Old-style admin: only the original five permissions (tests inheritance).
const admin = await seedUser("admin@test.cr", "admin", ["content.manage", "providers.manage", "ratings.moderate", "users.manage", "permissions.manage"]);
const limitedAdmin = await seedUser("limited@test.cr", "admin", ["users.manage"]);
const alice = await seedUser("alice@test.cr", "member");
const bob = await seedUser("bob@test.cr", "member");

const pdf = new Blob([Buffer.from("%PDF-1.4\n%test\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF")], { type: "application/pdf" });
const png = new Blob([Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000", "hex")], { type: "image/png" });
let providerId, jobId, articleSlug, articleId, docFile, coverUrl;

await step("anonymous member APIs are 401", async () => {
  for (const p of ["/api/member/jobs", "/api/member/articles", "/api/member/overview"]) assert.equal((await call(p)).status, 401, p);
});
await step("member cannot reach admin APIs", async () => {
  for (const p of ["/api/admin/overview", "/api/admin/kyc", "/api/admin/jobs", "/api/admin/articles"]) assert.equal((await call(p, { cookie: alice.cookie })).status, 401, p);
});
await step("admin without new perms is blocked from KYC queue", async () => {
  assert.equal((await call("/api/admin/kyc", { cookie: limitedAdmin.cookie })).status, 401);
});
await step("alice creates a real-estate business", async () => {
  const r = await call("/api/member/providers", { method: "POST", cookie: alice.cookie, json: { name: "Casa Tica Realty", category: "real-estate", descriptionEn: "Real estate for expats", descriptionEs: "Bienes raíces para extranjeros", email: "hi@casatica.cr" } });
  assert.equal(r.status, 201, JSON.stringify(r.body)); providerId = r.body.provider.id;
});
await step("upload rejects a fake PDF (magic bytes)", async () => {
  const f = new FormData(); f.append("file", new Blob(["hello"], { type: "application/pdf" }), "x.pdf"); f.append("kind", "document");
  const r = await call("/api/member/uploads", { method: "POST", cookie: alice.cookie, form: f });
  assert.equal(r.status, 415, JSON.stringify(r.body));
});
await step("alice uploads a KYC document", async () => {
  const f = new FormData(); f.append("file", pdf, "personeria.pdf"); f.append("kind", "document");
  const r = await call("/api/member/uploads", { method: "POST", cookie: alice.cookie, form: f });
  assert.equal(r.status, 201, JSON.stringify(r.body)); docFile = r.body.file;
  assert.ok(docFile.path.startsWith(`private/kyc/${alice.id}/`));
});
await step("KYC submit enforces SUGEF license for real estate + required docs", async () => {
  const r = await call(`/api/member/providers/${providerId}/kyc`, { method: "PUT", cookie: alice.cookie, json: { submit: true, legalName: "Casa Tica S.A.", legalIdType: "juridica", legalId: "3-101-123456", legalRepresentative: "Alice", foundedYear: 2015, employees: "2-9", licenses: [], documents: [{ kind: "incorporation", ...docFile }], declaration: true } });
  assert.equal(r.status, 422); assert.equal(r.body.errors.licenses, "required:sugef"); assert.match(r.body.errors.documents, /missing:legal_rep_id/);
});
await step("bob cannot read or attach alice's KYC", async () => {
  assert.equal((await call(`/api/member/providers/${providerId}/kyc`, { cookie: bob.cookie })).status, 403);
});
await step("alice submits complete KYC", async () => {
  const r = await call(`/api/member/providers/${providerId}/kyc`, { method: "PUT", cookie: alice.cookie, json: { submit: true, legalName: "Casa Tica S.A.", legalIdType: "juridica", legalId: "3-101-123456", legalRepresentative: "Alice", foundedYear: 2015, employees: "2-9", licenses: [{ regulator: "sugef", number: "CR-123" }], documents: [{ kind: "incorporation", ...docFile }, { kind: "legal_rep_id", ...docFile }], declaration: true } });
  assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.kyc.status, "submitted"); assert.equal(r.body.kyc.legalId, "3101123456");
});
await step("admin (inherited kyc.review) sees queue with signed doc links and verifies", async () => {
  const q = await call("/api/admin/kyc", { cookie: admin.cookie });
  assert.equal(q.status, 200); assert.ok(q.body.providers.some((p) => p.id === providerId && p.kycStatus === "submitted"));
  const d = await call(`/api/admin/kyc/${providerId}`, { cookie: admin.cookie });
  assert.ok(d.body.kyc.documents[0].url, "signed url");
  const v = await call(`/api/admin/kyc/${providerId}`, { method: "POST", cookie: admin.cookie, json: { decision: "verify" } });
  assert.equal(v.status, 200); assert.equal(v.body.kyc.status, "verified");
});
await step("directory shows Verified badge without leaking KYC data", async () => {
  const r = await call("/en/directory");
  assert.equal(r.status, 200); assert.match(r.body, /Casa Tica Realty/); assert.match(r.body, /Verified/);
  assert.doesNotMatch(r.body, /3101123456|Casa Tica S\.A\./);
});
await step("job validation + publish", async () => {
  const bad = await call("/api/member/jobs", { method: "POST", cookie: alice.cookie, json: { providerId, title: "", description: "short", applyEmail: "nope" } });
  assert.equal(bad.status, 422);
  const stolen = await call("/api/member/jobs", { method: "POST", cookie: bob.cookie, json: { providerId, title: "X", location: "SJ", description: "d".repeat(100), applyEmail: "b@b.cr", status: "published" } });
  assert.equal(stolen.status, 422); assert.equal(stolen.body.errors.providerId, "not_yours");
  const r = await call("/api/member/jobs", { method: "POST", cookie: alice.cookie, json: { providerId, title: "Bilingual Real Estate Agent", employmentType: "full-time", workMode: "hybrid", location: "Escazú", description: "Help international clients find homes in the Central Valley. ".repeat(3), requirements: "- English and Spanish\n- 2 years experience", salaryMin: 1500, salaryMax: 2500, salaryCurrency: "USD", salaryPeriod: "month", applyEmail: "jobs@casatica.cr", status: "published" } });
  assert.equal(r.status, 201, JSON.stringify(r.body)); jobId = r.body.job.id; assert.ok(r.body.job.expiresAt > Date.now());
});
await step("public board + detail (ES path) + JSON-LD", async () => {
  const list = await call("/es/empleos"); assert.equal(list.status, 200); assert.match(list.body, /Bilingual Real Estate Agent/);
  const d = await call(`/es/empleos/${jobId}`); assert.equal(d.status, 200); assert.match(d.body, /"@type":"JobPosting"/); assert.match(d.body, /Proveedor verificado/);
});
await step("apply with CV; honeypot swallowed; validation", async () => {
  const bad = new FormData(); bad.append("name", "Z"); bad.append("email", "z"); bad.append("message", "hi"); bad.append("consent", "true");
  assert.equal((await call(`/api/jobs/${jobId}/apply`, { method: "POST", form: bad })).status, 422);
  const hp = new FormData(); hp.append("website", "spam"); hp.append("name", "Bot");
  assert.equal((await call(`/api/jobs/${jobId}/apply`, { method: "POST", form: hp })).status, 201);
  const f = new FormData(); f.append("name", "Carlos Mora"); f.append("email", "carlos@mail.cr"); f.append("message", "I have 3 years selling to US buyers in Escazú."); f.append("consent", "true"); f.append("cv", pdf, "cv.pdf");
  const r = await call(`/api/jobs/${jobId}/apply`, { method: "POST", form: f });
  assert.equal(r.status, 201, JSON.stringify(r.body));
});
await step("only the owner sees applicants (with CV link)", async () => {
  assert.equal((await call(`/api/member/jobs/${jobId}/applications`, { cookie: bob.cookie })).status, 403);
  const r = await call(`/api/member/jobs/${jobId}/applications`, { cookie: alice.cookie });
  assert.equal(r.body.applications.length, 1); assert.ok(r.body.applications[0].cv.url);
  const mv = await call(`/api/member/jobs/${jobId}/applications/${r.body.applications[0].id}`, { method: "PATCH", cookie: alice.cookie, json: { status: "shortlisted" } });
  assert.equal(mv.status, 200);
});
await step("job counters: 1 view, 1 application", async () => {
  await new Promise((r) => setTimeout(r, 500));
  const r = await call("/api/member/jobs", { cookie: alice.cookie });
  const j = r.body.jobs.find((x) => x.id === jobId); assert.equal(j.applicationsCount, 1); assert.ok(j.viewsCount >= 1);
});
await step("admin takedown hides job and locks member edits", async () => {
  assert.equal((await call(`/api/admin/jobs/${jobId}`, { method: "PATCH", cookie: admin.cookie, json: { status: "removed" } })).status, 200);
  assert.equal((await call(`/en/jobs/${jobId}`)).status, 404);
  assert.equal((await call(`/api/member/jobs/${jobId}`, { method: "PATCH", cookie: alice.cookie, json: { status: "published" } })).status, 409);
  await call(`/api/admin/jobs/${jobId}`, { method: "PATCH", cookie: admin.cookie, json: { status: "published" } });
});
await step("cover image upload + public media route", async () => {
  const f = new FormData(); f.append("file", png, "cover.png"); f.append("kind", "image");
  const r = await call("/api/member/uploads", { method: "POST", cookie: alice.cookie, form: f });
  assert.equal(r.status, 201, JSON.stringify(r.body)); coverUrl = r.body.file.url;
  const res = await fetch(BASE + coverUrl); assert.equal(res.status, 200); assert.equal(res.headers.get("content-type"), "image/png");
  assert.equal((await fetch(BASE + "/api/media/private/kyc/x.pdf")).status, 404);
});
await step("article: too short rejected; foreign cover rejected", async () => {
  const r = await call("/api/member/articles", { method: "POST", cookie: alice.cookie, json: { title: "Hi", excerpt: "x", body: "short", submit: true } });
  assert.equal(r.status, 422); assert.equal(r.body.errors.body, "too_short");
  const c = await call("/api/member/articles", { method: "POST", cookie: bob.cookie, json: { title: "Hi", coverUrl } });
  assert.equal(c.status, 422); assert.equal(c.body.errors.coverUrl, "invalid");
});
await step("article submit without AI key goes to human review (never auto-publishes)", async () => {
  const body = "## Why it matters\n\nBuying property in Costa Rica as a foreigner is allowed with the same rights as citizens, except in the maritime zone. ".repeat(6);
  const r = await call("/api/member/articles", { method: "POST", cookie: alice.cookie, json: { title: "Buying property in Costa Rica as a foreigner", excerpt: "What international buyers need to know.", body, language: "en", category: "real-estate", providerId, coverUrl, submit: true } });
  assert.equal(r.status, 201, JSON.stringify(r.body)); assert.equal(r.body.article.status, "in_review"); assert.equal(r.body.article.moderation.source, "unavailable");
  articleId = r.body.article.id; articleSlug = r.body.article.slug;
  assert.equal((await call(`/en/blog/${articleSlug}`)).status, 404);
});
await step("bob cannot edit alice's article; editor publishes it", async () => {
  assert.equal((await call(`/api/member/articles/${articleId}`, { method: "PATCH", cookie: bob.cookie, json: { title: "x" } })).status, 403);
  const rej = await call(`/api/admin/articles/${articleId}`, { method: "POST", cookie: admin.cookie, json: { action: "reject" } });
  assert.equal(rej.status, 422);
  const ok = await call(`/api/admin/articles/${articleId}`, { method: "POST", cookie: admin.cookie, json: { action: "approve" } });
  assert.equal(ok.status, 200); assert.equal(ok.body.article.status, "published");
});
await step("public blog list + article page + JSON-LD", async () => {
  const l = await call("/es/blog"); assert.equal(l.status, 200); assert.match(l.body, /Buying property in Costa Rica/);
  const a = await call(`/en/blog/${articleSlug}`); assert.equal(a.status, 200); assert.match(a.body, /"@type":"Article"/); assert.match(a.body, /<h2>Why it matters<\/h2>/);
});
await step("sitemap includes job and article", async () => {
  const s = await call("/sitemap.xml"); assert.match(s.body, new RegExp(jobId)); assert.match(s.body, new RegExp(articleSlug));
});
await step("member overview", async () => {
  const r = await call("/api/member/overview", { cookie: alice.cookie });
  assert.equal(r.status, 200); assert.equal(r.body.businesses[0].verified, true); assert.equal(r.body.jobs.applications, 1); assert.equal(r.body.articles.published, 1);
});
await step("admin overview funnel counts", async () => {
  await new Promise((r) => setTimeout(r, 500));
  const r = await call("/api/admin/overview?days=7", { cookie: admin.cookie });
  assert.equal(r.status, 200); const p = r.body.period;
  assert.ok(p.job_apply >= 1 && p.job_view >= 1 && p.kyc_submitted >= 1 && p.kyc_verified >= 1 && p.article_published >= 1 && p.provider_created >= 1, JSON.stringify(p));
  assert.equal(r.body.series.length, 7); assert.equal(r.body.queues.kyc.allowed, true);
});
await step("pages render: dashboards, legal, localized paths", async () => {
  for (const p of ["/account", "/account/jobs", "/account/articles", "/account/verification", "/account/businesses", "/admin/dashboard", "/admin/verification", "/admin/jobs", "/admin/articles", "/es/privacidad", "/es/terminos", "/en/terms", "/en/jobs", "/en/blog"]) {
    const r = await call(p); assert.equal(r.status, 200, p);
  }
});
if (!process.env.KEEP) await step("deleting a job removes its applications", async () => {
  assert.equal((await call(`/api/member/jobs/${jobId}`, { method: "DELETE", cookie: alice.cookie })).status, 200);
  const apps = await db.collection("jobs").doc(jobId).collection("applications").get(); assert.equal(apps.size, 0);
});

if (process.env.KEEP) { const fs = await import("node:fs"); fs.writeFileSync("/tmp/seed.json", JSON.stringify({ admin: admin.cookie, alice: alice.cookie, jobId, articleSlug })); }
for (const r of results) console.log(r.map((x) => String(x).slice(0, 400)).join(" | "));
const failed = results.filter((r) => r[0] === "FAIL").length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
