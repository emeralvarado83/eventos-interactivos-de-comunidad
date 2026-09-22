// Reglas de normalización y validación de sugerencias (funciones puras) y del
// alta desde el chat con validación IGDB (servicio, con dependencias mockeadas).

import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  config: { igdbValidationEnabled: true },
  db: {
    round: { findUnique: vi.fn() },
    suggestionBan: { findUnique: vi.fn() },
    suggestion: { create: vi.fn() },
  },
  resolveGameName: vi.fn(),
  publishEventState: vi.fn(),
}));

vi.mock("@/lib/config", () => ({ config: mocks.config }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/lib/igdb/games", () => ({ resolveGameName: mocks.resolveGameName }));
vi.mock("@/lib/events/service", () => ({
  publishEventState: mocks.publishEventState,
}));

import {
  addSuggestion,
  isValidSuggestionText,
  normalizeGameName,
} from "@/lib/suggestions/service";

describe("normalizeGameName", () => {
  it("pasa a minúsculas, recorta y colapsa espacios múltiples", () => {
    expect(normalizeGameName("  Hollow   Knight  ")).toBe("hollow knight");
    expect(normalizeGameName("CELESTE")).toBe("celeste");
    expect(normalizeGameName("The\t\tMessenger")).toBe("the messenger");
  });

  it("hace equivalentes las variantes de mayúsculas y espaciado", () => {
    expect(normalizeGameName("Hades")).toBe(normalizeGameName("  HADES "));
    expect(normalizeGameName("Dead   Cells")).toBe(normalizeGameName("dead cells"));
  });
});

describe("isValidSuggestionText", () => {
  it("acepta textos entre 2 y 60 caracteres tras trim", () => {
    expect(isValidSuggestionText("ab")).toBe(true);
    expect(isValidSuggestionText("a".repeat(60))).toBe(true);
    expect(isValidSuggestionText("  Celeste  ")).toBe(true);
  });

  it("rechaza vacíos, demasiado cortos o demasiado largos", () => {
    expect(isValidSuggestionText("")).toBe(false);
    expect(isValidSuggestionText("   ")).toBe(false);
    expect(isValidSuggestionText("a")).toBe(false);
    expect(isValidSuggestionText(" a ")).toBe(false);
    expect(isValidSuggestionText("a".repeat(61))).toBe(false);
  });
});

describe("addSuggestion (validación IGDB)", () => {
  const activeRound = {
    id: "round-1",
    phase: "SUGGESTIONS",
    event: { id: "event-1", status: "SUGGESTIONS_ACTIVE", channelId: "ch-1" },
  };

  function createdSuggestion(gameName: string) {
    return {
      id: "sug-1",
      gameName,
      twitchLogin: "viewer",
      createdAt: new Date("2026-01-01T00:00:00Z"),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.config.igdbValidationEnabled = true;
    mocks.db.round.findUnique.mockResolvedValue(activeRound);
    mocks.db.suggestionBan.findUnique.mockResolvedValue(null);
    mocks.db.suggestion.create.mockImplementation(({ data }) =>
      Promise.resolve(createdSuggestion(data.gameName))
    );
    mocks.publishEventState.mockResolvedValue(undefined);
  });

  it("canoniza el typo al título oficial y guarda el igdbGameId", async () => {
    mocks.resolveGameName.mockResolvedValue({
      igdbGameId: 123,
      officialName: "Elden Ring",
    });

    const result = await addSuggestion("round-1", "user-1", "viewer", "Elden Rign");

    expect(result).toBe("added");
    expect(mocks.db.suggestion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        gameName: "Elden Ring",
        normalizedName: "elden ring",
        igdbGameId: 123,
      }),
    });
    expect(mocks.publishEventState).toHaveBeenCalledTimes(1);
  });

  it("rechaza silenciosamente lo que IGDB no encuentra (basura)", async () => {
    mocks.resolveGameName.mockResolvedValue(null);

    const result = await addSuggestion("round-1", "user-1", "viewer", "asdfgh qwerty");

    expect(result).toBe("ignored");
    expect(mocks.db.suggestion.create).not.toHaveBeenCalled();
    expect(mocks.publishEventState).not.toHaveBeenCalled();
  });

  it("fail-open: si IGDB falla, acepta el texto del usuario sin validar", async () => {
    mocks.resolveGameName.mockRejectedValue(new Error("IGDB timeout"));

    const result = await addSuggestion("round-1", "user-1", "viewer", "  Juego Raro  ");

    expect(result).toBe("added");
    expect(mocks.db.suggestion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        gameName: "Juego Raro",
        normalizedName: "juego raro",
        igdbGameId: null,
      }),
    });
  });

  it("con IGDB_VALIDATION=off no consulta el catálogo y acepta el texto", async () => {
    mocks.config.igdbValidationEnabled = false;

    const result = await addSuggestion("round-1", "user-1", "viewer", "Fangame Oscuro");

    expect(result).toBe("added");
    expect(mocks.resolveGameName).not.toHaveBeenCalled();
    expect(mocks.db.suggestion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ gameName: "Fangame Oscuro" }),
    });
  });

  it("el veto se comprueba sobre el nombre canónico (cubre todos los typos)", async () => {
    mocks.resolveGameName.mockResolvedValue({
      igdbGameId: 123,
      officialName: "Elden Ring",
    });
    mocks.db.suggestionBan.findUnique.mockResolvedValue({ id: "ban-1" });

    const result = await addSuggestion("round-1", "user-1", "viewer", "Elden Rign");

    expect(result).toBe("ignored");
    expect(mocks.db.suggestionBan.findUnique).toHaveBeenCalledWith({
      where: {
        roundId_normalizedName: { roundId: "round-1", normalizedName: "elden ring" },
      },
    });
    expect(mocks.db.suggestion.create).not.toHaveBeenCalled();
  });

  it("duplicado por nombre canónico (P2002) se ignora silenciosamente", async () => {
    mocks.resolveGameName.mockResolvedValue({
      igdbGameId: 123,
      officialName: "Elden Ring",
    });
    mocks.db.suggestion.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      })
    );

    const result = await addSuggestion("round-1", "user-2", "otro", "Elden Rign");

    expect(result).toBe("ignored");
    expect(mocks.publishEventState).not.toHaveBeenCalled();
  });

  it("texto inválido o fase incorrecta se ignoran sin consultar IGDB", async () => {
    expect(await addSuggestion("round-1", "user-1", "viewer", "a")).toBe("ignored");

    mocks.db.round.findUnique.mockResolvedValue({
      ...activeRound,
      phase: "VOTING",
      event: { ...activeRound.event, status: "VOTING_ACTIVE" },
    });
    expect(await addSuggestion("round-1", "user-1", "viewer", "Celeste")).toBe("ignored");

    expect(mocks.resolveGameName).not.toHaveBeenCalled();
    expect(mocks.db.suggestion.create).not.toHaveBeenCalled();
  });
});
