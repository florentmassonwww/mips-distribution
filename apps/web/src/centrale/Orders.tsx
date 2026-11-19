import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  apiRequest,
  Card,
  formatMoney,
  INVOICE_STATUS,
  ORDER_STATUS,
  PageHead,
  QueryView,
  StatusBadge,
  Table,
  t,
  useApi,
  useFeedback,
  useSession,
} from "./legacy.ts";
import { EMPTY_ORDER_DRAFT, OrderForm, type OrderDraft } from "./OrderForm.tsx";
import type { OrderSummary, ReferenceData, RouteSummary } from "./types.ts";

type OrderAction = "assign" | "status";

/** Orders: creation, preparation, assignment to a route, cancellation. */
export function Orders() {
  const feedback = useFeedback();
  const { session } = useSession();
  // Finance follows the orders but does not act on them.
  const canEdit = session.user.role !== `finance`;
  const [statusFilter, setStatusFilter] = useState(``);
  const orders = useApi<OrderSummary[]>(`/api/centrale/orders${statusFilter ? `?status=${statusFilter}` : ``}`);
  const reference = useApi<ReferenceData>(`/api/centrale/reference`);
  const routes = useApi<RouteSummary[]>(`/api/centrale/routes`);
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<OrderDraft>(EMPTY_ORDER_DRAFT);
  // Orders can only be added to routes that are not loaded yet.
  const plannedRoutes = (routes.data ?? []).filter((route) => route.status === `planned`);

  // Orders, stock (reference) and route totals all change with an order.
  const reloadAll = async () => {
    await Promise.all([orders.reload(), reference.reload(), routes.reload()]);
  };

  const createOrder = () =>
    feedback.run(async () => {
      const lines = Object.entries(draft.lines)
        .filter(([, qty]) => qty > 0)
        .map(([productId, qty]) => ({ productId, qty }));
      const created = await apiRequest<{ number: string }>(`POST`, `/api/centrale/orders`, {
        customerId: draft.customerId,
        routeId: draft.routeId || null,
        note: draft.note,
        lines,
      });
      feedback.toast(t(`Commande {0} créée.`, created.number));
      setFormOpen(false);
      setDraft(EMPTY_ORDER_DRAFT);
      await reloadAll();
    });

  const act = (order: OrderSummary, action: OrderAction, body: unknown, success: string) =>
    feedback.run(async () => {
      await apiRequest(`POST`, `/api/centrale/orders/${order.id}/${action}`, body);
      await reloadAll();
    }, success);

  // A pre-order can be changed until its route is loaded.
  const isEditable = (order: OrderSummary) =>
    canEdit &&
    order.kind === `preorder` &&
    [`confirmed`, `prepared`].includes(order.status) &&
    (!order.route_status || order.route_status === `planned`);

  const cancelOrder = async (order: OrderSummary) => {
    const confirmed = await feedback.ask({
      kind: `confirm`,
      title: t(`Annuler {0} ?`, order.number),
      danger: true,
      confirm: t(`Annuler la commande`),
    });
    if (confirmed) await act(order, `status`, { status: `cancelled` }, t(`Commande annulée.`));
  };

  return (
    <>
      <PageHead title={t(`Commandes`)} sub={t(`Création, préparation et affectation aux tournées.`)}>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label={t(`Filtrer par état`)}
          style={{ width: `auto` }}
        >
          <option value="">{t(`Tous les états`)}</option>
          {Object.entries(ORDER_STATUS).map(([status, [label]]) => (
            <option key={status} value={status}>
              {label}
            </option>
          ))}
        </select>
        {canEdit && <button onClick={() => setFormOpen(!formOpen)}>{t(formOpen ? `Fermer` : `Nouvelle commande`)}</button>}
      </PageHead>
      <div className="stack">
        {formOpen && (
          <QueryView q={reference}>
            {(referenceData) => (
              <OrderForm
                reference={referenceData}
                plannedRoutes={plannedRoutes}
                draft={draft}
                onChange={setDraft}
                onSubmit={createOrder}
              />
            )}
          </QueryView>
        )}
        <Card title={t(`Commandes`)} flush>
          <QueryView q={orders}>
            {(rows) => (
              <Table
                rows={rows}
                rowKey={(order) => order.id}
                empty={t(`Aucune commande.`)}
                onRow={(order) => navigate(`/centrale/commandes/${order.id}`)}
                cols={[
                  [`N°`, (order) => <strong>{order.number}</strong>],
                  [t(`Type`), (order) => (order.kind === `route_sale` ? t(`Vente sur place`) : t(`Commande`))],
                  [
                    t(`Commerce`),
                    (order) => (
                      <>
                        {order.customer}
                        <div className="small muted">{order.zone}</div>
                      </>
                    ),
                  ],
                  [t(`État`), (order) => <StatusBadge map={ORDER_STATUS} value={order.status} />],
                  [
                    t(`Tournée`),
                    (order) =>
                      isEditable(order) ? (
                        <select
                          value={order.route_id ?? ``}
                          // The row opens the order: keep clicks on the control from reaching it.
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) =>
                            act(order, `assign`, { routeId: event.target.value || null }, t(`Affectation enregistrée.`))
                          }
                          aria-label={t(`Tournée de {0}`, order.number)}
                        >
                          <option value="">{t(`Non affectée`)}</option>
                          {plannedRoutes.map((route) => (
                            <option key={route.id} value={route.id}>
                              {route.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        (order.route ?? `—`)
                      ),
                  ],
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
                  [
                    ``,
                    (order) =>
                      isEditable(order) ? (
                        <div className="row" onClick={(event) => event.stopPropagation()}>
                          {order.status === `confirmed` && (
                            <button
                              className="sm"
                              onClick={() => act(order, `status`, { status: `prepared` }, t(`{0} préparée.`, order.number))}
                            >
                              {t(`Marquer préparée`)}
                            </button>
                          )}
                          {order.status === `prepared` && (
                            <button
                              className="sm secondary"
                              onClick={() => act(order, `status`, { status: `confirmed` }, t(`Préparation annulée.`))}
                            >
                              {t(`Annuler la préparation`)}
                            </button>
                          )}
                          <button className="sm danger" onClick={() => cancelOrder(order)}>
                            {t(`Annuler`)}
                          </button>
                        </div>
                      ) : null,
                  ],
                ]}
              />
            )}
          </QueryView>
        </Card>
      </div>
    </>
  );
}
