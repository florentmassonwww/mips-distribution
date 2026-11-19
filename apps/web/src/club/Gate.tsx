// Entrance gate (/club/barriere): passages of today or the history, and the registered readers
// (club management only).
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Badge,
  Card,
  formatDate,
  GATE_DECISION,
  gateReason,
  Loaded,
  PageHead,
  StatusBadge,
  Table,
  t,
  useApi,
  useRole,
} from "./legacy.ts";
import { MemberCell } from "./parts.tsx";
import type { GateDevice, GateEvent } from "./types.ts";

export function Gate() {
  const navigate = useNavigate();
  const role = useRole();
  const [todayOnly, setTodayOnly] = useState(true);
  const events = useApi<GateEvent[]>(`/api/club/gate/events${todayOnly ? "?today=1" : ""}`, 8000);
  const isManagement = role === "company_admin";
  const devices = useApi<GateDevice[]>(isManagement ? "/api/club/gate/devices" : null);
  return (
    <>
      <PageHead
        title={t("Barrière d'accès")}
        sub={t(
          "Chaque passage est décidé sur l'état du compte au moment même : entrée autorisée, signalée à l'accueil, ou refusée.",
        )}
      >
        <div className="tabs" style={{ margin: 0 }}>
          <button aria-selected={todayOnly} onClick={() => setTodayOnly(true)}>
            {t("Aujourd'hui")}
          </button>
          <button aria-selected={!todayOnly} onClick={() => setTodayOnly(false)}>
            {t("Historique")}
          </button>
        </div>
        <Link to="/club/accueil" className="btn secondary">
          {t("Écran de l'accueil")}
        </Link>
      </PageHead>
      <div className="stack">
        <Card title={t("Passages")} flush>
          <Loaded q={events}>
            {(rows) => (
              <Table
                rows={rows}
                rowKey={(event) => event.id}
                empty={t("Aucun passage.")}
                // Unknown badges have no member to open.
                onRow={(event) => event.member_id && navigate(`/club/membres/${event.member_id}`)}
                cols={[
                  [t("Heure"), (event) => formatDate(event.at, true)],
                  [t("Décision"), (event) => <StatusBadge map={GATE_DECISION} value={event.decision} />],
                  [
                    t("Membre"),
                    (event) =>
                      event.member ? (
                        <MemberCell name={event.member} number={event.member_number} />
                      ) : (
                        <span className="muted">
                          {t("inconnu")} ({event.credential_hint})
                        </span>
                      ),
                  ],
                  [t("Motif"), (event) => gateReason(event)],
                  [t("Contrôle"), (event) => (event.source === "reader" ? t(event.device ?? "lecteur") : t("accueil"))],
                ]}
              />
            )}
          </Loaded>
        </Card>
        {isManagement && (
          <Loaded q={devices}>
            {(rows) => (
              <Card title={t("Lecteurs enregistrés")}>
                <ul className="plain">
                  {rows.map((device) => (
                    <li key={device.id} className="row spread">
                      <span>
                        <strong>{t(device.name)}</strong> <span className="code nb">{device.id}</span>
                      </span>
                      <Badge kind={device.active ? "ok" : ""}>{device.active ? t("Actif") : t("Désactivé")}</Badge>
                    </li>
                  ))}
                </ul>
                <p className="small muted" style={{ marginTop: 10 }}>
                  {t(
                    "Le lecteur interroge le club par une demande signée (secret propre au lecteur, horodatage). Il ne reçoit ni nom ni montant : seulement « ouvrir » ou non et un message court. L'interface réelle dépend du fournisseur de la barrière (à vérifier).",
                  )}
                </p>
              </Card>
            )}
          </Loaded>
        )}
      </div>
    </>
  );
}
