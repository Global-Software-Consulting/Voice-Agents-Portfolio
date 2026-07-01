// Per-demo configuration. This is the ONLY surface that changes when adding a demo.
// See docs/ARCHITECTURE.md → "TenantConfig".

export type VoicePlatform =
  | "elevenlabs"
  | "vapi"
  | "retell"
  | "hume"
  | "ultravox"
  | "deepgram";

export type FunctionParam = {
  name: string;
  type: "string" | "number" | "boolean";
  required?: boolean;
  description?: string;
};

export type FunctionSchema = {
  name: string; // e.g. "createLead", "bookAppointment", "calculateMotivationScore"
  description: string;
  params: FunctionParam[];
};

export type Branding = {
  logo: string;
  colors: { primary: string; accent: string; background: string };
  theme: "light" | "dark";
  tagline: string;
  // Visual layout variant — each demo gets a structurally different landing page
  // (nav placement, hero style, section order, footer) so no two look alike.
  layout?: "classic" | "editorial" | "bold";
};

export type ServiceItem = { title: string; description: string; icon?: string };
export type Benefit = { title: string; description: string };
export type HowStep = { title: string; description: string };
export type Stat = { value: string; label: string };
export type Faq = { q: string; a: string };
export type ConversationTurn = { side: "agent" | "user"; text: string };
// The illustrative "Live conversation" card in the hero. Per-tenant so the
// sample dialogue + outcomes match the demo's industry (real estate, law, …).
export type HeroConversation = { turns: ConversationTurn[]; outcomes: string[] };

export type LandingContent = {
  hero: string;
  concept: string;
  features: string[];
  // Optional richer marketing content. Sections render only when provided, so
  // tenants can opt in gradually.
  subhero?: string; // supporting paragraph under the hero headline
  benefits?: Benefit[]; // "why it matters" — business outcomes (3 is plenty)
  services?: ServiceItem[]; // "what we provide" cards
  steps?: HowStep[]; // "how it works" steps
  stats?: Stat[]; // headline numbers
  faqs?: Faq[]; // frequently asked questions
  conversation?: HeroConversation; // sample dialogue shown in the hero card
};

export type TenantConfig = {
  slug: string; // 'nestriq' — also stored as agent_type in the DB
  name: string; // 'Nestriq AI'
  industry: string;
  platform: VoicePlatform;
  branding: Branding;
  landing: LandingContent;
  testPrompts: string[]; // suggested prompts shown to visitors
  agentPrompt: string; // system prompt for the voice agent
  functions: FunctionSchema[]; // function-calling schema
  // References to platform-side identifiers / secret keys (resolved from env).
  platformConfig: Record<string, string>;
};
