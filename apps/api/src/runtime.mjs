// Process-wide sources of randomness. Production uses crypto.getRandomValues; the characterization
// tests replace the generator with a seeded one so that generated identifiers are reproducible.
import { webcrypto } from "node:crypto";

let fill = (buf) => webcrypto.getRandomValues(buf);

export const random = {
  /** n random bytes, as a Buffer. */
  bytes(n) {
    return fill(Buffer.alloc(n));
  },
  /** Replaces the byte generator (tests only). Pass null to restore crypto.getRandomValues. */
  setGenerator(fn) {
    fill = fn ?? ((buf) => webcrypto.getRandomValues(buf));
  },
};
