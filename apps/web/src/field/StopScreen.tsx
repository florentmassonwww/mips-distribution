// One stop: the shop's orders to deliver, its invoices to collect, and a new on-the-spot sale.
import { translate } from "../i18n/translate.ts";
import { Badge, StatusBadge } from "../shared/Badge.tsx";
import { formatMoney } from "../shared/format.ts";
import { INVOICE_STATUS, ORDER_STATUS } from "../shared/labels.ts";
import { BackButton } from "./BackButton.tsx";
import { amountDue, findCustomer } from "./route-helpers.ts";
import type { FieldView } from "./RouteScreen.tsx";
import type { BundleInvoice, BundleOrder, LocalRouteView } from "../shared/offline.ts";

interface StopScreenProps {
  work: LocalRouteView;
  customerId: string;
  online: boolean;
  closed: boolean;
  go: (view: FieldView) => void;
}

export function StopScreen({ work, customerId, online, closed, go }: StopScreenProps) {
  const customer = findCustomer(work, customerId);
  const productNames = new Map(work.products.map((product) => [product.id, product.name]));
  const orders = work.orders.filter((order) => order.customer_id === customerId);
  const invoices = work.invoices.filter((invoice) => invoice.customer_id === customerId);

  return (
    <div className="stack">
      <BackButton onClick={() => go({ name: "home" })}>{translate("Tournée")}</BackButton>
      <div>
        <h1>{customer?.name}</h1>
        <div className="muted">
          {customer?.address} · {customer?.phone}
        </div>
        {customer?.price_list_id && (
          <div style={{ marginTop: 6 }}>
            <Badge kind="info">{translate("Tarif grands comptes")}</Badge>
          </div>
        )}
      </div>
      <h2>{translate("Commandes")}</h2>
      {orders.length === 0 && <div className="empty">{translate("Aucune commande pour ce commerce.")}</div>}
      {orders.map((order) => (
        <OrderCard key={order.id} work={work} order={order} productNames={productNames} closed={closed} go={go} />
      ))}
      {invoices.length > 0 && <h2>{translate("Factures et encaissements")}</h2>}
      {invoices.map((invoice) => (
        <InvoiceCard key={invoice.id} invoice={invoice} online={online} go={go} />
      ))}
      {!closed && (
        <button className="big secondary" onClick={() => go({ name: "sale", customerId })}>
          {translate("Nouvelle vente sur place")}
        </button>
      )}
    </div>
  );
}

interface OrderCardProps {
  work: LocalRouteView;
  order: BundleOrder;
  productNames: Map<string, string>;
  closed: boolean;
  go: (view: FieldView) => void;
}

function OrderCard({ work, order, productNames, closed, go }: OrderCardProps) {
  // Delivered offline (or sold offline): shown as waiting for sync, no longer deliverable.
  const pendingSync = work.queuedOrders.has(order.id) || order.local;
  const orderedTotal = order.lines.reduce((sum, line) => sum + line.qty_ordered * line.unit_price_minor, 0);
  return (
    <div className="card">
      <div className="body stack">
        <div className="row spread">
          <strong>{order.number}</strong>
          {pendingSync ? <Badge kind="warn">{translate("À synchroniser")}</Badge> : <StatusBadge map={ORDER_STATUS} value={order.status} />}
        </div>
        {order.note && <div className="notice">{order.note}</div>}
        <ul className="plain small">
          {order.lines.map((line) => (
            <li key={line.id} className="row spread">
              <span>{productNames.get(line.product_id)}</span>
              <span className="nowrap">
                {order.status === "loaded" ? line.qty_ordered : `${line.qty_delivered}/${line.qty_ordered}`}
                {line.unit_price_minor ? ` × ${formatMoney(line.unit_price_minor)}` : ""}
              </span>
            </li>
          ))}
        </ul>
        {order.status === "loaded" && !pendingSync && (
          <>
            <div className="row spread">
              <span className="muted">{translate("Total commandé")}</span>
              <strong>{formatMoney(orderedTotal)}</strong>
            </div>
            {!closed && (
              <button className="big" onClick={() => go({ name: "deliver", orderId: order.id })}>
                {translate("Livrer cette commande")}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function InvoiceCard({ invoice, online, go }: { invoice: BundleInvoice; online: boolean; go: (view: FieldView) => void }) {
  const due = amountDue(invoice);
  return (
    <div className="card">
      <div className="body stack">
        <div className="row spread">
          <strong>{invoice.number}</strong>
          <StatusBadge map={INVOICE_STATUS} value={invoice.status} />
        </div>
        <div className="row spread">
          <span className="muted">{translate("Montant")}</span>
          <strong>{formatMoney(invoice.amount_minor)}</strong>
        </div>
        {due > 0 && due !== invoice.amount_minor && (
          <div className="row spread">
            <span className="muted">{translate("Reste dû")}</span>
            <strong>{formatMoney(due)}</strong>
          </div>
        )}
        {/* Payments and receipts come from the server: unavailable offline. */}
        <div className="row">
          {due > 0 && (
            <button className="grow" disabled={!online} onClick={() => go({ name: "pay", invoiceId: invoice.id })}>
              {invoice.status === "pending" || invoice.status === "to_verify" ? translate("Suivre le paiement") : translate("Encaisser")}
            </button>
          )}
          <button className="secondary grow" disabled={!online} onClick={() => go({ name: "receipt", invoiceId: invoice.id })}>
            {translate("Reçu")}
          </button>
        </div>
        {!online && due > 0 && (
          <div className="small muted">
            {translate("Encaissement électronique indisponible hors ligne : la facture reste « non payée » jusqu'au retour du réseau.")}
          </div>
        )}
      </div>
    </div>
  );
}
