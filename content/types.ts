// ============================================================
// CR-CIPI Content Types
// Single source of truth for the bilingual content schema.
// ============================================================

export type Locale = "en" | "es";

export interface NavItem {
  label: string;
  href: string;
}

export interface Announcement {
  enabled: boolean;
  eyebrow: string;
  title: string;
  body: string;
  linkLabel: string;
  linkUrl: string;
}

export interface Cta {
  label: string;
  href: string;
}

export interface Stat {
  value: string;
  label: string;
}

export interface Initiative {
  title: string;
  body: string;
  example: string;
  memberValue: string;
}

export interface Committee {
  name: string;
}

export interface ParticipationOption {
  title: string;
  purpose: string;
}

export interface InstitutionalPriority {
  title: string;
  description: string;
}

export interface FoundingGoal {
  metric: string;
  target: string;
}

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface FormContent {
  heading: string;
  intro: string;
  fields: {
    firstName: string;
    lastName: string;
    company: string;
    profession: string;
    email: string;
    phone: string;
    linkedin: string;
    expertise: string;
    participation: string;
    reason: string;
    language: string;
    consent: string;
    submit: string;
    submitting: string;
  };
  expertiseOptions: FormFieldOption[];
  participationOptions: FormFieldOption[];
  languageOptions: FormFieldOption[];
  errors: {
    required: string;
    email: string;
    consent: string;
    generic: string;
  };
  success: {
    title: string;
    body: string;
  };
}

export interface DirectoryContent {
  meta: {
    title: string;
    description: string;
  };
  hero: {
    eyebrow: string;
    heading: string;
    body: string;
  };
  filters: {
    browse: string;
    all: string;
    search: string;
    searchPlaceholder: string;
    noResults: string;
    verifiedOnly: string;
  };
  card: {
    featured: string;
    verified: string;
    verifiedHint: string;
    reviews: string;
    noReviews: string;
    visit: string;
  };
  rating: {
    heading: string;
    intro: string;
    ratingLabel: string;
    nameLabel: string;
    emailLabel: string;
    emailNote: string;
    commentLabel: string;
    sendCode: string;
    codeLabel: string;
    codeSent: string;
    codePlaceholder: string;
    verify: string;
    alreadyTitle: string;
    alreadyIntro: string;
    changeReview: string;
    newsletterPrompt: string;
    newsletterYes: string;
    submit: string;
    submitting: string;
    success: string;
    pending: string;
    errors: {
      rating: string;
      name: string;
      email: string;
      code: string;
      generic: string;
    };
  };
}

export interface PageContent {
  locale: Locale;
  lang: string;
  htmlLang: string;
  meta: {
    title: string;
    description: string;
  };
  nav: {
    home: string;
    about: string;
    join: string;
    directory: string;
    volunteer: string;
  };
  announcement: Announcement;
  home: {
    hero: {
      eyebrow: string;
      headline: string;
      body: string;
      primaryCta: string;
      secondaryCta: string;
    };
    stats: {
      items: Stat[];
    };
    purpose: {
      eyebrow: string;
      heading: string;
      body: string;
      vision: string;
    };
    whyJoin: {
      eyebrow: string;
      heading: string;
      body: string;
    };
    initiatives: {
      eyebrow: string;
      heading: string;
      exampleLabel: string;
      memberValueLabel: string;
      items: Initiative[];
    };
    sharedPurpose: {
      eyebrow: string;
      heading: string;
      body: string[];
      cta: string;
    };
  };
  about: {
    hero: {
      eyebrow: string;
      heading: string;
      body: string[];
    };
    mission: {
      eyebrow: string;
      heading: string;
      body: string;
    };
    priorities: {
      eyebrow: string;
      heading: string;
      items: InstitutionalPriority[];
    };
    not: {
      eyebrow: string;
      heading: string;
      items: string[];
      positioning: string;
    };
  };
  join: {
    hero: {
      eyebrow: string;
      heading: string;
      body: string;
    };
    committees: {
      eyebrow: string;
      heading: string;
      items: Committee[];
    };
    participation: {
      eyebrow: string;
      heading: string;
      options: ParticipationOption[];
    };
    goals: {
      eyebrow: string;
      heading: string;
      items: FoundingGoal[];
    };
    form: FormContent;
  };
  directory: DirectoryContent;
  footer: {
    purpose: string;
    contact: string;
    linkedin: string;
    formation: string;
    rights: string;
  };
}