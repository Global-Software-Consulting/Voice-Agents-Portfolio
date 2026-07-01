// Shared bits for the per-tenant landing layouts. Each layout component renders a
// structurally distinct page; this only holds the props type + id resolution.
import type { TenantConfig } from "@/lib/tenants/types";

export type LayoutProps = { cfg: TenantConfig; dashboardHref: string };

export function agentIdOf(cfg: TenantConfig): string {
  return (
    cfg.platformConfig.agentId ??
    cfg.platformConfig.configId ??
    cfg.platformConfig.assistantId ??
    ""
  );
}
