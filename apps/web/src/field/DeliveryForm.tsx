// Delivery of a pre-order (full, partial or refused) or, without an order, an on-the-spot sale
// from the vehicle stock; with goods returns and the proof of delivery. Produces a queued action
// (see offline-queue.ts): it is sent at once when online, kept on the phone otherwise.
import { useMemo, useState } from "react";
import { Field, formatMoney, Stepper, t } from "./legacy-bridge.js";
import { unitPrice } from "./bundle-cache.ts";
import { newActionId } from "./offline-queue.ts";
import { BackButton } from "./BackButton.tsx";
import { SignaturePad } from "./SignaturePad.tsx";
import { findCustomer } from "./route-helpers.ts";
import type { HandoverFields, Order, Product, QuantityLine, QueuedAction, RouteWork } from "./types.ts";

/** Quick reasons for a partial or refused delivery (translated once, when the module loads). */
export const DELIVERY_ISSUE_REASONS = [
  t("Commerce fermé"),
  t("Client absent"),
  t("Refus du client"),
  t("Produit endommagé"),
  t("Manque dans le véhicule"),
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
  work: RouteWork;
  /** The pre-order delivered; none for an on-the-spot sale. */
  order?: Order;
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

  const product = (productId: string): Product => productsById.get(productId)!;
  const deliveredQty = lines.reduce((sum, line) => sum + (quantities[line.key] ?? 0), 0);
  const orderedQty = lines.reduce((sum, line) => sum + line.ordered, 0);
  // Returns are credited at the customer's price.
  const returnsValue = Object.entries(returns).reduce((sum, [productId, qty]) => sum + qty * unitPrice(work, customer, product(productId)), 0);
  const total = lines.reduce((sum, line) => sum + (quantities[line.key] ?? 0) * line.price, 0) - returnsValue;
  const outcome: Outcome = order ? (deliveredQty === 0 ? "refused" : deliveredQty < orderedQty ? "partial" : "full") : "full";
  const needsReason = outcome !== "full";
  const problem =
    !order && deliveredQty === 0
      ? t("Ajoutez au moins un produit.")
      : needsReason && reason.trim().length < 3
        ? t("Indiquez le motif.")
        : outcome !== "refused" && receiverName.trim().length < 2
          ? t("Indiquez le nom du réceptionnaire.")
          : total < 0
            ? t("Les retours dépassent la valeur livrée.")
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
          id: newActionId(),
          type: "deliver",
          state: "queued",
          createdAt: handover.at,
          customerId,
          orderId: order.id,
          totalMinor: Math.max(0, total),
          items,
          label: `${t(outcome === "refused" ? "Non-livraison" : outcome === "partial" ? "Livraison partielle" : "Livraison")} ${order.number}`,
          payload: {
            orderId: order.id,
            lines: lines.map((line) => ({ lineId: line.key, qtyDelivered: quantities[line.key] ?? 0 })),
            reason: reason.trim(),
            ...handover,
          },
        }
      : {
          id: newActionId(),
          type: "sale",
          state: "queued",
          createdAt: handover.at,
          customerId,
          totalMinor: total,
          items,
          label: t("Vente sur place · {0}", customer?.name ?? ""),
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
      <h1>{order ? t("Livrer {0}", order.number) : t("Vente sur place")}</h1>
      {!order && (
        <input
          type="text"
          placeholder={t("Rechercher un produit…")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label={t("Rechercher un produit")}
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
                  {order ? t("commandé : {0}", line.ordered) : t("stock véhicule : {0}", line.max)}
                </div>
              </div>
              <Stepper
                label={t("Quantité {0}", lineProduct.name)}
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
            {t("Tout livrer")}
          </button>
          <button type="button" className="danger grow" onClick={() => setAll(() => 0)}>
            {t("Rien livré")}
          </button>
        </div>
      )}
      {needsReason && (
        <div className="card">
          <div className="body stack">
            <strong>{t(outcome === "refused" ? "Motif de non-livraison" : "Motif de la livraison partielle")}</strong>
            <div className="row">
              {DELIVERY_ISSUE_REASONS.map((quickReason) => (
                <button key={quickReason} type="button" className={`sm ${reason === quickReason ? "" : "secondary"}`} onClick={() => setReason(quickReason)}>
                  {quickReason}
                </button>
              ))}
            </div>
            <input type="text" value={reason} onChange={(event) => setReason(event.target.value)} placeholder={t("Précisez si besoin")} aria-label={t("Motif")} />
          </div>
        </div>
      )}
      {outcome !== "refused" && (
        <>
          <button type="button" className="secondary" onClick={() => setShowReturns(!showReturns)}>
            {t(showReturns ? "Masquer les retours" : "Ajouter un retour de marchandise")}
          </button>
          {showReturns && (
            <div className="card">
              <div className="body">
                <div className="small muted" style={{ marginBottom: 8 }}>
                  {t("Les retours sont déduits de la facture au tarif du commerce et soumis à validation de la centrale.")}
                </div>
                <ul className="plain">
                  {work.products.map((returned) => (
                    <li key={returned.id} className="qtyrow">
                      <div className="grow">
                        {returned.name}
                        <div className="small muted">{formatMoney(unitPrice(work, customer, returned))}</div>
                      </div>
                      <Stepper
                        label={t("Retour {0}", returned.name)}
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
              <strong>{t("Preuve de livraison")}</strong>
              <Field label={t("Nom du réceptionnaire")}>
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
              {t("Retours :")} {formatMoney(-returnsValue)}
            </div>
          )}
          <div className="small">{t(outcome === "refused" ? "Aucune facture" : "À facturer")}</div>
          <strong>{formatMoney(Math.max(0, total))}</strong>
        </div>
        <button disabled={!!problem || sending} onClick={submit}>
          {t(sending ? "Envoi…" : outcome === "refused" ? "Déclarer non livrée" : order ? "Confirmer la livraison" : "Valider la vente")}
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
