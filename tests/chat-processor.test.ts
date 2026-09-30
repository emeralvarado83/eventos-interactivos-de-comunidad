// Restricción del canal "solo suscriptores": el processor filtra los
// mensajes por badge ANTES de enrutarlos a sugerencias, votos o sorteo.
// Suscriptores, moderadores y el broadcaster siempre pueden participar.

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    channel: { findUnique: vi.fn() },
    event: { findFirst: vi.fn() },
  },
  addSuggestion: vi.fn(),
  addVote: vi.fn(),
  addParticipant: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/lib/suggestions/service", () => ({
  addSuggestion: mocks.addSuggestion,
}));
vi.mock("@/lib/voting/service", () => ({ addVote: mocks.addVote }));
vi.mock("@/lib/raffle/service", () => ({
  addParticipant: mocks.addParticipant,
  isParticipationCommand: (text: string, command: string) =>
    text.trim().toLowerCase() === command,
}));

import {
  passesSubsOnlyRestriction,
  processChatMessage,
} from "@/lib/chat/processor";

describe("passesSubsOnlyRestriction", () => {
  it("acepta suscriptores, moderadores y broadcaster", () => {
    expect(passesSubsOnlyRestriction(["subscriber"])).toBe(true);
    expect(passesSubsOnlyRestriction(["moderator"])).toBe(true);
    expect(passesSubsOnlyRestriction(["broadcaster"])).toBe(true);
    expect(passesSubsOnlyRestriction(["vip", "subscriber"])).toBe(true);
  });

  it("rechaza al resto (incluidos VIP sin sub)", () => {
    expect(passesSubsOnlyRestriction([])).toBe(false);
    expect(passesSubsOnlyRestriction(["vip"])).toBe(false);
    expect(passesSubsOnlyRestriction(["premium"])).toBe(false);
  });
});

describe("processChatMessage (subsOnly)", () => {
  const baseInput = {
    channelTwitchId: "twitch-ch-1",
    twitchUserId: "user-1",
    twitchLogin: "viewer",
    text: "Celeste",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.event.findFirst.mockResolvedValue({
      id: "event-1",
      status: "SUGGESTIONS_ACTIVE",
      raffleCommand: "participo",
      rounds: [{ id: "round-1" }],
    });
  });

  it("con subsOnly activo ignora mensajes sin badge de sub/mod/broadcaster", async () => {
    mocks.db.channel.findUnique.mockResolvedValue({
      id: "ch-1",
      subsOnly: true,
    });

    await processChatMessage({ ...baseInput, badges: [] });
    await processChatMessage({ ...baseInput, badges: ["vip"] });

    expect(mocks.addSuggestion).not.toHaveBeenCalled();
  });

  it("con subsOnly activo deja pasar a suscriptores y mods", async () => {
    mocks.db.channel.findUnique.mockResolvedValue({
      id: "ch-1",
      subsOnly: true,
    });

    await processChatMessage({ ...baseInput, badges: ["subscriber"] });
    await processChatMessage({ ...baseInput, badges: ["moderator"] });

    expect(mocks.addSuggestion).toHaveBeenCalledTimes(2);
  });

  it("con subsOnly desactivado no filtra por badges", async () => {
    mocks.db.channel.findUnique.mockResolvedValue({
      id: "ch-1",
      subsOnly: false,
    });

    await processChatMessage({ ...baseInput, badges: [] });

    expect(mocks.addSuggestion).toHaveBeenCalledTimes(1);
  });
});
