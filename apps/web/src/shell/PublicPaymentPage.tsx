// Public payment-link page (/payer/:token), opened by the customer without signing in.
import { useParams } from "react-router-dom";
import { K } from "../legacy/i18n.js";
import {
  J as api,
  W_ as PAYMENT_STATUSES,
  X as formatMoney,
  Y as useQuery,
  _v as useUi,
  lv as StatusBadge,
  pv as Loaded,
  yv as LanguageToggle,
} from "../legacy/shared.js";

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
  const ui = useUi();
  const link = useQuery<PaymentLink>(`/api/public/pay/${token}`, POLL_MS);

  const simulate = (outcome: "success" | "failure") =>
    ui.run(async () => {
      await api("POST", `/api/public/pay/${token}/demo`, { outcome });
      await link.reload();
    });

  return (
    <div className="mobile stack">
      <div className="mobile-head">
        <div className="row spread">
          <h1>{K("Paiement")}</h1>
          <LanguageToggle />
        </div>
        <div className="muted">{K("Lien sécurisé à usage unique")}</div>
      </div>
      <Loaded q={link}>
        {(payment) => (
          <div className="card">
            <div className="body stack">
              <div className="row spread">
                <strong>{payment.company}</strong>
                <StatusBadge map={PAYMENT_STATUSES} value={payment.status} />
              </div>
              <div className="duebox">
                <div className="small">
                  {K("Facture")} {payment.invoice}
                </div>
                <div className="amount">{formatMoney(payment.amount_minor)}</div>
              </div>
              {payment.status === "pending" && payment.demoMode && (
                <>
                  <div className="notice warn">
                    {K(
                      "Page de démonstration. En production, le client est dirigé vers la page de paiement hébergée par le prestataire : aucune donnée de carte n'est saisie ni conservée par cette application.",
                    )}
                  </div>
                  <button className="big" onClick={() => simulate("success")}>
                    {K("Simuler un paiement réussi")}
                  </button>
                  <button className="big secondary" onClick={() => simulate("failure")}>
                    {K("Simuler un paiement refusé")}
                  </button>
                </>
              )}
              {payment.status === "confirmed" && (
                <div className="success">
                  <div className="big">{K("Paiement confirmé")}</div>
                  <div>{K("Merci. Le distributeur a reçu la confirmation.")}</div>
                </div>
              )}
              {payment.status === "failed" && (
                <div className="notice err">{K("Ce paiement n'a pas abouti. Demandez un nouveau lien au distributeur.")}</div>
              )}
              {payment.status === "to_verify" && (
                <div className="notice warn">{K("Ce paiement est en cours de vérification par le distributeur.")}</div>
              )}
            </div>
          </div>
        )}
      </Loaded>
    </div>
  );
}
