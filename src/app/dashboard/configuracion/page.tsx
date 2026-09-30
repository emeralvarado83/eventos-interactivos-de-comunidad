import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getChannelSettings } from "@/lib/channel/settings";
import { SettingsClient } from "./settings-client";

export default async function ConfiguracionPage() {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const settings = (await getChannelSettings(session.channelId)) ?? {
    themeColor: "violet" as const,
    alertSoundEnabled: true,
    subsOnly: false,
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="border-b border-violet-500/10 px-6 py-5">
        <h1 className="font-display text-xl text-white">Configuración</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Ajustes del canal: participación, overlay y apariencia.
        </p>
      </header>

      <main className="flex-1 p-6">
        <SettingsClient initialSettings={settings} />
      </main>
    </div>
  );
}
