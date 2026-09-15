// Rate limit básico en memoria (ventana fija por clave). Suficiente para un
// despliegue de un solo proceso, que es el modelo de este MVP.

const WINDOW_MS = 60_000;
const MAX_MUTATIONS_PER_WINDOW = 30;
// Limpieza oportunista para que el mapa no crezca sin límite.
const MAX_KEYS = 10_000;

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** true si la llamada entra en el límite; false si debe responderse 429. */
export function checkRateLimit(
  key: string,
  limit = MAX_MUTATIONS_PER_WINDOW,
  windowMs = WINDOW_MS
): boolean {
  const now = Date.now();
  if (buckets.size >= MAX_KEYS) {
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k);
    }
  }
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}
