// Reglas puras del sorteo: comando de participación y selección del ganador.

import { describe, expect, it } from "vitest";
import {
  isParticipationCommand,
  pickWinnerIndex,
} from "@/lib/raffle/service";
import { BusinessError } from "@/lib/errors";

describe("isParticipationCommand", () => {
  it("acepta el comando exacto, con espacios o mayúsculas", () => {
    expect(isParticipationCommand("!participo")).toBe(true);
    expect(isParticipationCommand("  !participo  ")).toBe(true);
    expect(isParticipationCommand("!PARTICIPO")).toBe(true);
    expect(isParticipationCommand("!Participo")).toBe(true);
  });

  it("rechaza cualquier otro mensaje", () => {
    expect(isParticipationCommand("participo")).toBe(false);
    expect(isParticipationCommand("!participo por favor")).toBe(false);
    expect(isParticipationCommand("!participo!")).toBe(false);
    expect(isParticipationCommand("!yo participo")).toBe(false);
    expect(isParticipationCommand("hola")).toBe(false);
    expect(isParticipationCommand("")).toBe(false);
  });
});

describe("pickWinnerIndex", () => {
  it("devuelve índices dentro del rango", () => {
    // rng determinista: siempre el valor medio.
    const rng = () => 0.5;
    for (const count of [1, 2, 7, 47, 500]) {
      const index = pickWinnerIndex(count, rng);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(count);
      expect(Number.isInteger(index)).toBe(true);
    }
  });

  it("con rng = 0 elige al primero y con rng cercano a 1 al último", () => {
    expect(pickWinnerIndex(47, () => 0)).toBe(0);
    expect(pickWinnerIndex(47, () => 0.999999)).toBe(46);
  });

  it("lanza BusinessError si no hay elegibles", () => {
    expect(() => pickWinnerIndex(0)).toThrow(BusinessError);
    expect(() => pickWinnerIndex(0)).toThrow(/No quedan participantes/);
  });
});
