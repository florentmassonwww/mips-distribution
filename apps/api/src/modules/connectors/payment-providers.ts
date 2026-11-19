// Descriptions of the supported payment providers: labels, capabilities, open questions for the
// real integration, and how a request is presented to the customer. Shared by the simulator and,
// later, by real adapters.
import type { InitiatePaymentRequest, PaymentMethod, PaymentPresentation, ProviderCapabilities } from "./types.ts";

export interface PaymentProviderSpec {
  method: PaymentMethod;
  label: string;
  /** Prefix of the simulated provider references, e.g. `PS-DEMO-…`. */
  prefix: string;
  capabilities: ProviderCapabilities;
  toVerify: string[];
  present(request: InitiatePaymentRequest, providerRef: string): PaymentPresentation;
}

const paystation: PaymentProviderSpec = {
  method: "paystation",
  label: "PayStation",
  prefix: "PS",
  capabilities: { onSite: true, remote: false, refund: true, cancel: true, statusQuery: true },
  toVerify: [
    "Mode d'intégration depuis une application mobile tierce (API, SDK ou appel d'application) et parcours exact présenté au client.",
    "Format, signature et politique de renvoi des notifications de paiement ; existence d'une interrogation de statut serveur à serveur.",
    "Prise en charge d'une clé d'idempotence à l'initiation, de l'annulation d'une demande en attente et du remboursement partiel.",
    "Référence reprise sur le relevé bancaire, délai et compte de règlement (compte MCB du distributeur : à confirmer par circuit).",
  ],
  present: (request, providerRef) => ({
    kind: "qr",
    value: `DEMO-PAYSTATION:${providerRef}:${request.amountMinor}`,
    instructions: "Présentez ce code au client. Il valide le paiement sur son téléphone.",
  }),
};

const cardTerminal: PaymentProviderSpec = {
  method: "card_tpe",
  label: "Carte bancaire (TPE)",
  prefix: "TPE",
  capabilities: { onSite: true, remote: false, refund: true, cancel: true, statusQuery: true },
  toVerify: [
    "Modèles de TPE compatibles et mode de liaison avec le téléphone de l'agent (Bluetooth, réseau, cloud) ; certification requise le cas échéant.",
    "Transmission du montant et de la référence de facture au terminal, et retour du résultat sans ressaisie.",
    "Périmètre PCI DSS : l'application ne doit jamais voir, saisir ni stocker de numéro de carte ; seule la référence d'autorisation est conservée.",
    "Annulation avant télécollecte, remboursement, et référence reprise sur le relevé d'acquisition.",
  ],
  present: (_request, providerRef) => ({
    kind: "terminal",
    value: providerRef,
    instructions:
      "Montant envoyé au terminal. Le client présente ou insère sa carte sur le TPE ; aucune donnée de carte n'est saisie dans l'application.",
  }),
};

const juice: PaymentProviderSpec = {
  method: "juice",
  label: "Juice",
  prefix: "JCE",
  // Cancelling a pending request is assumed unavailable until confirmed with the provider.
  capabilities: { onSite: true, remote: true, refund: true, cancel: false, statusQuery: true },
  toVerify: [
    "Disponibilité d'une interface marchand permettant d'initier une demande de paiement et d'en recevoir la confirmation (API, QR dynamique ou autre).",
    "Notification serveur signée ou interrogation de statut : sans l'une des deux, le paiement reste « à vérifier » jusqu'au relevé.",
    "Possibilité d'annuler une demande en attente (supposée indisponible dans l'adaptateur de démonstration).",
    "Référence de transaction visible côté client et sur le relevé, plafonds et délai de règlement.",
  ],
  present: (request, providerRef) => ({
    kind: "app_request",
    value: `DEMO-JUICE:${providerRef}:${request.amountMinor}`,
    instructions: "Le client scanne ce code ou valide la demande dans son application. Une capture d'écran ne vaut pas confirmation.",
  }),
};

const paymentLink: PaymentProviderSpec = {
  method: "link",
  label: "Paiement par lien",
  prefix: "LNK",
  capabilities: { onSite: true, remote: true, refund: true, cancel: true, statusQuery: true },
  toVerify: [
    "Prestataire de la page de paiement hébergée et moyens acceptés sur cette page.",
    "Durée de validité du lien, usage unique, et annulation d'un lien non payé.",
    "Notification signée à la confirmation et référence reprise sur le relevé bancaire.",
  ],
  present: (request) => ({
    kind: "url",
    value: request.payUrl ?? "",
    instructions: "Partagez ce lien au client ou présentez le code sur place. Le paiement se fait sur la page hébergée du prestataire.",
  }),
};

/** In the order of PAYMENT_METHODS. */
export const PAYMENT_PROVIDER_SPECS: PaymentProviderSpec[] = [paystation, cardTerminal, juice, paymentLink];
