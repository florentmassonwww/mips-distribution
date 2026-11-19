// Public payment-link page (/payer/:token), opened by the customer without signing in.
import { useParams } from "react-router-dom";
import { translate } from "../i18n/translate.ts";
import { apiRequest } from "../shared/api.ts";
import { StatusBadge } from "../shared/Badge.tsx";
import { useFeedback } from "../shared/Feedback.tsx";
import { formatMoney } from "../shared/format.ts";
import { useApi } from "../shared/hooks.ts";
import { PAYMENT_STATUS } from "../shared/labels.ts";
import { LanguageToggle } from "../shared/LanguageToggle.tsx";
import { QueryView } from "../shared/QueryView.tsx";

/** GET /api/public/pay/:token */
interface PaymentLink {
  status: string;
  amount_minor: number;
  currency: string;
  expires_at: string | null;
  company: string;
  invoice: string;
  demoMode: boolean;
}

/** Polling interval: the status changes when the provider confirms the payment. */
const POLL_MS = 3000;

export function PublicPaymentPage() {
  const { token } = useParams();
  const ui = useFeedback();
  const link = useApi<PaymentLink>(`/api/public/pay/${token}`, POLL_MS);

  const simulate = (outcome: "success" | "failure") =>
    ui.run(async () => {
      await apiRequest("POST", `/api/public/pay/${token}/demo`, { outcome });
      await link.reload();
    });

  return (
    <div className="mobile stack">
      <div className="mobile-head">
        <div className="row spread">
          <h1>{translate("Paiement")}</h1>
          <LanguageToggle />
        </div>
        <div className="muted">{translate("Lien sécurisé à usage unique")}</div>
      </div>
      <QueryView q={link}>
        {(payment) => (
          <div className="card">
            <div className="body stack">
              <div className="row spread">
                <strong>{payment.company}</strong>
                <StatusBadge map={PAYMENT_STATUS} value={payment.status} />
              </div>
              <div className="duebox">
                <div className="small">
                  {translate("Facture")} {payment.invoice}
                </div>
                <div className="amount">{formatMoney(payment.amount_minor)}</div>
              </div>
              {payment.status === "pending" && payment.demoMode && (
                <>
                  <div className="notice warn">
                    {translate(
                      "Page de démonstration. En production, le client est dirigé vers la page de paiement hébergée par le prestataire : aucune donnée de carte n'est saisie ni conservée par cette application.",
                    )}
                  </div>
                  <button className="big" onClick={() => simulate("success")}>
                    {translate("Simuler un paiement réussi")}
                  </button>
                  <button className="big secondary" onClick={() => simulate("failure")}>
                    {translate("Simuler un paiement refusé")}
                  </button>
                </>
              )}
              {payment.status === "confirmed" && (
                <div className="success">
                  <div className="big">{translate("Paiement confirmé")}</div>
                  <div>{translate("Merci. Le distributeur a reçu la confirmation.")}</div>
                </div>
              )}
              {payment.status === "failed" && (
                <div className="notice err">{translate("Ce paiement n'a pas abouti. Demandez un nouveau lien au distributeur.")}</div>
              )}
              {payment.status === "to_verify" && (
                <div className="notice warn">{translate("Ce paiement est en cours de vérification par le distributeur.")}</div>
              )}
            </div>
          </div>
        )}
      </QueryView>
    </div>
  );
}
