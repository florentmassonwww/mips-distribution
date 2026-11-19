// Signature of provider notifications: `t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<body>">`.
import { createHmac, timingSafeEqual } from "node:crypto";
import { ApiError } from "../../core/errors.ts";

const hmacHex = (secret: string, timestamp: number, body: string): string =>
  createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");

export function signWebhook(secret: string, body: string, now: Date): string {
  const timestamp = Math.floor(now.getTime() / 1000);
  return `t=${timestamp},v1=${hmacHex(secret, timestamp, body)}`;
}

/** Rejects a missing, malformed, stale (older or newer than `toleranceSeconds`) or forged signature. */
export function verifyWebhook(secret: string, body: string, header: string | null | undefined, now: Date, toleranceSeconds: number): void {
  const match = /^t=(\d+),v1=([0-9a-f]{64})$/.exec(header ?? "");
  if (!match) throw new ApiError(401, "bad_signature", "Signature absente ou mal formée.");
  const timestamp = Number(match[1]);
  if (Math.abs(now.getTime() / 1000 - timestamp) > toleranceSeconds) throw new ApiError(401, "stale_signature", "Notification trop ancienne.");
  const expected = Buffer.from(hmacHex(secret, timestamp, body));
  const received = Buffer.from(match[2]!);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    throw new ApiError(401, "bad_signature", "Signature invalide.");
  }
}
