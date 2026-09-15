import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const overlayUrl = host
    ? `${proto}://${host}/overlay/${session.channelId}`
    : `/overlay/${session.channelId}`;

  return (
    <DashboardClient
      channelId={session.channelId}
      displayName={session.displayName}
      channelLogin={session.login}
      overlayUrl={overlayUrl}
    />
  );
}
