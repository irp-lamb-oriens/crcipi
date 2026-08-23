import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, clearSessionCookie, deleteSession } from "@/lib/auth";

// POST /api/auth/logout
// Clears the session cookie and deletes the session from Firestore.

export async function POST() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await deleteSession(token).catch((error) => {
      console.error("Failed to delete session:", error);
    });
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}