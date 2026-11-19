// Receipt of an invoice: delivered lines, returns, collections and proof of delivery; printable
// and shareable. Online only (built by the server).
import { formatDate, formatMoney, INVOICE_STATUS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS, QueryView, StatusBadge, t, useApi, useSession } from "./legacy-bridge.js";
import { BackButton } from "./BackButton.tsx";
import { amountDue } from "./route-helpers.ts";
import type { Receipt } from "./types.ts";

interface ReceiptScreenProps {
  invoiceId: string;
  online: boolean;
  onBack: (customerId?: string) => void;
  onPay: () => void;
}

export function ReceiptScreen({ invoiceId, online, onBack, onPay }: ReceiptScreenProps) {
  const { session } = useSession();
  const receipt = useApi<Receipt>(online ? `/api/invoices/${invoiceId}/receipt` : null);

  if (!online) {
    return (
      <div className="stack">
        <BackButton onClick={() => onBack()}>{t("Retour")}</BackButton>
        <div className="notice warn">{t("Reçu indisponible hors ligne.")}</div>
      </div>
    );
  }

  return (
    <QueryView q={receipt}>
      {(data) => {
        const invoice = data.invoice;
        const due = amountDue(invoice);
        const collected = invoice.paid_minor - invoice.refunded_minor;
        return (
          <div className="stack">
            <div className="noprint">
              <BackButton onClick={() => onBack(invoice.customer_id)}>{invoice.customer}</BackButton>
            </div>
            <div className="receipt">
              <div className="row spread">
                <div>
                  <strong>{invoice.company}</strong>
                  <div className="small muted">
                    {t("Reçu ·")} {invoice.number} {t("· commande")} {invoice.order_number}
                  </div>
                </div>
                <StatusBadge map={INVOICE_STATUS} value={invoice.status} />
              </div>
              {session.demoMode && <div className="small muted">{t("Document de démonstration, sans valeur fiscale.")}</div>}
              <hr />
              <div>
                <strong>{invoice.customer}</strong>
                <div className="small muted">
                  {invoice.address} · {formatDate(invoice.issued_at, true)}
                </div>
              </div>
              <table>
                <tbody>
                  {data.lines
                    .filter((line) => line.qty_delivered > 0)
                    .map((line) => (
                      <tr key={line.product}>
                        <td>
                          {line.product}
                          <div className="small muted">
                            {line.qty_delivered} × {formatMoney(line.unit_price_minor)}
                            {line.qty_delivered < line.qty_ordered ? t(" (commandé : {0})", line.qty_ordered) : ""}
                          </div>
                        </td>
                        <td className="right nowrap">{formatMoney(line.qty_delivered * line.unit_price_minor)}</td>
                      </tr>
                    ))}
                  {data.delivery?.returns.map((returned) => (
                    <tr key={`r-${returned.product}`}>
                      <td>
                        {t("Retour ·")} {returned.product}
                        <div className="small muted">
                          {returned.qty} × {formatMoney(returned.unitPriceMinor)}
                        </div>
                      </td>
                      <td className="right nowrap">{formatMoney(-returned.qty * returned.unitPriceMinor)}</td>
                    </tr>
                  ))}
                  <tr className="total">
                    <td>{t("Total")}</td>
                    <td className="right nowrap">{formatMoney(invoice.amount_minor)}</td>
                  </tr>
                </tbody>
              </table>
              <hr />
              <strong>{t("Encaissements")}</strong>
              {data.payments.length === 0 && <div className="small muted">{t("Aucun encaissement.")}</div>}
              {data.payments.map((payment) => (
                <div key={payment.id} className="row spread small">
                  <span>
                    {PAYMENT_METHOD_LABELS[payment.method]} · {formatDate(payment.createdAt, true)}
                    {payment.providerRef ? (
                      <>
                        {" · "}
                        <span className="code">{payment.providerRef}</span>
                      </>
                    ) : null}
                  </span>
                  <span className="nowrap">
                    {formatMoney(payment.amountMinor)} <StatusBadge map={PAYMENT_STATUS} value={payment.status} />
                  </span>
                </div>
              ))}
              <div className="row spread">
                <span>{t("Encaissé (confirmé par le prestataire)")}</span>
                <strong>{formatMoney(collected)}</strong>
              </div>
              {due > 0 && (
                <div className="row spread">
                  <span>{t("Reste dû")}</span>
                  <strong>{formatMoney(due)}</strong>
                </div>
              )}
              {data.delivery?.pod_name && (
                <>
                  <hr />
                  <div className="small">
                    {t("Reçu par")} <strong>{data.delivery.pod_name}</strong> {t("le")} {formatDate(data.delivery.at, true)}
                  </div>
                  {data.delivery.pod_signature && <img className="sigimg" src={data.delivery.pod_signature} alt={t("Signature du réceptionnaire")} />}
                </>
              )}
            </div>
            <div className="row noprint">
              {due > 0 && (
                <button className="grow" onClick={onPay}>
                  {t("Encaisser")}
                </button>
              )}
              <button className="secondary grow" onClick={() => window.print()}>
                {t("Imprimer")}
              </button>
              {typeof navigator.share === "function" && (
                <button
                  className="secondary grow"
                  onClick={() =>
                    void navigator
                      .share({
                        title: t("Reçu {0}", invoice.number),
                        text: t(
                          "{0} - {1} - {2}\nMontant : {3}\nÉtat : {4}\nEncaissé (confirmé) : {5}",
                          invoice.company,
                          invoice.number,
                          invoice.customer,
                          formatMoney(invoice.amount_minor),
                          INVOICE_STATUS[invoice.status]?.[0],
                          formatMoney(collected),
                        ),
                      })
                      .catch(() => null)
                  }
                >
                  {t("Partager")}
                </button>
              )}
            </div>
          </div>
        );
      }}
    </QueryView>
  );
}
