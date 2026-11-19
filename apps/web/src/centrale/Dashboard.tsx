import { useNavigate } from "react-router-dom";
import {
  AUDIT_ACTION_LABELS,
  Card,
  formatClockTime,
  formatDate,
  formatDay,
  formatMoney,
  PageHead,
  PAYMENT_METHOD_LABELS,
  QueryView,
  ROUTE_STATUS,
  StatusBadge,
  Table,
  Tile,
  t,
  useApi,
} from "./legacy.ts";
import type { DashboardData } from "./types.ts";

/** Polling interval of the head office dashboard (the subtitle tells the user). */
const REFRESH_MS = 5e3;

/** Head office dashboard: today's sales, deliveries, money, routes and recent activity. */
export function Dashboard() {
  const dashboard = useApi<DashboardData>(`/api/centrale/dashboard`, REFRESH_MS);
  const navigate = useNavigate();
  return (
    <>
      <PageHead
        title={t(`Tableau de bord`)}
        sub={
          dashboard.data
            ? t(`{0} · actualisé à {1} (toutes les 5 s)`, formatDay(dashboard.data.day), formatClockTime(dashboard.at))
            : undefined
        }
      />
      <QueryView q={dashboard}>
        {(data) => (
          <div className="stack">
            <div className="grid g4">
              <Tile
                label={t(`Ventes du jour`)}
                value={formatMoney(data.sales.invoiced)}
                hint={t(`{0} facture(s) · {1} vente(s) sur place`, data.sales.invoices, data.sales.routeSales)}
              />
              <Tile
                label={t(`Livraisons`)}
                value={`${data.deliveries.done}/${data.deliveries.planned}`}
                hint={t(`{0} partielle(s) · {1} non livrée(s)`, data.deliveries.partial, data.deliveries.refused)}
              />
              <Tile
                label={t(`Encaissé confirmé (jour)`)}
                value={formatMoney(data.money.confirmed)}
                hint={t(`dont réglé en banque : {0}`, formatMoney(data.money.settled))}
              />
              <Tile
                label={t(`Reste à encaisser`)}
                value={formatMoney(data.money.outstanding)}
                hint={t(`toutes factures ouvertes`)}
              />
            </div>
            <div className="grid g4">
              <Tile label={t(`Paiements en attente`)} value={data.money.pending} kind={data.money.pending ? `info` : ``} />
              <Tile label={t(`Paiements à vérifier`)} value={data.money.toVerify} kind={data.money.toVerify ? `warn` : ``} />
              <Tile
                label={t(`Incidents terrain ouverts`)}
                value={data.exceptions.ops}
                kind={data.exceptions.ops ? `warn` : ``}
              />
              <Tile
                label={t(`Exceptions finance ouvertes`)}
                value={data.exceptions.finance}
                kind={data.exceptions.finance ? `warn` : ``}
              />
            </div>
            <Card title={t(`Tournées du jour`)} flush>
              <Table
                rows={data.routes}
                rowKey={(route) => route.id}
                empty={t(`Aucune tournée aujourd'hui.`)}
                onRow={(route) => navigate(`/centrale/tournees/${route.id}`)}
                cols={[
                  [t(`Tournée`), (route) => <strong>{route.name}</strong>],
                  [t(`Agent`), (route) => route.agent ?? `—`],
                  [t(`État`), (route) => <StatusBadge map={ROUTE_STATUS} value={route.status} />],
                  [
                    t(`Commandes`),
                    (route) => (
                      <div style={{ minWidth: 110 }}>
                        {route.orders_done}/{route.orders_total}
                        <div className="bar">
                          <i
                            style={{
                              width: `${route.orders_total ? (route.orders_done / route.orders_total) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    ),
                  ],
                  [t(`Facturé`), (route) => formatMoney(route.invoiced_minor), `right`],
                  [t(`Encaissé confirmé`), (route) => formatMoney(route.paid_minor), `right`],
                ]}
              />
            </Card>
            <div className="grid g2">
              <Card title={t(`Encaissements confirmés par moyen`)} flush>
                <Table
                  rows={data.byMethod}
                  rowKey={(row) => row.method}
                  empty={t(`Aucun encaissement confirmé aujourd'hui.`)}
                  cols={[
                    [t(`Moyen`), (row) => PAYMENT_METHOD_LABELS[row.method]],
                    [t(`Nombre`), (row) => row.count, `right`],
                    [t(`Montant`), (row) => formatMoney(row.amount_minor), `right`],
                  ]}
                />
              </Card>
              <Card title={t(`Activité récente`)}>
                <ul className="plain small">
                  {data.recent.length === 0 && <li className="muted">{t(`Aucune activité.`)}</li>}
                  {data.recent.map((entry, index) => (
                    <li key={index} className="row spread">
                      <span>
                        <strong>{AUDIT_ACTION_LABELS[entry.action] ?? entry.action}</strong>
                        {` · `}
                        {entry.details.order ?? entry.details.invoice ?? entry.details.name ?? ``}
                        {entry.details.customer ? ` · ${entry.details.customer}` : ``}
                        {entry.details.method ? ` · ${PAYMENT_METHOD_LABELS[entry.details.method]}` : ``}
                        {entry.details.amountMinor ? ` · ${formatMoney(entry.details.amountMinor)}` : ``}
                      </span>
                      <span className="muted nowrap">
                        {formatDate(entry.at, true)}
                        {/* Actor names carry their role in parentheses: show the name only. */}
                        {entry.actor ? ` · ${entry.actor.split(` (`)[0]}` : ``}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        )}
      </QueryView>
    </>
  );
}
