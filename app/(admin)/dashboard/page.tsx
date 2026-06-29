// Shared admin dashboard (admin.<host> -> /dashboard). Server component: loads
// every shared table with the service role, then hands the data to the client
// dashboard (sidebar, navbar, charts, filtering). Reads are cross-tenant; the
// UI filters by tenant. See docs/ARCHITECTURE.md.

import { loadDashboardData } from "@/lib/admin/data";
import { adminAuthConfigured, isAdminAuthed } from "@/lib/admin/auth";
import DashboardClient from "./DashboardClient";
import AdminLogin from "./AdminLogin";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string }>;
}) {
  // Password gate (active when ADMIN_PASSWORD is set). Render the login screen
  // until a valid session cookie is present.
  if (adminAuthConfigured() && !(await isAdminAuthed())) {
    return <AdminLogin />;
  }

  const data = await loadDashboardData();
  const { tenant } = await searchParams;
  // In a single-tenant deployment, lock the dashboard to that one agent so it's
  // a per-agent admin (no tenant switcher, no other agents' data).
  const locked = process.env.NEXT_PUBLIC_ACTIVE_TENANT?.trim() || undefined;
  return (
    <DashboardClient
      data={data}
      initialTenant={locked ?? tenant ?? "all"}
      lockedTenant={locked}
    />
  );
}
