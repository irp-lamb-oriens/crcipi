import type { KycStatus } from "@/lib/kycOptions";
import type { BadgeTone } from "./StatusBadge";

// Display vocabulary for statuses shared across console pages.

export const KYC_STATUS_LABELS: Record<KycStatus, string> = {
  none: "Not started",
  draft: "Draft",
  submitted: "In review",
  verified: "Verified",
  rejected: "Changes needed",
};

export function kycTone(status: KycStatus): BadgeTone {
  if (status === "verified") return "good";
  if (status === "submitted") return "info";
  if (status === "rejected") return "bad";
  if (status === "draft") return "warn";
  return "neutral";
}

export function formatDate(time: number | null | undefined): string {
  if (!time) return "—";
  return new Date(time).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
