// Client-safe permission constants and types. Kept separate from `auth.ts`
// (which is server-only) so client components can import these directly.

export const ADMIN_PERMISSIONS = [
  "content.manage",
  "providers.manage",
  "ratings.moderate",
  "users.manage",
  "permissions.manage",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export type UserRole = "admin" | "member";
export type UserStatus = "active" | "suspended";