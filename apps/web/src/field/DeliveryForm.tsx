// Delivery of a pre-order (full, partial or refused) or, without an order, an on-the-spot sale
// from the vehicle stock; with goods returns and the proof of delivery. Produces a queued action
// (see offline-queue.ts): it is sent at once when online, kept on the phone otherwise.
import { useMemo, useState } from "react";
import { translate } from "../i18n/translate.ts";
import { Field, Stepper } from "../shared/Form.tsx";
import { formatMoney } from "../shared/format.ts";
import { BackButton } from "./BackButton.tsx";
import { SignaturePad } from "./SignaturePad.tsx";
import { findCustomer } from "./route-helpers.ts";
import {
  type BundleOrder,
  type BundleProduct,
  type HandoverFields,
  type LocalRouteView,
  newId,
  type QuantityLine,
  type QueuedAction,
  unitPrice,
} from "../shared/offline.ts";

/** Quick reasons for a partial or refused delivery (translated once, when the module loads). */
export const DELIVERY_ISSUE_REASONS = [
  translate("Commerce fermé"),
  translate("Client absent"),
  translate("Refus du client"),
  translate("Produit endommagé"),
  translate("Manque dans le véhicule"),
];

/** One quantity row: an order line, or a product of the catalogue for a sale. */
interface FormLine {
  key: string;
  productId: string;
  max: number;
  price: number;
  ordered: number;
}

type Outcome = "full" | "partial" | "refused";

interface DeliveryFormProps {
  work: LocalRouteView;
  /** The pre-order delivered; none for an on-the-spot sale. */
  order?: BundleOrder;
  customerId: string;
  onCancel: (customerId: string) => void;
  onSubmit: (action: QueuedAction) => Promise<void>;
}

