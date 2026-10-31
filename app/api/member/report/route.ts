import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { memberReport, parseMonth } from "@/lib/reports";

// GET /api/member/report?month=YYYY-MM — the member's monthly report.
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return fail("unauthorized", 401);
  const month = parseMonth(request.nextUrl.searchParams.get("month"));
  return ok({ report: await memberReport(user.userId, month) });
}
