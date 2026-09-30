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
        maxOptions: 5,
      })
    ).toEqual({
      suggestionDurationSec: 120,
      votingDurationSec: 90,
      maxOptions: 5,
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

  it("rechaza maxOptions fuera de rango o no entero", () => {
    expect(() => parseEventConfig({ maxOptions: 0 })).toThrow(/maxOptions/);
    expect(() => parseEventConfig({ maxOptions: 51 })).toThrow(/maxOptions/);
    expect(() => parseEventConfig({ maxOptions: 2.5 })).toThrow(/maxOptions/);
    expect(() => parseEventConfig({ maxOptions: "10" })).toThrow(/maxOptions/);
  });

  it("acepta maxOptions en los bordes del rango", () => {
    expect(parseEventConfig({ maxOptions: 1 })).toEqual({ maxOptions: 1 });
    expect(parseEventConfig({ maxOptions: 50 })).toEqual({ maxOptions: 50 });
  });

  it("acepta un tipo de evento válido", () => {
    expect(parseEventConfig({ type: "SUGGESTIONS" })).toEqual({
      type: "SUGGESTIONS",
    });
    expect(parseEventConfig({ type: "VOTING" })).toEqual({ type: "VOTING" });
    expect(parseEventConfig({ type: "RAFFLE" })).toEqual({ type: "RAFFLE" });
  });

  it("rechaza tipos de evento desconocidos o no string", () => {
    expect(() => parseEventConfig({ type: "GAME_SELECTION" })).toThrow(/type/);
    expect(() => parseEventConfig({ type: "poll" })).toThrow(/type/);
    expect(() => parseEventConfig({ type: 42 })).toThrow(/type/);
  });

  it("acepta un optionSource válido", () => {
    expect(parseEventConfig({ optionSource: "MANUAL" })).toEqual({
      optionSource: "MANUAL",
    });
    expect(parseEventConfig({ optionSource: "FROM_SUGGESTIONS" })).toEqual({
      optionSource: "FROM_SUGGESTIONS",
    });
  });

  it("rechaza un optionSource desconocido", () => {
    expect(() => parseEventConfig({ optionSource: "CHAT" })).toThrow(
      /optionSource/
    );
    expect(() => parseEventConfig({ optionSource: 1 })).toThrow(/optionSource/);
  });

  it("acepta opciones manuales válidas y les aplica trim", () => {
    expect(
      parseEventConfig({ options: ["  Celeste ", "Hades", "Dead Cells"] })
    ).toEqual({ options: ["Celeste", "Hades", "Dead Cells"] });
  });

  it("rechaza listas de opciones demasiado cortas o largas", () => {
    expect(() => parseEventConfig({ options: ["Celeste"] })).toThrow(
      /entre 2 y 50 opciones/
    );
    expect(() => parseEventConfig({ options: [] })).toThrow(
      /entre 2 y 50 opciones/
    );
    expect(() =>
      parseEventConfig({ options: Array.from({ length: 51 }, (_, i) => `Juego ${i}`) })
    ).toThrow(/entre 2 y 50 opciones/);
    expect(() => parseEventConfig({ options: "Celeste" })).toThrow(/array/);
  });

  it("rechaza opciones con texto inválido", () => {
    expect(() => parseEventConfig({ options: ["a", "Celeste"] })).toThrow(
      /entre 2 y 60 caracteres/
    );
    expect(() => parseEventConfig({ options: ["Celeste", "x".repeat(61)] })).toThrow(
      /entre 2 y 60 caracteres/
    );
    expect(() => parseEventConfig({ options: ["Celeste", 42] })).toThrow(
      /entre 2 y 60 caracteres/
    );
  });

  it("rechaza opciones duplicadas (ignorando mayúsculas y espacios)", () => {
    expect(() =>
      parseEventConfig({ options: ["Celeste", "  CELESTE "] })
    ).toThrow(/duplicadas/);
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

  it("acepta la config completa de sugerencias y recorta el título", () => {
    expect(
      parseEventConfig({
        type: "SUGGESTIONS",
        suggestionDurationSec: 120,
        suggestionTitle: "  ¿Qué serie vemos?  ",
        igdbValidation: false,
        suggestionMaxLength: 100,
      })
    ).toEqual({
      type: "SUGGESTIONS",
      suggestionDurationSec: 120,
      suggestionTitle: "¿Qué serie vemos?",
      igdbValidation: false,
      suggestionMaxLength: 100,
    });
  });

  it("rechaza un suggestionTitle inválido", () => {
    expect(() => parseEventConfig({ suggestionTitle: "a" })).toThrow(
      /suggestionTitle/
    );
    expect(() =>
      parseEventConfig({ suggestionTitle: "x".repeat(41) })
    ).toThrow(/suggestionTitle/);
    expect(() => parseEventConfig({ suggestionTitle: 42 })).toThrow(
      /suggestionTitle/
    );
  });

  it("rechaza un suggestionMaxLength fuera de rango", () => {
    expect(() => parseEventConfig({ suggestionMaxLength: 9 })).toThrow(
      /suggestionMaxLength/
    );
    expect(() => parseEventConfig({ suggestionMaxLength: 141 })).toThrow(
      /suggestionMaxLength/
    );
    expect(() => parseEventConfig({ suggestionMaxLength: "60" })).toThrow(
      /suggestionMaxLength/
    );
  });

  it("rechaza un igdbValidation que no es booleano", () => {
    expect(() => parseEventConfig({ igdbValidation: "si" })).toThrow(
      /igdbValidation/
    );
    expect(parseEventConfig({ igdbValidation: true })).toEqual({
      igdbValidation: true,
    });
  });

  it("acepta un raffleCommand válido y lo normaliza a minúsculas", () => {
    expect(parseEventConfig({ raffleCommand: "  SORTEO " })).toEqual({
      raffleCommand: "sorteo",
    });
  });

  it("rechaza un raffleCommand inválido", () => {
    expect(() => parseEventConfig({ raffleCommand: "a" })).toThrow(
      /raffleCommand/
    );
    expect(() => parseEventConfig({ raffleCommand: "x".repeat(21) })).toThrow(
      /raffleCommand/
    );
    expect(() => parseEventConfig({ raffleCommand: "dos palabras" })).toThrow(
      /raffleCommand/
    );
    expect(() => parseEventConfig({ raffleCommand: 42 })).toThrow(
      /raffleCommand/
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
