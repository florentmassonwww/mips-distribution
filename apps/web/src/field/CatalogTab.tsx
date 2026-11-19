// "Catalogue" tab: the products with the price for a chosen shop (its price list, if any) and the
// stock on board (after the actions still queued offline).
import { useState } from "react";
import { Badge, Field, formatMoney, t, unitPrice } from "./legacy-bridge.js";
import { findCustomer } from "./route-helpers.ts";
import type { RouteWork } from "./types.ts";

export function CatalogTab({ work }: { work: RouteWork }) {
  const [customerId, setCustomerId] = useState("");
  const customer = findCustomer(work, customerId);
  return (
    <div className="stack">
      <Field label={t("Prix applicables pour")}>
        <select value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
          <option value="">{t("Tarif de base")}</option>
          {work.customers.map((option) => (
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
                <strong>{formatMoney(unitPrice(work, customer, product))}</strong>
                <div>
                  {/* A negative stock means more went out than was loaded: shown as a variance. */}
                  <Badge kind={onBoard > 5 ? "ok" : onBoard > 0 ? "warn" : "err"}>
                    {onBoard > 0 ? t("{0} à bord", onBoard) : onBoard < 0 ? t("{0} (écart)", onBoard) : t("épuisé")}
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
