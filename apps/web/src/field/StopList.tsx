// "Route" tab: the stops in order with what is left to do at each, and a sale to a shop that is
// not on the route.
import { useState } from "react";
import { translate } from "../i18n/translate.ts";
import { Badge } from "../shared/Badge.tsx";
import { Field } from "../shared/Form.tsx";
import { formatMoney } from "../shared/format.ts";
import { amountDue } from "./route-helpers.ts";
import type { BundleStop, LocalRouteView } from "../shared/offline.ts";

interface StopListProps {
  work: LocalRouteView;
  onOpen: (customerId: string) => void;
  closed: boolean;
}

export function StopList({ work, onOpen, closed }: StopListProps) {
  const [offRouteCustomer, setOffRouteCustomer] = useState("");
  const onRoute = new Set(work.stops.map((stop) => stop.customer_id));

  return (
    <div className="stack">
      {closed && <div className="notice">{translate("Tournée clôturée : consultation seule.")}</div>}
      <ul className="plain tap">
        {work.stops.map((stop) => (
          <li key={stop.customer_id}>
            <StopButton work={work} stop={stop} onOpen={onOpen} />
          </li>
        ))}
      </ul>
      {!closed && (
        <div className="card">
          <div className="body stack">
            <Field label={translate("Vente à un commerce hors tournée")}>
              <select value={offRouteCustomer} onChange={(event) => setOffRouteCustomer(event.target.value)}>
                <option value="">{translate("Choisir un commerce…")}</option>
                {work.customers
                  .filter((customer) => !onRoute.has(customer.id))
                  .map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} · {customer.zone}
                    </option>
                  ))}
              </select>
            </Field>
            <button className="secondary" disabled={!offRouteCustomer} onClick={() => onOpen(offRouteCustomer)}>
              {translate("Ouvrir ce commerce")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StopButton({ work, stop, onOpen }: { work: LocalRouteView; stop: BundleStop; onOpen: (customerId: string) => void }) {
  const orders = work.orders.filter((order) => order.customer_id === stop.customer_id);
  const toDeliver = orders.filter((order) => order.status === "loaded" && !work.queuedOrders.has(order.id)).length;
  const toSync = orders.filter((order) => work.queuedOrders.has(order.id) || order.local).length;
  const toCollect = work.invoices
    .filter((invoice) => invoice.customer_id === stop.customer_id)
    .reduce((sum, invoice) => sum + Math.max(0, amountDue(invoice)), 0);
  const toVerify = work.invoices.some((invoice) => invoice.customer_id === stop.customer_id && invoice.status === "to_verify");

  return (
    <button className="stopbtn" aria-label={translate("Arrêt {0} : {1}", stop.seq, stop.name)} onClick={() => onOpen(stop.customer_id)}>
      <span className="seq">{stop.seq}</span>
      <span className="grow">
        <strong>{stop.name}</strong>
        <span className="small muted block">{stop.address}</span>
        <span className="row" style={{ marginTop: 6, gap: 6 }}>
          {toDeliver > 0 && (
            <Badge kind="info">
              {toDeliver} {translate("à livrer")}
            </Badge>
          )}
          {toSync > 0 && (
            <Badge kind="warn">
              {toSync} {translate("à synchroniser")}
            </Badge>
          )}
          {toCollect > 0 && (
            <Badge kind="warn">
              {formatMoney(toCollect)} {translate("à encaisser")}
            </Badge>
          )}
          {toVerify && <Badge kind="warn">{translate("Paiement à vérifier")}</Badge>}
          {toDeliver === 0 && toSync === 0 && toCollect === 0 && orders.length > 0 && <Badge kind="ok">{translate("Terminé")}</Badge>}
          {orders.length === 0 && <Badge>{translate("Visite libre")}</Badge>}
        </span>
      </span>
      <span aria-hidden="true">›</span>
    </button>
  );
}
