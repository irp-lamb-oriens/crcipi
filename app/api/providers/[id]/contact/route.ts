import { NextRequest } from "next/server";
import { getUserById } from "@/lib/auth";
import { fail, ok, readJson } from "@/lib/http";
import { NEED_LABELS, TIMELINE_LABELS } from "@/lib/leadCopy";
import { createLead, validateLeadInput } from "@/lib/leads";
import { notify } from "@/lib/mailer";
import { getProvider } from "@/lib/providers";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { recordEvent } from "@/lib/stats";

// POST /api/providers/:id/contact — an investor asks a member for a
// consultation. Public, IP rate-limited, honeypot-protected. The lead lands
// in the member's Contactos inbox and is emailed to the business.
//
// Body: { name, email, country?, need, timeline, message, consent, locale,
//         source?, company (honeypot, must be empty) }

const CONTACT_LIMIT = { max: 5, windowMs: 60 * 60 * 1000, baseBackoffMs: 5 * 60 * 1000 };

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await readJson(request);
  if (!body) return fail("invalid_json", 400);

  const provider = await getProvider(id);
  if (!provider || !provider.approved) return fail("not_found", 404);

  // Honeypot first and silently: bots must not learn what tripped them.
  if (String((body as Record<string, unknown>).company ?? "").trim()) return ok({}, 201);

  const result = validateLeadInput(body);
  if (!result.ok) return fail("validation", 422, { errors: result.errors });

  const limit = await rateLimit(`lead:${clientIp(request)}`, CONTACT_LIMIT);
  if (!limit.ok) return fail("rate_limited", 429);

  let leadId: string;
  try {
    const lead = await createLead(result.data, provider);
    leadId = lead.id;
  } catch (error) {
    console.error("lead save failed", error);
    return fail("storage_failed", 500);
  }

  recordEvent("lead_created");

  const lead = result.data;
  const owner = provider.ownerId ? await getUserById(provider.ownerId).catch(() => null) : null;
  const businessInbox = provider.email || owner?.email;
  if (businessInbox) {
    notify({
      to: businessInbox,
      replyTo: lead.email,
      subject: `Nuevo contacto en CR-CIPI: ${lead.name} · ${NEED_LABELS[lead.need].es}`,
      heading: `${lead.name} pidió una consulta a ${provider.name}`,
      lines: [
        `Necesita: ${NEED_LABELS[lead.need].es} · Cuándo: ${TIMELINE_LABELS[lead.timeline].es}`,
        lead.country ? `Desde: ${lead.country}` : "",
        `Correo: ${lead.email} (responda a este mensaje para escribirle)`,
        lead.message,
        "Responda en menos de 24 horas: su tiempo de respuesta se muestra en su perfil público.",
      ].filter(Boolean),
      cta: { label: "Abrir en Contactos", url: `/account/leads?lead=${leadId}` },
    });
  }
  notify({
    to: lead.email,
    subject:
      lead.locale === "es"
        ? `Su solicitud a ${provider.name} fue enviada`
        : `Your request to ${provider.name} was sent`,
    heading: lead.locale === "es" ? "Solicitud enviada" : "Request sent",
    lines:
      lead.locale === "es"
        ? [
            `Hola ${lead.name}, ${provider.name} recibió su solicitud y le responderá por correo.`,
            "Si no recibe respuesta en dos días hábiles, responda a este correo y CR-CIPI dará seguimiento.",
          ]
        : [
            `Hi ${lead.name}, ${provider.name} has your request and will reply by email.`,
            "If you don't hear back within two working days, reply to this email and CR-CIPI will follow up.",
          ],
  });

  return ok({}, 201);
}
