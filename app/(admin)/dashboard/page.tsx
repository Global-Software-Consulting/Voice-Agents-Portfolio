// Shared admin dashboard (admin.<host> -> /dashboard). Server component: loads
// every shared table with the service role, then hands the data to the client
// dashboard (sidebar, navbar, charts, filtering). Reads are cross-tenant; the
// UI filters by tenant. See docs/ARCHITECTURE.md.

import { loadDashboardData } from "@/lib/admin/data";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string }>;
}) {
  const data = await loadDashboardData();
  const { tenant } = await searchParams;
  return <DashboardClient data={data} initialTenant={tenant ?? "all"} />;
}
