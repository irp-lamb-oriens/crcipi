import { getSessionUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { listLeadsByOwner } from "@/lib/leads";
import { listProvidersByOwner } from "@/lib/providers";

// GET /api/member/leads — the signed-in member's Contactos inbox, newest
// first, plus each business's public reply time.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return fail("unauthorized", 401);
  const [leads, providers] = await Promise.all([
    listLeadsByOwner(user.userId),
    listProvidersByOwner(user.userId),
  ]);
  // Only leads for businesses the member owns today (ownership can move).
  const owned = new Set(providers.map((p) => p.id));
  return ok({
    leads: leads.filter((lead) => owned.has(lead.providerId)),
    businesses: providers.map((p) => ({
      id: p.id,
      name: p.name,
      responseHoursMedian: p.responseHoursMedian,
      responseSample: p.responseSample,
    })),
  });
}
