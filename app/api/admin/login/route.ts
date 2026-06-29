// Admin login: verify the password and set an httpOnly session cookie.
import { verifyPassword, ADMIN_COOKIE } from "@/lib/admin/auth";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { password?: unknown };
  const token = verifyPassword(String(body.password ?? ""));
  if (!token) {
    return Response.json({ ok: false, error: "Invalid password" }, { status: 401 });
  }
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const res = Response.json({ ok: true });
  // 7-day session.
  res.headers.append(
    "Set-Cookie",
    `${ADMIN_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800${secure}`,
  );
  return res;
}
