// Resolución de nombres de juego contra el catálogo IGDB: búsqueda difusa,
// elección del mejor candidato por similitud textual y caché en memoria
// (mismo patrón que rate-limit.ts: un solo proceso, mapa acotado con TTL).
//
// La similitud se mide contra el título oficial Y los nombres alternativos
// de cada candidato: así se aceptan tanto typos ("Elden Rign" → Elden Ring)
// como abreviaturas ("GTA V" → Grand Theft Auto V, que IGDB trae como nombre
// alternativo), mientras que la basura ("asdfgh") no alcanza el umbral.

import { queryGames } from "@/lib/igdb/client";

const MATCH_THRESHOLD = 0.6;
const SEARCH_LIMIT = 5;
const HIT_TTL_MS = 24 * 60 * 60 * 1000;
const MISS_TTL_MS = 60 * 60 * 1000;
const MAX_ENTRIES = 5_000;

export interface IgdbGameMatch {
  igdbGameId: number;
  officialName: string;
}

export interface IgdbGameCandidate {
  id: number;
  name: string;
  alternative_names?: Array<{ id: number; name: string }>;
}

/**
 * Normalización fuerte para comparar: minúsculas, sin diacríticos, sin
 * puntuación y espacios colapsados. Es deliberadamente más agresiva que
 * normalizeGameName (dedup en DB) porque aquí solo se usa para medir
 * similitud, nunca como clave de persistencia.
 */
export function normalizeForMatch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // marcas diacríticas combinantes (U+0300–U+036F)
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function bigrams(s: string): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
  return set;
}

/** Coeficiente de Dice sobre bigramas: 1 = idénticos, 0 = nada en común. */
export function similarity(a: string, b: string): number {
  if (a === b) return a.length > 0 ? 1 : 0;
  if (a.length < 2 || b.length < 2) return 0;
  const bigramsA = bigrams(a);
  const bigramsB = bigrams(b);
  let overlap = 0;
  for (const g of bigramsA) if (bigramsB.has(g)) overlap++;
  return (2 * overlap) / (bigramsA.size + bigramsB.size);
}

/**
 * Búsquedas de franquicia por palabra suelta ("zelda", "metroid"): los
 * bigramas penalizan títulos largos aunque sean el juego obvio. Si TODAS las
 * palabras "significativas" del texto (≥ 4 letras, para que "the", "war" o
 * "v" no casen con medio catálogo) aparecen como palabras completas en el
 * nombre del candidato, se considera match justo en el umbral. Como IGDB
 * devuelve los candidatos por relevancia y el desempate conserva el primero,
 * gana el juego más popular de la franquicia.
 */
function wordContainmentScore(needle: string, haystack: string): number {
  const haystackWords = new Set(haystack.split(" "));
  const needleWords = needle.split(" ").filter((word) => word.length >= 4);
  if (needleWords.length === 0) return 0;
  return needleWords.every((word) => haystackWords.has(word))
    ? MATCH_THRESHOLD
    : 0;
}

/**
 * Elige el candidato más parecido al texto del usuario comparando contra el
 * título y los nombres alternativos. Devuelve null si el mejor no supera el
 * umbral (texto basura o juego inexistente en el catálogo).
 */
export function pickBestMatch(
  input: string,
  candidates: IgdbGameCandidate[]
): IgdbGameMatch | null {
  const needle = normalizeForMatch(input);
  if (!needle) return null;
  let best: IgdbGameMatch | null = null;
  let bestScore = 0;
  for (const candidate of candidates) {
    const names = [
      candidate.name,
      ...(candidate.alternative_names?.map((alt) => alt.name) ?? []),
    ];
    let score = 0;
    for (const name of names) {
      const normalizedName = normalizeForMatch(name);
      score = Math.max(
        score,
        similarity(needle, normalizedName),
        wordContainmentScore(needle, normalizedName)
      );
    }
    if (score > bestScore) {
      bestScore = score;
      best = { igdbGameId: candidate.id, officialName: candidate.name };
    }
  }
  return bestScore >= MATCH_THRESHOLD ? best : null;
}

type CacheEntry =
  | { kind: "hit"; match: IgdbGameMatch; expiresAt: number }
  | { kind: "miss"; expiresAt: number };

// Clave: texto del usuario normalizado. Los errores de IGDB NO se cachean:
// en ese caso el caller aplica fail-open y el siguiente mensaje reintenta.
const cache = new Map<string, CacheEntry>();

/** Solo para tests: vacía la caché entre casos. */
export function clearGameResolutionCache(): void {
  cache.clear();
}

/**
 * Resuelve el texto del usuario a un juego del catálogo IGDB. Devuelve null
 * si no hay ningún juego parecido. Lanza si IGDB falla (timeout, red, 5xx):
 * el caller decide si acepta el texto original (fail-open).
 */
export async function resolveGameName(input: string): Promise<IgdbGameMatch | null> {
  const key = normalizeForMatch(input);
  if (!key) return null;

  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.kind === "hit" ? cached.match : null;
  }

  // Apicalypse delimita la búsqueda con comillas dobles: se eliminan del input.
  const safeQuery = input.replace(/["\\]/g, " ").replace(/\s+/g, " ").trim();
  const candidates = await queryGames<IgdbGameCandidate>(
    `search "${safeQuery}"; fields name, alternative_names.name; limit ${SEARCH_LIMIT};`
  );
  const match = pickBestMatch(input, candidates);

  if (cache.size >= MAX_ENTRIES) {
    const now = Date.now();
    for (const [k, entry] of cache) {
      if (entry.expiresAt <= now) cache.delete(k);
    }
  }
  const expiresAt = Date.now() + (match ? HIT_TTL_MS : MISS_TTL_MS);
  cache.set(key, match ? { kind: "hit", match, expiresAt } : { kind: "miss", expiresAt });
  return match;
}
