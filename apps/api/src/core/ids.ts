// Identifiers and opaque tokens. The number and order of random draws is part of the observable
// behaviour (the characterization suite compares generated identifiers): keep them unchanged.
import { randomBytes } from "./random.ts";

/** Random UUID v4. */
export function uuidV4(): string {
  const b = randomBytes(16);
  b[6] = (b[6]! & 15) | 64;
  b[8] = (b[8]! & 63) | 128;
  const h = b.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Prefixed identifier, e.g. `ord_0f3a…` (prefix + 20 hexadecimal characters). */
export function newId(prefix: string): string {
  return `${prefix}_${uuidV4().replace(/-/g, "").slice(0, 20)}`;
}

/** Unguessable token for public links (16 random bytes, base64url). */
export function newToken(): string {
  return randomBytes(16).toString("base64url");
}
