import { useState } from "react";
import { STOCK_MOVEMENT_LABELS } from "./labels.ts";
import { translate } from "../i18n/translate.ts";
import { apiRequest } from "../shared/api.ts";
import { DataTable } from "../shared/DataTable.tsx";
import { useFeedback } from "../shared/Feedback.tsx";
import { Field } from "../shared/Form.tsx";
import { formatDate, formatMoney } from "../shared/format.ts";
import { useApi } from "../shared/hooks.ts";
import { Card, PageHeader } from "../shared/Layout.tsx";
import { QueryView } from "../shared/QueryView.tsx";
import { useSession } from "../shared/session.ts";
import type { StockData } from "./types.ts";

const REFRESH_MS = 1e4;

/** Stock adjustment being entered for one product. */
interface Adjustment {
  id: string;
  name: string;
  /** Signed quantity: negative for goods leaving the warehouse. */
  delta: number;
  reason: string;
}

interface AdjustmentCardProps {
  adjustment: Adjustment;
  onChange: (adjustment: Adjustment) => void;
  onSave: () => void;
  onCancel: () => void;
}

function AdjustmentCard({ adjustment, onChange, onSave, onCancel }: AdjustmentCardProps) {
  return (
    <Card title={translate(`Ajuster le stock · {0}`, adjustment.name)}>
      <div className="grid g3">
        <Field label={translate(`Variation (négative pour une sortie)`)}>
          <input
            type="number"
            step={1}
            value={adjustment.delta}
            onChange={(event) => onChange({ ...adjustment, delta: Math.trunc(Number(event.target.value) || 0) })}
          />
        </Field>
        <Field label={translate(`Motif (obligatoire)`)}>
          <input
            type="text"
            value={adjustment.reason}
            onChange={(event) => onChange({ ...adjustment, reason: event.target.value })}
            placeholder={translate(`Ex. casse, inventaire, réception`)}
          />
        </Field>
        <div className="row" style={{ alignItems: `flex-end` }}>
          {/* Every adjustment is audited: a non-zero change and a reason of 3 characters or more. */}
          <button disabled={!adjustment.delta || adjustment.reason.trim().length < 3} onClick={onSave}>
            {translate(`Enregistrer`)}
          </button>
          <button className="secondary" onClick={onCancel}>
            {translate(`Annuler`)}
          </button>
        </div>
      </div>
    </Card>
  );
}

/** Stock: warehouse quantities, reservations, stock on vehicles, movements; manual adjustments. */
export function Stock() {
  const feedback = useFeedback();
  const { session } = useSession();
  const canAdjust = session.user!.role !== `finance`;
  const stock = useApi<StockData>(`/api/centrale/stock`, REFRESH_MS);
  const [adjustment, setAdjustment] = useState<Adjustment | null>(null);

  const saveAdjustment = (current: Adjustment) =>
    feedback.run(async () => {
      await apiRequest(`POST`, `/api/centrale/stock/adjust`, {
        productId: current.id,
        delta: current.delta,
        reason: current.reason,
      });
      setAdjustment(null);
      await stock.reload();
    }, translate(`Ajustement enregistré et tracé.`));

  return (
    <>
      <PageHeader title={translate(`Stocks`)} sub={translate(`Dépôt, véhicules en tournée et mouvements.`)} />
      <QueryView q={stock}>
        {(data) => (
          <div className="stack">
            {adjustment && (
              <AdjustmentCard
                adjustment={adjustment}
                onChange={setAdjustment}
                onSave={() => saveAdjustment(adjustment)}
                onCancel={() => setAdjustment(null)}
              />
            )}
            <Card title={translate(`Stock par produit`)} flush>
              <DataTable
                rows={data.warehouse}
                rowKey={(product) => product.id}
                empty={translate(`Aucun produit.`)}
                cols={[
                  [
                    translate(`Produit`),
                    (product) => (
                      <>
                        {product.name}
                        <div className="small muted">
                          {product.sku} · {product.unit}
                        </div>
                      </>
                    ),
                  ],
                  [translate(`Prix de base`), (product) => formatMoney(product.price_minor), `right`],
                  [translate(`Au dépôt`), (product) => <strong>{product.qty}</strong>, `right`],
                  [
                    translate(`Réservé (commandes)`),
                    // More reserved than in stock: some orders cannot be prepared.
                    (product) => <span className={product.reserved > product.qty ? `badge err` : ``}>{product.reserved}</span>,
                    `right`,
                  ],
                  [translate(`Sur les véhicules`), (product) => product.on_vehicles, `right`],
                  [
                    ``,
                    (product) =>
                      canAdjust ? (
                        <button
                          className="sm secondary"
                          onClick={() => setAdjustment({ id: product.id, name: product.name, delta: 0, reason: `` })}
                        >
                          {translate(`Ajuster`)}
                        </button>
                      ) : null,
                  ],
                ]}
              />
            </Card>
            <Card title={translate(`Derniers mouvements`)} flush>
              <DataTable
                rows={data.movements}
                rowKey={(movement) => movement.id}
                empty={translate(`Aucun mouvement.`)}
                cols={[
                  [translate(`Date`), (movement) => formatDate(movement.at, true)],
                  [translate(`Mouvement`), (movement) => STOCK_MOVEMENT_LABELS[movement.type] ?? movement.type],
                  [translate(`Produit`), (movement) => movement.product],
                  [translate(`Quantité`), (movement) => (movement.qty > 0 ? `+${movement.qty}` : movement.qty), `right`],
                  [translate(`Référence`), (movement) => movement.ref ?? `—`],
                  [translate(`Note`), (movement) => movement.note || `—`],
                  [translate(`Par`), (movement) => movement.actor ?? `—`],
                ]}
              />
            </Card>
          </div>
        )}
      </QueryView>
    </>
  );
}
