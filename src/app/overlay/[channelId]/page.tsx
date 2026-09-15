import { OverlayClient } from "./overlay-client";

export default async function OverlayPage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = await params;
  return <OverlayClient channelId={channelId} />;
}
