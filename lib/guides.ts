// In-module help ("How it works"), one guide per console module.
//
// Each guide has: a three-item checklist whose items tick themselves from
// real data (never from "I watched it"), short written how-tos, and an FAQ.
// Every statement here describes how the platform actually behaves; nothing
// about prices or review turnaround is promised.
//
// Client-safe: imported by the console pages and the help index.

export type MemberProgressKey =
  | "hasBusiness"
  | "profileComplete"
  | "translated"
  | "kycStarted"
  | "kycSubmitted"
  | "verified"
  | "leadAnswered"
  | "leadClosed"
  | "reviewReceived"
  | "jobPosted"
  | "applicantMoved"
  | "articleSubmitted"
  | "articlePublished"
  | "articleShared";

export type AdminProgressKey =
  | "kycQueueClear"
  | "articleQueueClear"
  | "accessQueueClear"
  | "membersVerified"
  | "staleLeadsNone"
  | "replyTimeHealthy";

export interface Guide<K extends string> {
  id: string;
  href: string;
  title: string;
  summary: string;
  checklist: { key: K; label: string; href?: string }[];
  howtos: { title: string; steps: string[] }[];
  faq: { q: string; a: string }[];
}

export const MEMBER_GUIDES: Guide<MemberProgressKey>[] = [
  {
    id: "home",
    href: "/account",
    title: "Overview",
    summary:
      "Your home shows what is working for your company and the single next step that brings you more clients.",
    checklist: [
      { key: "hasBusiness", label: "Your company is listed in the directory", href: "/account/businesses" },
      { key: "kycSubmitted", label: "You applied for the trust seal", href: "/account/verification" },
      { key: "leadAnswered", label: "You answered your first consultation request", href: "/account/leads" },
    ],
    howtos: [
      {
        title: "Read your dashboard in a minute",
        steps: [
          "New leads come first: anything waiting more than 24 hours is flagged in red.",
          "The cards below show reviews, job applications and article reads. Each card opens its module.",
          "The checklist lists what is still missing. It ticks itself as you complete each item.",
        ],
      },
    ],
    faq: [
      {
        q: "Who can see my company's data?",
        a: "Investors see your public profile: name, description, location, languages, rating and reply time. Your legal id and verification documents are private and only seen by the CR-CIPI team.",
      },
      {
        q: "Can a colleague help manage our profile?",
        a: "Yes. They register with their own email and enter your company's legal id. CR-CIPI receives the access request and confirms it with you.",
      },
    ],
  },
  {
    id: "businesses",
    href: "/account/businesses",
    title: "My businesses",
    summary: "Your public profile is your storefront for investors. Complete profiles get more consultation requests.",
    checklist: [
      { key: "hasBusiness", label: "Create your company profile", href: "/en/register" },
      { key: "profileComplete", label: "Add logo, website or phone, and location" },
      { key: "translated", label: "Write your description in both English and Spanish" },
    ],
    howtos: [
      {
        title: "Write a description that brings requests",
        steps: [
          "Start with who you help and with what: \"We handle pensionado and investor residency for families moving from North America.\"",
          "Add one concrete proof: years in practice, number of cases, languages spoken.",
          "Close with how you work: fixed fees, first call free, response time.",
        ],
      },
      {
        title: "Logo and contact details",
        steps: [
          "Use a square logo on a plain background; it is shown in a small square in the directory.",
          "Add a website or phone so investors who prefer to call can reach you.",
          "Set the location as canton and province, for example \"Escazú, San José\".",
        ],
      },
    ],
    faq: [
      {
        q: "We have several offices. How do we show that?",
        a: "Put the main office in the location and mention the others in your description.",
      },
      {
        q: "How do I change my category?",
        a: "Edit the business and pick another main service. Your verification stays valid unless the new category requires a license you have not provided.",
      },
    ],
  },
  {
    id: "leads",
    href: "/account/leads",
    title: "Leads",
    summary:
      "Consultation requests from your public profile. Your median reply time is shown to investors, so answer fast.",
    checklist: [
      { key: "leadAnswered", label: "Answer a request (the clock stops when you reply)" },
      { key: "leadClosed", label: "Mark a lead won or lost" },
      { key: "reviewReceived", label: "Receive your first verified review" },
    ],
    howtos: [
      {
        title: "Answer a request in under 24 hours",
        steps: [
          "Open the lead and press \"Reply by email\": your email app opens with the investor's address and a subject line.",
          "If you replied another way (phone, WhatsApp), press \"I already replied\" so your reply time is recorded.",
          "Leads waiting more than 24 hours are flagged and count against your public reply time.",
        ],
      },
      {
        title: "Close leads, and why it matters",
        steps: [
          "When the client hires you, press \"Mark won\". CR-CIPI then emails them once to ask for a verified review.",
          "If it doesn't go ahead, choose a reason and press \"Mark lost\". You can reopen it later.",
          "Won leads turn into reviews, and reviews move you up in the directory.",
        ],
      },
    ],
    faq: [
      {
        q: "Where does each lead come from?",
        a: "From the \"Request a consultation\" form on your public profile. Each request is also emailed to your leads address.",
      },
      {
        q: "What if a lead is spam?",
        a: "Mark it lost with the reason \"Spam\". The form already filters bots and limits how often one connection can send requests.",
      },
    ],
  },
  {
    id: "verification",
    href: "/account/verification",
    title: "Trust seal",
    summary:
      "The CR-CIPI seal tells investors that the Chamber checked your company's legal existence and licenses. Verified members are listed first.",
    checklist: [
      { key: "kycStarted", label: "Fill in your legal details" },
      { key: "kycSubmitted", label: "Upload the documents and submit for review" },
      { key: "verified", label: "Earn the seal" },
    ],
    howtos: [
      {
        title: "Which documents you need",
        steps: [
          "Companies (cédula jurídica): the personería jurídica or registry certificate, and the legal representative's ID.",
          "Independent professionals (cédula física): your ID.",
          "Regulated trades also need their registration: SUGEF for real estate, the Colegio de Abogados for law firms, the Colegio de Contadores for accountants, SUGESE for insurance.",
          "Files can be PDF, JPG or PNG, up to 5 MB each.",
        ],
      },
      {
        title: "Getting the personería jurídica",
        steps: [
          "Request a digital certificate from the Registro Nacional's online services.",
          "Download it as PDF and upload it in the \"Personería jurídica\" slot.",
        ],
      },
    ],
    faq: [
      {
        q: "What happens if I change my details after being verified?",
        a: "Re-submitting sends your file back to review and the seal is removed until the team approves it again. Saving a draft does not.",
      },
      {
        q: "What if the team asks for changes?",
        a: "You get an email with the reason. Fix what was asked and submit again.",
      },
    ],
  },
  {
    id: "jobs",
    href: "/account/jobs",
    title: "Jobs",
    summary: "Post openings for free on the public job board. Applications arrive by email and are collected here.",
    checklist: [
      { key: "hasBusiness", label: "Have a listed company" },
      { key: "jobPosted", label: "Publish a job" },
      { key: "applicantMoved", label: "Move an applicant to a new stage" },
    ],
    howtos: [
      {
        title: "Publish a job in three minutes",
        steps: [
          "Press \"New job\", choose the company, and write the title the way candidates search for it.",
          "Describe the role in a few short paragraphs, then the requirements as a list.",
          "Show the salary range: postings with a salary are easier for candidates to judge.",
        ],
      },
      {
        title: "Work through applicants",
        steps: [
          "Open the job to see every application, with the CV when the candidate attached one.",
          "Move each applicant through Reviewed, Shortlisted, Hired or Rejected to keep track.",
        ],
      },
    ],
    faq: [
      { q: "How long does a job stay up?", a: "60 days from publication. You can close it earlier." },
      {
        q: "Who sees the CVs?",
        a: "Only your company, from this dashboard. CVs are stored privately and are not public.",
      },
    ],
  },
  {
    id: "articles",
    href: "/account/articles",
    title: "Articles",
    summary:
      "Publish guides for people moving to Costa Rica. Good articles bring readers to your profile and show your expertise.",
    checklist: [
      { key: "articleSubmitted", label: "Write and submit an article" },
      { key: "articlePublished", label: "Get it published" },
      { key: "articleShared", label: "Reach your first 10 readers" },
    ],
    howtos: [
      {
        title: "Your first article: the question clients ask most",
        steps: [
          "Pick the question you answer every week and make it the title.",
          "Answer it in order: requirements, steps, costs or timeframes you can stand behind, common mistakes.",
          "Link your article to your company so readers can request a consultation.",
        ],
      },
      {
        title: "Why the review asked for changes",
        steps: [
          "Every article is checked automatically for quality and promotional tone; borderline ones go to a CR-CIPI editor.",
          "If changes are needed, you'll see the reasons on the article. Edit and submit again.",
        ],
      },
    ],
    faq: [
      {
        q: "What doesn't get published?",
        a: "Pure advertising, political or religious content, misleading claims, and anything unrelated to living, investing or working in Costa Rica.",
      },
      {
        q: "Can I share my article?",
        a: "Yes. Once published, copy its link from the Insights page and share it on LinkedIn or WhatsApp.",
      },
    ],
  },
];

