// Client-safe labels for Contactos (the consultation request flow).
// Kept outside the CMS content tree: these are form controls and statuses,
// not editorial copy.

import type { Locale } from "@/content/types";

type Labels<K extends string> = Record<K, Record<Locale, string>>;

export const NEED_LABELS: Labels<
  "residency" | "company" | "real-estate" | "banking" | "tax" | "insurance" | "health" | "relocation" | "other"
> = {
  residency: { en: "Residency or visa", es: "Residencia o visa" },
  company: { en: "Starting a company", es: "Crear una empresa" },
  "real-estate": { en: "Buying or renting property", es: "Comprar o alquilar propiedad" },
  banking: { en: "Banking", es: "Banca" },
  tax: { en: "Tax and accounting", es: "Impuestos y contabilidad" },
  insurance: { en: "Insurance", es: "Seguros" },
  health: { en: "Healthcare", es: "Salud" },
  relocation: { en: "Moving and settling in", es: "Mudanza e instalación" },
  other: { en: "Something else", es: "Otro" },
};

export const TIMELINE_LABELS: Labels<"now" | "3-months" | "6-months" | "exploring"> = {
  now: { en: "Right away", es: "De inmediato" },
  "3-months": { en: "In the next 3 months", es: "En los próximos 3 meses" },
  "6-months": { en: "In 3 to 6 months", es: "En 3 a 6 meses" },
  exploring: { en: "Just exploring", es: "Solo explorando" },
};

export const LOST_REASON_LABELS: Labels<"no-reply" | "price" | "not-a-fit" | "spam" | "other"> = {
  "no-reply": { en: "Client stopped replying", es: "El cliente dejó de responder" },
  price: { en: "Price", es: "Precio" },
  "not-a-fit": { en: "Not a fit for us", es: "No es para nosotros" },
  spam: { en: "Spam", es: "Spam" },
  other: { en: "Other", es: "Otro" },
};

export const CONTACT_COPY: Record<
  Locale,
  {
    heading: string;
    intro: string;
    need: string;
    timeline: string;
    name: string;
    email: string;
    country: string;
    message: string;
    messageHint: string;
    consent: string;
    submit: string;
    sending: string;
    successTitle: string;
    successBody: (provider: string) => string;
    privacy: string;
    errors: Record<"name" | "email" | "need" | "timeline" | "message" | "consent" | "generic" | "rate", string>;
  }
> = {
  en: {
    heading: "Request a consultation",
    intro: "Free. Your request goes straight to the firm; CR-CIPI keeps a record so it can protect you if something goes wrong.",
    need: "I need help with",
    timeline: "When",
    name: "Your name",
    email: "Email",
    country: "Moving from (optional)",
    message: "Your situation",
    messageHint: "A few lines: what you need, for whom, any deadline.",
    consent: "I agree that CR-CIPI shares this request with this member, as described in the privacy policy.",
    submit: "Send request",
    sending: "Sending…",
    successTitle: "Request sent",
    successBody: (provider) =>
      `${provider} has your request and usually replies by email. We sent you a copy. If you don't hear back within two working days, write to CR-CIPI and we'll follow up.`,
    privacy: "Privacy policy",
    errors: {
      name: "Please enter your name.",
      email: "Please enter a valid email.",
      need: "Choose what you need help with.",
      timeline: "Choose a timeline.",
      message: "Tell the firm a little more (at least 10 characters).",
      consent: "Please accept so we can forward your request.",
      generic: "Something went wrong. Please try again.",
      rate: "Too many requests from this connection. Please try again later.",
    },
  },
  es: {
    heading: "Solicitar una consulta",
    intro: "Gratis. Su solicitud va directo a la firma; CR-CIPI guarda un registro para protegerle si algo sale mal.",
    need: "Necesito ayuda con",
    timeline: "Cuándo",
    name: "Su nombre",
    email: "Correo",
    country: "País de origen (opcional)",
    message: "Su situación",
    messageHint: "Unas líneas: qué necesita, para quién y si hay una fecha límite.",
    consent: "Acepto que CR-CIPI comparta esta solicitud con este miembro, según la política de privacidad.",
    submit: "Enviar solicitud",
    sending: "Enviando…",
    successTitle: "Solicitud enviada",
    successBody: (provider) =>
      `${provider} recibió su solicitud y normalmente responde por correo. Le enviamos una copia. Si no recibe respuesta en dos días hábiles, escriba a CR-CIPI y daremos seguimiento.`,
    privacy: "Política de privacidad",
    errors: {
      name: "Indique su nombre.",
      email: "Indique un correo válido.",
      need: "Elija con qué necesita ayuda.",
      timeline: "Elija un plazo.",
      message: "Cuéntele un poco más a la firma (mínimo 10 caracteres).",
      consent: "Acepte para que podamos enviar su solicitud.",
      generic: "Algo salió mal. Inténtelo de nuevo.",
      rate: "Demasiadas solicitudes desde esta conexión. Inténtelo más tarde.",
    },
  },
};

