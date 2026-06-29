// platform -> adapter lookup. The api routes use this to pick the right adapter.
// Add a new platform here when you add a new voice vendor.

import type { VoicePlatform } from "../tenants/types";
import type { PlatformAdapter } from "./types";
import { elevenlabsAdapter } from "./elevenlabs";
import { humeAdapter } from "./hume";

// import { vapiAdapter } from "./vapi";
// import { retellAdapter } from "./retell";
// import { ultravoxAdapter } from "./ultravox";
// import { deepgramAdapter } from "./deepgram";

const ADAPTERS: Partial<Record<VoicePlatform, PlatformAdapter>> = {
  elevenlabs: elevenlabsAdapter,
  hume: humeAdapter,
  // vapi: vapiAdapter,
  // retell: retellAdapter,
  // ultravox: ultravoxAdapter,
  // deepgram: deepgramAdapter,
};

export function getAdapter(platform: string): PlatformAdapter {
  const adapter = ADAPTERS[platform as VoicePlatform];
  if (!adapter) throw new Error(`No adapter registered for platform: ${platform}`);
  return adapter;
}
