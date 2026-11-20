import { Link, useParams } from "react-router-dom";
import { translate, translateCount } from "../i18n/translate.ts";
import { Badge, StatusBadge } from "../shared/Badge.tsx";
import { DataTable } from "../shared/DataTable.tsx";
import { formatDate, formatMoney } from "../shared/format.ts";
import { useApi } from "../shared/hooks.ts";
import {
  BANK_SETTLEMENT_STATUS,
  CONFIRMATION_SOURCE,
  ERP_SYNC_STATUS,
  FEE_TO_BE_AGREED,
  INVOICE_STATUS,
  ORDER_STATUS,
  PAYMENT_CHANNEL,
  PAYMENT_STATUS,
} from "../shared/labels.ts";
import { Card, PageHeader } from "../shared/Layout.tsx";
import { QueryView } from "../shared/QueryView.tsx";
import { ERP_ENTRY_KIND_LABELS } from "./labels.ts";
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
    full: translate(`Complète`),
    partial: translate(`Partielle`),
    refused: translate(`Refusée`),
  };
  return [
    [translate(`Commande`), order.number, ORDER_STATUS[order.status]?.[0] ?? order.status],
    [
      translate(`Livraison`),
      delivery ? formatDate(delivery.at, true) : `—`,
      delivery ? (deliveryOutcomes[delivery.outcome] ?? ``) : translate(`À faire`),
    ],
    [
      translate(`Facture`),
      invoice ? `${invoice.number} · ${formatMoney(invoice.amount_minor)}` : `—`,
      invoice ? INVOICE_STATUS[invoice.status]![0] : translate(`Aucune`),
    ],
    [
      translate(`Transaction`),
      payments.length ? translateCount(payments.length, `{0} tentative`, `{0} tentatives`) : `—`,
      invoice ? translate(`{0} confirmé`, formatMoney(invoice.paid_minor - invoice.refunded_minor)) : ``,
    ],
    [
      translate(`Règlement bancaire`),
      formatMoney(settled),
      invoice && settled >= invoice.amount_minor ? translate(`Réglé`) : translate(settled > 0 ? `Partiel` : `Non réglé`),
    ],
    [
      `ERP`,
      translateCount(erp.length, `{1}/{0} écriture`, `{1}/{0} écritures`, erp.filter((entry) => entry.status === `synced`).length),
      erp.some((entry) => entry.status === `failed`)
        ? translate(`En erreur`)
        : erp.length && erp.every((entry) => entry.status === `synced`)
          ? translate(`Synchronisé`)
          : translate(`En attente`),
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
            <PageHeader
              title={`${order.number} · ${order.customer}`}
              sub={
                <>
                  <Link to={back}>{translate(`← Retour`)}</Link>
                  {` · `}
                  {order.kind === `route_sale` ? translate(`Vente sur place`) : translate(`Commande`)}
                  {order.route ? ` · ${order.route}` : ``} {translate(`· créée le`)} {formatDate(order.created_at, true)}
                  {order.created_by_name ? ` ${translate(`par {0}`, order.created_by_name)}` : ``}
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
                <Card title={translate(`Lignes`)} flush>
                  <DataTable
                    rows={chain.lines}
                    rowKey={(line) => line.id}
                    empty={`—`}
                    cols={[
                      [
                        translate(`Produit`),
                        (line) => (
                          <>
                            {line.product}
                            <div className="small muted">{line.sku}</div>
                          </>
                        ),
                      ],
                      [translate(`Commandé`), (line) => line.qty_ordered, `right`],
                      [translate(`Livré`), (line) => (delivery ? line.qty_delivered : `—`), `right`],
                      [translate(`Prix`), (line) => formatMoney(line.unit_price_minor), `right`],
                      [
                        translate(`Facturé`),
                        (line) => (delivery ? formatMoney(line.qty_delivered * line.unit_price_minor) : `—`),
                        `right`,
                      ],
                    ]}
                  />
                </Card>
                <Card title={translate(`Livraison et preuve`)}>
                  {delivery ? (
                    <dl className="kv">
                      <dt>{translate(`Agent`)}</dt>
                      <dd>{delivery.agent}</dd>
                      <dt>{translate(`Date du geste`)}</dt>
                      <dd>
                        {formatDate(delivery.at, true)}{" "}
                        {delivery.offline ? (
                          <Badge kind="warn">
                            {translate(`saisi hors ligne, synchronisé`)} {formatDate(delivery.synced_at, true)}
                          </Badge>
                        ) : null}
                      </dd>
                      {delivery.reason && (
                        <>
                          <dt>{translate(`Motif`)}</dt>
                          <dd>{delivery.reason}</dd>
                        </>
                      )}
                      {delivery.returns_minor > 0 && (
                        <>
                          <dt>{translate(`Retours`)}</dt>
                          <dd>
                            {(JSON.parse(delivery.returns_json) as { qty: number; product: string }[])
                              .map((item) => `${item.qty} × ${item.product}`)
                              .join(`, `)}
                            {` · `}
                            {formatMoney(-delivery.returns_minor)}
                          </dd>
                        </>
                      )}
                      <dt>{translate(`Reçu par`)}</dt>
                      <dd>{delivery.pod_name || `—`}</dd>
                      {delivery.pod_signature && (
                        <>
                          <dt>{translate(`Signature`)}</dt>
                          <dd>
                            <img className="sigimg" src={delivery.pod_signature} alt={translate(`Signature du réceptionnaire`)} />
                          </dd>
                        </>
                      )}
                    </dl>
                  ) : (
                    <div className="muted">
                      {translate(`Pas encore livrée.`)}
                      {order.note ? translate(` Consigne : {0}`, order.note) : ``}
                    </div>
                  )}
                </Card>
              </div>
              <Card title={translate(`Transactions`)} flush>
                <DataTable
                  rows={chain.payments}
                  rowKey={(payment) => payment.id}
                  empty={translate(`Aucune tentative de paiement.`)}
                  cols={[
                    [translate(`Créée`), (payment) => formatDate(payment.created_at, true)],
                    [translate(`Moyen`), (payment) => PAYMENT_CHANNEL[payment.method]],
                    [
                      translate(`Montant`),
                      (payment) => (
                        <>
                          {formatMoney(payment.amount_minor)}
                          {payment.refunded_minor ? (
                            <div className="small muted">
                              {translate(`remboursé`)} {formatMoney(payment.refunded_minor)}
                            </div>
                          ) : null}
                        </>
                      ),
                      `right`,
                    ],
                    [
                      translate(`Paiement`),
                      (payment) => (
                        <>
                          <StatusBadge map={PAYMENT_STATUS} value={payment.status} />
                          {payment.confirmed_via && (
                            <div className="small muted">
                              {translate(`par`)} {CONFIRMATION_SOURCE[payment.confirmed_via]}
                            </div>
                          )}
                          {(payment.failure_reason || payment.verify_reason) && (
                            <div className="small muted">{translate(payment.failure_reason ?? payment.verify_reason ?? ``)}</div>
                          )}
                        </>
                      ),
                    ],
                    [
                      translate(`Règlement`),
                      (payment) =>
                        // Only money the provider confirmed can be settled by the bank.
                        [`confirmed`, `refunded`].includes(payment.status) ? (
                          <>
                            <StatusBadge map={BANK_SETTLEMENT_STATUS} value={payment.settlement_status} />
                            {payment.settled_at && <div className="small muted">{formatDate(payment.settled_at)}</div>}
                          </>
                        ) : (
                          `—`
                        ),
                    ],
                    [
                      translate(`Frais`),
                      (payment) =>
                        payment.fee_actual_minor === null ? (
                          payment.status === `confirmed` ? (
                            <span className="muted">
                              {payment.fee_expected_known ? (
                                <>
                                  {formatMoney(payment.fee_expected_minor)} {translate(`attendu`)}
                                </>
                              ) : (
                                FEE_TO_BE_AGREED
                              )}
                            </span>
                          ) : (
                            `—`
                          )
                        ) : (
                          <>
                            {formatMoney(payment.fee_actual_minor)}
                            {!payment.fee_expected_known ? (
                              <div className="small muted">{translate(`frais attendus à convenir`)}</div>
                            ) : (
                              payment.fee_actual_minor !== payment.fee_expected_minor && (
                                <div className="small muted">
                                  {translate(`attendu`)} {formatMoney(payment.fee_expected_minor)}
                                </div>
                              )
                            )}
                          </>
                        ),
                      `right`,
                    ],
                    [translate(`Référence`), (payment) => <span className="code">{payment.provider_ref ?? `—`}</span>],
                    [translate(`Agent`), (payment) => payment.agent ?? `—`],
                  ]}
                />
              </Card>
              <Card title={translate(`Écritures ERP`)} flush>
                <DataTable
                  rows={chain.erp}
                  rowKey={(entry) => entry.id}
                  empty={translate(`Aucune écriture.`)}
                  cols={[
                    [translate(`Type`), (entry) => ERP_ENTRY_KIND_LABELS[entry.kind] ?? entry.kind],
                    [translate(`Libellé`), (entry) => entry.label],
                    [translate(`Montant`), (entry) => formatMoney(entry.amount_minor), `right`],
                    [translate(`État`), (entry) => <StatusBadge map={ERP_SYNC_STATUS} value={entry.status} />],
                    [
                      translate(`Référence ERP`),
                      (entry) =>
                        entry.external_ref ? <span className="code">{entry.external_ref}</span> : (entry.last_error ?? `—`),
                    ],
                    [translate(`Tentatives`), (entry) => entry.attempts, `right`],
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
