// ============================================================
// CR-CIPI Central Site Settings
// Edit these values to change contact details, links, and domain.
// ============================================================

export const site = {
  name: "CR-CIPI",
  fullName: "Costa Rica Chamber of International Private Investment",
  fullNameEs: "Cámara Costarricense de Inversión Privada Internacional",
  domain: "https://crcipi.org",

  // Contact email shown in the footer and used as the notification recipient.
  // TODO: replace with the production contact email before launch.
  contactEmail: "info@crcipi.org",

  // LinkedIn page URL. Leave empty string to hide the link until the page exists.
  linkedinUrl: "",

  // Notification recipients for new form submissions (comma-separated emails).
  // TODO: replace with the real notification inbox(es) before launch.
  notifyEmails: ["info@crcipi.org"],
} as const;