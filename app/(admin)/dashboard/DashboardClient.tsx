// The admin dashboard UI: collapsible sidebar, top navbar (search + tenant
// filter + notifications + profile menu), KPI cards, charts, and filterable
// section tables. Pure client component — receives the full dataset from the
// server page and filters/aggregates with useMemo so every control is instant.
"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Call, DashboardData, Lead, Transcript } from "@/lib/admin/data";
import {
  TENANT_META,
  tenantColor,
  tenantMeta,
  tenantLexicon,
  type Lexicon,
} from "@/lib/admin/tenants-meta";
import { BarChart, DonutChart, LineChart, type Point, type Series } from "./charts";
import { TranscriptModal } from "./TranscriptModal";
import { Icon } from "./icons";

// Pull a string `leadId` out of a function-call's arguments/result JSON.
function leadIdFrom(v: unknown): string | null {
  if (v && typeof v === "object" && "leadId" in v) {
    const id = (v as { leadId: unknown }).leadId;
    return typeof id === "string" ? id : null;
  }
  return null;
}

// Pull a `summary` string out of an event payload / function-call arguments.
function summaryFrom(v: unknown): string | null {
  if (v && typeof v === "object" && "summary" in v) {
    const s = (v as { summary: unknown }).summary;
    return typeof s === "string" && s.trim() ? s : null;
  }
  return null;
}

type SectionId =
  | "overview"
  | "calls"
  | "leads"
  | "appointments"
  | "transcripts"
  | "emotion"
  | "activity"
  | "functions";

const NAV: { id: SectionId; label: string; icon: (p: { className?: string }) => ReactNode }[] = [
  { id: "overview", label: "Overview", icon: Icon.grid },
  { id: "calls", label: "Calls", icon: Icon.phone },
  { id: "leads", label: "Leads", icon: Icon.users },
  { id: "appointments", label: "Appointments", icon: Icon.calendar },
  { id: "transcripts", label: "Transcripts", icon: Icon.doc },
  { id: "activity", label: "Agent Activity", icon: Icon.activity },
  { id: "functions", label: "Function Logs", icon: Icon.code },
];

type RangeId = "7d" | "30d" | "90d" | "all";
const RANGES: { id: RangeId; label: string; days: number | null }[] = [
  { id: "7d", label: "7 days", days: 7 },
  { id: "30d", label: "30 days", days: 30 },
  { id: "90d", label: "90 days", days: 90 },
  { id: "all", label: "All time", days: null },
];

const BRAND = "#0f766e";
const ADMIN_EMAIL = "admin@gmail.com";

// Admin preferences, persisted per-device in localStorage. Loaded after mount
// (never during render) so SSR and the client agree.
const SETTINGS_KEY = "gsoft.admin.settings";
type AdminSettings = { range?: RangeId; collapsed?: boolean };

function loadSettings(): AdminSettings {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? "{}") as AdminSettings;
  } catch {
    return {};
  }
}

function saveSetting(patch: AdminSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ ...loadSettings(), ...patch }),
    );
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

type Filtered = {
  calls: DashboardData["calls"];
  leads: DashboardData["leads"];
  appointments: DashboardData["appointments"];
  transcripts: DashboardData["transcripts"];
  agentEvents: DashboardData["agentEvents"];
  functionCalls: DashboardData["functionCalls"];
};

