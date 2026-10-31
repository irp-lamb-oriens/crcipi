// Client-safe permission constants and types. Kept separate from `auth.ts`
// (which is server-only) so client components can import these directly.

export const ADMIN_PERMISSIONS = [
  "content.manage",
  "providers.manage",
  "ratings.moderate",
  "users.manage",
  "permissions.manage",
  "kyc.review",
  "jobs.manage",
  "articles.moderate",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

// Permissions added after admins already existed. An admin whose stored
// permission list predates them inherits each one from the closest existing
// permission, so no admin silently loses access to the new consoles.
export const IMPLIED_PERMISSIONS: Partial<Record<AdminPermission, AdminPermission>> = {
  "kyc.review": "providers.manage",
  "jobs.manage": "providers.manage",
  "articles.moderate": "content.manage",
};

export function permissionGranted(
  granted: readonly AdminPermission[],
  permission: AdminPermission
): boolean {
  if (granted.includes(permission)) return true;
  const parent = IMPLIED_PERMISSIONS[permission];
  return !!parent && granted.includes(parent);
}

export const PERMISSION_LABELS: Record<AdminPermission, string> = {
  "content.manage": "Manage content",
  "providers.manage": "Manage providers",
  "ratings.moderate": "Moderate reviews",
  "users.manage": "Manage users",
  "permissions.manage": "Manage permissions",
  "kyc.review": "Review verifications (KYC)",
  "jobs.manage": "Manage job board",
  "articles.moderate": "Moderate articles",
};

export type UserRole = "admin" | "member";
export type UserStatus = "active" | "suspended";
