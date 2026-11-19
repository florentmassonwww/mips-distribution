// First screen of /terrain: the routes assigned to the agent.
import { api, formatDay, LanguageToggle, QueryView, ROUTE_STATUS, StatusBadge, t, useApi, useSession, useUi } from "./legacy-bridge.js";
import { saveBundle } from "./bundle-cache.ts";
import type { AgentRoute, RouteBundle } from "./types.ts";

interface RouteListProps {
  onPick: (routeId: string) => void;
  onLogout: () => void;
}

export function RouteList({ onPick, onLogout }: RouteListProps) {
  const { session } = useSession();
  const ui = useUi();
  const routes = useApi<AgentRoute[]>("/api/agent/routes");

  // Starting a loaded route, then downloading its bundle, so the route works offline from here.
  const open = (route: AgentRoute) =>
    ui.run(async () => {
      if (route.status === "loaded") await api("POST", `/api/agent/routes/${route.id}/start`);
      saveBundle(await api<RouteBundle>("GET", `/api/agent/routes/${route.id}/bundle`));
      onPick(route.id);
    });

  return (
    <div className="stack">
      <div className="mobile-head">
        <div className="row spread">
          <h1>{t("Mes tournées")}</h1>
          <span className="row">
            <LanguageToggle />
            <button className="sm ghost" onClick={onLogout}>
              {t("Déconnexion")}
            </button>
          </span>
        </div>
        <div className="muted">
          {session.user.name} · {session.user.companyName}
        </div>
      </div>
      <QueryView q={routes}>
        {(list) =>
          list.length === 0 ? (
            <div className="empty">{t("Aucune tournée ne vous est affectée.")}</div>
          ) : (
            <ul className="plain tap">
              {list.map((route) => (
                <li key={route.id}>
                  <div className="row spread">
                    <strong>{route.name}</strong>
                    <StatusBadge map={ROUTE_STATUS} value={route.status} />
                  </div>
                  <div className="small muted">
                    {formatDay(route.day)} · {route.vehicle || t("véhicule non précisé")} · {route.stops} {t("arrêt(s) ·")}{" "}
                    {route.orders_done}/{route.orders_total} {t("commande(s)")}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    {route.status === "planned" ? (
                      <div className="notice">{t("Le véhicule n'est pas encore chargé par la centrale.")}</div>
                    ) : (
                      <button className="big" onClick={() => open(route)}>
                        {route.status === "loaded"
                          ? t("Démarrer la tournée")
                          : route.status === "in_progress"
                            ? t("Reprendre la tournée")
                            : t("Voir le bilan")}
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
