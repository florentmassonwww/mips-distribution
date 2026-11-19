// "History" tab: the offline queue (pending or refused actions), then the deliveries and sales of
// the route, then its payment attempts, most recent first.
import { translate } from "../i18n/translate.ts";
import { Badge, StatusBadge } from "../shared/Badge.tsx";
import { formatMoney, formatTime } from "../shared/format.ts";
import { INVOICE_STATUS, ORDER_STATUS, PAYMENT_CHANNEL, PAYMENT_STATUS } from "../shared/labels.ts";
import { findCustomer } from "./route-helpers.ts";
import type { LocalRouteView, QueuedAction } from "../shared/offline.ts";

interface HistoryTabProps {
  work: LocalRouteView;
  queue: QueuedAction[];
  /** Removes a refused action from the queue. */
  onDrop: (actionId: string) => void;
  onInvoice: (invoiceId: string) => void;
}

const DONE_STATUSES = ["delivered", "partially_delivered", "refused"];

export function HistoryTab({ work, queue, onDrop, onInvoice }: HistoryTabProps) {
  const customerName = (customerId: string) => findCustomer(work, customerId)?.name ?? translate("Commerce");
  const done = work.orders
    .filter((order) => !order.local && DONE_STATUSES.includes(order.status))
    .sort((a, b) => (b.delivered_at ?? "").localeCompare(a.delivered_at ?? ""));
  const payments = work.invoices
    .flatMap((invoice) => invoice.payments.map((payment) => ({ ...payment, invoice })))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div className="stack">
      {queue.length > 0 && (
        <div className="card">
          <header>
            <h2>{translate("File de synchronisation")}</h2>
          </header>
          <div className="body">
            <ul className="plain">
              {queue.map((action) => (
                <li key={action.id}>
                  <div className="row spread">
                    <strong>{action.label}</strong>
                    <Badge kind={action.state === "rejected" ? "err" : "warn"}>{action.state === "rejected" ? translate("Refusée") : translate("En attente")}</Badge>
                  </div>
                  <div className="small muted">
                    {customerName(action.customerId)} · {formatTime(action.createdAt)} · {formatMoney(action.totalMinor)}
                  </div>
                  {action.state === "rejected" && (
                    <div className="row spread small" style={{ marginTop: 6 }}>
                      <span className="notice err grow">{action.message}</span>
                      <button className="sm secondary" onClick={() => onDrop(action.id)}>
                        {translate("Retirer")}
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <h2>{translate("Livraisons et ventes")}</h2>
      {done.length === 0 ? (
        <div className="empty">{translate("Rien pour l'instant.")}</div>
      ) : (
        <ul className="plain">
          {done.map((order) => {
            const invoice = work.invoices.find((candidate) => candidate.order_id === order.id);
            return (
              <li key={order.id}>
                <div className="row spread">
                  <strong>{order.number}</strong>
                  <StatusBadge map={ORDER_STATUS} value={order.status} />
                </div>
                <div className="small muted">
                  {order.kind === "route_sale" ? translate("Vente sur place") : translate("Commande")} · {customerName(order.customer_id)}
                  {" · "}
                  {order.delivered_at ? formatTime(order.delivered_at) : ""}
                </div>
                {invoice && (
                  <div className="row spread small" style={{ marginTop: 4 }}>
                    <button className="linkish" onClick={() => onInvoice(invoice.id)}>
                      {invoice.number} · {formatMoney(invoice.amount_minor)}
                    </button>
                    <StatusBadge map={INVOICE_STATUS} value={invoice.status} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <h2>{translate("Encaissements")}</h2>
      {payments.length === 0 ? (
        <div className="empty">{translate("Aucune tentative de paiement.")}</div>
      ) : (
        <ul className="plain">
          {payments.map((payment) => (
            <li key={payment.id}>
              <div className="row spread">
                <strong>
                  {formatMoney(payment.amount_minor)} · {PAYMENT_CHANNEL[payment.method]}
                </strong>
                <StatusBadge map={PAYMENT_STATUS} value={payment.status} />
              </div>
              <div className="small muted">
                {payment.invoice.number} · {customerName(payment.invoice.customer_id)} · {formatTime(payment.created_at)}
                {payment.failure_reason ? ` · ${translate(payment.failure_reason)}` : ""}
                {payment.verify_reason ? ` · ${translate(payment.verify_reason)}` : ""}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
