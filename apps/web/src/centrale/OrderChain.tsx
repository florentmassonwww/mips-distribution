import { Link, useParams } from "react-router-dom";
import { ERP_ENTRY_KIND_LABELS } from "./labels.ts";
import {
  Badge,
  Card,
  CONFIRMED_VIA_LABELS,
  ERP_STATUS,
  formatDate,
  formatMoney,
  INVOICE_STATUS,
  ORDER_STATUS,
  PageHead,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS,
  QueryView,
  SETTLEMENT_STATUS,
  StatusBadge,
  Table,
  t,
  useApi,
} from "./legacy.ts";
import type { OrderChainData } from "./types.ts";

type ChainStep = readonly [label: string, value: string, state: string];

/** The steps from order to accounting entry, each with its main value and its state. */
function chainSteps(chain: OrderChainData): ChainStep[] {
  const { order, delivery, invoice, payments, erp } = chain;
  // Money actually credited by the bank (net of refunds).
  const settled = payments
    .filter((payment) => payment.settlement_status === `settled`)
    .reduce((sum, payment) => sum + payment.amount_minor - payment.refunded_minor, 0);
  const deliveryOutcomes: Record<string, string> = {
    full: t(`Complète`),
    partial: t(`Partielle`),
    refused: t(`Refusée`),
  };
  return [
    [t(`Commande`), order.number, ORDER_STATUS[order.status]?.[0] ?? order.status],
    [
      t(`Livraison`),
      delivery ? formatDate(delivery.at, true) : `—`,
      delivery ? (deliveryOutcomes[delivery.outcome] ?? ``) : t(`À faire`),
    ],
    [
      t(`Facture`),
      invoice ? `${invoice.number} · ${formatMoney(invoice.amount_minor)}` : `—`,
      invoice ? INVOICE_STATUS[invoice.status]![0] : t(`Aucune`),
    ],
    [
      t(`Transaction`),
      payments.length ? `${payments.length} tentative(s)` : `—`,
      invoice ? t(`{0} confirmé`, formatMoney(invoice.paid_minor - invoice.refunded_minor)) : ``,
    ],
    [
      t(`Règlement bancaire`),
      formatMoney(settled),
      invoice && settled >= invoice.amount_minor ? t(`Réglé`) : t(settled > 0 ? `Partiel` : `Non réglé`),
    ],
    [
      `ERP`,
      `${erp.filter((entry) => entry.status === `synced`).length}/${erp.length} écriture(s)`,
      erp.some((entry) => entry.status === `failed`)
        ? t(`En erreur`)
        : erp.length && erp.every((entry) => entry.status === `synced`)
          ? t(`Synchronisé`)
          : t(`En attente`),
    ],
  ];
}

interface OrderChainProps {
  /** Page the "back" link returns to (orders list or invoices). */
  back: string;
}

