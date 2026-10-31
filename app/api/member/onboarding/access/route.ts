import { NextRequest } from "next/server";
import { getSessionUser, getUserById, listAdminEmails } from "@/lib/auth";
import { fail, ok, readJson } from "@/lib/http";
import { notify } from "@/lib/mailer";
import { createAccessRequest } from "@/lib/onboarding";
import { getProvider } from "@/lib/providers";

// POST /api/member/onboarding/access — { providerId, note? }
// Ask to manage a company that is already registered. CR-CIPI admins decide
// (they own business assignment); the current owner is told it happened.
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return fail("unauthorized", 401);
  const body = await readJson(request);
  if (!body) return fail("invalid_json", 400);

  const provider = await getProvider(String(body.providerId ?? ""));
  if (!provider) return fail("not_found", 404);
  if (provider.ownerId === user.userId) return ok({ already: true });

  const { request: req, created } = await createAccessRequest({
    providerId: provider.id,
    providerName: provider.name,
    userId: user.userId,
    email: user.email,
    name: user.name,
    note: String(body.note ?? "").trim().slice(0, 500),
  });

  if (created) {
    const admins = await listAdminEmails().catch(() => [] as string[]);
    for (const to of admins) {
      notify({
        to,
        subject: `Access request: ${user.name} → ${provider.name}`,
        heading: `${user.name} asks to manage ${provider.name}`,
        lines: [
          `${user.email} entered this company's legal id during onboarding.`,
          req.note ? `Note: ${req.note}` : "",
          "Approve or decline it in the review inbox.",
        ].filter(Boolean),
        cta: { label: "Open reviews", url: "/admin/reviews" },
      });
    }
    const owner = provider.ownerId ? await getUserById(provider.ownerId).catch(() => null) : null;
    if (owner) {
      notify({
        to: owner.email,
        subject: `Alguien solicitó acceso a ${provider.name} en CR-CIPI`,
        heading: "Solicitud de acceso",
        lines: [
          `${user.name} (${user.email}) solicitó administrar ${provider.name}.`,
          "El equipo de CR-CIPI la revisará. Si no conoce a esta persona, responda este correo.",
        ],
      });
    }
  }

  return ok({ request: { id: req.id, status: req.status } }, created ? 201 : 200);
}
