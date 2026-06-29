// Display metadata for every demo tenant (not just the active ones), used by the
// admin dashboard's tenant filter, color-coded charts, and badges. Data for any
// of the 6 demos can land in the shared tables, so the dashboard knows all of
// them regardless of which are wired up in lib/tenants/registry.ts.

// Per-tenant vocabulary for the SHARED dashboard. The dashboard is never forked
// per demo (golden rule); instead it relabels itself from this lexicon based on
// the selected tenant. A real-estate demo has "Leads", a law firm has "Cases", a
// clinic has "Patients" — same tables underneath, different words on screen.
export type Lexicon = {
  lead: string; // singular noun for a `leads`-table row
  leads: string; // plural noun (nav item, KPI, table title)
  scoreLabel: string; // header for the leads.score column
  showScore: boolean; // hide the score column where a numeric score is meaningless
  hiddenSections: string[]; // section ids to hide when this tenant is selected
  emotion: boolean; // show the "Emotional Analysis" section (Hume / Lexora)
};

// Default vocabulary, used for the "All demos" view and unknown tenants.
export const GENERIC_LEXICON: Lexicon = {
  lead: "Lead",
  leads: "Leads",
  scoreLabel: "Score",
  showScore: true,
  hiddenSections: [],
  emotion: false,
};

export type TenantMeta = {
  slug: string;
  name: string;
  platform: string;
  industry: string;
  color: string;
  lexicon: Lexicon;
};

const lex = (l: Partial<Lexicon>): Lexicon => ({ ...GENERIC_LEXICON, ...l });

export const TENANT_META: TenantMeta[] = [
  { slug: "nestriq", name: "Nestriq AI", platform: "ElevenLabs", industry: "Real Estate", color: "#14b8a6",
    lexicon: lex({ scoreLabel: "Motivation" }) },
  { slug: "callora", name: "Callora AI", platform: "Vapi", industry: "Home Services", color: "#f97316",
    lexicon: lex({}) },
  { slug: "medelynx", name: "Medelynx AI", platform: "Retell AI", industry: "Healthcare", color: "#3b82f6",
    lexicon: lex({ lead: "Patient", leads: "Patients", showScore: false }) },
  { slug: "lexora", name: "Lexora AI", platform: "Hume AI", industry: "Personal Injury Law", color: "#8b5cf6",
    lexicon: lex({ lead: "Case", leads: "Cases", scoreLabel: "Sentiment", showScore: false, emotion: true }) },
  { slug: "qualivo", name: "Qualivo AI", platform: "Ultravox", industry: "B2B SaaS / Sales", color: "#ec4899",
    lexicon: lex({ scoreLabel: "Lead Score" }) },
  { slug: "voxium", name: "Voxium Labs", platform: "Deepgram", industry: "Voice Tech", color: "#0ea5e9",
    // Transcription-only: no leads / appointments to show.
    lexicon: lex({ showScore: false, hiddenSections: ["leads", "appointments"] }) },
];

const BY_SLUG = new Map(TENANT_META.map((t) => [t.slug, t]));

export function tenantMeta(slug: string): TenantMeta {
  return (
    BY_SLUG.get(slug) ?? {
      slug,
      name: slug,
      platform: "—",
      industry: "—",
      color: "#64748b",
      lexicon: GENERIC_LEXICON,
    }
  );
}

export function tenantColor(slug: string): string {
  return tenantMeta(slug).color;
}

// Resolve the vocabulary for the dashboard's current tenant filter.
// "all" (or unknown) → generic CRM terms.
export function tenantLexicon(slug: string): Lexicon {
  return slug === "all" ? GENERIC_LEXICON : tenantMeta(slug).lexicon;
}
