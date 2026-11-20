import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { translate, translateCount } from "../i18n/translate.ts";
import { apiRequest } from "../shared/api.ts";
import { Badge, StatusBadge } from "../shared/Badge.tsx";
import { DataTable } from "../shared/DataTable.tsx";
import { useFeedback } from "../shared/Feedback.tsx";
import { Field } from "../shared/Form.tsx";
import { formatDate, formatDayLong, formatMoney } from "../shared/format.ts";
import { useApi } from "../shared/hooks.ts";
import { INVOICE_STATUS, ORDER_STATUS, ROUTE_STATUS } from "../shared/labels.ts";
import { Card, PageHeader, Tile } from "../shared/Layout.tsx";
import { QueryView } from "../shared/QueryView.tsx";
import { useSession } from "../shared/session.ts";
import { ProductQuantities } from "./ProductQuantities.tsx";
import type { OrderSummary, QuantityLines, ReferenceData, RouteDetailData } from "./types.ts";

/** The route detail follows the field activity (deliveries, sales) while it is open. */
const REFRESH_MS = 5e3;

interface LoadingCardProps {
  route: RouteDetailData["route"];
  reference: ReferenceData;
  /** Pre-orders of the route still to prepare: loading waits for them. */
  unprepared: readonly OrderSummary[];
  extras: QuantityLines;
  onExtrasChange: (extras: QuantityLines) => void;
  onAgentChange: (agentId: string | null) => void;
  onLoad: () => void;
}

