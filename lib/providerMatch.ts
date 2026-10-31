import "server-only";

import { listUsers, type User } from "@/lib/auth";
import { listProviders, nameKey, type Provider } from "@/lib/providers";

// ============================================================
// "Is this business already listed?"
//
// Before a member creates a listing we look for the same business: same
// name (ignoring case, accents, spacing and legal suffixes), same website
// domain, or same contact email. Matches come back with who manages them,
// so the member can open their own, claim an unclaimed one, or ask for
// access, instead of creating a copy.
//
// "Unclaimed" covers every kind of placeholder ownership:
//   none          no owner at all (added by the Chamber or seeded)
//   missing       owner id points to an account that doesn't exist
//   test          owner is a test/demo account
//   seeded        example data from scripts/seed-providers.mjs
// ============================================================

export type OwnerState = "you" | "member" | "none" | "missing" | "test" | "seeded";

export interface ListingMatch {
  id: string;
  name: string;
  location: string | null;
  verified: boolean;
  owner: OwnerState;
  reasons: ("name" | "website" | "email")[];
}

const TEST_EMAIL = /(@test\.|\.example$|@example\.|^test@|demo|placeholder|prueba)/i;
const EXAMPLE_CONTACT = /(example\.com|\.example\b)/i;
// Company-type suffixes don't make two businesses different.
const SUFFIXES = /\b(s a|sa|s r l|srl|ltda|limitada|inc|llc|ltd|corp|co|group|grupo|y asociados|and associates|asociados)\b/g;

export function looseName(name: string): string {
  return nameKey(name).replace(SUFFIXES, " ").replace(/\s+/g, " ").trim();
}

function host(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function ownerState(
  provider: Pick<Provider, "id" | "ownerId" | "website" | "email">,
  users: Map<string, User>,
  viewerId?: string
): OwnerState {
  if (provider.ownerId && provider.ownerId === viewerId) return "you";
  if (EXAMPLE_CONTACT.test(`${provider.website ?? ""} ${provider.email ?? ""}`)) return "seeded";
  if (!provider.ownerId) return "none";
  const owner = users.get(provider.ownerId);
  if (!owner) return "missing";
  if (TEST_EMAIL.test(owner.email)) return "test";
  return "member";
}

export const UNCLAIMED: OwnerState[] = ["none", "missing", "test", "seeded"];

export async function findSimilarListings(
  input: { name: string; website?: string; email?: string },
  viewerId: string,
  options: { excludeId?: string } = {}
): Promise<ListingMatch[]> {
  const [providers, users] = await Promise.all([listProviders(), listUsers()]);
  const userMap = new Map(users.map((u) => [u.id, u]));
  const wantName = looseName(input.name);
  const wantHost = host(input.website);
  const wantEmail = input.email?.trim().toLowerCase() || null;
  // Public mail domains say nothing about the business.
  const sharedMailbox = /@(gmail|hotmail|outlook|yahoo|icloud|live|proton(mail)?)\./i.test(wantEmail ?? "");

  const matches: ListingMatch[] = [];
  for (const p of providers) {
    if (p.id === options.excludeId) continue;
    const reasons: ListingMatch["reasons"] = [];
    if (wantName && looseName(p.name) === wantName) reasons.push("name");
    if (wantHost && host(p.website) === wantHost) reasons.push("website");
    if (wantEmail && !sharedMailbox && p.email?.trim().toLowerCase() === wantEmail) reasons.push("email");
    if (!reasons.length) continue;
    matches.push({
      id: p.id,
      name: p.name,
      location: p.location ?? null,
      verified: p.verified,
      owner: ownerState(p, userMap, viewerId),
      reasons,
    });
  }
  return matches;
}
