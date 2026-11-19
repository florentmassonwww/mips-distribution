// The driver's mobile screen (/terrain): the list of the agent's routes, or the route open.
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, useSession } from "./legacy-bridge.js";
import { readCurrentRoute, writeCurrentRoute } from "./bundle-cache.ts";
import { RouteList } from "./RouteList.tsx";
import { RouteScreen } from "./RouteScreen.tsx";

export function FieldApp() {
  const { session, refresh } = useSession();
  const navigate = useNavigate();
  const user = session.user;
  // The open route is remembered on the phone so a reload (or a restart offline) reopens it.
  const [routeId, setRouteId] = useState<string | null>(() => readCurrentRoute(user.id));
  const openRoute = useCallback(
    (id: string | null) => {
      writeCurrentRoute(user.id, id);
      setRouteId(id);
    },
    [user.id],
  );
  const leaveRoute = useCallback(() => openRoute(null), [openRoute]);

  const logout = async () => {
    await api("POST", "/api/logout").catch(() => null);
    await refresh();
    navigate("/");
  };

  return (
    <div className="mobile">
      {routeId ? <RouteScreen key={routeId} routeId={routeId} onLeave={leaveRoute} /> : <RouteList onPick={openRoute} onLogout={logout} />}
    </div>
  );
}
