import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "./api.ts";
import type { ApiError } from "./errors.ts";

interface ApiQueryState<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  /** Time (ms) of the last successful load, 0 before the first one. */
  at: number;
}

export interface ApiQuery<T> extends ApiQueryState<T> {
  /** Reloads in the background, keeping the data shown meanwhile. */
  reload: () => Promise<void>;
}

/**
 * Loads `url` with GET (nothing when url is null or empty) and, with `pollMs`, reloads it in the
 * background at that interval while the tab is visible. A background reload that fails keeps the
 * previous data; only the answer to the latest request is kept.
 */
export function useApi<T = unknown>(url: string | null | undefined, pollMs?: number): ApiQuery<T> {
  const [state, setState] = useState<ApiQueryState<T>>({ data: null, error: null, loading: !!url, at: 0 });
  const lastRequest = useRef(0);

  const load = useCallback(
    async (background = false) => {
      if (!url) return;
      const request = ++lastRequest.current;
      if (!background) setState((previous) => ({ ...previous, loading: true, error: null }));
      try {
        const data = await apiRequest<T>("GET", url);
        if (request === lastRequest.current) setState({ data, error: null, loading: false, at: Date.now() });
      } catch (error) {
        if (request === lastRequest.current)
          setState((previous) =>
            background && previous.data
              ? { ...previous, loading: false }
              : { data: null, error: error as ApiError, loading: false, at: previous.at },
          );
      }
    },
    [url],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!pollMs) return;
    const timer = setInterval(() => {
      if (!document.hidden) void load(true);
    }, pollMs);
    return () => clearInterval(timer);
  }, [pollMs, load]);

  return { ...state, reload: () => load(true) };
}
