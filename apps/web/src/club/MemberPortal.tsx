// Public member page (/membre/:token, no session): amount due, online payment, what remains to pay.
import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  api,
  Badge,
  formatDate,
  formatMoney,
  LanguageToggle,
  Loaded,
  newIdempotencyKey,
  t,
  useApi,
  useUi,
} from "./legacy.ts";
import type { PortalData } from "./types.ts";

export function MemberPortal() {
  const { token } = useParams();
  const ui = useUi();
  // Polled: the payment's outcome arrives from the provider while the member waits.
  const portal = useApi<PortalData>(`/api/public/member/${token}`, 3000);
  // One key for the page's lifetime: a repeated tap cannot start a second payment.
  const [idempotencyKey] = useState(newIdempotencyKey);

  const pay = () =>
    ui.run(async () => {
      await api("POST", `/api/public/member/${token}/pay`, { idempotencyKey });
      await portal.reload();
    });

  // Demo only: stands in for the provider's hosted payment page.
  const simulate = (outcome: "success" | "failure") =>
    ui.run(async () => {
      await api("POST", `/api/public/member/${token}/pay/demo`, { outcome });
      await portal.reload();
    });

  return (
    <div className="mobile stack">
      <Loaded q={portal}>
        {(data) => {
          const lastStatus = data.lastPayment?.status;
          return (
            <>
              <div className="mobile-head">
                <div className="row spread">
                  <h1>{data.club}</h1>
                  <LanguageToggle />
                </div>
                <div className="muted">{t("Bonjour {0} · membre {1}", data.firstName, data.number)}</div>
              </div>
              <div className="card">
                <div className="body stack">
                  {data.dueMinor > 0 ? (
                    <div className="duebox">
                      <div className="small">{t("Montant dû sur votre compte")}</div>
                      <div className="amount">{formatMoney(data.dueMinor)}</div>
                      {data.overdueMinor > 0 && (
                        <div className="small">
                          {t("dont {0} en retard de {1} jour(s)", formatMoney(data.overdueMinor), data.overdueDays)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="success">
                      <div className="big">{t("Compte à jour")}</div>
                      <div>{data.creditMinor ? t("Avoir : {0}", formatMoney(data.creditMinor)) : t("Merci, rien n'est dû.")}</div>
                    </div>
                  )}
                  {data.lastPayment?.status === "pending" && (
                    <>
                      <div className="notice">{t("Paiement de {0} en cours.", formatMoney(data.lastPayment.amountMinor))}</div>
                      {data.demoMode && (
                        <>
                          <div className="notice warn">
                            {t(
                              "Page de démonstration. En production, le membre est dirigé vers la page de paiement hébergée par le prestataire : aucune donnée de carte n'est saisie ni conservée par cette application.",
                            )}
                          </div>
                          <button className="big" onClick={() => simulate("success")}>
                            {t("Simuler un paiement réussi")}
                          </button>
                          <button className="big secondary" onClick={() => simulate("failure")}>
                            {t("Simuler un paiement refusé")}
                          </button>
                        </>
                      )}
                    </>
                  )}
                  {lastStatus === "to_verify" && (
                    <div className="notice warn">{t("Votre dernier paiement est en cours de vérification par le club.")}</div>
                  )}
                  {lastStatus === "failed" && data.dueMinor > 0 && (
                    <div className="notice err">{t("Votre dernier paiement n'a pas abouti. Vous pouvez réessayer.")}</div>
                  )}
                  {/* No new payment while one is in progress or being checked. */}
                  {data.dueMinor > 0 && lastStatus !== "pending" && lastStatus !== "to_verify" && (
                    <button className="big" onClick={pay}>
                      {t("Payer {0} en ligne", formatMoney(data.dueMinor))}
                    </button>
                  )}
                  {data.dueMinor > 0 && (
                    <div className="small muted">
                      {t("Par virement, indiquez toujours votre référence :")} <span className="code nb">{data.reference}</span>
                    </div>
                  )}
                </div>
              </div>
              {data.open.length > 0 && (
                <div className="card">
                  <header>
                    <h2>{t("Ce qui reste à régler")}</h2>
                  </header>
                  <ul className="plain" style={{ padding: "0 16px" }}>
                    {data.open.map((charge, index) => (
                      <li key={index} className="row spread">
                        <span>
                          {t(charge.label)}
                          <div className="small muted">
                            {t("à régler avant le")} {formatDate(charge.dueDate)}{" "}
                            {charge.overdue && <Badge kind="err">{t("en retard")}</Badge>}
                          </div>
                        </span>
                        <strong>{formatMoney(charge.remainingMinor)}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          );
        }}
      </Loaded>
    </div>
  );
}
