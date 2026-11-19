// Collecting an invoice: amount (partial allowed), payment method, then follow-up of the attempt
// (QR code, payment link or terminal) until the provider confirms it. Online only: a payment is
// "paid" only once the provider confirms it, never on the agent's word.
import { useState } from "react";
import {
  api,
  CONFIRMED_VIA_LABELS,
  Field,
  formatMoney,
  INVOICE_STATUS,
  moneyInputValue,
  parseMoney,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS,
  QueryView,
  StatusBadge,
  t,
  useApi,
  useSession,
  useUi,
} from "./legacy-bridge.js";
import { newActionId } from "./offline-queue.ts";
import { BackButton } from "./BackButton.tsx";
import { PaymentQrCode } from "./PaymentQrCode.tsx";
import { amountDue } from "./route-helpers.ts";
import type { PaymentMethodOption, Receipt, ReceiptPayment, SimulationResult } from "./types.ts";

/** The receipt is polled every 2.5 s: the provider's confirmation arrives on the server. */
const RECEIPT_POLL_MS = 2500;

interface PaymentPanelProps {
  invoiceId: string;
  methods: PaymentMethodOption[];
  online: boolean;
  /** Back to the invoice's stop (or to the route when unknown). */
  onBack: (customerId?: string) => void;
  onReceipt: () => void;
}

