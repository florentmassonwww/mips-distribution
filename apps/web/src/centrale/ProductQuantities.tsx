import { formatMoney, Stepper, t } from "./legacy.ts";
import type { Product, QuantityLines } from "./types.ts";

interface ProductQuantitiesProps {
  products: readonly Product[];
  lines: QuantityLines;
  onChange: (lines: QuantityLines) => void;
  /** Label of the available quantity shown under each product (e.g. "warehouse stock"). */
  stockLabel: string;
}

/** One quantity stepper per catalogue product (order lines, extra stock loaded on a vehicle). */
export function ProductQuantities({ products, lines, onChange, stockLabel }: ProductQuantitiesProps) {
  return (
    <ul className="plain">
      {products.map((product) => (
        <li key={product.id} className="qtyrow">
          <div className="grow">
            {product.name}
            <div className="small muted">
              {product.sku} · {formatMoney(product.price_minor)} · {stockLabel} : {product.qty}
            </div>
          </div>
          <Stepper
            label={t(`Quantité {0}`, product.name)}
            value={lines[product.id] ?? 0}
            max={1e5}
            onChange={(qty) => onChange({ ...lines, [product.id]: qty })}
          />
        </li>
      ))}
    </ul>
  );
}
