// Business logic behind each function-call name. Adapters normalize a vendor
// payload into { functionName, args }, then this dispatches to the right handler.
// Handlers are vendor-agnostic and write through the shared API layer (lib/api/*).

import { bookAppointment } from "../api/appointments";
import { createLead, updateLead } from "../api/leads";
import { logAgentEvent } from "../api/events";

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

  // Book a consultation appointment.
  bookConsultation: async (args, ctx) => {
    const appointmentId = await bookAppointment(ctx.tenantId, str(args.leadId) ?? null, {
      date: str(args.date),
      time: str(args.time),
    });
    return { appointmentId };
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
