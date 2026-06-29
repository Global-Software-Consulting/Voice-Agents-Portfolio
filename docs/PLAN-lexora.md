# Implementation Plan — Project 4: Lexora AI (Hume)

> **Progress:** Phases 1–5 built & verified (config, adapter, handlers, webhook,
> emotion UI, live widget + token route). Code is type-checked against the real
> Hume SDK (v0.2.14). **Remaining:** external Hume account setup (EVI config +
> credentials) to light up a live call, and Phase 6 polish. See "Status" notes
> at the bottom of each section.

> **Status:** Planned · **Platform:** Hume AI (EVI — Empathic Voice Interface)
> **Industry:** Personal Injury Law · **Subdomain:** `lexora.voice.gsoftconsulting.com`
>
> This is the second voice platform wired into the portfolio (after Nestriq /
> ElevenLabs). It is also the first demo to add a **new capability** — emotion &
> sentiment analysis — so it touches one small surface beyond the usual
> per-demo config: an "Emotional Analysis" view in the demo panels + dashboard.

---

## 1. Goal & why this demo

Lexora is an **AI legal intake specialist** for a personal-injury law firm. A
caller describes an accident/injury; the agent empathetically gathers intake
details, captures the case, books a consultation, and — uniquely — surfaces the
caller's **emotional state** (Hume's prosody/sentiment signals) live and in the
dashboard.

Per the PDF (pages 5–6):

| | |
|---|---|
| **Features** | Client intake · Accident reporting · Injury collection · Consultation booking · Emotion detection · Sentiment analysis |
| **Function Calls** | `Create Case Intake` · `Save Injury Information` · `Book Consultation` · `Emotion Analysis` |
| **Dashboard Output** | New Case · Intake Summary · Emotional Analysis · Consultation Request |
| **Tagline** | "The first conversation every client deserves." |
| **Test prompts** | "I was injured in a car accident" · "I need legal advice" · "I want to speak with an attorney" · "I'd like a consultation" |

---

## 2. The golden rule still holds (mostly)

