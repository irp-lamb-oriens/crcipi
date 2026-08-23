import { NextResponse } from "next/server";
import { getSessionEmail, isAdminEmail } from "@/lib/auth";

// GET /api/auth/me
// Returns whether the current visitor is authenticated as an admin.

export async function GET() {
  const email = await getSessionEmail();
  if (!email || !(await isAdminEmail(email))) {
    return NextResponse.json({ authed: false, email: null });
  }
  return NextResponse.json({ authed: true, email });
}