export default function DashboardClient({
  data,
  initialTenant = "all",
  lockedTenant,
}: {
  data: DashboardData;
  initialTenant?: string;
  lockedTenant?: string;
}) {
  const [section, setSection] = useState<SectionId>("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  // Initial tenant filter can be deep-linked via ?tenant=<slug> (e.g. the
  // "View Admin Dashboard" button on each demo page). Fall back to "all".
  const [tenant, setTenant] = useState<string>(
    initialTenant && TENANT_META.some((t) => t.slug === initialTenant)
      ? initialTenant
      : "all",
  );
  const [range, setRange] = useState<RangeId>("30d");
  const [query, setQuery] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  // Profile / Settings modal (null = closed).
  const [modal, setModal] = useState<null | "profile" | "settings">(null);
  // Capture "now" once on mount so date-range filtering is stable across renders.
  const [now] = useState(() => Date.now());

  // Apply persisted admin preferences once on mount. Reading localStorage during
  // render would cause an SSR/client mismatch, so we sync from this external store
  // after mount — the legitimate exception to the set-state-in-effect rule.
  useEffect(() => {
    const s = loadSettings();
    /* eslint-disable react-hooks/set-state-in-effect */
    if (s.range) setRange(s.range);
    if (typeof s.collapsed === "boolean") setCollapsed(s.collapsed);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Lead -> call -> transcript resolution. Built from the FULL dataset (not the
  // filtered view) so a transcript still opens even if its call falls outside
  // the active date range. Link priority: function_calls referencing the lead id,
  // then a same-tenant call whose caller name matches the lead.
  const lookup = useMemo(() => {
    const callById = new Map<string, Call>();
    for (const c of data.calls) callById.set(c.id, c);

    const transcriptByCall = new Map<string, Transcript>();
    for (const t of data.transcripts) {
      if (t.call_id && !transcriptByCall.has(t.call_id)) transcriptByCall.set(t.call_id, t);
    }

    const leadToCall = new Map<string, string>();
    for (const fc of data.functionCalls) {
      if (!fc.call_id) continue;
      const id = leadIdFrom(fc.arguments) ?? leadIdFrom(fc.result);
      if (id && !leadToCall.has(id)) leadToCall.set(id, fc.call_id);
    }

    // A call's summary can come from three places: the transcript row (post-call
    // webhook), a `call_summary` agent event, or a `saveCallSummary` function call.
    const summaryByCall = new Map<string, string>();
    const setSummary = (callId: string | null, s: string | null) => {
      if (callId && s && !summaryByCall.has(callId)) summaryByCall.set(callId, s);
    };
    for (const t of data.transcripts) setSummary(t.call_id, t.summary);
    for (const e of data.agentEvents) {
      if (e.event_type === "call_summary") setSummary(e.call_id, summaryFrom(e.payload));
    }
    for (const fc of data.functionCalls) {
      if (fc.name === "saveCallSummary") setSummary(fc.call_id, summaryFrom(fc.arguments));
    }

    const resolve = (
      lead: Lead,
    ): { call: Call | null; transcript: Transcript | null; summary: string | null } => {
      let callId = leadToCall.get(lead.id) ?? null;
      if (!callId && lead.name) {
        const nameLc = lead.name.trim().toLowerCase();
        const match = data.calls.find(
          (c) =>
            c.tenant === lead.tenant &&
            c.caller_name &&
            c.caller_name.trim().toLowerCase() === nameLc,
        );
        callId = match?.id ?? null;
      }
      const call = callId ? callById.get(callId) ?? null : null;
      const transcript = callId ? transcriptByCall.get(callId) ?? null : null;
      const summary = callId ? summaryByCall.get(callId) ?? null : null;
      return { call, transcript, summary };
    };

    return { resolve };
  }, [data]);

  const resolved = selectedLead ? lookup.resolve(selectedLead) : null;

  const days = RANGES.find((r) => r.id === range)!.days;
  const minTime = days == null ? 0 : now - days * 86_400_000;

  // Apply the GLOBAL filters (tenant + date range) once; sections reuse these.
  const f = useMemo(() => {
    const inScope = (slug: string, ts: string | null) =>
      (tenant === "all" || slug === tenant) &&
      (ts == null || new Date(ts).getTime() >= minTime);

    return {
      calls: data.calls.filter((c) => inScope(c.tenant, c.started_at)),
      leads: data.leads.filter((l) => inScope(l.tenant, l.created_at)),
      appointments: data.appointments.filter((a) => inScope(a.tenant, a.created_at)),
      transcripts: data.transcripts.filter((t) => inScope(t.tenant, t.created_at)),
      agentEvents: data.agentEvents.filter((e) => inScope(e.tenant, e.created_at)),
      functionCalls: data.functionCalls.filter((fc) => inScope(fc.tenant, fc.created_at)),
    };
  }, [data, tenant, minTime]);

  const activeTenants = useMemo(() => {
    const present = new Set<string>();
    [...data.calls, ...data.leads].forEach((r) => present.add(r.tenant));
    const ordered = TENANT_META.filter((t) => present.has(t.slug));
    return ordered.length ? ordered : TENANT_META;
  }, [data]);

  // Vocabulary + nav for the selected tenant: relabel "Leads" → "Cases"/"Patients",
  // hide sections that don't apply, and add "Emotional Analysis" for emotion-capable
  // demos (Lexora/Hume). "All demos" uses generic terms with no emotion section.
  const lexicon = tenantLexicon(tenant);
  const nav = useMemo(() => {
    const base = NAV.filter((n) => !lexicon.hiddenSections.includes(n.id)).map((n) =>
      n.id === "leads" ? { ...n, label: lexicon.leads } : n,
    );
    if (!lexicon.emotion) return base;
    const item = {
      id: "emotion" as SectionId,
      label: "Emotional Analysis",
      icon: Icon.heart,
    };
    const at = base.findIndex((n) => n.id === "transcripts");
    return at === -1
      ? [...base, item]
      : [...base.slice(0, at + 1), item, ...base.slice(at + 1)];
  }, [lexicon]);

  // Render the selected section only if it's available for this tenant; otherwise
  // fall back to overview (without mutating state, so the choice returns on "All
  // demos"). Covers both hidden sections and the conditional emotion section.
  const navIds = useMemo(() => new Set(nav.map((n) => n.id)), [nav]);
  const effectiveSection: SectionId = navIds.has(section) ? section : "overview";

  const title = nav.find((n) => n.id === effectiveSection)?.label ?? "Overview";

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      {/* ---- Sidebar ---- */}
      <Sidebar
        nav={nav}
        section={effectiveSection}
        setSection={(s) => {
          setSection(s);
          setMobileNav(false);
          setQuery("");
        }}
        collapsed={collapsed}
        mobileNav={mobileNav}
        closeMobile={() => setMobileNav(false)}
      />

      {/* ---- Main column ---- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar
          title={title}
          collapsed={collapsed}
          toggleCollapse={() => setCollapsed((c) => !c)}
          openMobile={() => setMobileNav(true)}
          tenant={tenant}
          setTenant={setTenant}
          tenants={activeTenants}
          lockTenant={!!lockedTenant}
          range={range}
          setRange={setRange}
          profileOpen={profileOpen}
          setProfileOpen={setProfileOpen}
          onOpenProfile={() => setModal("profile")}
          onOpenSettings={() => setModal("settings")}
          query={query}
          setQuery={setQuery}
          searchable={effectiveSection !== "overview"}
        />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {!data.connected && <DisconnectedBanner error={data.error} />}

          {effectiveSection === "overview" && (
            <Overview
              f={f}
              lex={lexicon}
              onNavigate={(s) => {
                setSection(s);
                setQuery("");
              }}
            />
          )}
          {effectiveSection === "calls" && <CallsView rows={f.calls} query={query} />}
          {effectiveSection === "leads" && (
            <LeadsView
              rows={f.leads}
              query={query}
              onSelect={setSelectedLead}
              lex={lexicon}
            />
          )}
          {effectiveSection === "appointments" && (
            <AppointmentsView rows={f.appointments} query={query} />
          )}
          {effectiveSection === "transcripts" && (
            <TranscriptsView rows={f.transcripts} query={query} />
          )}
          {effectiveSection === "emotion" && (
            <EmotionView rows={f.agentEvents} query={query} />
          )}
          {effectiveSection === "activity" && (
            <ActivityView rows={f.agentEvents} query={query} />
          )}
          {effectiveSection === "functions" && (
            <FunctionsView rows={f.functionCalls} query={query} />
          )}
        </main>
      </div>

      {selectedLead && (
        <TranscriptModal
          lead={selectedLead}
          call={resolved?.call ?? null}
          transcript={resolved?.transcript ?? null}
          summary={resolved?.summary ?? null}
          onClose={() => setSelectedLead(null)}
        />
      )}

      {modal === "profile" && (
        <ProfileModal lockedTenant={lockedTenant} onClose={() => setModal(null)} />
      )}
      {modal === "settings" && (
        <SettingsModal
          range={range}
          setRange={setRange}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

/* ============================== Sidebar ============================== */

function Sidebar({
  nav,
  section,
  setSection,
  collapsed,
  mobileNav,
  closeMobile,
}: {
  nav: typeof NAV;
  section: SectionId;
  setSection: (s: SectionId) => void;
  collapsed: boolean;
  mobileNav: boolean;
  closeMobile: () => void;
}) {
  return (
    <>
      {mobileNav && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={closeMobile}
        />
      )}
      <aside
        className={[
          "z-40 flex shrink-0 flex-col border-r border-gray-200 bg-white transition-all",
          collapsed ? "lg:w-[68px]" : "lg:w-60",
          "fixed inset-y-0 left-0 w-60 lg:static",
          mobileNav ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          "duration-200",
        ].join(" ")}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-gray-100 px-4">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ background: BRAND }}
          >
            G
          </span>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-sm font-semibold">GSoft Voice</div>
              <div className="text-[11px] text-gray-400">Admin Console</div>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {nav.map((item) => {
            const active = section === item.id;
            const I = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                title={collapsed ? item.label : undefined}
                className={[
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                  active
                    ? "bg-teal-50 text-teal-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                  collapsed ? "lg:justify-center" : "",
                ].join(" ")}
              >
                <I className="shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-gray-100 p-3">
          <button
            title={collapsed ? "Settings" : undefined}
            className={[
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50",
              collapsed ? "lg:justify-center" : "",
            ].join(" ")}
          >
            <Icon.settings className="shrink-0" />
            {!collapsed && <span>Settings</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

/* ============================== Navbar ============================== */

function Navbar({
  title,
  collapsed,
  toggleCollapse,
  openMobile,
  tenant,
  setTenant,
  tenants,
  lockTenant,
  range,
  setRange,
  profileOpen,
  setProfileOpen,
  onOpenProfile,
  onOpenSettings,
  query,
  setQuery,
  searchable,
}: {
  title: string;
  collapsed: boolean;
  toggleCollapse: () => void;
  openMobile: () => void;
  tenant: string;
  setTenant: (t: string) => void;
  tenants: typeof TENANT_META;
  lockTenant: boolean;
  range: RangeId;
  setRange: (r: RangeId) => void;
  profileOpen: boolean;
  setProfileOpen: (b: boolean) => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  query: string;
  setQuery: (q: string) => void;
  searchable: boolean;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-gray-200 bg-white/90 px-4 backdrop-blur sm:px-6">
      <button
        onClick={openMobile}
        className="rounded-md p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
        aria-label="Open menu"
      >
        <Icon.menu />
      </button>
      <button
        onClick={toggleCollapse}
        className="hidden rounded-md p-2 text-gray-500 hover:bg-gray-100 lg:block"
        aria-label="Toggle sidebar"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <Icon.menu />
      </button>

      <h1 className="text-lg font-semibold">{title}</h1>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {searchable && (
          <label className="relative hidden items-center sm:flex">
            <Icon.search className="pointer-events-none absolute left-2.5 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-40 rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-teal-400 focus:bg-white md:w-56"
            />
          </label>
        )}

        {lockTenant ? (
          <span className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
            {tenantMeta(tenant).name}
          </span>
        ) : (
          <Select
            value={tenant}
            onChange={setTenant}
            options={[
              { value: "all", label: "All demos" },
              ...tenants.map((t) => ({ value: t.slug, label: t.name })),
            ]}
          />
        )}

        <Select
          value={range}
          onChange={(v) => setRange(v as RangeId)}
          options={RANGES.map((r) => ({ value: r.id, label: r.label }))}
        />

        <button
          className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          aria-label="Notifications"
        >
          <Icon.bell />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
        </button>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-gray-100"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white"
              style={{ background: BRAND }}
            >
              A
            </span>
            <Icon.chevron className="hidden text-gray-400 sm:block" />
          </button>

          {profileOpen && (
            <>
              <button
                className="fixed inset-0 z-30 cursor-default"
                aria-hidden
                onClick={() => setProfileOpen(false)}
              />
              <div className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                <div className="border-b border-gray-100 px-4 py-3">
                  <div className="text-sm font-semibold">Admin</div>
                  <div className="truncate text-xs text-gray-500">{ADMIN_EMAIL}</div>
                </div>
                <div className="p-1">
                  <MenuItem
                    icon={<Icon.user />}
                    label="Profile"
                    onClick={() => {
                      setProfileOpen(false);
                      onOpenProfile();
                    }}
                  />
                  <MenuItem
                    icon={<Icon.settings />}
                    label="Settings"
                    onClick={() => {
                      setProfileOpen(false);
                      onOpenSettings();
                    }}
                  />
                </div>
                <div className="border-t border-gray-100 p-1">
                  <MenuItem icon={<Icon.logout />} label="Sign out" danger onClick={signOut} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function MenuItem({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm",
        danger ? "text-rose-600 hover:bg-rose-50" : "text-gray-700 hover:bg-gray-50",
      ].join(" ")}
    >
      {icon}
      {label}
    </button>
  );
}

async function signOut() {
  try {
    await fetch("/api/admin/logout", { method: "POST" });
  } finally {
    window.location.reload();
  }
}

/* ============================== Profile / Settings ============================== */

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <button
        aria-hidden
        onClick={onClose}
        className="fixed inset-0 z-40 cursor-default bg-black/30"
      />
      <div className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
            aria-label="Close"
          >
            <Icon.x />
          </button>
        </div>
        {children}
      </div>
    </>
  );
}

function ProfileModal({
  lockedTenant,
  onClose,
}: {
  lockedTenant?: string;
  onClose: () => void;
}) {
  const deployment = lockedTenant
    ? `${tenantMeta(lockedTenant).name} (single-tenant)`
    : "All demos (wildcard)";
  return (
    <ModalShell title="Profile" onClose={onClose}>
      <div className="flex items-center gap-3">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold text-white"
          style={{ background: BRAND }}
        >
          A
        </span>
        <div>
          <div className="font-semibold">Admin</div>
          <div className="text-sm text-gray-500">{ADMIN_EMAIL}</div>
        </div>
      </div>
      <dl className="mt-5 space-y-2 text-sm">
        <InfoRow label="Role" value="Administrator" />
        <InfoRow label="Deployment" value={deployment} />
      </dl>
      <button
        onClick={signOut}
        className="mt-6 w-full rounded-lg bg-rose-50 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-100"
      >
        Sign out
      </button>
    </ModalShell>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900">{value}</dd>
    </div>
  );
}

function SettingsModal({
  range,
  setRange,
  collapsed,
  setCollapsed,
  onClose,
}: {
  range: RangeId;
  setRange: (r: RangeId) => void;
  collapsed: boolean;
  setCollapsed: (b: boolean) => void;
  onClose: () => void;
}) {
  return (
    <ModalShell title="Settings" onClose={onClose}>
      <div className="space-y-5 text-sm">
        <div>
          <label className="mb-1 block font-medium text-gray-700">Default time range</label>
          <Select
            value={range}
            onChange={(v) => {
              setRange(v as RangeId);
              saveSetting({ range: v as RangeId });
            }}
            options={RANGES.map((r) => ({ value: r.id, label: r.label }))}
          />
          <p className="mt-1 text-xs text-gray-400">
            Applied to every view and remembered on this device.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-700">Collapse sidebar by default</div>
            <p className="text-xs text-gray-400">Start with a compact sidebar.</p>
          </div>
          <Toggle
            checked={collapsed}
            onChange={(v) => {
              setCollapsed(v);
              saveSetting({ collapsed: v });
            }}
          />
        </div>
      </div>
    </ModalShell>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative h-6 w-11 shrink-0 rounded-full transition"
      style={{ background: checked ? BRAND : "#e5e7eb" }}
    >
      <span
        className={[
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
          checked ? "left-[22px]" : "left-0.5",
        ].join(" ")}
      />
    </button>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm font-medium text-gray-700 outline-none hover:border-gray-300 focus:border-teal-400"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon.chevron className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
    </div>
  );
}

/* ============================== Overview ============================== */

function Overview({
  f,
  lex,
  onNavigate,
}: {
  f: Filtered;
  lex: Lexicon;
  onNavigate: (s: SectionId) => void;
}) {
  const totalCalls = f.calls.length;
  const totalLeads = f.leads.length;
  const booked = f.appointments.length;
  const durations = f.calls.map((c) => c.duration ?? 0).filter((d) => d > 0);
  const avgDuration = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0;
  const conversion = totalLeads ? Math.round((booked / totalLeads) * 100) : 0;

  // Calls per day (line)
  const callsPerDay = useMemo<Point[]>(() => bucketByDay(f.calls, (c) => c.started_at), [f.calls]);

  // Leads by status (donut)
  const leadStatus = useMemo<Series[]>(() => {
    const palette: Record<string, string> = {
      new: "#3b82f6",
      qualified: "#14b8a6",
      contacted: "#f59e0b",
      won: "#22c55e",
      lost: "#ef4444",
      unknown: "#94a3b8",
    };
    const counts = countBy(f.leads, (l) => l.status ?? "unknown");
    return Object.entries(counts).map(([label, value]) => ({
      label,
      value,
      color: palette[label] ?? "#64748b",
    }));
  }, [f.leads]);

  // Calls by tenant (bar)
  const callsByTenant = useMemo<Series[]>(() => {
    const counts = countBy(f.calls, (c) => c.tenant);
    return Object.entries(counts)
      .map(([slug, value]) => ({
        label: tenantMeta(slug).name.replace(/ AI| Labs/, ""),
        value,
        color: tenantColor(slug),
      }))
      .sort((a, b) => b.value - a.value);
  }, [f.calls]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Total Calls"
          value={totalCalls}
          icon={<Icon.phone />}
          tint="#0f766e"
          onClick={() => onNavigate("calls")}
        />
        <Kpi
          label={`Total ${lex.leads}`}
          value={totalLeads}
          icon={<Icon.users />}
          tint="#2563eb"
          onClick={() => onNavigate("leads")}
        />
        <Kpi
          label="Appointments"
          value={booked}
          icon={<Icon.calendar />}
          tint="#7c3aed"
          onClick={() => onNavigate("appointments")}
        />
        <Kpi
          label="Avg Call Time"
          value={fmtDuration(avgDuration)}
          icon={<Icon.clock />}
          tint="#db2777"
          onClick={() => onNavigate("calls")}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Calls over time" subtitle="Daily volume" className="lg:col-span-2">
          <LineChart data={callsPerDay} color={BRAND} />
        </Card>
        <Card title={`${lex.leads} by status`} subtitle={`${totalLeads} total`}>
          <DonutChart data={leadStatus} />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Calls by demo" subtitle="Across tenants" className="lg:col-span-2">
          <BarChart data={callsByTenant} />
        </Card>
        <Card title="Conversion" subtitle={`${lex.leads} → appointments`}>
          <div className="flex h-[220px] flex-col items-center justify-center">
            <div className="text-5xl font-bold text-gray-900">{conversion}%</div>
            <div className="mt-2 flex items-center gap-1 text-sm text-emerald-600">
              <Icon.trendUp />
              {booked} of {totalLeads} {lex.leads.toLowerCase()} booked
            </div>
            <div className="mt-4 h-2.5 w-40 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full"
                style={{ width: `${conversion}%`, background: BRAND }}
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon,
  tint,
  onClick,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  tint: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 active:translate-y-0"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{label}</span>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: `${tint}15`, color: tint }}
        >
          {icon}
        </span>
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
      <div className="mt-1 flex items-center gap-1 text-xs font-medium text-gray-400 opacity-0 transition group-hover:opacity-100">
        View details <span aria-hidden>→</span>
      </div>
    </button>
  );
}

/* ============================== Section views ============================== */

function CallsView({ rows, query }: { rows: DashboardData["calls"]; query: string }) {
  const filtered = search(rows, query, (c) => [c.tenant, c.caller_name, c.status]);
  return (
    <Card title="Calls" subtitle={`${filtered.length} records`}>
      <DataTable
        rows={filtered}
        empty="No calls match the current filters."
        columns={[
          { label: "Demo", cell: (c) => <TenantBadge slug={c.tenant} /> },
          { label: "Caller", cell: (c) => c.caller_name ?? "—" },
          { label: "Status", cell: (c) => <StatusBadge status={c.status} /> },
          { label: "Duration", cell: (c) => fmtDuration(c.duration ?? 0) },
          { label: "Started", cell: (c) => fmtDate(c.started_at), className: "text-gray-500" },
        ]}
      />
    </Card>
  );
}

function LeadsView({
  rows,
  query,
  onSelect,
  lex,
}: {
  rows: DashboardData["leads"];
  query: string;
  onSelect: (lead: Lead) => void;
  lex: Lexicon;
}) {
  const filtered = search(rows, query, (l) => [l.tenant, l.name, l.email, l.phone, l.status]);
  const columns: Column<Lead>[] = [
    { label: "Demo", cell: (l) => <TenantBadge slug={l.tenant} /> },
    { label: "Name", cell: (l) => l.name ?? "—" },
    { label: "Contact", cell: (l) => l.phone ?? l.email ?? "—" },
    // Score column only where a numeric score is meaningful for the demo.
    ...(lex.showScore
      ? [{ label: lex.scoreLabel, cell: (l: Lead) => <ScoreBadge score={l.score} /> }]
      : []),
    { label: "Status", cell: (l) => <StatusBadge status={l.status} /> },
    { label: "Created", cell: (l) => fmtDate(l.created_at), className: "text-gray-500" },
    {
      label: "",
      cell: () => (
        <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-teal-600">
          <Icon.message width={14} height={14} /> Transcript
        </span>
      ),
    },
  ];
  return (
    <Card
      title={lex.leads}
      subtitle={`${filtered.length} records · click a row to view the call transcript`}
    >
      <DataTable
        rows={filtered}
        empty={`No ${lex.leads.toLowerCase()} match the current filters.`}
        onRowClick={onSelect}
        columns={columns}
      />
    </Card>
  );
}

/* ----------------------- Emotional Analysis (Lexora) ---------------------- */

type EmotionRow = {
  id: string;
  tenant: string;
  dominant: string;
  sentiment: string;
  intensity: number | null;
  created_at: string;
};

function sentimentColor(sentiment: string): string {
  if (sentiment === "negative") return "#dc2626";
  if (sentiment === "positive") return "#16a34a";
  return "#64748b";
}

function SentimentPill({ sentiment }: { sentiment: string }) {
  const c = sentimentColor(sentiment);
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
      style={{ background: `${c}1a`, color: c }}
    >
      {sentiment}
    </span>
  );
}

function EmotionView({
  rows,
  query,
}: {
  rows: DashboardData["agentEvents"];
  query: string;
}) {
  const parsed: EmotionRow[] = rows
    .filter((e) => e.event_type === "emotion_analysis")
    .map((e) => {
      const p = (e.payload ?? {}) as Record<string, unknown>;
      return {
        id: e.id,
        tenant: e.tenant,
        dominant: typeof p.dominant === "string" ? p.dominant : "—",
        sentiment: typeof p.sentiment === "string" ? p.sentiment : "neutral",
        intensity: typeof p.intensity === "number" ? p.intensity : null,
        created_at: e.created_at,
      };
    });

  const filtered = search(parsed, query, (r) => [r.tenant, r.dominant, r.sentiment]);
  const counts = countBy(parsed, (r) => r.sentiment);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {(["negative", "neutral", "positive"] as const).map((s) => (
          <div key={s} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm capitalize text-gray-500">{s}</span>
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: sentimentColor(s) }}
              />
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight">{counts[s] ?? 0}</div>
          </div>
        ))}
      </div>

      <Card title="Emotional Analysis" subtitle={`${filtered.length} readings · from Hume voice analysis`}>
        <DataTable
          rows={filtered}
          empty="No emotional analysis recorded yet."
          columns={[
            { label: "Demo", cell: (r) => <TenantBadge slug={r.tenant} /> },
            { label: "Dominant emotion", cell: (r) => <span className="font-medium">{r.dominant}</span> },
            { label: "Sentiment", cell: (r) => <SentimentPill sentiment={r.sentiment} /> },
            {
              label: "Intensity",
              cell: (r) =>
                r.intensity == null ? (
                  "—"
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(0, Math.min(100, r.intensity * 100))}%`,
                          background: sentimentColor(r.sentiment),
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">
                      {Math.round(r.intensity * 100)}%
                    </span>
                  </div>
                ),
            },
            { label: "Time", cell: (r) => fmtDate(r.created_at), className: "text-gray-500" },
          ]}
        />
      </Card>
    </div>
  );
}

function AppointmentsView({
  rows,
  query,
}: {
  rows: DashboardData["appointments"];
  query: string;
}) {
  const filtered = search(rows, query, (a) => [a.tenant, a.date, a.time, a.status]);
  return (
    <Card title="Appointments" subtitle={`${filtered.length} records`}>
      <DataTable
        rows={filtered}
        empty="No appointments match the current filters."
        columns={[
          { label: "Demo", cell: (a) => <TenantBadge slug={a.tenant} /> },
          { label: "Date", cell: (a) => a.date ?? "—" },
          { label: "Time", cell: (a) => a.time ?? "—" },
          { label: "Status", cell: (a) => <StatusBadge status={a.status} /> },
          { label: "Booked", cell: (a) => fmtDate(a.created_at), className: "text-gray-500" },
        ]}
      />
    </Card>
  );
}

function TranscriptsView({
  rows,
  query,
}: {
  rows: DashboardData["transcripts"];
  query: string;
}) {
  const filtered = search(rows, query, (t) => [t.tenant, t.summary, t.transcript]);
  if (filtered.length === 0)
    return (
      <Card title="Transcripts" subtitle="0 records">
        <EmptyState text="No transcripts match the current filters." />
      </Card>
    );
  return (
    <div className="space-y-4">
      {filtered.map((t) => (
        <div key={t.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <TenantBadge slug={t.tenant} />
            <span className="text-xs text-gray-400">{fmtDate(t.created_at)}</span>
          </div>
          {t.summary && <p className="mt-3 text-sm font-medium text-gray-800">{t.summary}</p>}
          <pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
            {t.transcript || "(empty transcript)"}
          </pre>
        </div>
      ))}
    </div>
  );
}

function ActivityView({
  rows,
  query,
}: {
  rows: DashboardData["agentEvents"];
  query: string;
}) {
  const filtered = search(rows, query, (e) => [e.tenant, e.event_type]);
  return (
    <Card title="Agent Activity" subtitle={`${filtered.length} events`}>
      <DataTable
        rows={filtered}
        empty="No agent events match the current filters."
        columns={[
          { label: "Demo", cell: (e) => <TenantBadge slug={e.tenant} /> },
          {
            label: "Event",
            cell: (e) => (
              <span className="font-mono text-xs text-gray-700">{e.event_type ?? "—"}</span>
            ),
          },
          { label: "Payload", cell: (e) => <Json value={e.payload} /> },
          { label: "Time", cell: (e) => fmtDate(e.created_at), className: "text-gray-500" },
        ]}
      />
    </Card>
  );
}

function FunctionsView({
  rows,
  query,
}: {
  rows: DashboardData["functionCalls"];
  query: string;
}) {
  const filtered = search(rows, query, (fc) => [fc.tenant, fc.name]);
  return (
    <Card title="Function Call Logs" subtitle={`${filtered.length} calls`}>
      <DataTable
        rows={filtered}
        empty="No function calls match the current filters."
        columns={[
          { label: "Demo", cell: (fc) => <TenantBadge slug={fc.tenant} /> },
          {
            label: "Function",
            cell: (fc) => (
              <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs font-medium text-gray-800">
                {fc.name ?? "—"}
              </span>
            ),
          },
          { label: "Arguments", cell: (fc) => <Json value={fc.arguments} /> },
          { label: "Result", cell: (fc) => <Json value={fc.result} /> },
          { label: "Time", cell: (fc) => fmtDate(fc.created_at), className: "text-gray-500" },
        ]}
      />
    </Card>
  );
}

/* ============================== Building blocks ============================== */

function Card({
  title,
  subtitle,
  className = "",
  children,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${className}`}
    >
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
      </div>
      {children}
    </section>
  );
}

type Column<T> = { label: string; cell: (row: T) => ReactNode; className?: string };

function DataTable<T extends { id: string }>({
  columns,
  rows,
  empty,
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[];
  empty: string;
  onRowClick?: (row: T) => void;
}) {
  if (rows.length === 0) return <EmptyState text={empty} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-400">
            {columns.map((c, i) => (
              <th key={c.label || i} className="whitespace-nowrap px-3 py-2.5 font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={[
                "border-b border-gray-100 last:border-0",
                onRowClick ? "cursor-pointer hover:bg-teal-50/50" : "hover:bg-gray-50/60",
              ].join(" ")}
            >
              {columns.map((c, i) => (
                <td
                  key={c.label || i}
                  className={`px-3 py-2.5 align-top ${c.className ?? "text-gray-700"}`}
                >
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        <Icon.search />
      </span>
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  );
}

function TenantBadge({ slug }: { slug: string }) {
  const m = tenantMeta(slug);
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
      <span className="font-medium text-gray-800">{m.name}</span>
    </span>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-gray-400">—</span>;
  const s = status.toLowerCase();
  const tone =
    /(won|qualified|completed|booked|confirmed|active|success)/.test(s)
      ? "bg-emerald-50 text-emerald-700"
      : /(lost|failed|cancel|missed|error)/.test(s)
        ? "bg-rose-50 text-rose-700"
        : /(pending|contacted|in_progress|new)/.test(s)
          ? "bg-amber-50 text-amber-700"
          : "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      {status}
    </span>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-gray-400">—</span>;
  const tone =
    score >= 70 ? "text-emerald-600" : score >= 40 ? "text-amber-600" : "text-gray-500";
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`font-semibold ${tone}`}>{score}</span>
      <span className="h-1.5 w-12 overflow-hidden rounded-full bg-gray-100">
        <span
          className="block h-full rounded-full"
          style={{
            width: `${Math.max(0, Math.min(100, score))}%`,
            background: score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#9ca3af",
          }}
        />
      </span>
    </span>
  );
}

function Json({ value }: { value: unknown }) {
  if (value == null) return <span className="text-gray-400">—</span>;
  const str = typeof value === "string" ? value : JSON.stringify(value);
  return (
    <span
      className="block max-w-[260px] truncate font-mono text-xs text-gray-500"
      title={str}
    >
      {str}
    </span>
  );
}

function DisconnectedBanner({ error }: { error?: string }) {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      <Icon.bell className="mt-0.5 shrink-0" />
      <div>
        <p className="font-medium">Supabase not connected — showing an empty dashboard.</p>
        <p className="mt-0.5 text-amber-700">
          Set <code>SUPABASE_URL</code> + <code>SUPABASE_SERVICE_ROLE_KEY</code> and apply{" "}
          <code>supabase/migrations/0001_init.sql</code>.
          {error ? ` (${error})` : ""}
        </p>
      </div>
    </div>
  );
}

/* ============================== utils ============================== */

function fmtDuration(seconds: number): string {
  if (!seconds) return "0s";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${m}m ${s}s` : `${s}s`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  // Pin locale + timeZone so server and client render the same string (avoids
  // a hydration mismatch). UTC keeps the dashboard's time basis consistent with
  // bucketByDay; switch timeZone here if you want a specific business TZ.
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function countBy<T>(rows: T[], key: (r: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const k = key(r);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

function bucketByDay<T>(rows: T[], getTs: (r: T) => string | null): Point[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const ts = getTs(r);
    if (!ts) continue;
    const d = new Date(ts);
    if (isNaN(d.getTime())) continue;
    const key = d.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (counts.size === 0) return [];
  const keys = [...counts.keys()].sort();
  const start = new Date(keys[0]);
  const end = new Date(keys[keys.length - 1]);
  const out: Point[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    out.push({
      // Pin locale + timeZone so SSR (Node) and the browser produce the
      // identical string — otherwise the order ("Jun 24" vs "24 Jun") differs
      // by runtime locale and React throws a hydration mismatch. Keys are UTC
      // dates, so format in UTC to keep the label on the right bucket day.
      label: d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      value: counts.get(key) ?? 0,
    });
  }
  // cap to last 60 buckets to keep the axis readable
  return out.slice(-60);
}

function search<T>(rows: T[], query: string, fields: (r: T) => (string | null)[]): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) =>
    fields(r).some((v) => v != null && v.toLowerCase().includes(q)),
  );
}
