import { useNavigate } from "react-router-dom";
import { AUDIT_ACTION_LABELS } from "../field/audit-labels.ts";
import { translate, translateCount } from "../i18n/translate.ts";
import { StatusBadge } from "../shared/Badge.tsx";
import { DataTable } from "../shared/DataTable.tsx";
import { formatDate, formatDayLong, formatMoney, formatTime } from "../shared/format.ts";
import { useApi } from "../shared/hooks.ts";
import { PAYMENT_CHANNEL, ROUTE_STATUS } from "../shared/labels.ts";
import { Card, PageHeader, Tile } from "../shared/Layout.tsx";
import { QueryView } from "../shared/QueryView.tsx";
import type { DashboardData } from "./types.ts";

/** Polling interval of the head office dashboard (the subtitle tells the user). */
const REFRESH_MS = 5e3;

/** Head office dashboard: today's sales, deliveries, money, routes and recent activity. */
export function Dashboard() {
  const dashboard = useApi<DashboardData>(`/api/centrale/dashboard`, REFRESH_MS);
  const navigate = useNavigate();
  return (
    <>
      <PageHeader
        title={translate(`Tableau de bord`)}
        sub={
          dashboard.data
            ? translate(`{0} · actualisé à {1} (toutes les 5 s)`, formatDayLong(dashboard.data.day), formatTime(dashboard.at))
            : undefined
        }
      />
      <QueryView q={dashboard}>
        {(data) => (
          <div className="stack">
            <div className="grid g4">
              <Tile
                label={translate(`Ventes du jour`)}
                value={formatMoney(data.sales.invoiced)}
                hint={`${translateCount(data.sales.invoices, `{0} facture`, `{0} factures`)} · ${translateCount(
                  data.sales.routeSales,
                  `{0} vente sur place`,
                  `{0} ventes sur place`,
                )}`}
              />
              <Tile
                label={translate(`Livraisons`)}
                value={`${data.deliveries.done}/${data.deliveries.planned}`}
                hint={`${translateCount(data.deliveries.partial, `{0} partielle`, `{0} partielles`)} · ${translateCount(
                  data.deliveries.refused,
                  `{0} non livrée`,
                  `{0} non livrées`,
                )}`}
              />
              <Tile
                label={translate(`Encaissé confirmé (jour)`)}
                value={formatMoney(data.money.confirmed)}
                hint={translate(`dont réglé en banque : {0}`, formatMoney(data.money.settled))}
              />
              <Tile
                label={translate(`Reste à encaisser`)}
                value={formatMoney(data.money.outstanding)}
                hint={translate(`toutes factures ouvertes`)}
              />
            </div>
            <div className="grid g4">
              <Tile label={translate(`Paiements en attente`)} value={data.money.pending} kind={data.money.pending ? `info` : ``} />
              <Tile label={translate(`Paiements à vérifier`)} value={data.money.toVerify} kind={data.money.toVerify ? `warn` : ``} />
              <Tile
                label={translate(`Incidents terrain ouverts`)}
                value={data.exceptions.ops}
                kind={data.exceptions.ops ? `warn` : ``}
              />
              <Tile
                label={translate(`Exceptions finance ouvertes`)}
                value={data.exceptions.finance}
                kind={data.exceptions.finance ? `warn` : ``}
              />
            </div>
            <Card title={translate(`Tournées du jour`)} flush>
              <DataTable
                rows={data.routes}
                rowKey={(route) => route.id}
                empty={translate(`Aucune tournée aujourd'hui.`)}
                onRow={(route) => navigate(`/centrale/tournees/${route.id}`)}
                cols={[
                  [translate(`Tournée`), (route) => <strong>{route.name}</strong>],
                  [translate(`Agent`), (route) => route.agent ?? `—`],
                  [translate(`État`), (route) => <StatusBadge map={ROUTE_STATUS} value={route.status} />],
                  [
                    translate(`Commandes`),
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
                  [translate(`Facturé`), (route) => formatMoney(route.invoiced_minor), `right`],
                  [translate(`Encaissé confirmé`), (route) => formatMoney(route.paid_minor), `right`],
                ]}
              />
            </Card>
            <div className="grid g2">
              <Card title={translate(`Encaissements confirmés par moyen`)} flush>
                <DataTable
                  rows={data.byMethod}
                  rowKey={(row) => row.method}
                  empty={translate(`Aucun encaissement confirmé aujourd'hui.`)}
                  cols={[
                    [translate(`Moyen`), (row) => PAYMENT_CHANNEL[row.method]],
                    [translate(`Nombre`), (row) => row.count, `right`],
                    [translate(`Montant`), (row) => formatMoney(row.amount_minor), `right`],
                  ]}
                />
              </Card>
              <Card title={translate(`Activité récente`)}>
                <ul className="plain small">
                  {data.recent.length === 0 && <li className="muted">{translate(`Aucune activité.`)}</li>}
                  {data.recent.map((entry, index) => (
                    <li key={index} className="row spread">
                      <span>
                        <strong>{AUDIT_ACTION_LABELS[entry.action] ?? entry.action}</strong>
                        {` · `}
                        {entry.details.order ?? entry.details.invoice ?? entry.details.name ?? ``}
                        {entry.details.customerOutlet ? ` · ${entry.details.customerOutlet}` : ``}
                        {entry.details.method ? ` · ${PAYMENT_CHANNEL[entry.details.method]}` : ``}
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
