// Reports whether a platform is out of credits, so the widget can show the
// callback form instead of the (broken) voice agent.
//   GET /api/voice/credits?platform=elevenlabs  ->  { outOfCredits: boolean }
//
// Only ElevenLabs exposes a usable quota endpoint here (needs ELEVENLABS_API_KEY).
// Hume credit exhaustion is detected at connect-time in the widget instead.
// When we can't determine it, we report outOfCredits:false (don't block the agent).

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const platform = new URL(req.url).searchParams.get("platform");

  if (platform === "elevenlabs") {
    const key = process.env.ELEVENLABS_API_KEY;
    if (!key) return Response.json({ outOfCredits: false });
    try {
      const r = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
        headers: { "xi-api-key": key },
        cache: "no-store",
      });
      if (!r.ok) return Response.json({ outOfCredits: false });
      const d = (await r.json()) as {
        character_count?: number;
        character_limit?: number;
      };
      const used = Number(d.character_count ?? 0);
      const limit = Number(d.character_limit ?? 0);
      return Response.json({ outOfCredits: limit > 0 && used >= limit, used, limit });
    } catch {
      return Response.json({ outOfCredits: false });
    }
  }

  return Response.json({ outOfCredits: false });
}
