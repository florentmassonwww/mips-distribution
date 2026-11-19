// "Summary" tab: money and orders of the route, collections by method, vehicle stock, and the
// route close (once everything is synced and every order delivered or declared not delivered).
import { api, formatDate, formatMoney, PAYMENT_METHOD_LABELS, QueryView, t, useApi, useUi } from "./legacy-bridge.js";
import type { RouteSummaryData } from "./types.ts";

interface RouteSummaryProps {
  routeId: string;
  online: boolean;
  /** Actions still queued on the phone. */
  pending: number;
  closed: boolean;
  onClosed: () => void;
}

export function RouteSummary({ routeId, online, pending, closed, onClosed }: RouteSummaryProps) {
  const ui = useUi();
  const summary = useApi<RouteSummaryData>(online ? `/api/agent/routes/${routeId}/summary` : null);

  if (!online) return <div className="notice warn">{t("Le bilan se calcule sur le serveur : il sera disponible au retour du réseau.")}</div>;

  const close = async () => {
    const confirmed = await ui.ask({
      kind: "confirm",
      title: t("Clôturer la tournée ?"),
      text: t("Le stock restant revient au dépôt. La tournée ne pourra plus être modifiée."),
      confirm: t("Clôturer"),
    });
    if (!confirmed) return;
    if (!(await ui.run(() => api("POST", `/api/agent/routes/${routeId}/close`), t("Tournée clôturée.")))) return;
    await summary.reload();
    onClosed();
  };

  return (
    <QueryView q={summary}>
      {(data) => {
        const blocked = pending > 0 || data.orders.toDeliver > 0;
        return (
          <div className="stack">
            <div className="grid g2 keep2">
              <div className="tile">
                <div className="label">{t("Facturé")}</div>
                <div className="value">{formatMoney(data.money.invoiced)}</div>
              </div>
              <div className="tile">
                <div className="label">{t("Encaissé confirmé")}</div>
                <div className="value">{formatMoney(data.money.confirmed)}</div>
              </div>
              <div className="tile">
                <div className="label">{t("Reste à encaisser")}</div>
                <div className="value">{formatMoney(data.money.invoiced - data.money.confirmed)}</div>
                <div className="hint">
                  {data.money.pending > 0 && t("{0} en attente · ", formatMoney(data.money.pending))}
                  {data.money.toVerify > 0 && t("{0} à vérifier", formatMoney(data.money.toVerify))}
                </div>
              </div>
              <div className="tile">
                <div className="label">{t("Commandes")}</div>
                <div className="value">
                  {data.orders.delivered + data.orders.partial}/{data.orders.total}
                </div>
                <div className="hint">
                  {data.orders.partial} {t("partielle(s) ·")} {data.orders.refused} {t("non livrée(s) ·")} {data.orders.routeSales}{" "}
                  {t("vente(s) sur place")}
                </div>
              </div>
            </div>
            {data.byMethod.length > 0 && (
              <div className="card">
                <header>
                  <h2>{t("Encaissements par moyen")}</h2>
                </header>
                <div className="body">
                  <ul className="plain">
                    {data.byMethod.map((row) => (
                      <li key={row.method} className="row spread">
                        <span>
                          {PAYMENT_METHOD_LABELS[row.method]} · {row.count}
                        </span>
                        <strong>{formatMoney(row.amount_minor)}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            <div className="card">
              <header>
                <h2>{t("Stock du véhicule")}</h2>
              </header>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t("Produit")}</th>
                      <th className="right">{t("Chargé")}</th>
                      <th className="right">{t("Sorti")}</th>
                      <th className="right">{t("Reste")}</th>
                      <th className="right">{t("Retours")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.stock.map((row) => (
                      <tr key={row.product_id}>
                        <td>{row.name}</td>
                        <td className="right">{row.loaded_qty}</td>
                        <td className="right">{row.loaded_qty - row.qty}</td>
                        <td className="right">{row.qty}</td>
                        <td className="right">{row.returned_qty || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {closed || data.route.status === "closed" ? (
              <div className="notice ok">
                {t("Tournée clôturée")}
                {data.route.closed_at ? ` le ${formatDate(data.route.closed_at, true)}` : ""}.
              </div>
            ) : (
              <>
                <button className="big" disabled={blocked} onClick={close}>
                  {t("Clôturer la tournée")}
                </button>
                {blocked && (
                  <div className="small muted">
                    {pending > 0 ? t("Synchronisez d'abord les actions en attente. ") : ""}
                    {data.orders.toDeliver > 0 ? t("{0} commande(s) restent à livrer ou à déclarer non livrées.", data.orders.toDeliver) : ""}
                  </div>
                )}
              </>
            )}
          </div>
        );
      }}
    </QueryView>
  );
}
