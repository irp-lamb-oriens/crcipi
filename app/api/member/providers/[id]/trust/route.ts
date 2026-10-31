import { getSessionUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { getProvider } from "@/lib/providers";
import { scoreProvider } from "@/lib/trustScore";

// GET /api/member/providers/:id/trust — the owner's trust score breakdown.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return fail("unauthorized", 401);
  const { id } = await params;
  const provider = await getProvider(id);
  if (!provider || provider.ownerId !== user.userId) return fail("not_found", 404);
  return ok({ score: await scoreProvider(provider) });
}
