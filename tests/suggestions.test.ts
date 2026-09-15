// Reglas de normalización y validación de sugerencias (funciones puras).

import { describe, expect, it } from "vitest";
import {
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
