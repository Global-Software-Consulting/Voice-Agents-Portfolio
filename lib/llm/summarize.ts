// Platform-agnostic call summarizer. Instead of relying on each voice vendor's
// own summary (ElevenLabs has one, Vapi has one, Hume has none), we send the full
// transcript to GPT and generate a consistent summary for EVERY agent.
//
// Requires OPENAI_API_KEY. Returns null when unset or on error, so callers fall
// back to the platform-provided summary (or none).

import OpenAI from "openai";

const MODEL = "gpt-4o-mini"; // cheap + fast, good for short summaries

let cached: OpenAI | null = null;
function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  if (!cached) cached = new OpenAI({ apiKey });
  return cached;
}

export async function summarizeTranscript(transcript: string): Promise<string | null> {
  const client = getClient();
  if (!client || !transcript.trim()) return null;

  try {
    const res = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 256, // a 1-2 sentence summary; deliberately short output
      messages: [
        {
          role: "system",
          content:
            "You summarize customer voice-agent call transcripts for a business dashboard. " +
            "Reply with 1-2 concise sentences capturing who called, what they needed, and the outcome. " +
            "Output only the summary text — no preamble, no labels, no quotation marks.",
        },
        {
          role: "user",
          content: `Summarize this call transcript:\n\n${transcript.slice(0, 24000)}`,
        },
      ],
    });

    const text = res.choices[0]?.message?.content?.trim();
    return text || null;
  } catch {
    return null;
  }
}
