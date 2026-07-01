// Callora AI — Home-services AI receptionist (Vapi).
// Third platform wired into the portfolio. Only platform-specific server code is
// lib/adapters/vapi.ts. See docs/ARCHITECTURE.md.

import type { TenantConfig } from "./types";

export const callora: TenantConfig = {
  slug: "callora",
  name: "Callora AI",
  industry: "Home Services",
  platform: "vapi",

  branding: {
    logo: "/callora-logo.svg",
    colors: { primary: "#c2410c", accent: "#f97316", background: "#fff7ed" },
    theme: "light",
    tagline: "Never miss another customer call.",
  },

  landing: {
    hero: "Every call answered, every job booked — 24/7.",
    subhero:
      "Callora is an AI receptionist for roofing, HVAC, plumbing, and home-services businesses. It answers every call, handles common questions, checks your service area, books appointments, and logs the lead — so you never lose a job to a missed call again.",
    concept: "AI receptionist that answers calls and books appointments.",
    features: [
      "Incoming call handling",
      "FAQ answering",
      "Service area lookup",
      "Appointment booking",
      "Lead capture",
      "Call summary",
    ],
    stats: [
      { value: "24/7", label: "Calls answered" },
      { value: "0", label: "Missed calls" },
      { value: "<20s", label: "To book a job" },
      { value: "100%", label: "Calls logged" },
    ],
    steps: [
      {
        title: "A customer calls",
        description:
          "Callora picks up instantly — day or night — greets the caller, and understands what service they need.",
      },
      {
        title: "It answers & books",
        description:
          "It answers common questions, confirms you serve their area, and books the appointment right into your calendar.",
      },
      {
        title: "You get the job",
        description:
          "Every call produces a lead, an appointment, and a call summary in your dashboard — ready for your crew.",
      },
    ],
    services: [
      {
        icon: "📞",
        title: "Incoming Call Handling",
        description:
          "Answers every inbound call professionally, so you never lose a customer to voicemail again.",
      },
      {
        icon: "❓",
        title: "FAQ Answering",
        description:
          "Handles common questions about pricing, availability, and services without tying up your crew.",
      },
      {
        icon: "📍",
        title: "Service Area Lookup",
        description:
          "Confirms whether you cover the caller's location before booking, so every job is reachable.",
      },
      {
        icon: "📅",
        title: "Appointment Booking",
        description:
          "Books inspections and service calls straight into your schedule, the moment the customer is ready.",
      },
      {
        icon: "🎯",
        title: "Lead Capture",
        description:
          "Logs every caller's name, contact, and request so nothing slips through the cracks.",
      },
      {
        icon: "📝",
        title: "Call Summary",
        description:
          "Writes a clear summary of each call so your team knows exactly what the customer needs.",
      },
    ],
    faqs: [
      {
        q: "Who is Callora for?",
        a: "Roofing, HVAC, plumbing, and other home-services businesses that lose jobs whenever a call goes unanswered.",
      },
      {
        q: "What does it do during a call?",
        a: "It greets the caller, answers common questions, checks your service area, captures their details, and books an appointment when they're ready.",
      },
      {
        q: "What happens after the call?",
        a: "Every conversation produces a lead, an appointment, a call summary, and a transcript — all in the admin dashboard instantly.",
      },
    ],
    conversation: {
      turns: [
        { side: "agent", text: "Thanks for calling Callora — how can we help with your home today?" },
        { side: "user", text: "My AC stopped working and it's really hot. Do you cover Charlotte?" },
        { side: "agent", text: "We do cover Charlotte. I can get a technician out to you — does tomorrow morning work?" },
      ],
      outcomes: ["✓ Lead created · HVAC repair", "Appointment booked"],
    },
  },

  testPrompts: [
    "I need a roof inspection",
    "Do you service Charlotte?",
    "I need an HVAC repair",
    "I'd like to schedule an appointment",
  ],

  agentPrompt: [
    "You are Callora, an AI receptionist for a home-services company (roofing, HVAC, plumbing).",
    "Answer warmly and professionally, like a great front-desk receptionist.",
    "Find out what service the caller needs, answer common questions, and confirm you serve their area.",
    "Collect the caller's name and contact, then book an appointment when they're ready.",
    "Call createLead as soon as you have a name, bookAppointment when they agree on a time,",
    "and saveCallSummary at the end with a short summary of the call.",
    "If the caller would rather continue by phone or asks for a callback, get their",
    "phone number and call requestCallback so we can call them back.",
    "Be concise, never quote exact prices, and never promise same-day service unless the caller asks and you offer to check.",
  ].join(" "),

  functions: [
    {
      name: "createLead",
      description: "Create a new customer lead with their contact details.",
      params: [
        { name: "name", type: "string", required: true },
        { name: "phone", type: "string" },
        { name: "email", type: "string" },
        { name: "service", type: "string", description: "service needed, e.g. roof inspection, HVAC repair" },
      ],
    },
    {
      name: "bookAppointment",
      description: "Book a service appointment for the customer.",
      params: [
        { name: "leadId", type: "string" },
        { name: "date", type: "string" },
        { name: "time", type: "string" },
      ],
    },
    {
      name: "saveCallSummary",
      description: "Save a short summary of the call for the team.",
      params: [
        { name: "leadId", type: "string" },
        { name: "summary", type: "string" },
      ],
    },
    {
      name: "requestCallback",
      description:
        "Call the caller's phone and continue the conversation there, when they'd rather talk by phone or ask for a callback.",
      params: [
        { name: "name", type: "string" },
        { name: "phone", type: "string", required: true, description: "the caller's phone number to call them on" },
        { name: "reason", type: "string" },
        { name: "leadId", type: "string" },
      ],
    },
  ],

  // The Vapi assistant id is the client-visible identifier; the public key is read
  // by the browser widget from NEXT_PUBLIC_VAPI_PUBLIC_KEY. Server secrets stay in env.
  platformConfig: {
    assistantId: process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID ?? "",
  },
};
