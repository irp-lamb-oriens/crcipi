import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http";
import { addApplication, getJob, isLive, validateApplication } from "@/lib/jobs";
import { notify } from "@/lib/mailer";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { recordEvent } from "@/lib/stats";
import { recordProviderStat } from "@/lib/providerStats";
import { storeUpload, type StoredFile } from "@/lib/storage";

// POST /api/jobs/:id/apply  (multipart)
// Fields: name, email, phone, linkedin, message, consent, cv (optional file),
// website (honeypot, must be empty). Public and IP rate-limited.

const APPLY_LIMIT = { max: 6, windowMs: 60 * 60 * 1000, baseBackoffMs: 60 * 1000 };

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await rateLimit(`apply:${clientIp(request)}`, APPLY_LIMIT);
  if (!limit.ok) return fail("rate_limited", 429);

  const { id } = await params;
  const job = await getJob(id);
  if (!job || !isLive(job)) return fail("not_found", 404);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("invalid_form", 400);
  }

  // Honeypot: bots fill every field. Pretend success so they don't adapt.
  if (String(form.get("website") ?? "").trim()) return ok({}, 201);

  const fields = Object.fromEntries(
    ["name", "email", "phone", "linkedin", "message", "consent"].map((key) => [key, String(form.get(key) ?? "")])
  );
  const result = validateApplication(fields);
  if (!result.ok) return fail("validation", 422, { errors: result.errors });

  let cv: StoredFile | null = null;
  const file = form.get("cv");
  if (file instanceof File && file.size > 0) {
    try {
      const stored = await storeUpload(file, {
        kind: "document",
        visibility: "private",
        folder: `applications/${id}`,
      });
      if (!stored.ok) {
        // Uploads switched off is not the applicant's fault: accept without CV.
        if (stored.error !== "disabled") return fail("validation", 422, { errors: { cv: stored.error } });
      } else {
        cv = stored.file;
      }
    } catch (error) {
      console.error("cv upload failed", error);
      return fail("storage_failed", 500);
    }
  }

  try {
    await addApplication(id, result.data, cv);
  } catch (error) {
    console.error("application save failed", error);
    return fail("storage_failed", 500);
  }

  recordEvent("job_apply");
  recordProviderStat(job.providerId, "applications");
  notify({
    to: job.applyEmail,
    replyTo: result.data.email,
    subject: `New applicant for ${job.title}: ${result.data.name}`,
    heading: `${result.data.name} applied to ${job.title}`,
    lines: [
      `Email: ${result.data.email}${result.data.phone ? ` · Phone: ${result.data.phone}` : ""}`,
      result.data.linkedin ? `LinkedIn: ${result.data.linkedin}` : "",
      result.data.message,
      cv ? "A CV is attached to the application in your dashboard." : "",
    ].filter(Boolean),
    cta: { label: "See all applicants", url: "/account/jobs" },
  });
  notify({
    to: result.data.email,
    subject: `We received your application: ${job.title}`,
    heading: "Application received",
    lines: [
      `Thanks, ${result.data.name}. ${job.providerName} received your application for ${job.title} and will contact you directly if there's a fit.`,
    ],
  });

  return ok({}, 201);
}
