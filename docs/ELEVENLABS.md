# Fully integrating ElevenLabs (Nestriq)

Three parts must all work for a live call to drive the product:

1. **Widget** — the in-browser voice UI (client-side). Already embedded.
2. **Server tools** — the AI's function calls POST to our backend → write to the DB.
3. **Post-call webhook** — ElevenLabs sends the transcript/summary after the call.

The widget runs in the browser, but **server tools and the webhook are called by
ElevenLabs' servers** — they cannot reach `localhost`. So you need a public URL first.

---

## Step 0 — Make the app publicly reachable

Pick one:

- **Deploy to Vercel** (recommended): connect the repo, add all `.env.local` vars as
  Vercel env vars, and set up the wildcard domain `*.voice.gsoftconsulting.com`. Use the
  real subdomains in all URLs below.
- **Tunnel for local dev**: `npx ngrok http 3000` (or `cloudflared tunnel --url
  http://localhost:3000`). Use the tunnel host in the URLs below, e.g.
  `https://<id>.ngrok-free.app/api/functions/elevenlabs?...`. The widget still loads via
  the tunnel host too.

---

## Step 1 — Configure the agent (ElevenLabs dashboard → Conversational AI → your agent)

- **System prompt**: paste the `agentPrompt` from `lib/tenants/nestriq.ts`.
- **First message**: e.g. "Hi, this is Nestriq — are you looking to sell a property?"
- **Voice / language / LLM**: pick a voice and model.
- **Agent ID**: confirm it matches `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` in `.env.local`.
- **Allowlist**: under the agent's security/widget settings, add the domains the widget
  will run on (your Vercel domain, or the ngrok host) so the embed is allowed to connect.

---

## Step 2 — Add the server tools (one per function)

In the agent's **Tools** section, add a **Webhook tool** for each of our four functions.
Each tool's URL points at our function endpoint with the tenant + function name:

| Tool name | Method | URL |
|---|---|---|
| createLead | POST | `https://<host>/api/functions/elevenlabs?tenant=nestriq&fn=createLead` |
| saveSellerDetails | POST | `https://<host>/api/functions/elevenlabs?tenant=nestriq&fn=saveSellerDetails` |
| calculateMotivationScore | POST | `https://<host>/api/functions/elevenlabs?tenant=nestriq&fn=calculateMotivationScore` |
| bookConsultation | POST | `https://<host>/api/functions/elevenlabs?tenant=nestriq&fn=bookConsultation` |

For each tool, declare the body parameters to match `functions` in `nestriq.ts`. Set
**Method = POST**, header `Content-Type: application/json`, and **Wait for response = on**
(synchronous) so the returned `leadId` is handed back to the AI.

### Tool: createLead — "Create a lead once you have the caller's name."
| Parameter | Type | Required | Value source | Description |
|---|---|---|---|---|
| name | String | yes | LLM Prompt | Seller's full name. |
| phone | String | no | LLM Prompt | Seller's phone. |
| email | String | no | LLM Prompt | Seller's email. |
| conversation_id | String | no | Dynamic Variable `system__conversation_id` | Links all calls in this conversation. |

### Tool: saveSellerDetails — "Save property details as you learn them."
| Parameter | Type | Value source | Description |
|---|---|---|---|
| leadId | String | LLM Prompt | Id returned by createLead. |
| address | String | LLM Prompt | Property address. |
| condition | String | LLM Prompt | Property condition. |
| reason | String | LLM Prompt | Reason for selling. |
| timeline | String | LLM Prompt | Desired selling timeline. |
| conversation_id | String | Dynamic Variable `system__conversation_id` | — |

### Tool: calculateMotivationScore — "Call once you know reason + timeline."
| Parameter | Type | Value source | Description |
|---|---|---|---|
| leadId | String | LLM Prompt | Id from createLead. |
| reason | String | LLM Prompt | Reason for selling. |
| timeline | String | LLM Prompt | Desired timeline. |
| condition | String | LLM Prompt | Property condition. |
| conversation_id | String | Dynamic Variable `system__conversation_id` | — |

### Tool: bookConsultation — "Call when the seller agrees to a consultation."
| Parameter | Type | Value source | Description |
|---|---|---|---|
| leadId | String | LLM Prompt | Id from createLead. |
| date | String | LLM Prompt | Preferred date (YYYY-MM-DD). |
| time | String | LLM Prompt | Preferred time. |
| conversation_id | String | Dynamic Variable `system__conversation_id` | — |

Set `conversation_id` as a **Dynamic Variable** (not LLM Prompt) so it auto-fills and the
AI never asks the caller for it — this groups all calls into one `calls` row.

**Returned values chain across calls.** Our endpoint responds with
`{ "ok": true, "result": { "leadId": "..." } }`. The LLM sees that result, so instruct it
(in the prompt) to reuse `leadId` from `createLead` when calling `saveSellerDetails`,
`calculateMotivationScore`, and `bookConsultation`.

Optionally send the conversation id so calls group into one `calls` row: add a body field
`conversation_id` mapped to the dynamic variable `{{conversation_id}}` (or `system__
conversation_id`).

---

## Step 3 — Configure the post-call webhook (workspace-level)

ElevenLabs sends the transcript/summary **after** the call, from a single workspace-wide
URL (it can't carry a `?tenant=`). Set it under **Conversational AI → Settings → Webhooks
→ Post-call webhook**:

```
https://<host>/api/webhooks/elevenlabs
```

The payload includes `agent_id`; our webhook resolves the tenant from it via
`getTenantByAgentId()` (so every agent can share this one URL). No query param needed.

> If you prefer, you can still append `?tenant=nestriq` — the explicit param wins. But for
> multiple demos, rely on the agent-id mapping.

**Signature verification (production):** ElevenLabs signs post-call webhooks with an HMAC
secret. For production, verify the `ElevenLabs-Signature` header before trusting the body.
(Not yet implemented — see "Hardening" below.)

---

## Step 4 — Test a live call

1. Open `https://nestriq.<host>/` (or the tunnel host) and click **Talk To Agent**.
2. Say "I want to sell my house," answer the questions.
3. Watch the on-page panels (poll every 2.5s):
   - **Function Calls** → `createLead`, `calculateMotivationScore`, … as the AI invokes them.
   - **Extracted Data** → the captured arguments.
   - **Live Transcript** → fills after the call ends (post-call webhook).
4. Open `https://admin.<host>/` → the lead, score, call, and any appointment appear.

---

## Hardening (before production)

- **Verify webhook signatures** (`ElevenLabs-Signature` HMAC) in
  `app/api/webhooks/[platform]/route.ts`.
- **Authenticate the function endpoint** (shared secret header or ElevenLabs tool auth) so
  only ElevenLabs can write leads.
- **Add auth to the admin dashboard** (`/dashboard` is currently open).
- **Rotate** to the new Supabase secret key and keep it server-only.
