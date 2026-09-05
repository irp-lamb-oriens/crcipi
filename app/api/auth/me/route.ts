import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

// GET /api/auth/me
// Returns the current session's role-safe identity.

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ authed: false, email: null, role: null });
  }
  return NextResponse.json({
    authed: true,
    email: user.email,
    role: user.role,
    name: user.name,
    permissions: user.permissions,
  });
}
