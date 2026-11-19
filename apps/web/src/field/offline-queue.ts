// Offline actions (deliveries and on-the-spot sales) recorded on the phone and sent to
// POST /api/agent/sync when the network is back. localStorage key (unchanged from v0.1.0):
// md_queue_<user id>, a JSON array of QueuedAction. Each action keeps the id generated on the
// device: the server applies an id only once, so sending an action again is harmless.
import { localizeErrorMessage } from "../shared/errors.ts";
import type { QueuedAction } from "../shared/offline.ts";
import type { SyncResult } from "./types.ts";

export const queuedActions = (queue: QueuedAction[]): QueuedAction[] => queue.filter((action) => action.state === "queued");

export const rejectedActions = (queue: QueuedAction[]): QueuedAction[] => queue.filter((action) => action.state === "rejected");

/** The body sent to the server: only id, type and payload of each action. */
export const syncRequest = (queued: QueuedAction[]) => ({
  actions: queued.map(({ id, type, payload }) => ({ id, type, payload })),
});

/**
 * Applies the server's answers to the queue: an applied (or duplicate) action leaves the queue; a
 * rejected one stays, marked rejected with the translated reason, until the agent removes it.
 */
export function applySyncResults(queue: QueuedAction[], results: SyncResult[]): QueuedAction[] {
  let next = queue;
  for (const result of results) {
    next =
      result.status === "rejected"
        ? next.map((action) =>
            action.id === result.id
              ? { ...action, state: "rejected", message: result.message ? localizeErrorMessage(result.code ?? "", result.message) : undefined }
              : action,
          )
        : next.filter((action) => action.id !== result.id);
  }
  return next;
}
