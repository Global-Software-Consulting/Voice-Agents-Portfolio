// Callback / contact form submission. Used by the fallback form shown when a
// voice agent is unavailable (e.g. out of credits). Saves the person as a lead
// (so it appears in the dashboard) and emails the team via Resend.
//
// Env: RESEND_API_KEY, CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL. If unset, the lead
// is still saved and the request succeeds (email simply isn't sent).

import { ensureTenant } from "@/lib/api/tenants";
import { createLead } from "@/lib/api/leads";

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const tenant = String(body.tenant ?? "").trim();

    if (!name || (!email && !phone)) {
      return Response.json(
        { ok: false, error: "Please provide your name and an email or phone." },
        { status: 400 },
      );
    }

    // Save as a lead (best-effort — don't fail the request if the DB write does).
    if (tenant) {
      try {
        const tenantId = await ensureTenant(tenant);
        await createLead(tenantId, tenant, {
          name,
          email: email || undefined,
          phone: phone || undefined,
          status: "callback_requested",
        });
      } catch {
        /* ignore DB errors so the user still gets a success response */
      }
    }

    // Email the team via Resend, if configured.
    const apiKey = process.env.RESEND_API_KEY;
    const to = process.env.CONTACT_TO_EMAIL;
    const from = process.env.CONTACT_FROM_EMAIL || "Voice Agent Portfolio Leads <onboarding@resend.dev>";
    let emailed = false;
    if (apiKey && to && from) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to,
          reply_to: email || undefined,
          subject: `New callback request${tenant ? ` — ${tenant}` : ""}`,
          html: `<h2>New callback request</h2>
            <p><strong>Agent:</strong> ${escapeHtml(tenant) || "—"}</p>
            <p><strong>Name:</strong> ${escapeHtml(name)}</p>
            <p><strong>Email:</strong> ${escapeHtml(email) || "—"}</p>
            <p><strong>Phone:</strong> ${escapeHtml(phone) || "—"}</p>`,
        }),
      });
      if (!res.ok) {
        return Response.json(
          { ok: false, error: `Email failed (${res.status})` },
          { status: 502 },
        );
      }
      emailed = true;
    }

    return Response.json({ ok: true, emailed });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Request failed" },
      { status: 500 },
    );
  }
}