export function DeliveryForm({ work, order, customerId, onCancel, onSubmit }: DeliveryFormProps) {
  const customer = findCustomer(work, customerId);
  const productsById = useMemo(() => new Map(work.products.map((product) => [product.id, product])), [work.products]);
  // A delivery cannot exceed what was ordered; a sale cannot exceed the stock on board.
  const lines = useMemo<FormLine[]>(
    () =>
      order
        ? order.lines.map((line) => ({
            key: line.id,
            productId: line.product_id,
            max: line.qty_ordered,
            price: line.unit_price_minor,
            ordered: line.qty_ordered,
          }))
        : work.products.map((product) => ({
            key: product.id,
            productId: product.id,
            max: Math.max(0, work.stock[product.id] ?? 0),
            price: unitPrice(work, customer, product),
            ordered: 0,
          })),
    [order, work, customer],
  );
  const [quantities, setQuantities] = useState<Record<string, number | undefined>>(() =>
    Object.fromEntries(lines.map((line) => [line.key, line.ordered])),
  );
  const [returns, setReturns] = useState<Record<string, number>>({});
  const [showReturns, setShowReturns] = useState(false);
  const [reason, setReason] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);

  const product = (productId: string): BundleProduct => productsById.get(productId)!;
  const deliveredQty = lines.reduce((sum, line) => sum + (quantities[line.key] ?? 0), 0);
  const orderedQty = lines.reduce((sum, line) => sum + line.ordered, 0);
  // Returns are credited at the customer's price.
  const returnsValue = Object.entries(returns).reduce((sum, [productId, qty]) => sum + qty * unitPrice(work, customer, product(productId)), 0);
  const total = lines.reduce((sum, line) => sum + (quantities[line.key] ?? 0) * line.price, 0) - returnsValue;
  const outcome: Outcome = order ? (deliveredQty === 0 ? "refused" : deliveredQty < orderedQty ? "partial" : "full") : "full";
  const needsReason = outcome !== "full";
  const problem =
    !order && deliveredQty === 0
      ? translate("Ajoutez au moins un produit.")
      : needsReason && reason.trim().length < 3
        ? translate("Indiquez le motif.")
        : outcome !== "refused" && receiverName.trim().length < 2
          ? translate("Indiquez le nom du réceptionnaire.")
          : total < 0
            ? translate("Les retours dépassent la valeur livrée.")
            : null;

  const submit = async () => {
    setSending(true);
    const items: QuantityLine[] = lines
      .filter((line) => (quantities[line.key] ?? 0) > 0)
      .map((line) => ({ productId: line.productId, qty: quantities[line.key] ?? 0 }));
    const returnLines: QuantityLine[] = Object.entries(returns)
      .filter(([, qty]) => qty > 0)
      .map(([productId, qty]) => ({ productId, qty }));
    // Key order matters: it is the JSON stored on the phone and sent to the server.
    const handover: HandoverFields = {
      returns: outcome === "refused" ? [] : returnLines,
      pod: { name: receiverName.trim(), signature: outcome === "refused" ? null : signature, note: "" },
      at: new Date().toISOString(),
      expectedTotalMinor: Math.max(0, total),
    };
    const action: QueuedAction = order
      ? {
          id: newId(),
          type: "deliver",
          state: "queued",
          createdAt: handover.at,
          customerId,
          orderId: order.id,
          totalMinor: Math.max(0, total),
          items,
          label: `${translate(outcome === "refused" ? "Non-livraison" : outcome === "partial" ? "Livraison partielle" : "Livraison")} ${order.number}`,
          payload: {
            orderId: order.id,
            lines: lines.map((line) => ({ lineId: line.key, qtyDelivered: quantities[line.key] ?? 0 })),
            reason: reason.trim(),
            ...handover,
          },
        }
      : {
          id: newId(),
          type: "sale",
          state: "queued",
          createdAt: handover.at,
          customerId,
          totalMinor: total,
          items,
          label: translate("Vente sur place · {0}", customer?.name ?? ""),
          payload: { routeId: work.route.id, customerId, lines: items, ...handover },
        };
    try {
      await onSubmit(action);
    } finally {
      setSending(false);
    }
  };

  const shownLines = lines.filter((line) => order || !search || product(line.productId).name.toLowerCase().includes(search.toLowerCase()));
  const setAll = (qty: (line: FormLine) => number) => setQuantities(Object.fromEntries(lines.map((line) => [line.key, qty(line)])));

  return (
    <div className="stack">
      <BackButton onClick={() => onCancel(customerId)}>{customer?.name}</BackButton>
      <h1>{order ? translate("Livrer {0}", order.number) : translate("Vente sur place")}</h1>
      {!order && (
        <input
          type="text"
          placeholder={translate("Rechercher un produit…")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label={translate("Rechercher un produit")}
        />
      )}
      <ul className="plain">
        {shownLines.map((line) => {
          const lineProduct = product(line.productId);
          return (
            <li key={line.key} className="qtyrow">
              <div className="grow">
                <strong>{lineProduct.name}</strong>
                <div className="small muted">
                  {lineProduct.unit} · {formatMoney(line.price)}
                  {" · "}
                  {order ? translate("commandé : {0}", line.ordered) : translate("stock véhicule : {0}", line.max)}
                </div>
              </div>
              <Stepper
                label={translate("Quantité {0}", lineProduct.name)}
                value={quantities[line.key] ?? 0}
                max={line.max}
                onChange={(qty) => setQuantities((current) => ({ ...current, [line.key]: qty }))}
              />
            </li>
          );
        })}
      </ul>
      {order && (
        <div className="row">
          <button type="button" className="secondary grow" onClick={() => setAll((line) => line.ordered)}>
            {translate("Tout livrer")}
          </button>
          <button type="button" className="danger grow" onClick={() => setAll(() => 0)}>
            {translate("Rien livré")}
          </button>
        </div>
      )}
      {needsReason && (
        <div className="card">
          <div className="body stack">
            <strong>{translate(outcome === "refused" ? "Motif de non-livraison" : "Motif de la livraison partielle")}</strong>
            <div className="row">
              {DELIVERY_ISSUE_REASONS.map((quickReason) => (
                <button key={quickReason} type="button" className={`sm ${reason === quickReason ? "" : "secondary"}`} onClick={() => setReason(quickReason)}>
                  {quickReason}
                </button>
              ))}
            </div>
            <input type="text" value={reason} onChange={(event) => setReason(event.target.value)} placeholder={translate("Précisez si besoin")} aria-label={translate("Motif")} />
          </div>
        </div>
      )}
      {outcome !== "refused" && (
        <>
          <button type="button" className="secondary" onClick={() => setShowReturns(!showReturns)}>
            {translate(showReturns ? "Masquer les retours" : "Ajouter un retour de marchandise")}
          </button>
          {showReturns && (
            <div className="card">
              <div className="body">
                <div className="small muted" style={{ marginBottom: 8 }}>
                  {translate("Les retours sont déduits de la facture au tarif du commerce et soumis à validation de la centrale.")}
                </div>
                <ul className="plain">
                  {work.products.map((returned) => (
                    <li key={returned.id} className="qtyrow">
                      <div className="grow">
                        {returned.name}
                        <div className="small muted">{formatMoney(unitPrice(work, customer, returned))}</div>
                      </div>
                      <Stepper
                        label={translate("Retour {0}", returned.name)}
                        value={returns[returned.id] ?? 0}
                        max={999}
                        onChange={(qty) => setReturns((current) => ({ ...current, [returned.id]: qty }))}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <div className="card">
            <div className="body stack">
              <strong>{translate("Preuve de livraison")}</strong>
              <Field label={translate("Nom du réceptionnaire")}>
                <input type="text" value={receiverName} onChange={(event) => setReceiverName(event.target.value)} autoComplete="off" />
              </Field>
              <SignaturePad onChange={setSignature} />
            </div>
          </div>
        </>
      )}
      <div className="totalbar">
        <div>
          {returnsValue > 0 && (
            <div className="small">
              {translate("Retours :")} {formatMoney(-returnsValue)}
            </div>
          )}
          <div className="small">{translate(outcome === "refused" ? "Aucune facture" : "À facturer")}</div>
          <strong>{formatMoney(Math.max(0, total))}</strong>
        </div>
        <button disabled={!!problem || sending} onClick={submit}>
          {translate(sending ? "Envoi…" : outcome === "refused" ? "Déclarer non livrée" : order ? "Confirmer la livraison" : "Valider la vente")}
        </button>
      </div>
      {problem && (
        <div className="small muted" role="status">
          {problem}
        </div>
      )}
    </div>
  );
}
