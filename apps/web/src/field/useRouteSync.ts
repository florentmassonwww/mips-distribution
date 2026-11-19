// Keeps the open route in step with the server: sends the offline queue, then downloads a fresh
// bundle. Runs at once and every 20 s while online (none while offline, real or simulated).
import { useCallback, useEffect, useRef, useState } from "react";
import { translate } from "../i18n/translate.ts";
import { apiRequest } from "../shared/api.ts";
import { useFeedback } from "../shared/Feedback.tsx";
import type { NetworkState } from "../shared/offline.ts";
import { applySyncResults, queuedActions, syncRequest } from "./offline-queue.ts";
import {
  type QueuedAction,
  readBundle,
  readQueue,
  type RouteBundle,
  writeBundle,
  writeQueue,
} from "../shared/offline.ts";
import type { SyncResult } from "./types.ts";

const SYNC_INTERVAL_MS = 20000;

const errorStatus = (error: unknown): unknown =>
  typeof error === "object" && error !== null && "status" in error ? error.status : undefined;

export interface RouteSync {
  /** Last bundle received (from the phone's cache until the first sync). */
  bundle: RouteBundle | null;
  queue: QueuedAction[];
  /** Replaces the stored queue. */
  setQueue: (queue: QueuedAction[]) => void;
  syncing: boolean;
  /** Date.now() of the last successful sync, null before. */
  lastSyncAt: number | null;
  /** Sends the queue then refreshes the bundle; resolves to the server's answer per action id. */
  sync: () => Promise<Map<string, SyncResult>>;
  /** Queues an action and, online, syncs at once; resolves to its result (null when not sent). */
  submit: (action: QueuedAction) => Promise<SyncResult | null>;
}

export function useRouteSync(routeId: string, userId: string, network: NetworkState, onLeave: () => void): RouteSync {
  const ui = useFeedback();
  const [bundle, setBundle] = useState<RouteBundle | null>(() => readBundle(routeId));
  const [queue, setQueueState] = useState<QueuedAction[]>(() => readQueue(userId));
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  // A sync already running makes another call a no-op (the 20 s timer can fire during a manual one).
  const running = useRef(false);

  const setQueue = useCallback(
    (next: QueuedAction[]) => {
      writeQueue(userId, next);
      setQueueState(next);
    },
    [userId],
  );

  const sync = useCallback(async () => {
    const results = new Map<string, SyncResult>();
    if (running.current) return results;
    running.current = true;
    setSyncing(true);
    try {
      // Read from storage, not state: another tab or a just-queued action may have changed it.
      const queued = queuedActions(readQueue(userId));
      if (queued.length) {
        const answer = await apiRequest<{ results: SyncResult[] }>("POST", "/api/agent/sync", syncRequest(queued));
        for (const result of answer.results) results.set(result.id, result);
        setQueue(applySyncResults(readQueue(userId), answer.results));
      }
      const fresh = await apiRequest<RouteBundle>("GET", `/api/agent/routes/${routeId}/bundle`);
      writeBundle(fresh);
      setBundle(fresh);
      setLastSyncAt(Date.now());
    } finally {
      running.current = false;
      setSyncing(false);
    }
    return results;
  }, [userId, routeId, setQueue]);

  useEffect(() => {
    if (!network.online) return;
    const tick = () => {
      sync().catch((error: unknown) => {
        // The route is gone or reassigned to someone else: back to the route list.
        const status = errorStatus(error);
        if (status === 404 || status === 403) onLeave();
      });
    };
    tick();
    const timer = setInterval(tick, SYNC_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [network.online, sync, onLeave]);

  const submit = async (action: QueuedAction): Promise<SyncResult | null> => {
    // Always stored first: nothing is lost if the network drops during the request.
    setQueue([...readQueue(userId), action]);
    if (!network.online) {
      ui.toast(translate("Enregistré sur le téléphone. Synchronisation au retour du réseau."));
      return null;
    }
    try {
      return (await sync()).get(action.id) ?? null;
    } catch {
      ui.toast(translate("Réseau instable : action conservée, elle sera synchronisée automatiquement."));
      return null;
    }
  };

  return { bundle, queue, setQueue, syncing, lastSyncAt, sync, submit };
}
