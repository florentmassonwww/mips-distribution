import type { ReactNode } from "react";
import { translate } from "../i18n/translate.ts";
import type { ApiQuery } from "./hooks.ts";

interface QueryViewProps<T> {
  q: ApiQuery<T>;
  /** Renders the loaded data. */
  children: (data: T) => ReactNode;
}

/** Shows the error (with a retry button), the loading state, or the data of a useApi query. */
export function QueryView<T>({ q: query, children }: QueryViewProps<T>) {
  if (query.error)
    return (
      <div className="notice err" role="alert">
        {query.error.message}{" "}
        <button className="sm secondary" onClick={query.reload}>
          {translate("Réessayer")}
        </button>
      </div>
    );
  if (query.data) return <>{children(query.data)}</>;
  return (
    <div className="loading" role="status">
      {translate("Chargement…")}
    </div>
  );
}
