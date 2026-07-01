// Business logic behind each function-call name. Adapters normalize a vendor
// payload into { functionName, args }, then this dispatches to the right handler.
// Handlers are vendor-agnostic and write through the shared API layer (lib/api/*).

import { bookAppointment } from "../api/appointments";
import { createLead, updateLead } from "../api/leads";
import { logAgentEvent } from "../api/events";
import { placeAgentCall } from "../telephony/outbound";

export type FunctionContext = {
  slug: string; // tenant slug / agent_type
  tenantId: string; // tenant uuid
  callId: string | null; // call uuid (may be null if no conversation id)
};

type Args = Record<string, unknown>;
type Handler = (args: Args, ctx: FunctionContext) => Promise<unknown>;

const str = (v: unknown) => (v == null ? undefined : String(v));

// Nestriq: motivation score from seller signals (0-100). Simple, explainable.
function motivationScore(args: Args): number {
  let score = 40;
  const timeline = str(args.timeline)?.toLowerCase() ?? "";
  const reason = str(args.reason ?? args.motivation)?.toLowerCase() ?? "";
  if (/asap|immediately|urgent|30|month/.test(timeline)) score += 25;
  if (/inherit|divorce|relocat|foreclos|job|behind|tired landlord/.test(reason))
    score += 25;
  if (str(args.condition)?.toLowerCase().includes("needs work")) score += 10;
  return Math.max(0, Math.min(100, score));
}

// Lexora: normalize Hume's emotion signals (forwarded by the widget) into one
// canonical shape for storage + display. Derives sentiment/valence when the
// widget only sends a dominant emotion. See docs/PLAN-lexora.md §3.
type EmotionSummary = {
  dominant: string;
  sentiment: "negative" | "neutral" | "positive";
  intensity?: number;
  valence: number; // -1..1
};
function summarizeEmotions(args: Args): EmotionSummary {
  const dominant = str(args.dominantEmotion ?? args.dominant) ?? "Neutral";
  const intensityRaw = Number(args.intensity ?? args.score);
  const intensity = Number.isFinite(intensityRaw) ? intensityRaw : undefined;

  const explicit = str(args.sentiment)?.toLowerCase();
  const sentiment: EmotionSummary["sentiment"] =
    explicit === "negative" || explicit === "neutral" || explicit === "positive"
      ? explicit
      : /distress|anxiet|fear|sad|anger|pain|disappoint|tired/i.test(dominant)
        ? "negative"
        : /calm|relief|joy|content|hope|satisf|gratitude/i.test(dominant)
          ? "positive"
          : "neutral";

  const magnitude = intensity ?? 0.5;
  const valence =
    sentiment === "negative" ? -magnitude : sentiment === "positive" ? magnitude : 0;

  return { dominant, sentiment, intensity, valence };
}

const handlers: Record<string, Handler> = {
  // Create a new lead in the shared leads table.
  createLead: async (args, ctx) => {
    const leadId = await createLead(ctx.tenantId, ctx.slug, {
      name: str(args.name ?? args.full_name),
      email: str(args.email),
      phone: str(args.phone),
      industry: str(args.industry),
    });
    return { leadId };
  },

  // Save seller / property details captured during the call (logged as an event).
  saveSellerDetails: async (args, ctx) => {
    await logAgentEvent(ctx.tenantId, ctx.callId, "seller_details", args);
    if (str(args.leadId)) {
      await updateLead(str(args.leadId)!, { status: "qualifying" });
    }
    return { saved: true };
  },

  // Compute a motivation score and persist it on the lead if we have one.
  calculateMotivationScore: async (args, ctx) => {
    const score = motivationScore(args);
    if (str(args.leadId)) await updateLead(str(args.leadId)!, { score });
    await logAgentEvent(ctx.tenantId, ctx.callId, "motivation_score", { score, args });
    return { score };
  },

  // Book a consultation appointment (shared by Nestriq and Lexora).
  bookConsultation: async (args, ctx) => {
    const appointmentId = await bookAppointment(ctx.tenantId, str(args.leadId) ?? null, {
      date: str(args.date),
      time: str(args.time),
    });
    return { appointmentId };
  },

  // --- Lexora (Hume) ---------------------------------------------------------

  // Open a new case file for an injured caller.
  createCaseIntake: async (args, ctx) => {
    const leadId = await createLead(ctx.tenantId, ctx.slug, {
      name: str(args.name ?? args.full_name),
      email: str(args.email),
      phone: str(args.phone),
      industry: "Personal Injury Law",
    });
    await logAgentEvent(ctx.tenantId, ctx.callId, "case_intake", args);
    return { leadId };
  },

  // Save accident / injury details captured during the call (logged as an event).
  saveInjuryInformation: async (args, ctx) => {
    await logAgentEvent(ctx.tenantId, ctx.callId, "injury_info", args);
    if (str(args.leadId)) {
      await updateLead(str(args.leadId)!, { status: "qualifying" });
    }
    return { saved: true };
  },

  // Record the caller's emotional state + sentiment (Lexora's differentiator).
  emotionAnalysis: async (args, ctx) => {
    const emotion = summarizeEmotions(args);
    await logAgentEvent(ctx.tenantId, ctx.callId, "emotion_analysis", emotion);
    return emotion;
  },

  // --- Callora (Vapi) --------------------------------------------------------

  // Book a service appointment (home services). Same shape as bookConsultation.
  bookAppointment: async (args, ctx) => {
    const appointmentId = await bookAppointment(ctx.tenantId, str(args.leadId) ?? null, {
      date: str(args.date),
      time: str(args.time),
    });
    return { appointmentId };
  },

  // Save a short call summary captured by the agent (logged as an event).
  saveCallSummary: async (args, ctx) => {
    await logAgentEvent(ctx.tenantId, ctx.callId, "call_summary", args);
    return { saved: true };
  },

  // --- Phone callback (shared by all agents) ---------------------------------

  // Call the caller's phone and connect them to THIS tenant's voice agent (the AI
  // continues the conversation by phone — no human bridge). Uses the platform's
  // native outbound calling (Vapi / ElevenLabs).
  requestCallback: async (args, ctx) => {
    await logAgentEvent(ctx.tenantId, ctx.callId, "callback_requested", args);
    const phone = str(args.phone);

    if (!phone) {
      return { called: false, message: "What phone number should we call you on?" };
    }

    const result = await placeAgentCall(ctx.slug, phone);

    if (!result) {
      return {
        called: false,
        message:
          "I've noted your callback request — we'll ring you back shortly.",
      };
    }

    if (str(args.leadId)) await updateLead(str(args.leadId)!, { status: "callback" });
    await logAgentEvent(ctx.tenantId, ctx.callId, "callback_placed", {
      to: phone,
      callId: result.id,
    });
    return {
      called: true,
      callId: result.id,
      message: "Calling you now — your phone will ring in just a moment.",
    };
  },
};

export async function runFunction(
  name: string,
  args: Args,
  ctx: FunctionContext,
): Promise<unknown> {
  const handler = handlers[name];
  if (!handler) throw new Error(`No handler for function: ${name}`);
  return handler(args, ctx);
}

export const SUPPORTED_FUNCTIONS = Object.keys(handlers);
