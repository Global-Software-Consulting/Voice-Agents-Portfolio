# Fully integrating Hume AI / EVI (Lexora)

Lexora runs on Hume's **EVI 3** (Empathic Voice Interface). Unlike ElevenLabs,
EVI's whole differentiator is that it reads the caller's **emotion from their
voice** (prosody), not just their words.

Four parts make a live call drive the product:

1. **Widget** — the in-browser voice UI. `HumeWidget.tsx` connects to EVI over a
   WebSocket using the official `@humeai/voice-react` SDK.
2. **Token route** — `/api/voice/hume-token` mints a short-lived access token from
   server secrets (the keys never reach the browser).
3. **Tool calls** — the AI's function calls come back **over the WebSocket to the
   browser**, which forwards them to our backend → write to the DB.
4. **Post-call webhook** — on `chat_ended`, Hume notifies us; we fetch the
   transcript from Hume's API and store it.

> **Key difference from ElevenLabs.** ElevenLabs calls our server tools directly
> (server-to-server webhooks). Hume delivers tool calls **over the socket to the
> browser**, and `HumeWidget` forwards them to `/api/functions/hume`. So tool
> calls + emotion work on `localhost` with no tunnel — only the transcript webhook
> needs a public URL.

---

## The big picture

```
Caller's voice ──► Hume EVI (WebSocket) ──► GPT-4.1 (your system prompt)
                        │                          │
                        │ prosody/emotion model    │ decides to call a tool
                        ▼                          ▼
              emotion scores per utterance   tool_call message
                        │                          │
                        └──────────┬───────────────┘
                                   ▼
                    Browser: HumeWidget.tsx  (@humeai/voice-react)
                                   │  POST same-origin
                                   ▼
                  /api/functions/hume?tenant=lexora&fn=<name>
                                   │
                  humeAdapter.parseFunctionCall → runFunction → handler
                                   │
                            Supabase (tenant_id-stamped rows)
                                   ▼
                            Admin dashboard
```

The browser is the hub: Hume talks to it over a WebSocket, and it forwards
everything to the shared, vendor-agnostic server pipeline.

---

## Flow A — Tool calls (e.g. `createCaseIntake`)

1. **The model decides.** Steered by `agentPrompt` in `lib/tenants/lexora.ts`,
   GPT-4.1 decides to invoke a tool. Hume sends a `tool_call` message over the
   socket with `name` (e.g. `createCaseIntake`) and `parameters` (a JSON **string**).
2. **The SDK fires our handler.** `VoiceProvider`'s `onToolCall` →
   `HumeWidget.tsx → handleToolCall`: it `JSON.parse`s the parameters and POSTs to
   `/api/functions/hume?tenant=lexora&fn=<name>` with body
   `{ parameters: args, chat_id: <live chat id> }`.
3. **The server normalizes + executes** (`app/api/functions/[platform]/route.ts`):
   - `getAdapter("hume")` → `humeAdapter`
   - `humeAdapter.parseFunctionCall(...)` → `{ tenant, platform, externalCallId: chat_id, functionName, args }`
   - `ensureTenant("lexora")` → `tenantId`; `ensureCall(...chat_id)` → `callId`
   - `runFunction(name, args, ctx)` → dispatches to `lib/functions/handlers.ts`
   - `logFunctionCall(...)` → writes a `function_calls` row
   - responds `{ ok: true, result }`
4. **The result returns to Hume.** `handleToolCall` returns `send.success(result)`
   → socket → the agent continues speaking. On failure, `send.error(...)` → the
   agent speaks the tool's `fallback_content`.

**Names must match exactly.** The tool `name` in Hume must equal a handler key in
`handlers.ts` (`createCaseIntake`, `saveInjuryInformation`, `emotionAnalysis`,
`bookConsultation`) — the widget routes by name to `?fn=<name>`.

**One call row.** Tool calls, emotion readings, and the transcript webhook all use
the same `chat_id` as the external id (the widget shares it via a ref), so they
attach to a single `calls` row.

---

## Flow B — Emotion detection (the differentiator)

1. **Hume analyzes the voice, not the words.** EVI 3 runs a **prosody/expression
   model** over the caller's audio (pitch, tone, rhythm, pace) and scores ~48
   emotions (Distress, Anxiety, Calmness, Relief…) **per user utterance**. It
   measures *how* they speak, not *what* they say.
2. **Scores arrive over the socket.** Each user message carries
   `models.prosody.scores` — a map like `{ "Distress": 0.74, "Anxiety": 0.61, … }`.
3. **The widget rolls it up** (`HumeWidget.tsx → Inner`): a `useEffect` finds the
   latest user message with prosody scores (`userProsodyScores`), picks the
   strongest (`topEmotion`), and — only when the dominant emotion **changes** —
   POSTs to `/api/functions/hume?...&fn=emotionAnalysis` with
   `{ dominantEmotion, intensity }`.
4. **The server derives sentiment** (`lib/functions/handlers.ts → summarizeEmotions`):
   maps the raw emotion to `sentiment` (negative/neutral/positive), `intensity`
   (0–1), and `valence` (−1…1), then `logAgentEvent(..., "emotion_analysis", {...})`.
5. **It shows in the dashboard.** `loadDashboardData()` reads `agent_events`; the
   **Emotional Analysis** section (`DashboardClient.tsx → EmotionView`) filters to
   `event_type === "emotion_analysis"`.

