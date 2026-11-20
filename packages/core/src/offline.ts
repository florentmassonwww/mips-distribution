// Field actions recorded on the phone and replayed at reconnection.
//
// Only deliveries and on-the-spot sales can be queued offline. A payment is never part of the
// queue: an electronic payment needs the provider's answer, so it is never confirmed offline.

export const OFFLINE_ACTION_TYPES = ["deliver", "sale"] as const;
export type OfflineActionType = (typeof OFFLINE_ACTION_TYPES)[number];

export const isOfflineActionType = (type: string): type is OfflineActionType => (OFFLINE_ACTION_TYPES as readonly string[]).includes(type);

/** An action reaching the server more than two minutes after it happened was done offline. */
export const OFFLINE_THRESHOLD_MS = 120_000;
/** Device times older than this are not trusted. */
export const MAX_FIELD_AGE_MS = 7 * 24 * 3600_000;

export const wasOffline = (at: Date, receivedAt: Date): boolean => receivedAt.getTime() - at.getTime() > OFFLINE_THRESHOLD_MS;

/** Time of an action on the field: the device time, unless unreadable, in the future or older than a week. */
export function fieldTime(deviceTime: string, now: Date): Date {
  const date = new Date(deviceTime);
  return Number.isNaN(date.getTime()) || date > now || now.getTime() - date.getTime() > MAX_FIELD_AGE_MS ? now : date;
}

/**
 * Replay of an action: the same action id gives back the first result and changes nothing
 * (idempotent). `previous` is the stored result of that id, if any.
 */
export type ReplayDecision<T> = { replay: true; result: T } | { replay: false };
export const replayDecision = <T>(previous: T | undefined): ReplayDecision<T> =>
  previous === undefined ? { replay: false } : { replay: true, result: previous };
