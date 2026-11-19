import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  apiRequest,
  Badge,
  Card,
  Field,
  formatDate,
  formatDay,
  formatMoney,
  INVOICE_STATUS,
  ORDER_STATUS,
  PageHead,
  QueryView,
  ROUTE_STATUS,
  StatusBadge,
  Table,
  Tile,
  t,
  useApi,
  useFeedback,
  useSession,
} from "./legacy.ts";
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
    <Card title={t(`Agent et chargement`)}>
      <div className="stack">
        <div className="grid g3">
          <Field label={t(`Agent affecté`)}>
            <select value={route.agent_id ?? ``} onChange={(event) => onAgentChange(event.target.value || null)}>
              <option value="">{t(`À affecter`)}</option>
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
                {t(`À préparer avant le chargement :`)} {unprepared.map((order) => order.number).join(`, `)}{" "}
                {t(`(page Commandes).`)}
              </div>
            )}
            <div>
              <strong>{t(`Stock de vente libre à charger`)}</strong>
              <div className="small muted">{t(`En plus des commandes préparées, pour les ventes sur place.`)}</div>
            </div>
            <ProductQuantities
              products={reference.products}
              lines={extras}
              onChange={onExtrasChange}
              stockLabel={t(`stock dépôt`)}
            />
            <div>
              {/* Loading needs every pre-order prepared and an agent to drive the route. */}
              <button disabled={unprepared.length > 0 || !route.agent_id} onClick={onLoad}>
                {t(`Charger le véhicule`)}
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
  const canEdit = session.user.role !== `finance`;
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
          }, t(`Véhicule chargé : la tournée peut démarrer.`));

        return (
          <>
            <PageHead
              title={route.name}
              sub={
                <>
                  <Link to="/centrale/tournees">{t(`← Tournées`)}</Link>
                  {` · `}
                  {formatDay(route.day)}
                  {` · `}
                  {route.vehicle || t(`véhicule non précisé`)}
                  {route.started_at ? t(` · démarrée {0}`, formatDate(route.started_at, true)) : ``}
                  {route.closed_at ? t(` · clôturée {0}`, formatDate(route.closed_at, true)) : ``}
                </>
              }
            >
              <StatusBadge map={ROUTE_STATUS} value={route.status} />
            </PageHead>
            <div className="stack">
              <div className="grid g4">
                <Tile
                  label={t(`Commandes traitées`)}
                  value={`${data.orders.delivered + data.orders.partial + data.orders.refused}/${data.orders.total}`}
                  hint={t(
                    `{0} partielle(s) · {1} non livrée(s) · {2} vente(s) sur place`,
                    data.orders.partial,
                    data.orders.refused,
                    data.orders.routeSales,
                  )}
                />
                <Tile label={t(`Facturé`)} value={formatMoney(data.money.invoiced)} />
                <Tile
                  label={t(`Encaissé confirmé`)}
                  value={formatMoney(data.money.confirmed)}
                  hint={t(`réglé en banque : {0}`, formatMoney(data.money.settled))}
                />
                <Tile
                  label={t(`Reste à encaisser`)}
                  value={formatMoney(data.money.invoiced - data.money.confirmed)}
                  hint={t(`{0} en attente · {1} à vérifier`, formatMoney(data.money.pending), formatMoney(data.money.toVerify))}
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
                      onAgentChange={(agentId) => updateRoute({ agentId }, t(`Agent affecté.`))}
                      onLoad={loadVehicle}
                    />
                  )}
                </QueryView>
              )}
              <div className="grid g2">
                <Card title={t(`Arrêts`)} flush>
                  <Table
                    rows={data.stops}
                    rowKey={(stop) => stop.customer_id}
                    empty={t(`Aucun arrêt.`)}
                    cols={[
                      [`#`, (stop) => stop.seq],
                      [t(`Commerce`), (stop) => stop.name],
                      [t(`Zone`), (stop) => stop.zone],
                    ]}
                  />
                </Card>
                <Card title={t(`Stock du véhicule`)} flush>
                  <Table
                    rows={data.stock}
                    rowKey={(line) => line.product_id}
                    empty={t(`Véhicule non chargé.`)}
                    cols={[
                      [t(`Produit`), (line) => line.name],
                      [t(`Chargé`), (line) => line.loaded_qty, `right`],
                      [t(`Sorti`), (line) => line.loaded_qty - line.qty, `right`],
                      // A negative quantity on board means more was recorded than loaded.
                      [t(`À bord`), (line) => <Badge kind={line.qty < 0 ? `err` : ``}>{line.qty}</Badge>, `right`],
                      [t(`Retours`), (line) => line.returned_qty || ``, `right`],
                    ]}
                  />
                </Card>
              </div>
              <Card title={t(`Commandes et ventes de la tournée`)} flush>
                <Table
                  rows={data.orderList}
                  rowKey={(order) => order.id}
                  empty={t(`Aucune commande affectée.`)}
                  onRow={(order) => navigate(`/centrale/commandes/${order.id}`)}
                  cols={[
                    [`N°`, (order) => <strong>{order.number}</strong>],
                    [t(`Type`), (order) => (order.kind === `route_sale` ? t(`Vente sur place`) : t(`Commande`))],
                    [t(`Commerce`), (order) => order.customer],
                    [t(`État`), (order) => <StatusBadge map={ORDER_STATUS} value={order.status} />],
                    [t(`Commandé`), (order) => formatMoney(order.ordered_minor), `right`],
                    [
                      t(`Facture`),
                      (order) =>
                        order.invoice_number ? (
                          <>
                            {formatMoney(order.invoice_minor)}{" "}
                            <StatusBadge map={INVOICE_STATUS} value={order.invoice_status} />
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
