// Outbound phone calls handled by the tenant's OWN voice AI agent (no human
// bridge). The AI calls the caller's number and continues the conversation on
// the phone, using each platform's native outbound-calling API.
//
// Returns a provider call id on success, or null (unsupported / unconfigured /
// error) so the caller falls back to a graceful message.

import { getTenant } from "../tenants/registry";

async function vapiOutbound(to: string): Promise<{ id: string } | null> {
  const key = process.env.VAPI_PRIVATE_KEY;
  const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;
  if (!key || !assistantId || !phoneNumberId) return null;
  try {
    const res = await fetch("https://api.vapi.ai/call", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ assistantId, phoneNumberId, customer: { number: to } }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { id?: string };
    return json.id ? { id: json.id } : null;
  } catch {
    return null;
  }
}

async function elevenlabsOutbound(to: string): Promise<{ id: string } | null> {
  const key = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
  const phoneNumberId = process.env.ELEVENLABS_PHONE_NUMBER_ID;
  if (!key || !agentId || !phoneNumberId) return null;
  try {
    const res = await fetch(
      "https://api.elevenlabs.io/v1/convai/twilio/outbound-call",
      {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: agentId,
          agent_phone_number_id: phoneNumberId,
          to_number: to,
        }),
      },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { callSid?: string; conversation_id?: string };
    const id = json.callSid ?? json.conversation_id;
    return id ? { id } : null;
  } catch {
    return null;
  }
}

// Place an outbound AI call for a tenant, dialing `to` and connecting them to
// that tenant's voice agent. Dispatches by the tenant's voice platform.
export async function placeAgentCall(
  tenantSlug: string,
  to: string,
): Promise<{ id: string } | null> {
  const cfg = getTenant(tenantSlug);
  if (!cfg || !to) return null;
  switch (cfg.platform) {
    case "vapi":
      return vapiOutbound(to);
    case "elevenlabs":
      return elevenlabsOutbound(to);
    default:
      // Hume EVI has no simple native outbound calling — logged, not placed.
      return null;
  }
}
