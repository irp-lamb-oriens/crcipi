// ============================================================
// CR-CIPI Form Validation
// Shared validation logic used by both the client and server.
// ============================================================

export interface SubmissionInput {
  firstName: string;
  lastName: string;
  company?: string;
  profession: string;
  email: string;
  phone?: string;
  linkedin?: string;
  expertise: string[];
  participation: string[];
  reason: string;
  preferredLanguage: "en" | "es";
  consent: boolean;
  sourcePage?: string;
  language?: string;
  utm?: Record<string, string>;
}

export type ValidationResult =
  | { ok: true; data: SubmissionInput }
  | { ok: false; errors: Record<string, string> };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

export function validateSubmission(raw: Record<string, unknown>): ValidationResult {
  const errors: Record<string, string> = {};

  const firstName = clean(raw.firstName);
  const lastName = clean(raw.lastName);
  const company = clean(raw.company);
  const profession = clean(raw.profession);
  const email = clean(raw.email);
  const phone = clean(raw.phone);
  const linkedin = clean(raw.linkedin);
  const expertise = cleanArray(raw.expertise);
  const participation = cleanArray(raw.participation);
  const reason = clean(raw.reason);
  const preferredLanguage = raw.preferredLanguage === "es" ? "es" : "en";
  const consent = raw.consent === true;

  if (!firstName) errors.firstName = "required";
  if (!lastName) errors.lastName = "required";
  if (!profession) errors.profession = "required";
  if (!email) {
    errors.email = "required";
  } else if (!EMAIL_RE.test(email)) {
    errors.email = "email";
  }
  if (expertise.length === 0) errors.expertise = "required";
  if (participation.length === 0) errors.participation = "required";
  if (!reason) errors.reason = "required";
  if (!consent) errors.consent = "consent";

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      firstName,
      lastName,
      company: company || undefined,
      profession,
      email,
      phone: phone || undefined,
      linkedin: linkedin || undefined,
      expertise,
      participation,
      reason,
      preferredLanguage,
      consent,
      sourcePage: clean(raw.sourcePage) || undefined,
      language: clean(raw.language) || undefined,
      utm:
        raw.utm && typeof raw.utm === "object"
          ? Object.fromEntries(
              Object.entries(raw.utm as Record<string, unknown>).filter(
                (entry): entry is [string, string] =>
                  typeof entry[1] === "string" && entry[1].length > 0
              )
            )
          : undefined,
    },
  };
}