/** Full chain of one order: delivery and proof, invoice, payment attempts, bank settlement, ERP. */
export function OrderChain({ back }: OrderChainProps) {
  const { id } = useParams();
  const chainQuery = useApi<OrderChainData>(`/api/chain/${id}`);
  return (
    <QueryView q={chainQuery}>
      {(chain) => {
        const { order, delivery } = chain;
        return (
          <>
            <PageHead
              title={`${order.number} · ${order.customer}`}
              sub={
                <>
                  <Link to={back}>{t(`← Retour`)}</Link>
                  {` · `}
                  {order.kind === `route_sale` ? t(`Vente sur place`) : t(`Commande`)}
                  {order.route ? ` · ${order.route}` : ``} {t(`· créée le`)} {formatDate(order.created_at, true)}
                  {order.created_by_name ? ` par ${order.created_by_name}` : ``}
                </>
              }
            />
            <div className="stack">
              <ol className="chain">
                {chainSteps(chain).map(([label, value, state]) => (
                  <li key={label}>
                    <div className="small muted">{label}</div>
                    <strong>{value}</strong>
                    <div className="small">{state}</div>
                  </li>
                ))}
              </ol>
              <div className="grid g2">
                <Card title={t(`Lignes`)} flush>
                  <Table
                    rows={chain.lines}
                    rowKey={(line) => line.id}
                    empty={`—`}
                    cols={[
                      [
                        t(`Produit`),
                        (line) => (
                          <>
                            {line.product}
                            <div className="small muted">{line.sku}</div>
                          </>
                        ),
                      ],
                      [t(`Commandé`), (line) => line.qty_ordered, `right`],
                      [t(`Livré`), (line) => (delivery ? line.qty_delivered : `—`), `right`],
                      [t(`Prix`), (line) => formatMoney(line.unit_price_minor), `right`],
                      [
                        t(`Facturé`),
                        (line) => (delivery ? formatMoney(line.qty_delivered * line.unit_price_minor) : `—`),
                        `right`,
                      ],
                    ]}
                  />
                </Card>
                <Card title={t(`Livraison et preuve`)}>
                  {delivery ? (
                    <dl className="kv">
                      <dt>{t(`Agent`)}</dt>
                      <dd>{delivery.agent}</dd>
                      <dt>{t(`Date du geste`)}</dt>
                      <dd>
                        {formatDate(delivery.at, true)}{" "}
                        {delivery.offline ? (
                          <Badge kind="warn">
                            {t(`saisi hors ligne, synchronisé`)} {formatDate(delivery.synced_at, true)}
                          </Badge>
                        ) : null}
                      </dd>
                      {delivery.reason && (
                        <>
                          <dt>{t(`Motif`)}</dt>
                          <dd>{delivery.reason}</dd>
                        </>
                      )}
                      {delivery.returns_minor > 0 && (
                        <>
                          <dt>{t(`Retours`)}</dt>
                          <dd>
                            {(JSON.parse(delivery.returns_json) as { qty: number; product: string }[])
                              .map((item) => `${item.qty} × ${item.product}`)
                              .join(`, `)}
                            {` · `}
                            {formatMoney(-delivery.returns_minor)}
                          </dd>
                        </>
                      )}
                      <dt>{t(`Reçu par`)}</dt>
                      <dd>{delivery.pod_name || `—`}</dd>
                      {delivery.pod_signature && (
                        <>
                          <dt>{t(`Signature`)}</dt>
                          <dd>
                            <img className="sigimg" src={delivery.pod_signature} alt={t(`Signature du réceptionnaire`)} />
                          </dd>
                        </>
                      )}
                    </dl>
                  ) : (
                    <div className="muted">
                      {t(`Pas encore livrée.`)}
                      {order.note ? t(` Consigne : {0}`, order.note) : ``}
                    </div>
                  )}
                </Card>
              </div>
              <Card title={t(`Transactions`)} flush>
                <Table
                  rows={chain.payments}
                  rowKey={(payment) => payment.id}
                  empty={t(`Aucune tentative de paiement.`)}
                  cols={[
                    [t(`Créée`), (payment) => formatDate(payment.created_at, true)],
                    [t(`Moyen`), (payment) => PAYMENT_METHOD_LABELS[payment.method]],
                    [
                      t(`Montant`),
                      (payment) => (
                        <>
                          {formatMoney(payment.amount_minor)}
                          {payment.refunded_minor ? (
                            <div className="small muted">
                              {t(`remboursé`)} {formatMoney(payment.refunded_minor)}
                            </div>
                          ) : null}
                        </>
                      ),
                      `right`,
                    ],
                    [
                      t(`Paiement`),
                      (payment) => (
                        <>
                          <StatusBadge map={PAYMENT_STATUS} value={payment.status} />
                          {payment.confirmed_via && (
                            <div className="small muted">
                              {t(`par`)} {CONFIRMED_VIA_LABELS[payment.confirmed_via]}
                            </div>
                          )}
                          {(payment.failure_reason || payment.verify_reason) && (
                            <div className="small muted">{t(payment.failure_reason ?? payment.verify_reason ?? ``)}</div>
                          )}
                        </>
                      ),
                    ],
                    [
                      t(`Règlement`),
                      (payment) =>
                        // Only money the provider confirmed can be settled by the bank.
                        [`confirmed`, `refunded`].includes(payment.status) ? (
                          <>
                            <StatusBadge map={SETTLEMENT_STATUS} value={payment.settlement_status} />
                            {payment.settled_at && <div className="small muted">{formatDate(payment.settled_at)}</div>}
                          </>
                        ) : (
                          `—`
                        ),
                    ],
                    [
                      t(`Frais`),
                      (payment) =>
                        payment.fee_actual_minor === null ? (
                          payment.status === `confirmed` ? (
                            <span className="muted">
                              {formatMoney(payment.fee_expected_minor)} {t(`attendu`)}
                            </span>
                          ) : (
                            `—`
                          )
                        ) : (
                          <>
                            {formatMoney(payment.fee_actual_minor)}
                            {payment.fee_actual_minor !== payment.fee_expected_minor && (
                              <div className="small muted">
                                {t(`attendu`)} {formatMoney(payment.fee_expected_minor)}
                              </div>
                            )}
                          </>
                        ),
                      `right`,
                    ],
                    [t(`Référence`), (payment) => <span className="code">{payment.provider_ref ?? `—`}</span>],
                    [t(`Agent`), (payment) => payment.agent ?? `—`],
                  ]}
                />
              </Card>
              <Card title={t(`Écritures ERP`)} flush>
                <Table
                  rows={chain.erp}
                  rowKey={(entry) => entry.id}
                  empty={t(`Aucune écriture.`)}
                  cols={[
                    [t(`Type`), (entry) => ERP_ENTRY_KIND_LABELS[entry.kind] ?? entry.kind],
                    [t(`Libellé`), (entry) => entry.label],
                    [t(`Montant`), (entry) => formatMoney(entry.amount_minor), `right`],
                    [t(`État`), (entry) => <StatusBadge map={ERP_STATUS} value={entry.status} />],
                    [
                      t(`Référence ERP`),
                      (entry) =>
                        entry.external_ref ? <span className="code">{entry.external_ref}</span> : (entry.last_error ?? `—`),
                    ],
                    [t(`Tentatives`), (entry) => entry.attempts, `right`],
                  ]}
                />
              </Card>
            </div>
          </>
        );
      }}
    </QueryView>
  );
}
