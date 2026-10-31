import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { fail, ok, readJson } from "@/lib/http";
import {
  applyLeadAction,
  getLead,
  markReviewRequested,
  parseLeadAction,
  refreshProviderResponseTime,
} from "@/lib/leads";
import { notify } from "@/lib/mailer";
import { getProvider } from "@/lib/providers";
import { recordEvent } from "@/lib/stats";

// PATCH /api/member/leads/:id — { action: "responded" | "won" | "reopen" }
// or { action: "lost", reason }. Ownership is checked against the provider's
// current owner, not the denormalised ownerId, so a business that changed
// hands stops exposing its old leads to the previous owner.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return fail("unauthorized", 401);

  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) return fail("not_found", 404);
  const provider = await getProvider(lead.providerId);
  if (!provider || provider.ownerId !== user.userId) return fail("not_found", 404);

  const action = parseLeadAction(await readJson(request));
  if (!action) return fail("validation", 422, { errors: { action: "invalid" } });

  const result = await applyLeadAction(lead, action);

  if (result.firstResponse) {
    recordEvent("lead_responded");
    await refreshProviderResponseTime(provider.id).catch((error) =>
      console.error("response time refresh failed", error)
    );
  }

  // A won lead earns the client an email-verified review request, once.
  if (result.becameWon) {
    recordEvent("lead_won");
    if (!lead.reviewRequestedAt) {
      const es = lead.locale === "es";
      notify({
        to: lead.email,
        subject: es
          ? `¿Cómo le fue con ${provider.name}?`
          : `How did it go with ${provider.name}?`,
        heading: es ? "Su opinión protege al próximo inversionista" : "Your review protects the next investor",
        lines: es
          ? [
              `Hola ${lead.name}, ${provider.name} nos indicó que trabajaron juntos.`,
              "Una reseña de dos minutos ayuda a otras personas que llegan a Costa Rica a elegir con confianza. Verificamos su correo antes de publicarla.",
            ]
          : [
              `Hi ${lead.name}, ${provider.name} told us you worked together.`,
              "A two-minute review helps other people moving to Costa Rica choose with confidence. We verify your email before it's published.",
            ],
        cta: {
          label: es ? "Dejar una reseña" : "Leave a review",
          url: `${es ? "/es/directorio" : "/en/directory"}/${provider.id}?review=1`,
        },
      });
      const requestedAt = Date.now();
      await markReviewRequested(lead.id, requestedAt);
      result.lead.reviewRequestedAt = requestedAt;
    }
  }

  return ok({ lead: result.lead });
}
