import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_PERMISSIONS,
  getSessionUser,
  getUserById,
  hasPermission,
  updateUser,
  type AdminPermission,
} from "@/lib/auth";

// PATCH /api/admin/users/:id
// Admin-only: update a user's role, status, or permissions.
//
// - role/status changes require `users.manage`.
// - permission changes require `permissions.manage`.
//
// The caller cannot demote, suspend, or strip the permissions of their own
// account, which prevents admins from locking themselves out.

function isPermissionArray(value: unknown): value is AdminPermission[] {
  if (!Array.isArray(value)) return false;
  return value.every((p) => (ADMIN_PERMISSIONS as readonly unknown[]).includes(p));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getSessionUser();
  if (!actor || actor.role !== "admin") {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const target = await getUserById(id);
  if (!target) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const wantsRole = body.role !== undefined;
  const wantsStatus = body.status !== undefined;
  const wantsPermissions = body.permissions !== undefined;

  const patch: {
    role?: "admin" | "member";
    status?: "active" | "suspended";
    permissions?: AdminPermission[];
  } = {};

  if (wantsRole || wantsStatus) {
    if (!hasPermission(actor, "users.manage")) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    // Self-protection: an admin cannot change their own role or suspend self.
    if (id === actor.userId) {
      return NextResponse.json({ ok: false, error: "self_protected" }, { status: 403 });
    }
    if (wantsRole) {
      const role = body.role === "member" ? "member" : "admin";
      patch.role = role;
    }
    if (wantsStatus) {
      patch.status = body.status === "suspended" ? "suspended" : "active";
    }
  }

  if (wantsPermissions) {
    if (!hasPermission(actor, "permissions.manage")) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    if (!isPermissionArray(body.permissions)) {
      return NextResponse.json({ ok: false, error: "invalid_permissions" }, { status: 422 });
    }
    if (id === actor.userId) {
      return NextResponse.json({ ok: false, error: "self_protected" }, { status: 403 });
    }
    patch.permissions = body.permissions;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "no_change" }, { status: 422 });
  }

  try {
    await updateUser(id, patch);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 500 });
  }
}