Per `CLAUDE.md`, adding a demo should only touch the 5 per-tenant surfaces.
Lexora does — **plus** three small, justified additions because it introduces a
brand-new platform transport (Hume's WebSocket SDK + token auth) and a new data
type (emotion). Nothing here adds a new table or a per-demo page.

| Surface | File | New? |
|---|---|---|
| **1. Branding / landing** | `lib/tenants/lexora.ts` | new tenant file |
| **2. Platform** | `platform: "hume"` in that file | — |
| **3. Agent prompt** | `agentPrompt` in that file | — |
| **4. Function schema** | `functions` in that file | — |
| Adapter (only platform-specific server code) | `lib/adapters/hume.ts` + uncomment in `index.ts` | new adapter |
| Registry wiring | uncomment `lexora` in `lib/tenants/registry.ts` | — |
| New business logic | 4 handlers in `lib/functions/handlers.ts` | extend existing map |
| **Justified extra A** — Hume needs a short-lived access token (unlike the ElevenLabs public agent id) | `app/api/voice/hume-token/route.ts` | new server route |
| **Justified extra B** — Hume's widget is a custom WebSocket client, not an embed script | `hume` branch in `app/(demo)/components/VoiceWidget.tsx` | extend existing component |
| **Justified extra C** — surface emotion in the UI | "Emotional Analysis" panel in `DemoPanels.tsx` + dashboard section | extend existing components |

> **No new table.** Emotion data is stored in the existing `agent_events`
> (`event_type = 'emotion_analysis'`, structured `payload` jsonb) and the case
> "strength" score reuses `leads.score`. This keeps us aligned with the
> "never create per-demo tables" rule and means the dashboard already loads the
> data via `loadDashboardData()` (it reads `agent_events`).

---

## 3. Data model decision (no migration required)

| Concept | Where it lives | How |
|---|---|---|
| Case / client | `leads` row | `createCaseIntake` → `createLead(...)` (status `"new"`) |
| Intake details (accident, injuries) | `agent_events` | `saveInjuryInformation` → `logAgentEvent(..., "injury_info", args)` |
| Case strength score (0–100) | `leads.score` | computed in `createCaseIntake` / refined later via `updateLead` |
| **Emotion / sentiment** | `agent_events` (`event_type = 'emotion_analysis'`) | `emotionAnalysis` → `logAgentEvent(..., "emotion_analysis", { topEmotions, dominant, sentiment, score })` |
| Consultation | `appointments` row | `bookConsultation` → `bookAppointment(...)` (reused as-is) |
| Transcript + summary | `transcripts` | Hume post-call webhook → `saveTranscript(...)` (shared path) |

The emotion `payload` shape (one canonical internal shape):

```jsonc
{
  "topEmotions": [ { "name": "Distress", "score": 0.74 }, { "name": "Anxiety", "score": 0.61 } ],
  "dominant": "Distress",
  "sentiment": "negative",          // negative | neutral | positive (derived)
  "valence": -0.4                   // -1..1 (derived from Hume scores)
}
```

---

## 4. Hume integration architecture

Hume EVI is **not** a drop-in embed like ElevenLabs. It runs over a WebSocket
from the browser using Hume's SDK, needs a server-minted access token, returns
**emotion scores per utterance**, and emits **tool calls** over the socket. We
adapt it to our existing endpoints so the server stays vendor-agnostic.

```
Browser (lexora.*)
  └─ VoiceWidget (hume branch)
       1. GET  /api/voice/hume-token        → mints short-lived EVI access token (server: HUME_API_KEY+SECRET)
       2. opens Hume EVI WebSocket with the token + config id
       3. renders LIVE transcript + LIVE emotion meter from socket messages
       4. on a tool_call message  → POST /api/functions/hume?tenant=lexora&fn=<name>  (our shape)
                                     ← returns result, widget sends tool_response back over socket
       5. periodically/at call-end → POST /api/functions/hume?...&fn=emotionAnalysis  with aggregated top emotions
Hume (post-call)
  └─ webhook → POST /api/webhooks/hume?tenant=lexora   → adapter → saveTranscript + closeCall
```

**Why this shape:** it reuses the two endpoints we already have
(`/api/functions/[platform]`, `/api/webhooks/[platform]`) untouched. The Hume
**adapter** only has to parse (a) our own forwarded function-call JSON and (b)
Hume's post-call webhook payload into the existing `NormalizedFunctionCall` /
`NormalizedCallEvent` shapes. All business logic stays in shared handlers.

> **Token route is a justified platform exception, not business logic.** It only
> exchanges server secrets for a short-lived client token. ElevenLabs didn't need
> one (its agent id is public); Hume does.

---

## 5. File-by-file work

### 5.1 `lib/tenants/lexora.ts` (new) — the per-demo surface
Mirror `nestriq.ts`. Fill in:
- `slug: "lexora"`, `name: "Lexora AI"`, `industry: "Personal Injury Law"`, `platform: "hume"`.
- **Branding:** legal/trust palette (e.g. deep navy primary `#1e3a5f`, warm accent), `theme: "light"`, tagline "The first conversation every client deserves."
- **Landing:** hero + subhero, concept, 6 features, `stats`, `steps`, `services`, `faqs` — legal-intake flavored (reassuring, empathetic tone).
- **testPrompts:** the 4 from the PDF.
- **agentPrompt:** empathetic intake specialist; gather name/contact, accident description, injuries, date, fault/other party, current treatment; never give legal advice; call `createCaseIntake` early, `saveInjuryInformation` as details arrive, `emotionAnalysis` to reflect sentiment, `bookConsultation` when ready.
- **functions:** the 4 schemas (see 5.4).
- **platformConfig:** `{ configId: process.env.NEXT_PUBLIC_HUME_CONFIG_ID ?? "" }` (the EVI config id is the client-visible identifier, analogous to the ElevenLabs agent id).

### 5.2 `lib/tenants/registry.ts` — uncomment
```ts
import { lexora } from "./lexora";
// ...
export const TENANTS = { nestriq, lexora /* , ... */ };
```

### 5.3 `lib/adapters/hume.ts` (new) + `lib/adapters/index.ts` — uncomment
Implement `PlatformAdapter`:
- `parseFunctionCall(input)`: read `?tenant` + `?fn` from query (our forwarded convention, same as ElevenLabs), `args` from body, `externalCallId` from body (`chat_id` / `chat_group_id`).
- `parseWebhook(input)`: parse Hume's chat/post-call webhook → transcript (concatenate messages), summary if present, `durationSeconds`, `externalCallId`, and `type` (`"summary"` on the chat-ended event, else `"transcript"`).
- Add an exported `verifyHumeSignature(...)` if Hume signs webhooks (confirm in docs); wire it into the webhook route the same way ElevenLabs is. If Hume doesn't sign, gate on a shared-secret query param instead and note it.

### 5.4 `lib/functions/handlers.ts` — add 4 handlers
Extend the existing `handlers` map (vendor-agnostic):
```ts
createCaseIntake:      // -> createLead(...) with status "new"; seed a case-strength score
saveInjuryInformation: // -> logAgentEvent(tenantId, callId, "injury_info", args); updateLead status "qualifying"
emotionAnalysis:       // -> derive {dominant, sentiment, valence}; logAgentEvent(..., "emotion_analysis", payload); optionally updateLead score
bookConsultation:      // ALREADY EXISTS — reuse as-is
```
Add a small pure helper `summarizeEmotions(args)` (like `motivationScore`) that
turns Hume's raw emotion scores into `{ topEmotions, dominant, sentiment, valence }`.

> `bookConsultation` already exists and is generic — Lexora reuses it. Only 3
> genuinely new handlers.

### 5.5 `app/api/voice/hume-token/route.ts` (new)
`GET` → mint an EVI access token from `HUME_API_KEY` + `HUME_SECRET_KEY` (server
only) and return `{ accessToken, configId }`. Short cache / no-store.

### 5.6 `app/(demo)/components/VoiceWidget.tsx` — add `hume` branch
- For `platform === "hume"`: a small client component that fetches the token,
  opens the Hume EVI socket (via `@humeai/voice` or a thin WS client), shows a
  "🎤 Talk To Agent" button + connection state, streams transcript/emotion into
  the page (lift via a callback or a shared store the panels read), forwards
  tool calls to `/api/functions/hume`, and sends an `emotionAnalysis` rollup.
- Keep the ElevenLabs branch untouched. Degrade gracefully when
  `NEXT_PUBLIC_HUME_CONFIG_ID` is unset (same pattern as the current ElevenLabs hint).

### 5.7 `app/(demo)/components/DemoPanels.tsx` — Emotional Analysis panel
- Add a 4th panel "Emotional Analysis" that reads emotion from the activity feed.
- Extend `/api/demo/[tenant]/activity/route.ts` to also return the latest
  `agent_events` row where `event_type = 'emotion_analysis'` (newest first), so
  the panel shows dominant emotion + top emotions + sentiment. Render a simple
  bar/meter (reuse the dependency-free SVG approach from `charts.tsx`).

### 5.8 Dashboard — "Emotional Analysis" surfacing
- The data already arrives: `loadDashboardData()` loads `agent_events`.
- In `DashboardClient.tsx`, on the existing **Agent Activity** section (or a new
  "Emotional Analysis" sub-view shown when the selected tenant is Lexora), filter
  `agentEvents` to `event_type === 'emotion_analysis'` and render dominant
  emotion + sentiment per call. No new dashboard data plumbing needed.

### 5.9 Assets & env
- `public/lexora-logo.svg` (or reuse the initial-letter avatar already in the page header — logo optional).
- `.env.local` additions (see §7).

---

## 6. Build order (phased — each phase independently verifiable)

1. **Config-only slice (no Hume yet).** Create `lexora.ts`, uncomment registry.
   → Visit `lexora.lvh.me:3000`; landing page renders from config. Widget shows
   the "set config id" hint. *Proves the tenant resolves end-to-end.*
2. **Adapter + handlers + replayed function call.** Add `hume.ts`, uncomment in
   `index.ts`, add the 3 handlers. Test by `curl`-POSTing a fake function call to
   `/api/functions/hume?tenant=lexora&fn=createCaseIntake` (same way ElevenLabs is
   replayed). *Proves the server pipeline writes rows with `tenant_id`.*
3. **Post-call webhook.** Implement `parseWebhook` + signature/secret check; replay
   a captured/sample Hume payload against `/api/webhooks/hume?tenant=lexora`.
   *Proves transcript + summary persist.*
4. **Token route + live widget.** Add `/api/voice/hume-token`, wire the Hume
   branch in `VoiceWidget`. *Proves a real voice call connects and tools fire.*
5. **Emotion UX.** Aggregate Hume emotion scores → `emotionAnalysis` call;
   add the Emotional Analysis panel + dashboard view. *Proves the differentiator.*
6. **Polish.** Landing copy, branding palette, FAQs, logo, test prompts.

---

## 7. Environment variables (add to `.env.local` + Vercel)

```bash
# Hume EVI
HUME_API_KEY=...                       # server only — mints access token
HUME_SECRET_KEY=...                    # server only
NEXT_PUBLIC_HUME_CONFIG_ID=...         # EVI config id (client-visible, like the ElevenLabs agent id)
HUME_WEBHOOK_SECRET=...                # if Hume signs post-call webhooks (confirm)
```

(Existing Supabase + ElevenLabs vars unchanged.)

---

## 8. Hume-side setup (external, done in Hume dashboard)
1. Create an **EVI config** for Lexora: set the system prompt (can mirror
   `agentPrompt`), pick a voice, enable the **prosody/emotion** model.
2. Define the 4 **tools** (`createCaseIntake`, `saveInjuryInformation`,
   `emotionAnalysis`, `bookConsultation`) with parameter schemas matching §5.4.
   (If Hume executes tools client-side over the socket, the widget forwards them
   to our endpoint; if Hume supports server webhooks for tools, point them at
   `/api/functions/hume?tenant=lexora&fn=<name>`.)
3. Configure the **post-call webhook** → `/api/webhooks/hume?tenant=lexora`.
4. Copy the **config id** + API/secret keys into env.

---

## 9. Open questions / risks (confirm against Hume docs during step 2–4)
- **Tool transport:** does EVI deliver tool calls over the socket (client must
  forward) or via server webhook? This decides exactly how the widget wires to
  `/api/functions/hume`. *Plan assumes socket-forwarding; adapter is agnostic either way.*
- **Webhook signing:** confirm whether Hume signs post-call webhooks and the
  header format, to mirror `verifyElevenLabsSignature`. Fall back to a shared
  secret query param if not.
- **Emotion payload shape:** confirm Hume's per-message emotion array field names
  so `summarizeEmotions()` maps them correctly.
- **SDK choice:** `@humeai/voice` (official) vs a thin hand-rolled WS client.
  Prefer official; keep it lazy-loaded like the ElevenLabs embed.

---

## 10. Definition of done
- `lexora.lvh.me:3000` renders a real, branded legal-intake landing page.
- Clicking "Talk To Agent" connects a live Hume EVI call.
- During the call: live transcript + live emotion appear in the demo panels.
- The agent fires `createCaseIntake` / `saveInjuryInformation` /
  `emotionAnalysis` / `bookConsultation`; rows land in `leads`, `appointments`,
  `agent_events`, `function_calls`, `transcripts`, all stamped `tenant_id`.
- The admin dashboard (filtered to Lexora) shows the new case, intake summary,
  consultation, and an **Emotional Analysis** readout.
- Zero new tables; `lib/api/*` unchanged; only the Hume adapter is
  platform-specific server code.