export const PROFILE_COPY: Record<
  Locale,
  {
    back: string;
    rating: string;
    noReviews: string;
    verifiedReviews: (n: number) => string;
    replies: string;
    repliesWithin: (h: number) => string;
    repliesUnknown: string;
    memberSince: string;
    about: string;
    sealHeading: string;
    sealItems: string[];
    notVerified: string;
    reviewsHeading: string;
    leaveReview: string;
    jobsHeading: string;
    articlesHeading: string;
    contact: string;
    website: string;
    report: string;
  }
> = {
  en: {
    back: "Member directory",
    rating: "Rating",
    noReviews: "No reviews yet",
    verifiedReviews: (n) => `${n} verified ${n === 1 ? "review" : "reviews"}`,
    replies: "Usually replies",
    repliesWithin: (h) => (h < 1 ? "within the hour" : h < 24 ? `within ${Math.ceil(h)} h` : `within ${Math.ceil(h / 24)} days`),
    repliesUnknown: "New on Contactos",
    memberSince: "Member since",
    about: "About",
    sealHeading: "What the CR-CIPI seal checked",
    sealItems: [
      "Legal existence and representation (Registro Nacional)",
      "Professional license or regulator registration for its field",
      "Identity of the people who run it",
      "Verified client reviews and reply time, kept up to date",
    ],
    notVerified: "This member has not completed CR-CIPI verification yet. Ask for credentials before you sign anything.",
    reviewsHeading: "Verified reviews",
    leaveReview: "Leave a review",
    jobsHeading: "Open roles",
    articlesHeading: "Guides by this member",
    contact: "Request a consultation",
    website: "Website",
    report: "Problem with a member? Tell CR-CIPI",
  },
  es: {
    back: "Directorio de miembros",
    rating: "Calificación",
    noReviews: "Sin reseñas aún",
    verifiedReviews: (n) => `${n} ${n === 1 ? "reseña verificada" : "reseñas verificadas"}`,
    replies: "Suele responder",
    repliesWithin: (h) => (h < 1 ? "en menos de una hora" : h < 24 ? `en ${Math.ceil(h)} h` : `en ${Math.ceil(h / 24)} días`),
    repliesUnknown: "Nuevo en Contactos",
    memberSince: "Miembro desde",
    about: "Acerca de",
    sealHeading: "Lo que revisó el sello CR-CIPI",
    sealItems: [
      "Existencia legal y representación (Registro Nacional)",
      "Licencia profesional o inscripción ante el regulador de su campo",
      "Identidad de quienes la dirigen",
      "Reseñas verificadas de clientes y tiempo de respuesta, al día",
    ],
    notVerified: "Este miembro aún no completa la verificación de CR-CIPI. Pida sus credenciales antes de firmar.",
    reviewsHeading: "Reseñas verificadas",
    leaveReview: "Dejar una reseña",
    jobsHeading: "Vacantes abiertas",
    articlesHeading: "Guías de este miembro",
    contact: "Solicitar una consulta",
    website: "Sitio web",
    report: "¿Problema con un miembro? Avise a CR-CIPI",
  },
};
