// First screen of /terrain: the routes assigned to the agent.
import { translate } from "../i18n/translate.ts";
import { apiRequest } from "../shared/api.ts";
import { StatusBadge } from "../shared/Badge.tsx";
import { useFeedback } from "../shared/Feedback.tsx";
import { formatDayLong } from "../shared/format.ts";
import { useApi } from "../shared/hooks.ts";
import { ROUTE_STATUS } from "../shared/labels.ts";
import { LanguageToggle } from "../shared/LanguageToggle.tsx";
import { type RouteBundle, writeBundle } from "../shared/offline.ts";
import { QueryView } from "../shared/QueryView.tsx";
import { useSession } from "../shared/session.ts";
import type { AgentRoute } from "./types.ts";

interface RouteListProps {
  onPick: (routeId: string) => void;
  onLogout: () => void;
}

export function RouteList({ onPick, onLogout }: RouteListProps) {
  const { session } = useSession();
  const ui = useFeedback();
  const routes = useApi<AgentRoute[]>("/api/agent/routes");

  // Starting a loaded route, then downloading its bundle, so the route works offline from here.
  const open = (route: AgentRoute) =>
    ui.run(async () => {
      if (route.status === "loaded") await apiRequest("POST", `/api/agent/routes/${route.id}/start`);
      writeBundle(await apiRequest<RouteBundle>("GET", `/api/agent/routes/${route.id}/bundle`));
      onPick(route.id);
    });

  return (
    <div className="stack">
      <div className="mobile-head">
        <div className="row spread">
          <h1>{translate("Mes tournées")}</h1>
          <span className="row">
            <LanguageToggle />
            <button className="sm ghost" onClick={onLogout}>
              {translate("Déconnexion")}
            </button>
          </span>
        </div>
        <div className="muted">
          {session.user!.name} · {session.user!.companyName}
        </div>
      </div>
      <QueryView q={routes}>
        {(list) =>
          list.length === 0 ? (
            <div className="empty">{translate("Aucune tournée ne vous est affectée.")}</div>
          ) : (
            <ul className="plain tap">
              {list.map((route) => (
                <li key={route.id}>
                  <div className="row spread">
                    <strong>{route.name}</strong>
                    <StatusBadge map={ROUTE_STATUS} value={route.status} />
                  </div>
                  <div className="small muted">
                    {formatDayLong(route.day)} · {route.vehicle || translate("véhicule non précisé")} · {route.stops} {translate("arrêt(s) ·")}{" "}
                    {route.orders_done}/{route.orders_total} {translate("commande(s)")}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    {route.status === "planned" ? (
                      <div className="notice">{translate("Le véhicule n'est pas encore chargé par la centrale.")}</div>
                    ) : (
                      <button className="big" onClick={() => open(route)}>
                        {route.status === "loaded"
                          ? translate("Démarrer la tournée")
                          : route.status === "in_progress"
                            ? translate("Reprendre la tournée")
                            : translate("Voir le bilan")}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )
        }
      </QueryView>
    </div>
  );
}
