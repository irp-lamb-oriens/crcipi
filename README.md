# CR-CIPI

Bilingual institutional website for the Costa Rica Chamber of International Private Investment, built with Next.js (App Router), SCSS modules, and Firebase/Firestore.

## Stack

- Next.js 15 (App Router, React 19)
- SCSS modules
- Firebase Admin (Firestore) for content, auth, and form submissions
- Nodemailer (Gmail SMTP) for email

## Routes

| Purpose | English | Spanish |
| --- | --- | --- |
| Home | `/en` | `/es` |
| About | `/en/about` | `/es/quienes-somos` |
| Join | `/en/join` | `/es/unete` |
| Member directory | `/en/directory` | `/es/directorio` |
| Admin sign-in | `/admin` | `/admin` |
| Job board | `/en/jobs` | `/es/empleos` |
| Member articles | `/en/blog` | `/es/blog` |
| Privacy policy | `/en/privacy` | `/es/privacidad` |
| Terms of use | `/en/terms` | `/es/terminos` |
| Member dashboard | `/account` (+ `/businesses`, `/verification`, `/jobs`, `/articles`) | same |
| Admin dashboard | `/admin/dashboard` (+ `/providers`, `/verification`, `/jobs`, `/articles`, `/users`) | same |

## Editing content (CMS)

The whole site is editable in a WYSIWYG-style edit mode, similar to Elementor.

1. Sign in at `/admin` with an authorized admin email.
2. You receive a 6-digit code by email. Enter it to start a 30-day session.
3. Click **Edit page** in the floating admin bar.
4. Click any text on the page and type to change it. Editable elements get a dashed outline on hover.
5. List elements (stats, initiatives, committees, priorities, participation options, goals) get **add / remove / reorder** controls.
6. Your changes autosave. Use **Undo / Redo** and the **Save now** button in the admin bar.

The live-stream announcement is enabled and editable from the banner at the top of the page. Toggle it on/off and set its title, body, link label, and destination URL in edit mode.

### How it works

- Static content lives in `content/en.ts` and `content/es.ts`.
- Live edits are stored in Firestore under `sites/crcipi/content/{locale}` and win over static content.
- Previous snapshots are kept in `sites/crcipi/history/{locale}/entries` (history read/restore API available in `app/api/admin/history`).

## Member provider directory

A public directory of member providers with moderated ratings.

- Visitors browse, search, and filter providers on `/en/directory` (or `/es/directorio`).
- Each provider shows a star average, review count, contact details, and an inline review form.
- New reviews land as **pending** and only count after an admin approves them in `/admin/providers`.

Data lives in Firestore:

```
providers/{providerId}                -> provider fields + ratingsCount/ratingsSum
providers/{providerId}/ratings/{id}   -> { rating, reviewerName, comment, approved }
```

Seed example providers (idempotent; build the real directory from the admin UI):

```bash
node scripts/seed-providers.mjs   # or: npm run seed:providers
```

## Platform features

### Trusted-provider verification (KYC)

Members submit legal name, ID (cédula jurídica / física, DIMEX, passport), legal
representative, year founded, headcount, licenses and documents. Regulated
categories must include their registration: real estate → SUGEF (Ley 8204, art.
15 bis), law → Colegio de Abogados, accounting → Colegio de Contadores,
insurance → SUGESE (`REQUIRED_REGULATOR` in `lib/kycOptions.ts`). Verified
providers get a badge and a "Verified only" directory filter. Legal data lives in
`providers/{id}/private/kyc`; the provider doc only carries `verified` +
`kycStatus`.

### Job board

`jobs/{id}` + `jobs/{id}/applications/{id}`. Members publish 60-day postings
under a listed business; applicants apply with an optional CV; employers get an
email and manage a pipeline (new → reviewed → shortlisted → rejected/hired).
Detail pages emit schema.org `JobPosting` for Google job search.

### Member articles with AI review

`articles/{id}`. On submit, `lib/moderation.ts` asks Claude (Anthropic API) for a
strict JSON verdict against the editorial policy (relevant to the community; no
political, religious, anti–Costa Rica, spam or misleading content). Clear passes
publish, clear violations come back with reasons, anything else — including any
AI error or a missing API key — goes to `/admin/articles`. The AI can never
publish by failing.

### Uploads

`/api/member/uploads` uploads on file selection (no extra click). Files are
validated by magic bytes and size (5 MB, Netlify's body limit is ~6 MB). Private
files (`private/...`) are opened only through 10-minute signed URLs; public
images (`public/...`) are streamed by `/api/media/...`.

### Metrics

`lib/stats.ts` keeps one counter document per day (`stats/daily/days/{date}`)
for the admin funnels: sign-ups → businesses → KYC → verified, job views →
applications, directory visits → reviews, articles submitted → published → read.

### Checks

```bash
npm run check:moderation   # AI output parser guardrails
npm run check:e2e          # full round-trip, emulators only (see file header)
```

## Auth

Email-code (passwordless) auth:

```
auth/adminEmails/emails/{sha256(email)}   -> allowlist
auth/loginCodes/codes/{sha256(email:code)} -> one-time 6-digit codes
auth/sessions/tokens/{token}              -> sessions
```

Emails are lowercased and trimmed. Codes and emails are stored SHA-256 hashed, never in plaintext.

### Add an admin

```bash
node scripts/seed-admin.mjs you@example.com
```

### Environment

Copy `.env.example` to `.env` and set:

- `FIREBASE_SERVICE_ACCOUNT` — minified `serviceAccountKey.json`, or place `serviceAccountKey.json` in the project root.
- `SMTP_USER` / `SMTP_PASS` (Gmail App Password), `SMTP_HOST`, `SMTP_PORT`.
- `FIREBASE_STORAGE_BUCKET` — enables uploads (KYC documents, CVs, covers).
- `ANTHROPIC_API_KEY` (and optional `ANTHROPIC_MODEL`) — enables AI article review.

## Commands

```bash
npm run dev     # local dev server
npm run build   # production build
npm run lint    # lint (may prompt for ESLint setup on first run)
```

## Content customization

The announcement, nav labels, hero, stats, all section copy, form labels, and footer text are all schema-driven in `content/types.ts` and seeded in `content/en.ts` / `content/es.ts`. Central site settings (name, contact email, LinkedIn, domain) live in `content/site.ts`.