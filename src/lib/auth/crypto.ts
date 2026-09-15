// Cifrado simétrico (AES-256-GCM) para los tokens de Twitch en reposo.
// La clave se deriva de SESSION_SECRET; los valores cifrados tienen el
// formato "iv.tag.ciphertext" en base64.

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { config } from "@/lib/config";

const KEY_SALT = "twitch-events-token-store";

function key(): Buffer {
  return scryptSync(config.sessionSecret, KEY_SALT, 32);
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((b) => b.toString("base64")).join(".");
}

export function decryptSecret(encrypted: string): string {
  const [iv, tag, ciphertext] = encrypted.split(".").map((p) => Buffer.from(p, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
