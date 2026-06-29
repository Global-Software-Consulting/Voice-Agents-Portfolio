// Admin logout: clear the session cookie.
import { ADMIN_COOKIE } from "@/lib/admin/auth";

export async function POST() {
  const res = Response.json({ ok: true });
  res.headers.append(
    "Set-Cookie",
    `${ADMIN_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`,
  );
  return res;
}