export const ADMIN_GUIDES: Guide<AdminProgressKey>[] = [
  {
    id: "routine",
    href: "/admin/dashboard",
    title: "Daily routine",
    summary: "Ten minutes a day keeps every queue moving and members trusting the seal.",
    checklist: [
      { key: "kycQueueClear", label: "No verification waiting", href: "/admin/reviews" },
      { key: "articleQueueClear", label: "No article waiting for an editor", href: "/admin/reviews" },
      { key: "accessQueueClear", label: "No access request waiting", href: "/admin/reviews" },
    ],
    howtos: [
      {
        title: "The 10-minute routine",
        steps: [
          "Open Reviews: it lists everything waiting for a person, oldest first.",
          "Decide each item or leave a note for the member explaining what is missing.",
          "Glance at Members for companies with leads waiting over 24 hours, and nudge them.",
        ],
      },
    ],
    faq: [
      {
        q: "Who gets the notification emails?",
        a: "Verification and access requests go to every admin. Articles needing an editor go to the Chamber's notification inbox set in the site settings.",
      },
    ],
  },
  {
    id: "reviews",
    href: "/admin/reviews",
    title: "Reviews",
    summary: "One inbox for everything waiting on the Chamber: verifications, articles and access requests.",
    checklist: [
      { key: "kycQueueClear", label: "Verification queue empty" },
      { key: "articleQueueClear", label: "Article queue empty" },
      { key: "accessQueueClear", label: "Access requests answered" },
    ],
    howtos: [
      {
        title: "Verify a company",
        steps: [
          "Check the legal name and id against the personería jurídica.",
          "Match the legal representative's ID with the name on the certificate.",
          "For regulated trades, confirm the registration number with the regulator's public register.",
          "Approve, or request changes with a note: the member sees it and gets an email.",
        ],
      },
      {
        title: "Decide an article the automatic review couldn't",
        steps: [
          "Read the reasons the automatic review gave.",
          "Publish if it is useful and honest; reject with a short explanation if it is advertising or misleading.",
        ],
      },
      {
        title: "Answer an access request",
        steps: [
          "Someone entered a company's legal id that is already registered.",
          "Confirm with the company's current owner (their email is shown), then assign the business in Users or decline.",
        ],
      },
    ],
    faq: [],
  },
  {
    id: "members",
    href: "/admin/members",
    title: "Members",
    summary: "Every company with its health: profile, seal, reply time and activity.",
    checklist: [
      { key: "membersVerified", label: "More than half of the members hold the seal" },
      { key: "staleLeadsNone", label: "No member has leads waiting over 24 hours" },
      { key: "replyTimeHealthy", label: "Members' median reply time is under 24 hours" },
    ],
    howtos: [
      {
        title: "Read a member's health",
        steps: [
          "The trust score adds up five pillars: legal, profile, responsiveness, reviews and activity.",
          "Sort by score to find members who need a nudge, or by waiting leads to protect investors.",
        ],
      },
      {
        title: "Suspend and restore access",
        steps: [
          "In Users, suspend a person to block their sign-in. Their company stays listed.",
          "To hide a company from the directory, use Providers.",
        ],
      },
    ],
    faq: [],
  },
];

// Admin-only steps for editing site copy; kept here so the help index lists it.
export const SITE_EDITING_HOWTO = {
  title: "Edit the website's text",
  steps: [
    "Sign in, open any public page and press \"Edit\" in the floating bar.",
    "Click a text to change it in place, then press \"Save\". Undo and Redo are in the same bar; press \"Done\" to leave edit mode.",
  ],
};
