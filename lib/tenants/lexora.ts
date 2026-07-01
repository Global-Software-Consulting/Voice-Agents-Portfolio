// Lexora AI — Personal Injury legal intake specialist (Hume AI / EVI).
// Second platform wired into the portfolio. This file is the ENTIRE per-demo
// surface; the only platform-specific server code is lib/adapters/hume.ts.
// See docs/PLAN-lexora.md.

import type { TenantConfig } from "./types";

export const lexora: TenantConfig = {
  slug: "lexora",
  name: "Lexora AI",
  industry: "Personal Injury Law",
  platform: "hume",

  branding: {
    logo: "/lexora-logo.svg",
    colors: { primary: "#1e3a5f", accent: "#9a7b4f", background: "#f4f1ea" },
    theme: "light",
    tagline: "The first conversation every client deserves.",
    layout: "editorial",
  },

  landing: {
    hero: "Injured and unsure what to do next? Talk to our AI intake specialist.",
    subhero:
      "Lexora is an AI legal intake specialist for personal-injury firms. It speaks with injured callers 24/7 with genuine empathy, captures the details of the accident and injuries, reads the caller's emotional state, and books a consultation — so your attorneys only spend time on cases that matter.",
    concept: "AI legal intake specialist for personal-injury law firms.",
    features: [
      "Client intake",
      "Accident reporting",
      "Injury collection",
      "Consultation booking",
      "Emotion detection",
      "Sentiment analysis",
    ],
    benefits: [
      {
        title: "Never miss an intake",
        description:
          "Injured callers reach a real, empathetic conversation around the clock, so cases don't slip away to whichever firm answered first.",
      },
      {
        title: "Attorneys focus on real cases",
        description:
          "Lexora gathers the facts and books the consultation — your attorneys only spend time on intakes worth pursuing.",
      },
      {
        title: "Every caller handled with care",
        description:
          "Real-time emotion reading means distressed callers are met with the right tone, and flagged for priority follow-up.",
      },
    ],
    stats: [
      { value: "24/7", label: "Always available" },
      { value: "<60s", label: "To open a case file" },
      { value: "0", label: "Missed intakes" },
      { value: "100%", label: "Calls logged & analyzed" },
    ],
    steps: [
      {
        title: "An injured caller reaches out",
        description:
          "Someone who's just been in an accident clicks “Talk to Agent” and explains what happened — in their own words, any time of day.",
      },
      {
        title: "Lexora listens with empathy",
        description:
          "It gathers the accident details, injuries, and treatment, while reading the caller's emotional state in real time so the conversation stays human.",
      },
      {
        title: "Your firm gets a ready case file",
        description:
          "A new case, an intake summary, an emotional analysis, and a booked consultation are waiting in your dashboard the moment the call ends.",
      },
    ],
    services: [
      {
        icon: "📝",
        title: "Client Intake",
        description:
          "Captures the caller's name, contact details, and the core facts of their situation accurately and calmly.",
      },
      {
        icon: "🚗",
        title: "Accident Reporting",
        description:
          "Records how, when, and where the accident happened, and who else was involved.",
      },
      {
        icon: "🩹",
        title: "Injury Collection",
        description:
          "Documents injuries sustained and any treatment received so attorneys can assess the case quickly.",
      },
      {
        icon: "❤️",
        title: "Emotion Detection",
        description:
          "Reads the caller's emotional state from their voice so distressed clients are handled with extra care.",
      },
      {
        icon: "📊",
        title: "Sentiment Analysis",
        description:
          "Summarizes the emotional tone of every call, surfacing the most distressed callers for priority follow-up.",
      },
      {
        icon: "📅",
        title: "Consultation Booking",
        description:
          "Books a consultation with an attorney the moment the caller is ready — no phone tag, no missed leads.",
      },
    ],
    faqs: [
      {
        q: "Who is Lexora for?",
        a: "Personal-injury law firms that want to capture and qualify every intake call with empathy, without staffing a 24/7 reception desk.",
      },
      {
        q: "Does it give legal advice?",
        a: "No. Lexora gathers the facts of the situation, reassures the caller, and books a consultation. It never offers legal opinions or advice.",
      },
      {
        q: "What does the emotional analysis do?",
        a: "Hume's voice model reads the caller's emotional state during the call. Lexora summarizes the dominant emotions and overall sentiment so your team can prioritize the people who need the most support.",
      },
    ],
    conversation: {
      turns: [
        { side: "agent", text: "Hi, this is Lexora. I'm sorry you're going through this — can you tell me what happened?" },
        { side: "user", text: "I was hit by a car last week and I've had neck pain ever since." },
        { side: "agent", text: "That sounds really difficult. Have you been seen by a doctor for the neck pain yet?" },
      ],
      outcomes: ["✓ Case opened · Sentiment: distressed", "Consultation booked"],
    },
  },

  testPrompts: [
    "I was injured in a car accident",
    "I need legal advice",
    "I want to speak with an attorney",
    "I'd like a consultation",
  ],

  agentPrompt: [
    "You are Lexora, an AI legal intake specialist for a personal-injury law firm.",
    "Your goal is to make injured callers feel heard while gathering the facts their attorney needs.",
    "Be warm, calm, and empathetic — many callers are in pain or distress.",
    "Collect: caller name and contact, what happened (accident type, date, location),",
    "injuries sustained and any treatment, and whether another party was at fault.",
    "Call createCaseIntake early once you have a name, saveInjuryInformation as you learn",
    "about the accident and injuries, emotionAnalysis to reflect the caller's emotional state,",
    "and bookConsultation when the caller is ready to speak with an attorney.",
    "Never give legal advice or opinions, never quote settlement amounts, and never make promises",
    "about case outcomes. If asked for advice, gently explain an attorney will cover that in the consultation.",
  ].join(" "),

  functions: [
    {
      name: "createCaseIntake",
      description: "Open a new case file for an injured caller with their contact details.",
      params: [
        { name: "name", type: "string", required: true },
        { name: "phone", type: "string" },
        { name: "email", type: "string" },
        { name: "accidentType", type: "string", description: "e.g. car accident, slip and fall" },
        { name: "accidentDate", type: "string" },
      ],
    },
    {
      name: "saveInjuryInformation",
      description: "Save accident and injury details collected during the call.",
      params: [
        { name: "leadId", type: "string" },
        { name: "injuries", type: "string" },
        { name: "treatment", type: "string" },
        { name: "atFault", type: "string", description: "who was at fault, if known" },
        { name: "otherParty", type: "string" },
      ],
    },
    {
      name: "emotionAnalysis",
      description:
        "Record the caller's emotional state and overall sentiment, derived from Hume's voice analysis.",
      params: [
        { name: "leadId", type: "string" },
        { name: "dominantEmotion", type: "string", description: "e.g. Distress, Anxiety, Calmness" },
        { name: "sentiment", type: "string", description: "negative | neutral | positive" },
        { name: "intensity", type: "number", description: "0-1 strength of the dominant emotion" },
      ],
    },
    {
      name: "bookConsultation",
      description: "Book a consultation appointment with an attorney.",
      params: [
        { name: "leadId", type: "string" },
        { name: "date", type: "string" },
        { name: "time", type: "string" },
      ],
    },
  ],

  // The Hume EVI config id is the client-visible identifier (analogous to the
  // ElevenLabs agent id). Server secrets (HUME_API_KEY / HUME_SECRET_KEY) are
  // used only by the token-mint route and never reach the browser.
  platformConfig: {
    configId: process.env.NEXT_PUBLIC_HUME_CONFIG_ID ?? "",
  },
};
