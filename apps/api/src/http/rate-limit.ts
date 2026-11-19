// In-memory sliding-window rate limiting, per application instance.
import { ApiError } from "../core/errors.ts";

/** Throws 429 when `key` already made `limit` attempts within the last `windowMs`; else records one. */
export type RateLimiter = (key: string, limit: number, windowMs: number) => void;

export const ONE_MINUTE_MS = 60_000;

export function createRateLimiter(now: () => Date): RateLimiter {
  const attempts = new Map<string, number[]>();
  return (key, limit, windowMs) => {
    const at = now().getTime();
    const recent = (attempts.get(key) ?? []).filter((time) => time > at - windowMs);
    // A refused attempt is not recorded: the window only counts accepted ones.
    if (recent.length >= limit) {
      throw new ApiError(429, "too_many_requests", "Trop de tentatives. Réessayez dans un instant.");
    }
    recent.push(at);
    attempts.set(key, recent);
  };
}
