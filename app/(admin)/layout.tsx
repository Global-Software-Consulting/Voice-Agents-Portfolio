// Layout for the admin route group (admin.<host>). The dashboard renders its own
// chrome (sidebar + navbar); this just sets metadata and lets it fill the screen.
import type { Metadata } from "next";

export const metadata: Metadata = {
  // `absolute` so the root layout's "%s · …" template isn't appended.
  title: { absolute: "Admin Console · GSoft AI Voice Agents" },
  description: "Cross-tenant analytics for the GSoft AI Voice Agent demos.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex-1">{children}</div>;
}
