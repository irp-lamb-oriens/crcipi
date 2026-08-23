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
| Admin sign-in | `/admin` | `/admin` |

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

## Commands

```bash
npm run dev     # local dev server
npm run build   # production build
npm run lint    # lint (may prompt for ESLint setup on first run)
```

## Content customization

The announcement, nav labels, hero, stats, all section copy, form labels, and footer text are all schema-driven in `content/types.ts` and seeded in `content/en.ts` / `content/es.ts`. Central site settings (name, contact email, LinkedIn, domain) live in `content/site.ts`.