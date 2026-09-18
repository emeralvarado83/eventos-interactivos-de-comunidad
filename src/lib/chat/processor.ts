// Procesador de mensajes de chat (Fase 7, corrección del documento 2):
// NO hay comandos. En SUGGESTIONS_ACTIVE cualquier texto válido es una
// sugerencia; en VOTING_ACTIVE solo un entero dentro de [1, n] es un voto.
// Excepción del sorteo: en REGISTRATION_OPEN solo "!participo" inscribe.
// Todo lo demás se ignora silenciosamente: nunca se responde al chat.

import { db } from "@/lib/db";
import { addSuggestion } from "@/lib/suggestions/service";
import { addVote } from "@/lib/voting/service";
import { addParticipant, isParticipationCommand } from "@/lib/raffle/service";

export interface ChatMessageInput {
  /** twitchId del canal (broadcaster) donde llegó el mensaje. */
  channelTwitchId: string;
  twitchUserId: string;
  twitchLogin: string;
  text: string;
}

/** Un voto es exactamente un entero positivo (sin espacios ni otros caracteres). */
function parseVotePosition(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = parseInt(trimmed, 10);
  return Number.isSafeInteger(value) ? value : null;
}

export async function processChatMessage(input: ChatMessageInput): Promise<void> {
  const channel = await db.channel.findUnique({
    where: { twitchId: input.channelTwitchId },
  });
  if (!channel) return;

  const event = await db.event.findFirst({
    where: {
      channelId: channel.id,
      status: { in: ["SUGGESTIONS_ACTIVE", "VOTING_ACTIVE", "REGISTRATION_OPEN"] },
    },
    orderBy: { createdAt: "desc" },
    include: { rounds: { orderBy: { number: "desc" }, take: 1 } },
  });
  const round = event?.rounds[0];
  if (!event || !round) return;

  // Los servicios validan (texto, fase, duplicados, veto, rango, límite) y
  // emiten el snapshot actualizado cuando algo cambia; aquí solo se enruta.
  if (event.status === "SUGGESTIONS_ACTIVE") {
    await addSuggestion(round.id, input.twitchUserId, input.twitchLogin, input.text);
  } else if (event.status === "REGISTRATION_OPEN") {
    if (isParticipationCommand(input.text)) {
      await addParticipant(event.id, input.twitchUserId, input.twitchLogin);
    }
  } else {
    const position = parseVotePosition(input.text);
    if (position !== null) {
      await addVote(round.id, input.twitchUserId, position);
    }
  }
}
