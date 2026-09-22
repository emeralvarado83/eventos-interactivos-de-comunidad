// Tabla de transiciones de la máquina de estados del evento.

import { describe, expect, it } from "vitest";
import {
  allowedTransitions,
  assertTransition,
  canTransition,
} from "@/lib/events/state-machine";
import { BusinessError } from "@/lib/errors";
import type { EventStatusName } from "@/lib/realtime/contracts";

const ALL_STATUSES = Object.keys(allowedTransitions) as EventStatusName[];

describe("máquina de estados", () => {
  it("admite exactamente las transiciones listadas", () => {
    const valid: Array<[EventStatusName, EventStatusName]> = [
      ["DRAFT", "SUGGESTIONS_ACTIVE"],
      ["DRAFT", "VOTING_ACTIVE"],
      ["DRAFT", "REGISTRATION_OPEN"],
      ["DRAFT", "CANCELLED"],
      ["SUGGESTIONS_ACTIVE", "SUGGESTIONS_FINISHED"],
      ["SUGGESTIONS_ACTIVE", "CANCELLED"],
      ["SUGGESTIONS_FINISHED", "COMPLETED"],
      ["SUGGESTIONS_FINISHED", "CANCELLED"],
      ["VOTING_ACTIVE", "VOTING_FINISHED"],
      ["VOTING_ACTIVE", "CANCELLED"],
      ["VOTING_FINISHED", "TIE"],
      ["VOTING_FINISHED", "COMPLETED"],
      ["VOTING_FINISHED", "CANCELLED"],
      ["TIE", "VOTING_ACTIVE"],
      ["COMPLETED", "SUGGESTIONS_ACTIVE"],
      ["COMPLETED", "VOTING_ACTIVE"],
      ["COMPLETED", "REGISTRATION_OPEN"],
      ["COMPLETED", "DRAWING"],
      ["COMPLETED", "CANCELLED"],
      ["REGISTRATION_OPEN", "REGISTRATION_CLOSED"],
      ["REGISTRATION_OPEN", "CANCELLED"],
      ["REGISTRATION_CLOSED", "DRAWING"],
      ["REGISTRATION_CLOSED", "CANCELLED"],
      ["DRAWING", "COMPLETED"],
    ];
    for (const [from, to] of valid) {
      expect(canTransition(from, to)).toBe(true);
      expect(() => assertTransition(from, to)).not.toThrow();
    }
  });

  it("rechaza cualquier transición no listada", () => {
    let rejected = 0;
    for (const from of ALL_STATUSES) {
      for (const to of ALL_STATUSES) {
        if (!allowedTransitions[from].includes(to)) {
          expect(canTransition(from, to)).toBe(false);
          expect(() => assertTransition(from, to)).toThrow(BusinessError);
          rejected += 1;
        }
      }
    }
    // 121 pares posibles (11 estados) - 24 válidas.
    expect(rejected).toBe(97);
  });

  it("rechaza las transiciones del antiguo flujo combinado", () => {
    // SUGGESTIONS_FINISHED ya no puede pasar a votación: son eventos
    // independientes. TIE ya no abre una nueva ronda de sugerencias.
    expect(canTransition("SUGGESTIONS_FINISHED", "VOTING_ACTIVE")).toBe(false);
    expect(canTransition("TIE", "SUGGESTIONS_ACTIVE")).toBe(false);
  });

  it("CANCELLED es un pozo sin transiciones de salida", () => {
    expect(allowedTransitions.CANCELLED).toEqual([]);
    expect(() => assertTransition("CANCELLED", "SUGGESTIONS_ACTIVE")).toThrow(
      /Transición no permitida/
    );
  });
});
