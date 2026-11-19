// Entrance gate (/club/barriere): passages of today or the history, and the registered readers
// (club management only).
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { describeGateDecision } from "../admin/clubLabels.ts";
import { useCurrentRole } from "../admin/roles.ts";
import { translate } from "../i18n/translate.ts";
import { Badge, StatusBadge } from "../shared/Badge.tsx";
import { DataTable } from "../shared/DataTable.tsx";
import { formatDate } from "../shared/format.ts";
import { useApi } from "../shared/hooks.ts";
import { ACCESS_DECISION } from "../shared/labels.ts";
import { Card, PageHeader } from "../shared/Layout.tsx";
import { QueryView } from "../shared/QueryView.tsx";
import { MemberCell } from "./parts.tsx";
import type { GateDevice, GateEvent } from "./types.ts";

export function Gate() {
  const navigate = useNavigate();
  const role = useCurrentRole();
  const [todayOnly, setTodayOnly] = useState(true);
  const events = useApi<GateEvent[]>(`/api/club/gate/events${todayOnly ? "?today=1" : ""}`, 8000);
  const isManagement = role === "company_admin";
  const devices = useApi<GateDevice[]>(isManagement ? "/api/club/gate/devices" : null);
  return (
    <>
      <PageHeader
        title={translate("Barrière d'accès")}
        sub={translate(
          "Chaque passage est décidé sur l'état du compte au moment même : entrée autorisée, signalée à l'accueil, ou refusée.",
        )}
      >
        <div className="tabs" style={{ margin: 0 }}>
          <button aria-selected={todayOnly} onClick={() => setTodayOnly(true)}>
            {translate("Aujourd'hui")}
          </button>
          <button aria-selected={!todayOnly} onClick={() => setTodayOnly(false)}>
            {translate("Historique")}
          </button>
        </div>
        <Link to="/club/accueil" className="btn secondary">
          {translate("Écran de l'accueil")}
        </Link>
      </PageHeader>
      <div className="stack">
        <Card title={translate("Passages")} flush>
          <QueryView q={events}>
            {(rows) => (
              <DataTable
                rows={rows}
                rowKey={(event) => event.id}
                empty={translate("Aucun passage.")}
                // Unknown badges have no member to open.
                onRow={(event) => event.member_id && navigate(`/club/membres/${event.member_id}`)}
                cols={[
                  [translate("Heure"), (event) => formatDate(event.at, true)],
                  [translate("Décision"), (event) => <StatusBadge map={ACCESS_DECISION} value={event.decision} />],
                  [
                    translate("Membre"),
                    (event) =>
                      event.member ? (
                        <MemberCell name={event.member} number={event.member_number} />
                      ) : (
                        <span className="muted">
                          {translate("inconnu")} ({event.credential_hint})
                        </span>
                      ),
                  ],
                  [translate("Motif"), (event) => describeGateDecision(event)],
                  [translate("Contrôle"), (event) => (event.source === "reader" ? translate(event.device ?? "lecteur") : translate("accueil"))],
                ]}
              />
            )}
          </QueryView>
        </Card>
        {isManagement && (
          <QueryView q={devices}>
            {(rows) => (
              <Card title={translate("Lecteurs enregistrés")}>
                <ul className="plain">
                  {rows.map((device) => (
                    <li key={device.id} className="row spread">
                      <span>
                        <strong>{translate(device.name)}</strong> <span className="code nb">{device.id}</span>
                      </span>
                      <Badge kind={device.active ? "ok" : ""}>{device.active ? translate("Actif") : translate("Désactivé")}</Badge>
                    </li>
                  ))}
                </ul>
                <p className="small muted" style={{ marginTop: 10 }}>
                  {translate(
                    "Le lecteur interroge le club par une demande signée (secret propre au lecteur, horodatage). Il ne reçoit ni nom ni montant : seulement « ouvrir » ou non et un message court. L'interface réelle dépend du fournisseur de la barrière (à vérifier).",
                  )}
                </p>
              </Card>
            )}
          </QueryView>
        )}
      </div>
    </>
  );
}
