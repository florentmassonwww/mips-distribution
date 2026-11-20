import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { translate } from "../i18n/translate.ts";
import { apiRequest } from "../shared/api.ts";
import { StatusBadge } from "../shared/Badge.tsx";
import { DataTable } from "../shared/DataTable.tsx";
import { useFeedback } from "../shared/Feedback.tsx";
import { formatMoney } from "../shared/format.ts";
import { useApi } from "../shared/hooks.ts";
import { INVOICE_STATUS, ORDER_STATUS } from "../shared/labels.ts";
import { Card, PageHeader } from "../shared/Layout.tsx";
import { QueryView } from "../shared/QueryView.tsx";
import { useSession } from "../shared/session.ts";
import { EMPTY_ORDER_DRAFT, OrderForm, type OrderDraft } from "./OrderForm.tsx";
import type { OrderSummary, ReferenceData, RouteSummary } from "./types.ts";

type OrderAction = "assign" | "status";

/** Orders: creation, preparation, assignment to a route, cancellation. */
export function Orders() {
  const feedback = useFeedback();
  const { session } = useSession();
  // Finance follows the orders but does not act on them.
  const canEdit = session.user!.role !== `finance`;
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
        customerOutletId: draft.customerOutletId,
        routeId: draft.routeId || null,
        note: draft.note,
        lines,
      });
      feedback.toast(translate(`Commande {0} créée.`, created.number));
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
      title: translate(`Annuler {0} ?`, order.number),
      danger: true,
      confirm: translate(`Annuler la commande`),
    });
    if (confirmed) await act(order, `status`, { status: `cancelled` }, translate(`Commande annulée.`));
  };

  return (
    <>
      <PageHeader title={translate(`Commandes`)} sub={translate(`Création, préparation et affectation aux tournées.`)}>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label={translate(`Filtrer par état`)}
          style={{ width: `auto` }}
        >
          <option value="">{translate(`Tous les états`)}</option>
          {Object.entries(ORDER_STATUS).map(([status, [label]]) => (
            <option key={status} value={status}>
              {label}
            </option>
          ))}
        </select>
        {canEdit && <button onClick={() => setFormOpen(!formOpen)}>{translate(formOpen ? `Fermer` : `Nouvelle commande`)}</button>}
      </PageHeader>
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
        <Card title={translate(`Commandes`)} flush>
          <QueryView q={orders}>
            {(rows) => (
              <DataTable
                rows={rows}
                rowKey={(order) => order.id}
                empty={translate(`Aucune commande.`)}
                onRow={(order) => navigate(`/centrale/commandes/${order.id}`)}
                cols={[
                  [`N°`, (order) => <strong>{order.number}</strong>],
                  [translate(`Type`), (order) => (order.kind === `route_sale` ? translate(`Vente sur place`) : translate(`Commande`))],
                  [
                    translate(`Commerce`),
                    (order) => (
                      <>
                        {order.customer_outlet}
                        <div className="small muted">{order.zone}</div>
                      </>
                    ),
                  ],
                  [translate(`État`), (order) => <StatusBadge map={ORDER_STATUS} value={order.status} />],
                  [
                    translate(`Tournée`),
                    (order) =>
                      isEditable(order) ? (
                        <select
                          value={order.route_id ?? ``}
                          // The row opens the order: keep clicks on the control from reaching it.
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) =>
                            act(order, `assign`, { routeId: event.target.value || null }, translate(`Affectation enregistrée.`))
                          }
                          aria-label={translate(`Tournée de {0}`, order.number)}
                        >
                          <option value="">{translate(`Non affectée`)}</option>
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
                  [
                    ``,
                    (order) =>
                      isEditable(order) ? (
                        <div className="row" onClick={(event) => event.stopPropagation()}>
                          {order.status === `confirmed` && (
                            <button
                              className="sm"
                              onClick={() => act(order, `status`, { status: `prepared` }, translate(`{0} préparée.`, order.number))}
                            >
                              {translate(`Marquer préparée`)}
                            </button>
                          )}
                          {order.status === `prepared` && (
                            <button
                              className="sm secondary"
                              onClick={() => act(order, `status`, { status: `confirmed` }, translate(`Préparation annulée.`))}
                            >
                              {translate(`Annuler la préparation`)}
                            </button>
                          )}
                          <button className="sm danger" onClick={() => cancelOrder(order)}>
                            {translate(`Annuler`)}
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