/** Agent assignment and, while the route is planned, vehicle loading. */
function LoadingCard({ route, reference, unprepared, extras, onExtrasChange, onAgentChange, onLoad }: LoadingCardProps) {
  return (
    <Card title={translate(`Agent et chargement`)}>
      <div className="stack">
        <div className="grid g3">
          <Field label={translate(`Agent affecté`)}>
            <select value={route.agent_id ?? ``} onChange={(event) => onAgentChange(event.target.value || null)}>
              <option value="">{translate(`À affecter`)}</option>
              {reference.agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {route.status === `planned` && (
          <>
            {unprepared.length > 0 && (
              <div className="notice warn">
                {translate(`À préparer avant le chargement :`)} {unprepared.map((order) => order.number).join(`, `)}{" "}
                {translate(`(page Commandes).`)}
              </div>
            )}
            <div>
              <strong>{translate(`Stock de vente libre à charger`)}</strong>
              <div className="small muted">{translate(`En plus des commandes préparées, pour les ventes sur place.`)}</div>
            </div>
            <ProductQuantities
              products={reference.products}
              lines={extras}
              onChange={onExtrasChange}
              stockLabel={translate(`stock dépôt`)}
            />
            <div>
              {/* Loading needs every pre-order prepared and an agent to drive the route. */}
              <button disabled={unprepared.length > 0 || !route.agent_id} onClick={onLoad}>
                {translate(`Charger le véhicule`)}
              </button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

/** One route: progress and money, agent and loading, stops, vehicle stock, orders and sales. */
export function RouteDetail() {
  const { id } = useParams();
  const feedback = useFeedback();
  const { session } = useSession();
  // Finance follows the route but does not organise it.
  const canEdit = session.user!.role !== `finance`;
  const detail = useApi<RouteDetailData>(`/api/centrale/routes/${id}`, REFRESH_MS);
  const reference = useApi<ReferenceData>(`/api/centrale/reference`);
  const navigate = useNavigate();
  // Extra free-sale stock to load (product id → quantity), on top of the prepared orders.
  const [extras, setExtras] = useState<QuantityLines>({});

  return (
    <QueryView q={detail}>
      {(data) => {
        const { route } = data;
        const unprepared = data.orderList.filter((order) => order.status === `confirmed`);

        const updateRoute = (changes: { agentId: string | null }, success: string) =>
          feedback.run(async () => {
            await apiRequest(`PATCH`, `/api/centrale/routes/${id}`, changes);
            await detail.reload();
          }, success);

        const loadVehicle = () =>
          feedback.run(async () => {
            await apiRequest(`POST`, `/api/centrale/routes/${id}/load`, {
              extras: Object.entries(extras)
                .filter(([, qty]) => qty > 0)
                .map(([productId, qty]) => ({ productId, qty })),
            });
            setExtras({});
            // Loading moves stock out of the warehouse: refresh the catalogue quantities too.
            await Promise.all([detail.reload(), reference.reload()]);
          }, translate(`Véhicule chargé : la tournée peut démarrer.`));

        return (
          <>
            <PageHeader
              title={route.name}
              sub={
                <>
                  <Link to="/centrale/tournees">{translate(`← Tournées`)}</Link>
                  {` · `}
                  {formatDayLong(route.day)}
                  {` · `}
                  {route.vehicle || translate(`véhicule non précisé`)}
                  {route.started_at ? translate(` · démarrée {0}`, formatDate(route.started_at, true)) : ``}
                  {route.closed_at ? translate(` · clôturée {0}`, formatDate(route.closed_at, true)) : ``}
                </>
              }
            >
              <StatusBadge map={ROUTE_STATUS} value={route.status} />
            </PageHeader>
            <div className="stack">
              <div className="grid g4">
                <Tile
                  label={translate(`Commandes traitées`)}
                  value={`${data.orders.delivered + data.orders.partial + data.orders.refused}/${data.orders.total}`}
                  hint={[
                    translateCount(data.orders.partial, `{0} partielle`, `{0} partielles`),
                    translateCount(data.orders.refused, `{0} non livrée`, `{0} non livrées`),
                    translateCount(data.orders.routeSales, `{0} vente sur place`, `{0} ventes sur place`),
                  ].join(` · `)}
                />
                <Tile label={translate(`Facturé`)} value={formatMoney(data.money.invoiced)} />
                <Tile
                  label={translate(`Encaissé confirmé`)}
                  value={formatMoney(data.money.confirmed)}
                  hint={translate(`réglé en banque : {0}`, formatMoney(data.money.settled))}
                />
                <Tile
                  label={translate(`Reste à encaisser`)}
                  value={formatMoney(data.money.invoiced - data.money.confirmed)}
                  hint={translate(`{0} en attente · {1} à vérifier`, formatMoney(data.money.pending), formatMoney(data.money.toVerify))}
                />
              </div>
              {/* The agent and the load can change until the route starts. */}
              {canEdit && route.status !== `closed` && route.status !== `in_progress` && (
                <QueryView q={reference}>
                  {(referenceData) => (
                    <LoadingCard
                      route={route}
                      reference={referenceData}
                      unprepared={unprepared}
                      extras={extras}
                      onExtrasChange={setExtras}
                      onAgentChange={(agentId) => updateRoute({ agentId }, translate(`Agent affecté.`))}
                      onLoad={loadVehicle}
                    />
                  )}
                </QueryView>
              )}
              <div className="grid g2">
                <Card title={translate(`Arrêts`)} flush>
                  <DataTable
                    rows={data.stops}
                    rowKey={(stop) => stop.customer_outlet_id}
                    empty={translate(`Aucun arrêt.`)}
                    cols={[
                      [`#`, (stop) => stop.seq],
                      [translate(`Commerce`), (stop) => stop.name],
                      [translate(`Zone`), (stop) => stop.zone],
                    ]}
                  />
                </Card>
                <Card title={translate(`Stock du véhicule`)} flush>
                  <DataTable
                    rows={data.stock}
                    rowKey={(line) => line.product_id}
                    empty={translate(`Véhicule non chargé.`)}
                    cols={[
                      [translate(`Produit`), (line) => line.name],
                      [translate(`Chargé`), (line) => line.loaded_qty, `right`],
                      [translate(`Sorti`), (line) => line.loaded_qty - line.qty, `right`],
                      // A negative quantity on board means more was recorded than loaded.
                      [translate(`À bord`), (line) => <Badge kind={line.qty < 0 ? `err` : ``}>{line.qty}</Badge>, `right`],
                      [translate(`Retours`), (line) => line.returned_qty || ``, `right`],
                    ]}
                  />
                </Card>
              </div>
              <Card title={translate(`Commandes et ventes de la tournée`)} flush>
                <DataTable
                  rows={data.orderList}
                  rowKey={(order) => order.id}
                  empty={translate(`Aucune commande affectée.`)}
                  onRow={(order) => navigate(`/centrale/commandes/${order.id}`)}
                  cols={[
                    [`N°`, (order) => <strong>{order.number}</strong>],
                    [translate(`Type`), (order) => (order.kind === `route_sale` ? translate(`Vente sur place`) : translate(`Commande`))],
                    [translate(`Commerce`), (order) => order.customer_outlet],
                    [translate(`État`), (order) => <StatusBadge map={ORDER_STATUS} value={order.status} />],
                    [translate(`Commandé`), (order) => formatMoney(order.ordered_minor), `right`],
                    [
                      translate(`Facture`),
                      (order) =>
                        order.invoice_number ? (
                          <>
                            {formatMoney(order.invoice_minor)}{" "}
                            <StatusBadge map={INVOICE_STATUS} value={order.invoice_status!} />
                          </>
                        ) : (
                          `—`
                        ),
                    ],
                  ]}
                />
              </Card>
            </div>
          </>
        );
      }}
    </QueryView>
  );
}
