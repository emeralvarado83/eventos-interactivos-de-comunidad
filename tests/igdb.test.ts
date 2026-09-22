// Matching difuso contra el catálogo IGDB (funciones puras) y caché de
// resolveGameName con el cliente HTTP mockeado.

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ queryGames: vi.fn() }));
vi.mock("@/lib/igdb/client", () => ({ queryGames: mocks.queryGames }));

import {
  clearGameResolutionCache,
  normalizeForMatch,
  pickBestMatch,
  resolveGameName,
  similarity,
} from "@/lib/igdb/games";

describe("normalizeForMatch", () => {
  it("minúsculas, sin diacríticos ni puntuación y espacios colapsados", () => {
    expect(normalizeForMatch("  Pokémon   Rojo ")).toBe("pokemon rojo");
    expect(normalizeForMatch("The Legend of Zelda: Breath of the Wild")).toBe(
      "the legend of zelda breath of the wild"
    );
    expect(normalizeForMatch("Grand Theft Auto™ V")).toBe("grand theft auto v");
  });
});

describe("similarity", () => {
  it("1 para textos idénticos y ~0 para textos sin relación", () => {
    expect(similarity("elden ring", "elden ring")).toBe(1);
    expect(similarity("asdfgh qwerty", "elden ring")).toBe(0);
  });

  it("puntuación alta para typos", () => {
    expect(similarity("elden rign", "elden ring")).toBeGreaterThan(0.6);
    expect(similarity("hollow knigth", "hollow knight")).toBeGreaterThan(0.6);
  });
});

describe("pickBestMatch", () => {
  it("canoniza un typo al título oficial", () => {
    const match = pickBestMatch("Elden Rign", [
      { id: 123, name: "Elden Ring" },
    ]);
    expect(match).toEqual({ igdbGameId: 123, officialName: "Elden Ring" });
  });

  it("acepta abreviaturas que casan con un nombre alternativo (GTA V)", () => {
    const match = pickBestMatch("GTA V", [
      {
        id: 456,
        name: "Grand Theft Auto V",
        alternative_names: [{ id: 1, name: "GTA V" }],
      },
    ]);
    expect(match).toEqual({
      igdbGameId: 456,
      officialName: "Grand Theft Auto V",
    });
  });

  it("acepta palabras sueltas de franquicia y desempata por relevancia de IGDB", () => {
    const match = pickBestMatch("zelda", [
      { id: 1, name: "The Legend of Zelda: Breath of the Wild" },
      { id: 2, name: "The Legend of Zelda: Tears of the Kingdom" },
    ]);
    expect(match?.igdbGameId).toBe(1);
  });

  it("rechaza basura aunque IGDB devuelva candidatos", () => {
    expect(
      pickBestMatch("asdfgh qwerty", [{ id: 1, name: "Elden Ring" }])
    ).toBeNull();
  });

  it("no casa palabras comunes de menos de 4 letras con títulos largos", () => {
    expect(
      pickBestMatch("the", [
        { id: 1, name: "The Legend of Zelda: Breath of the Wild" },
      ])
    ).toBeNull();
  });

  it("sin candidatos o con texto vacío devuelve null", () => {
    expect(pickBestMatch("celeste", [])).toBeNull();
    expect(pickBestMatch("  ", [{ id: 1, name: "Celeste" }])).toBeNull();
  });
});

describe("resolveGameName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearGameResolutionCache();
  });

  it("resuelve contra IGDB y cachea el hit (una sola llamada HTTP)", async () => {
    mocks.queryGames.mockResolvedValue([{ id: 123, name: "Elden Ring" }]);

    const first = await resolveGameName("Elden Rign");
    const second = await resolveGameName("elden   rign");

    expect(first).toEqual({ igdbGameId: 123, officialName: "Elden Ring" });
    expect(second).toEqual(first);
    expect(mocks.queryGames).toHaveBeenCalledTimes(1);
  });

  it("cachea también los misses (texto sin juego)", async () => {
    mocks.queryGames.mockResolvedValue([]);

    expect(await resolveGameName("asdfgh qwerty")).toBeNull();
    expect(await resolveGameName("ASDFGH   QWERTY")).toBeNull();
    expect(mocks.queryGames).toHaveBeenCalledTimes(1);
  });

  it("no traga los errores de IGDB: los propaga para el fail-open del caller", async () => {
    mocks.queryGames.mockRejectedValue(new Error("timeout"));
    await expect(resolveGameName("Celeste")).rejects.toThrow("timeout");
  });
});
