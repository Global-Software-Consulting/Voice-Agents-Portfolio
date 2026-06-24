// Nestriq AI — Real Estate seller-acquisition specialist (ElevenLabs).
// This file is the ENTIRE per-demo surface. Copy it to add another demo.

import type { TenantConfig } from "./types";

export const nestriq: TenantConfig = {
  slug: "nestriq",
  name: "Nestriq AI",
  industry: "Real Estate",
  platform: "elevenlabs",

  branding: {
    logo: "/nestriq-logo.svg",
    colors: { primary: "#0f766e", accent: "#14b8a6", background: "#f0fdfa" },
    theme: "light",
    tagline: "AI-powered property acquisition specialist.",
  },

  landing: {
    hero: "Sell your home on your terms — talk to our AI acquisition specialist.",
    subhero:
      "Nestriq is an AI-powered acquisition specialist for real estate investors. It speaks with home sellers 24/7, understands their situation, scores their motivation, and books qualified consultations — so your team only ever talks to ready-to-sell leads.",
    concept: "AI acquisition specialist that qualifies motivated home sellers.",
    features: [
      "Seller qualification",
      "Property information collection",
      "Timeline assessment",
      "Motivation scoring",
      "Appointment booking",
      "Lead capture",
    ],
    stats: [
      { value: "24/7", label: "Always answering" },
      { value: "<30s", label: "To qualify a seller" },
      { value: "0", label: "Missed leads" },
      { value: "100%", label: "Conversations logged" },
    ],
    steps: [
      {
        title: "Seller starts a conversation",
        description:
          "A motivated homeowner clicks “Talk to Agent” and tells Nestriq why they want to sell — in natural speech, any time of day.",
      },
      {
        title: "Nestriq qualifies & scores",
        description:
          "It collects the property details, reason for selling, and timeline, then calculates a motivation score in real time.",
      },
      {
        title: "Your team gets a booked lead",
        description:
          "Qualified sellers are booked straight into a consultation, with a full transcript and summary waiting in your dashboard.",
      },
    ],
    services: [
      {
        icon: "🏠",
        title: "Seller Qualification",
        description:
          "Identifies genuinely motivated sellers and filters out tire-kickers before they ever reach your team.",
      },
      {
        icon: "📋",
        title: "Property Information Collection",
        description:
          "Captures address, condition, and key property details accurately during the conversation.",
      },
      {
        icon: "⏱️",
        title: "Timeline Assessment",
        description:
          "Understands how soon the seller needs to move so you can prioritize the hottest opportunities.",
      },
      {
        icon: "📊",
        title: "Motivation Scoring",
        description:
          "Scores every seller 0–100 based on their reason for selling, urgency, and property condition.",
      },
      {
        icon: "📅",
        title: "Appointment Booking",
        description:
          "Books consultations automatically the moment a seller is ready — no back-and-forth scheduling.",
      },
      {
        icon: "🎯",
        title: "Lead Capture",
        description:
          "Logs every lead, transcript, and outcome to your CRM-ready dashboard in real time.",
      },
    ],
    faqs: [
      {
        q: "Who is Nestriq for?",
        a: "Real estate investors and acquisition teams who want to qualify motivated home sellers without staffing a 24/7 call center.",
      },
      {
        q: "What does it do during a call?",
        a: "It greets the seller, collects property and contact details, assesses their motivation and timeline, scores the lead, and books a consultation when they're ready.",
      },
      {
        q: "What happens after the call?",
        a: "Every conversation produces a lead, a motivation score, a transcript, and a summary — all visible in the admin dashboard instantly.",
      },
    ],
  },

  testPrompts: [
    "I want to sell my house",
    "I inherited a property",
    "I need to sell quickly",
    "I'm considering a cash offer",
  ],

  agentPrompt: [
    "You are Nestriq, an AI acquisition specialist for a real estate investment firm.",
    "Your goal is to qualify motivated home sellers warmly and efficiently.",
    "Collect: seller name and contact, property address, condition, reason for selling,",
    "and desired timeline. Assess motivation, then offer to book a consultation.",
    "Call createLead early, saveSellerDetails as you learn about the property,",
    "calculateMotivationScore once you know reason + timeline, and bookConsultation",
    "when the seller is interested. Be concise and never give legal or tax advice.",
  ].join(" "),

  functions: [
    {
      name: "createLead",
      description: "Create a new seller lead with their contact details.",
      params: [
        { name: "name", type: "string", required: true },
        { name: "phone", type: "string" },
        { name: "email", type: "string" },
      ],
    },
    {
      name: "saveSellerDetails",
      description: "Save property and seller context collected during the call.",
      params: [
        { name: "leadId", type: "string" },
        { name: "address", type: "string" },
        { name: "condition", type: "string" },
        { name: "reason", type: "string" },
        { name: "timeline", type: "string" },
      ],
    },
    {
      name: "calculateMotivationScore",
      description: "Score how motivated the seller is (0-100).",
      params: [
        { name: "leadId", type: "string" },
        { name: "reason", type: "string" },
        { name: "timeline", type: "string" },
        { name: "condition", type: "string" },
      ],
    },
    {
      name: "bookConsultation",
      description: "Book a consultation appointment with the seller.",
      params: [
        { name: "leadId", type: "string" },
        { name: "date", type: "string" },
        { name: "time", type: "string" },
      ],
    },
  ],

  // Resolved at server render time. The ElevenLabs agent id is public (used by the
  // browser widget); secrets live only in server env.
  platformConfig: {
    agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ?? "",
  },
};
