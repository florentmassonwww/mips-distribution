// Source of random bytes for identifiers, tokens and secrets. Production uses
// crypto.getRandomValues; the characterization tests install a seeded generator so that every
// generated identifier is reproducible.
import { webcrypto } from "node:crypto";

type Fill = (buf: Buffer) => Buffer;

const secureFill: Fill = (buf) => webcrypto.getRandomValues(buf);
let fill: Fill = secureFill;

/** `n` random bytes. */
export function randomBytes(n: number): Buffer {
  return fill(Buffer.alloc(n));
}

/** Replaces the byte generator (tests only). `null` restores crypto.getRandomValues. */
export function setRandomGenerator(generator: Fill | null): void {
  fill = generator ?? secureFill;
}
