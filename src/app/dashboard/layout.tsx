import { getSession } from "@/lib/auth/session";
import { getChannelSettings } from "@/lib/channel/settings";
import { Sidebar } from "./components/sidebar";

export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  const session = await getSession();
  const settings = session
    ? await getChannelSettings(session.channelId)
    : null;
  const themeColor = settings?.themeColor ?? "violet";

  return (
    <div
      data-theme={themeColor}
      className="flex min-h-full flex-1 bg-[#0a0614] font-sans text-zinc-100"
    >
      <Sidebar />
      {children}
    </div>
  );
}
