// Mints a short-lived Hume EVI access token for the browser voice widget.
// Hume (unlike ElevenLabs' public agent id) requires a server-side token minted
// from the API + secret keys via client-credentials. The keys never reach the
// client; only the resulting access token + the public config id are returned.
//
// GET /api/voice/hume-token  ->  { accessToken, configId }

export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = process.env.HUME_API_KEY;
  const secretKey = process.env.HUME_SECRET_KEY;
  const configId = process.env.NEXT_PUBLIC_HUME_CONFIG_ID ?? "";

  if (!apiKey || !secretKey) {
    // Not configured yet — the widget degrades to its "set env" hint.
    return Response.json(
      { error: "Hume not configured: set HUME_API_KEY and HUME_SECRET_KEY" },
      { status: 501 },
    );
  }

  try {
    const basic = Buffer.from(`${apiKey}:${secretKey}`).toString("base64");
    const res = await fetch("https://api.hume.ai/oauth2-cc/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      cache: "no-store",
    });

    if (!res.ok) {
      return Response.json(
        { error: `Hume token request failed (${res.status})` },
        { status: 502 },
      );
    }

    const json = (await res.json()) as { access_token?: string };
    if (!json.access_token) {
      return Response.json({ error: "Hume returned no access token" }, { status: 502 });
    }

    return Response.json({ accessToken: json.access_token, configId });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "token mint failed" },
      { status: 500 },
    );
  }
}
