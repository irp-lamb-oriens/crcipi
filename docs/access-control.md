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
- Browse jobs (`/en/jobs`, `/es/empleos`) and apply (rate-limited, honeypot).
- Read published articles (`/en/blog`, `/es/blog`).
- Never sees KYC data: the directory shows only the public `verified` badge.
- Submit the volunteer/interest form (`/en/join`, `/es/unete`).
- **Cannot** sign in. Sign-in is only for people who already have an account.

### Member (signed in, role = member)

- Everything Anonymous can do.
- Member dashboard at `/account` (overview + next steps).
- Manage only their own businesses at `/account/businesses` (add / edit / delete);
  actions are server-enforced to `provider.ownerId === session.userId`.
- Submit their own businesses for verification (KYC) at `/account/verification`.
  Documents upload privately; only the owner and `kyc.review` admins can open
  them, through links that expire in 10 minutes.
- Post jobs for their own (listed) businesses at `/account/jobs` and see the
  applicants (incl. CVs) for **their own** jobs only.
- Write articles at `/account/articles`; the AI editor publishes, rejects with
  reasons, or routes to a human editor. Authors edit only their own articles.
- See reviewer emails **for their own businesses** (hidden everywhere else).
- **Cannot** see the CMS bar, the admin pages, or any admin-only UI.
- **Cannot** call any `/api/admin/*` endpoint (each one enforces a permission).

### Admin (signed in, role = admin)

- Everything Member can do, plus the admin console.
- `/admin/providers` — manage all providers and moderate reviews, see all
  reviewer emails. Requires `providers.manage` and `ratings.moderate`.
- `/admin/users` — participants, admins, participants' accesses, admins'
  permissions. Requires `users.manage` / `permissions.manage`.
- `/admin/dashboard` — KPIs, review queues and 7/30/90-day funnels. Any admin.
- `/admin/verification` — KYC queue, verify / send back. Requires `kyc.review`.
- `/admin/jobs` — every posting; take down / restore. Requires `jobs.manage`.
- `/admin/articles` — editorial queue; publish / send back / archive / re-run AI.
  Requires `articles.moderate`.

New permissions are inherited by admins created before they existed:
`kyc.review` and `jobs.manage` from `providers.manage`, `articles.moderate`
from `content.manage` (see `IMPLIED_PERMISSIONS` in `lib/permissions.ts`). Grant
the new permission explicitly to give it without the parent.
- The floating CMS bar (inline WYSIWYG editing). Requires `content.manage`.

## Sign-in routing

There is one sign-in page (`/admin`, neutral heading "Sign in"). It has no
"admin only" wording.

| Result of sign-in | Redirect |
| --- | --- |
| Email has no account | `/en/join` (the volunteer page) |
| Member account | `/account` |
| Admin account | `/admin/dashboard` |

## What makes sense to display vs. not

- **Header `MemberMenu`:** anonymous → "Sign in" (`/admin`), member →
  "My dashboard" (`/account`), admin → "Admin" (`/admin/dashboard`).
- **`CmsProvider`/`AdminBar`:** renders the CMS bar only when the session is an
  admin. Members and anonymous users never see it.
- **Admin pages** gate on `role === "admin"`, never on `authed === true`. A
  member hitting `/admin/providers` is redirected to `/account`; an anonymous
  user is shown the sign-in prompt.
- **`/account`** is member-only. An admin visiting it is redirected to
  `/admin/dashboard`.

## Sign-up (decided)

Filling the volunteer/interest form is the single sign-up path. `/api/submit`
idempotently creates a `users` record (role `member`, keyed on email) and never
overwrites or demotes an existing account. `/signup` is a redirect to
`/en/join#form` so old links don't 404, and `/account` sends signed-out users to
`/admin`. Result: one sign-up (volunteer form) and one sign-in (`/admin`).
</content>