export function PaymentPanel({ invoiceId, methods, online, onBack, onReceipt }: PaymentPanelProps) {
  const { session } = useSession();
  const ui = useUi();
  const receipt = useApi<Receipt>(online ? `/api/invoices/${invoiceId}/receipt` : null, RECEIPT_POLL_MS);
  const [amountText, setAmountText] = useState<string | null>(null);
  // Idempotency key of the next attempt (suffixed with the method): a double tap or a retry after a
  // network error cannot create two attempts. Renewed once an attempt is accepted.
  const [attemptKey, setAttemptKey] = useState(newActionId);
  const [starting, setStarting] = useState(false);

  if (!online) {
    return (
      <div className="stack">
        <BackButton onClick={() => onBack()}>{t("Retour")}</BackButton>
        <div className="notice warn">
          {t("Hors ligne : aucun paiement électronique ne peut être lancé ni confirmé. La facture reste « non payée » et pourra être encaissée au retour du réseau.")}
        </div>
      </div>
    );
  }

  const start = async (method: string, amountMinor: number | null) => {
    setStarting(true);
    const ok = await ui.run(() =>
      api("POST", "/api/payments", { invoiceId, method, amountMinor, idempotencyKey: `${attemptKey}-${method}` }),
    );
    if (ok) {
      setAttemptKey(newActionId());
      setAmountText(null);
    }
    await receipt.reload();
    setStarting(false);
  };

  const postThenReload = (url: string, successMessage?: string) =>
    ui.run(async () => {
      await api("POST", url);
      await receipt.reload();
    }, successMessage);

  // Demo: plays the customer and the provider (notifications go through the signed webhook).
  const simulate = (paymentId: string, outcome: string) =>
    ui.run(async () => {
      const answer = await api<SimulationResult>("POST", `/api/demo/payments/${paymentId}/simulate`, { outcome });
      const outcomes: Record<string, string | undefined> = {
        confirmed: t("paiement confirmé"),
        failed: t("paiement refusé"),
        duplicate: t("notification en double ignorée"),
        no_notification: t("payé chez le prestataire, notification perdue"),
        amount_mismatch: t("montant notifié incohérent"),
        already_confirmed: t("déjà confirmé"),
      };
      ui.toast(t("Prestataire simulé : {0}", outcomes[answer.result] ?? answer.result));
      await receipt.reload();
    });

  const resendNotification = (paymentId: string) =>
    ui.run(async () => {
      const answer = await api<SimulationResult>("POST", `/api/demo/payments/${paymentId}/simulate`, { outcome: "duplicate" });
      ui.toast(answer.result === "duplicate" ? t("Notification renvoyée : reconnue comme doublon, rien n'est ajouté.") : answer.result);
      await receipt.reload();
    });

  return (
    <QueryView q={receipt}>
      {(data) => {
        const invoice = data.invoice;
        const due = amountDue(invoice);
        // At most one attempt in progress: a new one is offered only when none is pending or doubtful.
        const open = data.payments.find((payment) => payment.status === "pending" || payment.status === "to_verify");
        const last = data.payments[data.payments.length - 1];
        const amountValue = amountText ?? moneyInputValue(due);
        const amountMinor = parseMoney(amountValue);
        const amountValid = amountMinor !== null && amountMinor > 0 && amountMinor <= due;
        return (
          <div className="stack">
            <BackButton onClick={() => onBack(invoice.customer_id)}>{invoice.customer}</BackButton>
            <div className="row spread">
              <h1>{invoice.number}</h1>
              <StatusBadge map={INVOICE_STATUS} value={invoice.status} />
            </div>
            <div className="duebox">
              <div className="small">{t(due > 0 ? "Reste à encaisser" : "Facture soldée")}</div>
              <div className="amount">{formatMoney(Math.max(0, due))}</div>
              {due !== invoice.amount_minor && (
                <div className="small">
                  {t("sur")} {formatMoney(invoice.amount_minor)}
                </div>
              )}
            </div>
            {open && (
              <OpenPaymentCard
                payment={open}
                invoice={invoice}
                demoMode={session.demoMode}
                onPost={postThenReload}
                onSimulate={(outcome) => simulate(open.id, outcome)}
                onCopy={(link) => ui.run(() => navigator.clipboard.writeText(link), t("Lien copié."))}
              />
            )}
            {!open && last?.status === "failed" && due > 0 && (
              <div className="notice err" role="alert">
                <strong>{t("Dernier paiement échoué")}</strong> ({PAYMENT_METHOD_LABELS[last.method]}) : {t(last.failureReason ?? "")}{" "}
                {t("La facture reste due.")}
              </div>
            )}
            {!open && last?.status === "confirmed" && (
              <div className="success">
                <div className="big">{t("Paiement confirmé")}</div>
                <div>
                  {formatMoney(last.amountMinor)} · {PAYMENT_METHOD_LABELS[last.method]}
                </div>
                <div className="small">
                  {t("Confirmé par")} {CONFIRMED_VIA_LABELS[last.confirmedVia ?? ""] ?? t("le prestataire")}
                  {t(". Le règlement en banque est suivi par la finance.")}
                </div>
                {session.demoMode && (
                  <button className="sm secondary" style={{ marginTop: 10 }} onClick={() => resendNotification(last.id)}>
                    {t("Démo : renvoyer la notification")}
                  </button>
                )}
              </div>
            )}
            {!open && due > 0 && (
              <div className="card">
                <div className="body stack">
                  <Field
                    label={t("Montant à encaisser (Rs)")}
                    hint={
                      amountMinor !== null && amountMinor < due && amountMinor > 0
                        ? t("Paiement partiel : il restera {0}.", formatMoney(due - amountMinor))
                        : amountValid
                          ? undefined
                          : t("Montant invalide ou supérieur au reste dû.")
                    }
                  >
                    <input type="text" inputMode="decimal" value={amountValue} aria-invalid={!amountValid} onChange={(event) => setAmountText(event.target.value)} />
                  </Field>
                  <div className="methods">
                    {methods.map((option) => (
                      <button key={option.method} disabled={!amountValid || starting} onClick={() => start(option.method, amountMinor)}>
                        {PAYMENT_METHOD_LABELS[option.method] ?? option.label}
                      </button>
                    ))}
                  </div>
                  <div className="small muted">
                    {t("Aucune donnée de carte n'est saisie dans cette application. Le paiement n'est « payé » qu'après confirmation du prestataire.")}
                  </div>
                </div>
              </div>
            )}
            <button className="secondary" onClick={onReceipt}>
              {t("Voir le reçu")}
            </button>
          </div>
        );
      }}
    </QueryView>
  );
}

interface OpenPaymentCardProps {
  payment: ReceiptPayment;
  invoice: Receipt["invoice"];
  demoMode: boolean;
  onPost: (url: string, successMessage?: string) => void;
  onSimulate: (outcome: string) => void;
  onCopy: (link: string) => void;
}

