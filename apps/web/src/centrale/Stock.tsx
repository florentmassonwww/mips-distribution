import { useState } from "react";
import { STOCK_MOVEMENT_LABELS } from "./labels.ts";
import {
  apiRequest,
  Card,
  Field,
  formatDate,
  formatMoney,
  PageHead,
  QueryView,
  Table,
  t,
  useApi,
  useFeedback,
  useSession,
} from "./legacy.ts";
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
    <Card title={t(`Ajuster le stock · {0}`, adjustment.name)}>
      <div className="grid g3">
        <Field label={t(`Variation (négative pour une sortie)`)}>
          <input
            type="number"
            step={1}
            value={adjustment.delta}
            onChange={(event) => onChange({ ...adjustment, delta: Math.trunc(Number(event.target.value) || 0) })}
          />
        </Field>
        <Field label={t(`Motif (obligatoire)`)}>
          <input
            type="text"
            value={adjustment.reason}
            onChange={(event) => onChange({ ...adjustment, reason: event.target.value })}
            placeholder={t(`Ex. casse, inventaire, réception`)}
          />
        </Field>
        <div className="row" style={{ alignItems: `flex-end` }}>
          {/* Every adjustment is audited: a non-zero change and a reason of 3 characters or more. */}
          <button disabled={!adjustment.delta || adjustment.reason.trim().length < 3} onClick={onSave}>
            {t(`Enregistrer`)}
          </button>
          <button className="secondary" onClick={onCancel}>
            {t(`Annuler`)}
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
  const canAdjust = session.user.role !== `finance`;
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
    }, t(`Ajustement enregistré et tracé.`));

  return (
    <>
      <PageHead title={t(`Stocks`)} sub={t(`Dépôt, véhicules en tournée et mouvements.`)} />
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
            <Card title={t(`Stock par produit`)} flush>
              <Table
                rows={data.warehouse}
                rowKey={(product) => product.id}
                empty={t(`Aucun produit.`)}
                cols={[
                  [
                    t(`Produit`),
                    (product) => (
                      <>
                        {product.name}
                        <div className="small muted">
                          {product.sku} · {product.unit}
                        </div>
                      </>
                    ),
                  ],
                  [t(`Prix de base`), (product) => formatMoney(product.price_minor), `right`],
                  [t(`Au dépôt`), (product) => <strong>{product.qty}</strong>, `right`],
                  [
                    t(`Réservé (commandes)`),
                    // More reserved than in stock: some orders cannot be prepared.
                    (product) => <span className={product.reserved > product.qty ? `badge err` : ``}>{product.reserved}</span>,
                    `right`,
                  ],
                  [t(`Sur les véhicules`), (product) => product.on_vehicles, `right`],
                  [
                    ``,
                    (product) =>
                      canAdjust ? (
                        <button
                          className="sm secondary"
                          onClick={() => setAdjustment({ id: product.id, name: product.name, delta: 0, reason: `` })}
                        >
                          {t(`Ajuster`)}
                        </button>
                      ) : null,
                  ],
                ]}
              />
            </Card>
            <Card title={t(`Derniers mouvements`)} flush>
              <Table
                rows={data.movements}
                rowKey={(movement) => movement.id}
                empty={t(`Aucun mouvement.`)}
                cols={[
                  [t(`Date`), (movement) => formatDate(movement.at, true)],
                  [t(`Mouvement`), (movement) => STOCK_MOVEMENT_LABELS[movement.type] ?? movement.type],
                  [t(`Produit`), (movement) => movement.product],
                  [t(`Quantité`), (movement) => (movement.qty > 0 ? `+${movement.qty}` : movement.qty), `right`],
                  [t(`Référence`), (movement) => movement.ref ?? `—`],
                  [t(`Note`), (movement) => movement.note || `—`],
                  [t(`Par`), (movement) => movement.actor ?? `—`],
                ]}
              />
            </Card>
          </div>
        )}
      </QueryView>
    </>
  );
}
