// "Catalogue" tab: the products with the price for a chosen shop (its price list, if any) and the
// stock on board (after the actions still queued offline).
import { useState } from "react";
import { translate } from "../i18n/translate.ts";
import { Badge } from "../shared/Badge.tsx";
import { Field } from "../shared/Form.tsx";
import { formatMoney } from "../shared/format.ts";
import { type LocalRouteView, unitPrice } from "../shared/offline.ts";
import { findCustomerOutlet } from "./route-helpers.ts";

export function CatalogTab({ work }: { work: LocalRouteView }) {
  const [customerOutletId, setCustomerOutletId] = useState("");
  const outlet = findCustomerOutlet(work, customerOutletId);
  return (
    <div className="stack">
      <Field label={translate("Prix applicables pour")}>
        <select value={customerOutletId} onChange={(event) => setCustomerOutletId(event.target.value)}>
          <option value="">{translate("Tarif de base")}</option>
          {work.customer_outlets.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </Field>
      <ul className="plain">
        {work.products.map((product) => {
          const onBoard = work.stock[product.id] ?? 0;
          return (
            <li key={product.id} className="row spread">
              <div>
                <strong>{product.name}</strong>
                <div className="small muted">
                  {product.sku} · {product.unit}
                </div>
              </div>
              <div className="right">
                <strong>{formatMoney(unitPrice(work, outlet, product))}</strong>
                <div>
                  {/* A negative stock means more went out than was loaded: shown as a variance. */}
                  <Badge kind={onBoard > 5 ? "ok" : onBoard > 0 ? "warn" : "err"}>
                    {onBoard > 0 ? translate("{0} à bord", onBoard) : onBoard < 0 ? translate("{0} (écart)", onBoard) : translate("épuisé")}
                  </Badge>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
