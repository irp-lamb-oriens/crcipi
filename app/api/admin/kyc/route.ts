import { getSessionUser, hasPermission, listUsers } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { listProviders } from "@/lib/providers";

// GET /api/admin/kyc — every provider with its verification status and owner,
// for the admin verification queue. Requires `kyc.review`.
export async function GET() {
  const user = await getSessionUser();
  if (!hasPermission(user, "kyc.review")) return fail("unauthorized", 401);

  const [providers, users] = await Promise.all([listProviders(), listUsers()]);
  const emailById = new Map(users.map((u) => [u.id, u.email]));

  return ok({
    providers: providers.map((provider) => ({
      id: provider.id,
      name: provider.name,
      category: provider.category,
      kycStatus: provider.kycStatus,
      verified: provider.verified,
      ownerEmail: provider.ownerId ? (emailById.get(provider.ownerId) ?? null) : null,
    })),
  });
}
