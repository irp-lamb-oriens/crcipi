import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { isLocale } from "@/content";
import { getLiveContent, saveContent } from "@/lib/contentStore";

// GET /api/admin/content?locale=en
// Returns the live content for an admin-authorized request.

export async function GET(request: NextRequest) {
  if (!(await requirePermission("content.manage"))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const locale = request.nextUrl.searchParams.get("locale") ?? "en";
  if (!isLocale(locale)) {
    return NextResponse.json({ ok: false, error: "invalid_locale" }, { status: 422 });
  }

  const content = await getLiveContent(locale);
  return NextResponse.json({ ok: true, content });
}

// POST /api/admin/content
// Persists a full content document for a locale.

export async function POST(request: NextRequest) {
  if (!(await requirePermission("content.manage"))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let locale: string;
  let content: unknown;
  try {
    const body = await request.json();
    locale = String(body?.locale ?? "");
    content = body?.content;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!isLocale(locale)) {
    return NextResponse.json({ ok: false, error: "invalid_locale" }, { status: 422 });
  }

  if (!content || typeof content !== "object") {
    return NextResponse.json({ ok: false, error: "invalid_content" }, { status: 422 });
  }

  try {
    await saveContent(locale, content as never);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to save content:", error);
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 500 });
  }
}