/** The attempt in progress (pending) or in doubt (to verify), with its presentation and checks. */
function OpenPaymentCard({ payment, invoice, demoMode, onPost, onSimulate, onCopy }: OpenPaymentCardProps) {
  const presentation = payment.presentation;
  return (
    <div className="card">
      <div className="body stack">
        <div className="row spread">
          <strong>
            {PAYMENT_METHOD_LABELS[payment.method]} · {formatMoney(payment.amountMinor)}
          </strong>
          <StatusBadge map={PAYMENT_STATUS} value={payment.status} />
        </div>
        {payment.status === "pending" && (
          <>
            {presentation.kind !== "terminal" && presentation.value && <PaymentQrCode value={presentation.value} />}
            {presentation.kind === "terminal" && (
              <div className="terminal">
                {t("Terminal de paiement")}
                <br />
                <strong>{formatMoney(payment.amountMinor)}</strong>
              </div>
            )}
            <p>{t(presentation.instructions)}</p>
            {presentation.kind === "url" && <PaymentLink link={presentation.value ?? ""} payment={payment} invoice={invoice} onCopy={onCopy} />}
            <div className="small muted">
              {t("Référence prestataire :")} <span className="code">{payment.providerRef}</span>{" "}
              {t("· en attente de la confirmation du prestataire…")}
            </div>
            <button className="secondary" onClick={() => onPost(`/api/payments/${payment.id}/check`)}>
              {t("Vérifier auprès du prestataire")}
            </button>
            {/* A screenshot proves nothing: the payment only goes "to verify", never "paid". */}
            <button
              className="secondary"
              onClick={() => onPost(`/api/payments/${payment.id}/claim`, t("Paiement placé « à vérifier ». Aucune confirmation n'est enregistrée."))}
            >
              {t("Le client montre une capture d'écran")}
            </button>
            <button className="danger" onClick={() => onPost(`/api/payments/${payment.id}/cancel`)}>
              {t("Annuler cette tentative")}
            </button>
          </>
        )}
        {payment.status === "to_verify" && (
          <>
            <div className="notice warn">
              <strong>{t("À vérifier.")}</strong> {t(payment.verifyReason ?? "")}{" "}
              {t("Ce paiement n'est pas confirmé : ne le considérez pas comme encaissé. Aucune nouvelle tentative n'est possible tant que le doute n'est pas levé, pour éviter un double débit.")}
            </div>
            <button className="secondary" onClick={() => onPost(`/api/payments/${payment.id}/check`)}>
              {t("Interroger le prestataire")}
            </button>
          </>
        )}
        {demoMode && (
          <div className="demo-box">
            <strong>{t("Simulateur de prestataire (démonstration)")}</strong>
            <div className="small">
              {t("Tient le rôle du client et du prestataire. Les notifications passent par le webhook signé, comme en réel.")}
            </div>
            <div className="row">
              <button className="sm" onClick={() => onSimulate("success")}>
                {t("Paiement réussi")}
              </button>
              <button className="sm secondary" onClick={() => onSimulate("failure")}>
                {t("Paiement refusé")}
              </button>
              <button className="sm secondary" onClick={() => onSimulate("lost_notification")}>
                {t("Réussi, notification perdue")}
              </button>
              <button className="sm secondary" onClick={() => onSimulate("wrong_amount")}>
                {t("Montant incohérent")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface PaymentLinkProps {
  link: string;
  payment: ReceiptPayment;
  invoice: Receipt["invoice"];
  onCopy: (link: string) => void;
}

/** Payment link sent to the customer: copy, share (when the phone can) or open. */
function PaymentLink({ link, payment, invoice, onCopy }: PaymentLinkProps) {
  return (
    <div className="stack">
      <div className="code">{link}</div>
      <div className="row">
        <button className="secondary grow" onClick={() => onCopy(link)}>
          {t("Copier le lien")}
        </button>
        {typeof navigator.share === "function" && (
          <button
            className="secondary grow"
            onClick={() =>
              void navigator
                .share({
                  title: t("Paiement {0}", invoice.number),
                  text: `${invoice.company} : ${formatMoney(payment.amountMinor)} pour ${invoice.number}`,
                  url: link,
                })
                .catch(() => null)
            }
          >
            {t("Partager")}
          </button>
        )}
        <a className="btn secondary grow" href={link} target="_blank" rel="noreferrer">
          {t("Ouvrir")}
        </a>
      </div>
    </div>
  );
}
