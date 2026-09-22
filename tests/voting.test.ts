// Ranking y resultado de la votación (funciones puras).

import { describe, expect, it } from "vitest";
import { computeRanking, resolveOutcome } from "@/lib/voting/service";

describe("computeRanking", () => {
  it("ordena por votos descendientes", () => {
    const ranked = computeRanking([
      { position: 1, gameName: "A", votes: 2 },
      { position: 2, gameName: "B", votes: 5 },
      { position: 3, gameName: "C", votes: 1 },
    ]);
    expect(ranked.map((o) => o.position)).toEqual([2, 1, 3]);
  });

  it("desempata por posición ascendente (posiciones estables)", () => {
    const ranked = computeRanking([
      { position: 3, gameName: "C", votes: 4 },
      { position: 1, gameName: "A", votes: 4 },
      { position: 2, gameName: "B", votes: 0 },
    ]);
    expect(ranked.map((o) => o.position)).toEqual([1, 3, 2]);
  });

  it("no muta el array de entrada", () => {
    const input = [
      { position: 2, gameName: "B", votes: 5 },
      { position: 1, gameName: "A", votes: 1 },
    ];
    computeRanking(input);
    expect(input.map((o) => o.position)).toEqual([2, 1]);
  });
});

describe("resolveOutcome", () => {
  it("devuelve ganadora cuando hay una única opción en cabeza", () => {
    const outcome = resolveOutcome([
      { position: 1, gameName: "A", votes: 3 },
      { position: 2, gameName: "B", votes: 5 },
    ]);
    expect(outcome).toEqual({
      type: "winner",
      winner: { position: 2, gameName: "B", votes: 5 },
    });
  });

  it("devuelve empate cuando 2+ opciones lideran con los mismos votos", () => {
    const outcome = resolveOutcome([
      { position: 1, gameName: "A", votes: 4 },
      { position: 2, gameName: "B", votes: 4 },
      { position: 3, gameName: "C", votes: 1 },
    ]);
    expect(outcome).toEqual({ type: "tie", tiedPositions: [1, 2] });
  });

  it("sin votos no hay ganador ni empate: el resultado es 'none'", () => {
    const outcome = resolveOutcome([
      { position: 1, gameName: "A", votes: 0 },
      { position: 2, gameName: "B", votes: 0 },
    ]);
    expect(outcome).toEqual({ type: "none" });
  });

  it("una sola opción con 0 votos también es 'none' (no hubo participación)", () => {
    const outcome = resolveOutcome([{ position: 1, gameName: "A", votes: 0 }]);
    expect(outcome).toEqual({ type: "none" });
  });
});
