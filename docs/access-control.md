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

- **Header `MemberMenu`:** anonymous → "Sign in" (`/admin`), member →
  "Manage my business" (`/account`), admin → "Admin" (`/admin/providers`).
- **`CmsProvider`/`AdminBar`:** renders the CMS bar only when the session is an
  admin. Members and anonymous users never see it.
- **Admin pages** gate on `role === "admin"`, never on `authed === true`. A
  member hitting `/admin/providers` is redirected to `/account`; an anonymous
  user is shown the sign-in prompt.
- **`/account`** is member-only. An admin visiting it is redirected to
  `/admin/providers`.

## Sign-up (decided)

Filling the volunteer/interest form is the single sign-up path. `/api/submit`
idempotently creates a `users` record (role `member`, keyed on email) and never
overwrites or demotes an existing account. `/signup` is a redirect to
`/en/join#form` so old links don't 404, and `/account` sends signed-out users to
`/admin`. Result: one sign-up (volunteer form) and one sign-in (`/admin`).
</content>
