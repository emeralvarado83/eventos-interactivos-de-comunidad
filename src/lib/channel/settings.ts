// Ajustes del canal (página Configuración del dashboard): color de tema,
// sonido de alerta del overlay y restricción de participación "solo subs".
// Son por canal (no por evento) y se aplican en vivo vía snapshot.

import { db } from "@/lib/db";
import { BusinessError } from "@/lib/errors";
import { THEME_COLORS, type ThemeColorName } from "@/lib/realtime/contracts";
import { publishEventState } from "@/lib/events/service";

export interface ChannelSettings {
  themeColor: ThemeColorName;
  alertSoundEnabled: boolean;
  subsOnly: boolean;
}

export async function getChannelSettings(
  channelId: string
): Promise<ChannelSettings | null> {
  const channel = await db.channel.findUnique({ where: { id: channelId } });
  if (!channel) return null;
  return {
    themeColor: channel.themeColor as ThemeColorName,
    alertSoundEnabled: channel.alertSoundEnabled,
    subsOnly: channel.subsOnly,
  };
}

/** Parsea y valida el body JSON del PATCH de ajustes; todos los campos opcionales. */
export function parseChannelSettings(body: unknown): Partial<ChannelSettings> {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new BusinessError("El body debe ser un objeto JSON");
  }
  const { themeColor, alertSoundEnabled, subsOnly } = body as Record<
    string,
    unknown
  >;

  if (
    themeColor !== undefined &&
    (typeof themeColor !== "string" ||
      !(THEME_COLORS as readonly string[]).includes(themeColor))
  ) {
    throw new BusinessError(
      `themeColor debe ser uno de: ${THEME_COLORS.join(", ")}`
    );
  }
  for (const [name, value] of [
    ["alertSoundEnabled", alertSoundEnabled],
    ["subsOnly", subsOnly],
  ] as const) {
    if (value !== undefined && typeof value !== "boolean") {
      throw new BusinessError(`${name} debe ser un booleano`);
    }
  }

  return {
    themeColor: themeColor as ThemeColorName | undefined,
    alertSoundEnabled: alertSoundEnabled as boolean | undefined,
    subsOnly: subsOnly as boolean | undefined,
  };
}

export async function updateChannelSettings(
  channelId: string,
  settings: Partial<ChannelSettings>
): Promise<ChannelSettings> {
  const channel = await db.channel.update({
    where: { id: channelId },
    data: {
      ...(settings.themeColor !== undefined
        ? { themeColor: settings.themeColor }
        : {}),
      ...(settings.alertSoundEnabled !== undefined
        ? { alertSoundEnabled: settings.alertSoundEnabled }
        : {}),
      ...(settings.subsOnly !== undefined ? { subsOnly: settings.subsOnly } : {}),
    },
  });
  // El snapshot lleva los ajustes al overlay y al dashboard en vivo.
  await publishEventState(channelId);
  return {
    themeColor: channel.themeColor as ThemeColorName,
    alertSoundEnabled: channel.alertSoundEnabled,
    subsOnly: channel.subsOnly,
  };
}
