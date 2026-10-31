import { NextRequest } from "next/server";
import { getSessionUser, getUserById, hasPermission } from "@/lib/auth";
import { fail, ok, readJson } from "@/lib/http";
import { notify } from "@/lib/mailer";
import { resolveAccessRequest } from "@/lib/onboarding";
import { getProvider, updateProvider } from "@/lib/providers";
import { db } from "@/lib/firebaseAdmin";

// PATCH /api/admin/access/:id — { decision: "approve" | "decline" }
// Approving assigns the business to the requester. A business has one
// owner, so if it already had one, that person loses access: the admin UI
// says so before the click, and both people are emailed.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!hasPermission(user, "users.manage")) return fail("unauthorized", 401);
  const { id } = await params;
  const body = await readJson(request);
  const decision = body?.decision === "approve" ? "approved" : body?.decision === "decline" ? "declined" : null;
  if (!decision) return fail("validation", 422, { errors: { decision: "invalid" } });

  const snap = await db.collection("accessRequests").doc(id).get();
  if (!snap.exists) return fail("not_found", 404);
  const pending = snap.data() as { providerId: string; userId: string; status: string };
  if (pending.status !== "pending") return fail("already_resolved", 409);

  const provider = await getProvider(pending.providerId);
  if (!provider) return fail("not_found", 404);
  const previousOwnerId = provider.ownerId;

  if (decision === "approved") await updateProvider(provider.id, { ownerId: pending.userId });
  const resolved = await resolveAccessRequest(id, decision);
  if (!resolved) return fail("not_found", 404);

  notify({
    to: resolved.email,
    subject:
      decision === "approved"
        ? `Acceso aprobado: ${provider.name}`
        : `Solicitud de acceso no aprobada: ${provider.name}`,
    heading: decision === "approved" ? "Ya puede administrar su empresa" : "Solicitud no aprobada",
    lines:
      decision === "approved"
        ? [`El equipo de CR-CIPI le dio acceso a ${provider.name}.`]
        : [`El equipo de CR-CIPI no pudo confirmar su relación con ${provider.name}. Responda este correo si cree que es un error.`],
    cta: decision === "approved" ? { label: "Abrir mi panel", url: "/account" } : undefined,
  });
  if (decision === "approved" && previousOwnerId && previousOwnerId !== pending.userId) {
    const previous = await getUserById(previousOwnerId).catch(() => null);
    if (previous) {
      notify({
        to: previous.email,
        subject: `Cambio de administrador: ${provider.name}`,
        heading: "Su empresa tiene un nuevo administrador",
        lines: [
          `${resolved.name} (${resolved.email}) ahora administra ${provider.name} en CR-CIPI.`,
          "Si no reconoce este cambio, responda este correo.",
        ],
      });
    }
  }

  return ok({ request: { id, status: decision } });
}
