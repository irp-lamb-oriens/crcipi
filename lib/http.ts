import { NextResponse } from "next/server";

// Uniform JSON error/success envelopes for route handlers.
export function fail(error: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, error, ...extra }, { status });
}

export function ok(body: Record<string, unknown> = {}, status = 200) {
  return NextResponse.json({ ok: true, ...body }, { status });
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
