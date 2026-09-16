// Parseo y validación del body de configuración de eventos
// (POST /api/events y PATCH /api/events/[id]).

import { describe, expect, it } from "vitest";
import { parseEventConfig } from "@/lib/events/config";
import { BusinessError } from "@/lib/errors";
import { EVENT_TYPES } from "@/lib/realtime/contracts";
import { EVENT_TYPE_META } from "@/lib/branding";

describe("parseEventConfig", () => {
  it("acepta body vacío o nulo y devuelve objeto vacío", () => {
    expect(parseEventConfig(null)).toEqual({});
    expect(parseEventConfig(undefined)).toEqual({});
    expect(parseEventConfig({})).toEqual({});
  });

  it("acepta una configuración completa válida", () => {
    expect(
      parseEventConfig({
        suggestionDurationSec: 120,
        votingDurationSec: 90,
        maxGames: 5,
      })
    ).toEqual({
      suggestionDurationSec: 120,
      votingDurationSec: 90,
      maxGames: 5,
    });
  });

  it("rechaza bodies que no son objeto", () => {
    expect(() => parseEventConfig("texto")).toThrow(BusinessError);
    expect(() => parseEventConfig([1, 2])).toThrow(BusinessError);
    expect(() => parseEventConfig(42)).toThrow(BusinessError);
  });

  it("rechaza duraciones fuera de rango o no enteras", () => {
    expect(() => parseEventConfig({ suggestionDurationSec: 5 })).toThrow(
      /suggestionDurationSec/
    );
    expect(() => parseEventConfig({ votingDurationSec: 3601 })).toThrow(
      /votingDurationSec/
    );
    expect(() => parseEventConfig({ votingDurationSec: 60.5 })).toThrow(
      /votingDurationSec/
    );
    expect(() => parseEventConfig({ suggestionDurationSec: "60" })).toThrow(
      /suggestionDurationSec/
    );
  });

  it("rechaza maxGames fuera de rango o no entero", () => {
    expect(() => parseEventConfig({ maxGames: 0 })).toThrow(/maxGames/);
    expect(() => parseEventConfig({ maxGames: 51 })).toThrow(/maxGames/);
    expect(() => parseEventConfig({ maxGames: 2.5 })).toThrow(/maxGames/);
    expect(() => parseEventConfig({ maxGames: "10" })).toThrow(/maxGames/);
  });

  it("acepta maxGames en los bordes del rango", () => {
    expect(parseEventConfig({ maxGames: 1 })).toEqual({ maxGames: 1 });
    expect(parseEventConfig({ maxGames: 50 })).toEqual({ maxGames: 50 });
  });

  it("acepta un tipo de evento válido", () => {
    expect(parseEventConfig({ type: "GAME_SELECTION" })).toEqual({
      type: "GAME_SELECTION",
    });
    expect(parseEventConfig({ type: "RAFFLE" })).toEqual({ type: "RAFFLE" });
  });

  it("rechaza tipos de evento desconocidos o no string", () => {
    expect(() => parseEventConfig({ type: "poll" })).toThrow(/type/);
    expect(() => parseEventConfig({ type: "suggestions_votes" })).toThrow(
      /type/
    );
    expect(() => parseEventConfig({ type: 42 })).toThrow(/type/);
  });

  it("acepta la configuración del sorteo", () => {
    expect(
      parseEventConfig({
        type: "RAFFLE",
        registrationDurationSec: 600,
        maxParticipants: 50,
      })
    ).toEqual({
      type: "RAFFLE",
      registrationDurationSec: 600,
      maxParticipants: 50,
    });
  });

  it("acepta maxParticipants null (sin límite)", () => {
    expect(parseEventConfig({ maxParticipants: null })).toEqual({
      maxParticipants: null,
    });
  });

  it("rechaza registrationDurationSec fuera de rango o no entero", () => {
    expect(() => parseEventConfig({ registrationDurationSec: 5 })).toThrow(
      /registrationDurationSec/
    );
    expect(() => parseEventConfig({ registrationDurationSec: 3601 })).toThrow(
      /registrationDurationSec/
    );
    expect(() =>
      parseEventConfig({ registrationDurationSec: "300" })
    ).toThrow(/registrationDurationSec/);
  });

  it("rechaza maxParticipants fuera de rango o no entero", () => {
    expect(() => parseEventConfig({ maxParticipants: 0 })).toThrow(
      /maxParticipants/
    );
    expect(() => parseEventConfig({ maxParticipants: 10001 })).toThrow(
      /maxParticipants/
    );
    expect(() => parseEventConfig({ maxParticipants: 2.5 })).toThrow(
      /maxParticipants/
    );
    expect(() => parseEventConfig({ maxParticipants: "100" })).toThrow(
      /maxParticipants/
    );
  });
});

describe("EVENT_TYPE_META", () => {
  it("tiene textos visibles para cada tipo de evento", () => {
    for (const type of EVENT_TYPES) {
      const meta = EVENT_TYPE_META[type];
      expect(meta.label).toBeTruthy();
      expect(meta.startLabel).toBeTruthy();
      expect(meta.title).toBeTruthy();
    }
  });
});
