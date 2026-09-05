import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { isLocale } from "@/content";
import { getHistory, restoreContent } from "@/lib/contentStore";

// GET /api/admin/history?locale=en
// Lists the last 25 saved snapshots for a locale (newest first).

export async function GET(request: NextRequest) {
  if (!(await requirePermission("content.manage"))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const locale = request.nextUrl.searchParams.get("locale") ?? "en";
  if (!isLocale(locale)) {
    return NextResponse.json({ ok: false, error: "invalid_locale" }, { status: 422 });
  }

  const history = await getHistory(locale);
  return NextResponse.json({ ok: true, history });
}

// POST /api/admin/history
// Restores a persisted snapshot as the live content.

export async function POST(request: NextRequest) {
  if (!(await requirePermission("content.manage"))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let locale: string;
  let entryId: string;
  try {
    const body = await request.json();
    locale = String(body?.locale ?? "");
    entryId = String(body?.entryId ?? "");
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!isLocale(locale)) {
    return NextResponse.json({ ok: false, error: "invalid_locale" }, { status: 422 });
  }

  if (!entryId) {
    return NextResponse.json({ ok: false, error: "invalid_entry" }, { status: 422 });
  }

  try {
    const restored = await restoreContent(locale, entryId);
    return NextResponse.json({ ok: true, content: restored });
  } catch (error) {
    if ((error as Error).message === "history_not_found") {
      return NextResponse.json({ ok: false, error: "history_not_found" }, { status: 404 });
    }
    console.error("Failed to restore content:", error);
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 500 });
  }
}