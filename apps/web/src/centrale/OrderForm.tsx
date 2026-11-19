import { translate } from "../i18n/translate.ts";
import { Field } from "../shared/Form.tsx";
import { formatDayLong } from "../shared/format.ts";
import { Card } from "../shared/Layout.tsx";
import { ProductQuantities } from "./ProductQuantities.tsx";
import type { QuantityLines, ReferenceData, RouteSummary } from "./types.ts";

export interface OrderDraft {
  customerId: string;
  /** Empty: the order is assigned to a route later. */
  routeId: string;
  note: string;
  lines: QuantityLines;
}

export const EMPTY_ORDER_DRAFT: OrderDraft = { customerId: ``, routeId: ``, note: ``, lines: {} };

interface OrderFormProps {
  reference: ReferenceData;
  /** Routes an order can still be added to (not loaded yet). */
  plannedRoutes: readonly RouteSummary[];
  draft: OrderDraft;
  onChange: (draft: OrderDraft) => void;
  onSubmit: () => void;
}

/** New order card. The draft is owned by the page, so it survives closing and reopening the form. */
export function OrderForm({ reference, plannedRoutes, draft, onChange, onSubmit }: OrderFormProps) {
  const hasQuantity = Object.values(draft.lines).some((qty) => qty > 0);
  return (
    <Card title={translate(`Nouvelle commande`)}>
      <div className="stack">
        <div className="grid g3">
          <Field label={translate(`Commerce`)}>
            <select value={draft.customerId} onChange={(event) => onChange({ ...draft, customerId: event.target.value })}>
              <option value="">{translate(`Choisir…`)}</option>
              {reference.customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} · {customer.zone}
                  {customer.price_list ? ` · ${customer.price_list}` : ``}
                </option>
              ))}
            </select>
          </Field>
          <Field label={translate(`Tournée (facultatif)`)}>
            <select value={draft.routeId} onChange={(event) => onChange({ ...draft, routeId: event.target.value })}>
              <option value="">{translate(`À affecter plus tard`)}</option>
              {plannedRoutes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.name} · {formatDayLong(route.day)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={translate(`Consigne de livraison`)}>
            <input type="text" value={draft.note} onChange={(event) => onChange({ ...draft, note: event.target.value })} />
          </Field>
        </div>
        <ProductQuantities
          products={reference.products}
          lines={draft.lines}
          onChange={(lines) => onChange({ ...draft, lines })}
          stockLabel={translate(`stock dépôt`)}
        />
        <div className="small muted">
          {translate(`Le prix appliqué est celui de la liste de prix du commerce, fixé à la création de la commande.`)}
        </div>
        <div>
          <button disabled={!draft.customerId || !hasQuantity} onClick={onSubmit}>
            {translate(`Créer la commande`)}
          </button>
        </div>
      </div>
    </Card>
  );
}
