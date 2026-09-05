# Access control & UI matrix

This file is the single source of truth for what each actor can see and do, so
the server and every page stay in sync. Three actors exist.

| Actor | Definition |
| --- | --- |
| Anonymous | No session cookie. |
| Member | Signed in, `users/{id}.role === "member"`. |
| Admin | Signed in, `users/{id}.role === "admin"` plus explicit permissions. |

## What each actor can see and do

### Anonymous

- Read the public directory of approved providers.
- Open the verified review modal, verify an email, and submit a review.
- Subscribe to the newsletter.
- Submit the volunteer/interest form (`/en/join`, `/es/unete`).
- **Cannot** sign in. Sign-in is only for people who already have an account.

### Member (signed in, role = member)

- Everything Anonymous can do.
- Manage only their own businesses at `/account` (add / edit / delete), and the
  actions are server-enforced to `provider.ownerId === session.userId`.
- See reviewer emails **for their own businesses** (hidden everywhere else).
- **Cannot** see the CMS bar, the admin pages, or any admin-only UI.
- **Cannot** call any `/api/admin/*` endpoint (each one enforces a permission).

### Admin (signed in, role = admin)

- Everything Member can do, plus the admin console.
- `/admin/providers` — manage all providers and moderate reviews, see all
  reviewer emails. Requires `providers.manage` and `ratings.moderate`.
- `/admin/users` — participants, admins, participants' accesses, admins'
  permissions. Requires `users.manage` / `permissions.manage`.
- The floating CMS bar (inline WYSIWYG editing). Requires `content.manage`.

## Sign-in routing

There is one sign-in page (`/admin`, neutral heading "Sign in"). It has no
"admin only" wording.

| Result of sign-in | Redirect |
| --- | --- |
| Email has no account | `/en/join` (the volunteer page) |
| Member account | `/account` |
| Admin account | `/admin/providers` |

## What makes sense to display vs. not

- **Header `MemberMenu`:** anonymous → "Register your business", member →
  "Manage my business", admin → "Admin".
- **`CmsProvider`/`AdminBar`:** renders the CMS bar only when the session is an
  admin. Members and anonymous users never see it.
- **Admin pages** gate on `role === "admin"`, never on `authed === true`. A
  member hitting `/admin/providers` is redirected to `/account`; an anonymous
  user is shown the sign-in prompt.
- **`/account`** is member-only. An admin visiting it is redirected to
  `/admin/providers`.

## Known gap (to decide later)

The volunteer/interest form at `/en/join` stores a submission and emails the
team; it does **not** create a `users` account yet. Sign-in is therefore
reserved for the separate member-account sign-up at `/signup`. If "signing up
to volunteer" is meant to also create a user account, the volunteer form's
`/api/submit` handler needs to create a `users` record (role `member`) as well —
a one-line follow-up once that product decision is confirmed.