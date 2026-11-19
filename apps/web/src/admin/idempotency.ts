/**
 * Idempotency key for a write the user may submit twice (double click, retry after a network
 * error): the server applies a given key only once.
 */
export const newIdempotencyKey = (): string =>
  `${Date.now().toString(36)}-${crypto.getRandomValues(new Uint32Array(4)).join("")}`;
