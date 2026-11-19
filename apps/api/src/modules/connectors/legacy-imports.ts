// Typed bindings to functions of modules not rewritten yet (removed once they are).
// Bound at call time: the legacy modules form import cycles with this one.
// @ts-expect-error -- legacy module without type declarations
import * as distribution from "../../legacy/distribution.mjs";

/** Signature header of a notification: `t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<body>">`. */
export function signPayload(secret: string, rawBody: string, now: Date): string {
  return distribution.Bd(secret, rawBody, now);
}

/** Throws a 401 when the signature is missing, malformed, stale (beyond `toleranceSeconds`) or wrong. */
export function verifySignature(
  secret: string,
  rawBody: string,
  signature: string | undefined,
  now: Date,
  toleranceSeconds: number,
): void {
  distribution.Vd(secret, rawBody, signature, now, toleranceSeconds);
}
