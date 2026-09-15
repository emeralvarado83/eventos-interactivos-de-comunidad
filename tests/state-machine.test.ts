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
      ["DRAFT", "CANCELLED"],
      ["SUGGESTIONS_ACTIVE", "SUGGESTIONS_FINISHED"],
      ["SUGGESTIONS_ACTIVE", "CANCELLED"],
      ["SUGGESTIONS_FINISHED", "VOTING_ACTIVE"],
      ["SUGGESTIONS_FINISHED", "CANCELLED"],
      ["VOTING_ACTIVE", "VOTING_FINISHED"],
      ["VOTING_FINISHED", "TIE"],
      ["VOTING_FINISHED", "COMPLETED"],
      ["TIE", "VOTING_ACTIVE"],
      ["TIE", "SUGGESTIONS_ACTIVE"],
      ["COMPLETED", "SUGGESTIONS_ACTIVE"],
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
    // 64 pares posibles - 12 válidas.
    expect(rejected).toBe(52);
  });

  it("CANCELLED es un pozo sin transiciones de salida", () => {
    expect(allowedTransitions.CANCELLED).toEqual([]);
    expect(() => assertTransition("CANCELLED", "SUGGESTIONS_ACTIVE")).toThrow(
      /Transición no permitida/
    );
  });
});