> Two paths feed the same `emotionAnalysis` handler: (1) **automatic** — the widget
> sends prosody rollups (primary), and (2) **optional** — the agent itself calls the
> `emotionAnalysis` tool. The automatic path is what makes it work reliably.

---

## Environment variables

```bash
HUME_API_KEY=...                   # server-only; mints the access token + fetches transcripts
HUME_SECRET_KEY=...                # server-only; used with the API key to mint the token
NEXT_PUBLIC_HUME_CONFIG_ID=...     # EVI config id (client-visible, like the ElevenLabs agent id)
HUME_WEBHOOK_SECRET=...            # optional; the per-account WEBHOOK SIGNING KEY (NOT the secret key)
```

Get the API key + secret key and the webhook signing key from
[platform.hume.ai](https://platform.hume.ai) → API keys / webhook settings. The
config id comes from the EVI config you create (below).

> ⚠️ `HUME_WEBHOOK_SECRET` is Hume's **webhook signing key** — a separate
> per-account secret shown in the webhook config — **not** `HUME_SECRET_KEY`. If
> real webhooks return 401, this mismatch is the cause.

---

## Step 1 — Create the 4 tools

Dashboard: **EVI → Tools → New tool**. Paste `name`, `description`, and the
`parameters` JSON Schema for each. The exact configs live in `hume-tools.json` at
the repo root. Tool names (must match handlers): `createCaseIntake`,
`saveInjuryInformation`, `emotionAnalysis`, `bookConsultation`.

> Hume tools have **no webhook URL** — they're handled in the browser by
> `HumeWidget`'s `onToolCall`, which forwards to `/api/functions/hume`.

---

## Step 2 — Create the EVI config

Dashboard: **EVI → Configs → new config**.

- **EVI version**: EVI 3 (built-in prosody/emotion model).
- **Language model**: GPT-4.1, **temperature ~0.7** (structured intake; avoid 1.0).
- **System prompt**: paste `agentPrompt` from `lib/tenants/lexora.ts` (the clean
  joined text — not the raw TypeScript array).
- **First message**: e.g. *"Hi, thank you for calling — this is Lexora, your intake
  assistant. I'm here to help. Can you start by telling me what happened?"*
- **Tools**: attach the 4 tools from Step 1.
- Copy the **Config ID** → `NEXT_PUBLIC_HUME_CONFIG_ID` → restart the dev server.

---

## Step 3 — Post-call webhook (for transcripts)

Tool calls + emotion already work without this. The webhook is only needed to store
**transcripts/summaries**.

1. **Public URL.** Local: `npx ngrok http 3000` (URL changes per restart on free).
   Prod: `https://lexora.voice.gsoftconsulting.com`.
2. **Add the webhook** (EVI Webhooks section):
   ```
   https://<host>/api/webhooks/hume?tenant=lexora
   ```
   Subscribe to `chat_started` and `chat_ended`. Keep the `?tenant=lexora` param.
3. **Signing.** Put the webhook **signing key** in `HUME_WEBHOOK_SECRET`. Hume signs
   with headers `X-Hume-AI-Webhook-Signature` (hex HMAC-SHA256) and
   `X-Hume-AI-Webhook-Timestamp`, over `` `${rawBody}.${timestamp}` `` (180s window).
   Verified in `lib/adapters/hume.ts → verifyHumeSignature`. Leave unset to disable
   verification while testing.

**Why a fetch step is needed:** Hume's `chat_ended` payload is **metadata-only**
(no transcript text). The webhook route takes the `chat_id` and calls
`fetchHumeTranscript()` (`GET https://api.hume.ai/v0/evi/chats/{chat_id}` with
`HUME_API_KEY`), assembles the USER/AGENT messages into transcript text, and saves
it via `saveTranscript`.

---

## Step 4 — Test a live call

1. Open `https://lexora.<host>/` and click the floating **Talk To Agent** button
   (bottom-right). Allow the microphone.
2. Say *"I was injured in a car accident"* and answer the questions.
3. In the **admin dashboard** (`https://admin.<host>/?tenant=lexora`):
   - **Cases** → the new case (lead) appears
   - **Emotional Analysis** → dominant emotion + sentiment from voice prosody
   - **Appointments / Function Logs** → as tools fire
   - **Transcripts** → after the call ends (requires the webhook)

> The public landing page intentionally shows **no** live panels — the live data
> lands in the admin dashboard only.

---

## Where data lands (all `tenant_id`-stamped)

| Data | Written by | Table | Dashboard view |
|---|---|---|---|
| Case / lead | `createCaseIntake` → `createLead` | `leads` | Cases |
| Injury details | `saveInjuryInformation` | `agent_events` | Agent Activity |
| **Emotion** | prosody → `emotionAnalysis` | `agent_events` | **Emotional Analysis** |
| Appointment | `bookConsultation` | `appointments` | Appointments |
| Every tool invocation | route → `logFunctionCall` | `function_calls` | Function Logs |
| Transcript | `chat_ended` webhook → `fetchHumeTranscript` | `transcripts` | Transcripts |

---

## Hardening (before production)

- **Set `HUME_WEBHOOK_SECRET`** to the real signing key so webhook verification is on.
- **Authenticate `/api/functions/hume`** (shared-secret header) so only your widget
  can write — tool calls are browser-originated and currently unauthenticated.
- **Add auth to the admin dashboard** (`/dashboard` is currently open).
- **Confirm the prosody field path** (`models.prosody.scores`) and chat-events API
  shape against current Hume docs if the SDK major version changes.
