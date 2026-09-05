import { NextResponse } from "next/server";
import { getSessionUser, hasPermission, listUsers } from "@/lib/auth";
import { listProviders } from "@/lib/providers";

// GET /api/admin/users
// Admin-only overview of participants (members) and admins, plus the full
// provider list so the console can display who owns/accesses which business.
//
// Viewing this requires an admin account. Granting/revoking permissions is
// gated separately by `permissions.manage` (see PATCH in [id]/route.ts).

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const users = await listUsers();
  const providers = await listProviders();

  return NextResponse.json({
    ok: true,
    participants: users
      .filter((u) => u.role === "member")
      .map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        status: u.status,
        createdAt: u.createdAt,
      })),
    admins: users
      .filter((u) => u.role === "admin")
      .map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        permissions: u.permissions,
        status: u.status,
        canManagePermissions: hasPermission(user, "permissions.manage"),
      })),
    providers: providers.map((p) => ({
      id: p.id,
      name: p.name,
      ownerId: p.ownerId,
      approved: p.approved,
      featured: p.featured,
    })),
    viewer: {
      canManagePermissions: hasPermission(user, "permissions.manage"),
      canManageUsers: hasPermission(user, "users.manage"),
    },
  });
}