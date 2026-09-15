// Parseo y validación del body de configuración de eventos
// (POST /api/events y PATCH /api/events/[id]).

import { describe, expect, it } from "vitest";
import { parseEventConfig } from "@/lib/events/config";
import { BusinessError } from "@/lib/errors";

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
});
