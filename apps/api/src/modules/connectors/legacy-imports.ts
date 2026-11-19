// Typed bindings to functions of modules not rewritten yet (removed once they are).
import * as m_distribution_webhook_signature from "../distribution/webhook-signature.ts";
// Bound at call time: the legacy modules form import cycles with this one.

/** Signature header of a notification: `t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<body>">`. */
export function signPayload(secret: string, rawBody: string, now: Date): string {
  return m_distribution_webhook_signature.signWebhook(secret, rawBody, now);
}

/** Throws a 401 when the signature is missing, malformed, stale (beyond `toleranceSeconds`) or wrong. */
export function verifySignature(
  secret: string,
  rawBody: string,
  signature: string | undefined,
  now: Date,
  toleranceSeconds: number,
): void {
  m_distribution_webhook_signature.verifyWebhook(secret, rawBody, signature, now, toleranceSeconds);
}
