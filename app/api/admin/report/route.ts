import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { boardReport, parseMonth } from "@/lib/reports";

// GET /api/admin/report?month=YYYY-MM — the Board's monthly report.
export async function GET(request: NextRequest) {
  if (!(await requireAdmin())) return fail("unauthorized", 401);
  const month = parseMonth(request.nextUrl.searchParams.get("month"));
  return ok({ report: await boardReport(month) });
}
