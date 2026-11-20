// Display labels of the API's enumerations. Status maps give [label, badge kind] for StatusBadge.
// Labels are translated once at startup (the language never changes without a reload).
import { translate } from "../i18n/translate.ts";
import { isClubOnly } from "./modules.ts";
import type { BadgeKind } from "./Badge.tsx";

export type StatusEntry = readonly [label: string, kind: BadgeKind];
export type StatusMap = Readonly<Record<string, StatusEntry>>;
export type LabelMap = Readonly<Record<string, string>>;

export const INVOICE_STATUS: StatusMap = {
  unpaid: [translate("Non payé"), ""],
  pending: [translate("En attente"), "info"],
  to_verify: [translate("À vérifier"), "warn"],
  partially_paid: [translate("Partiellement payé"), "info"],
  paid: [translate("Payé"), "ok"],
  failed: [translate("Échoué"), "err"],
  refunded: [translate("Remboursé"), ""],
};

export const PAYMENT_STATUS: StatusMap = {
  pending: [translate("En attente"), "info"],
  to_verify: [translate("À vérifier"), "warn"],
  confirmed: [translate("Confirmé"), "ok"],
  failed: [translate("Échoué"), "err"],
  refunded: [translate("Remboursé"), ""],
};

export const BANK_SETTLEMENT_STATUS: StatusMap = {
  unsettled: [translate("Non réglé en banque"), "warn"],
  settled: [translate("Réglé en banque"), "ok"],
};

export const ORDER_STATUS: StatusMap = {
  confirmed: [translate("À préparer"), "warn"],
  prepared: [translate("Préparée"), "info"],
  loaded: [translate("Chargée"), "info"],
  delivered: [translate("Livrée"), "ok"],
  partially_delivered: [translate("Livrée partiellement"), "warn"],
  refused: [translate("Non livrée"), "err"],
  cancelled: [translate("Annulée"), ""],
};

export const ROUTE_STATUS: StatusMap = {
  planned: [translate("Planifiée"), ""],
  loaded: [translate("Chargée"), "info"],
  in_progress: [translate("En cours"), "ok"],
  closed: [translate("Clôturée"), ""],
};

export const ERP_SYNC_STATUS: StatusMap = {
  pending: [translate("En attente"), "info"],
  synced: [translate("Synchronisée"), "ok"],
  failed: [translate("En erreur"), "err"],
};

export const RECONCILIATION_STATUS: StatusMap = {
  matched: [translate("Rapproché"), "ok"],
  unmatched: [translate("Sans correspondance"), "err"],
  amount_mismatch: [translate("Écart de montant"), "warn"],
  duplicate: [translate("Doublon"), "err"],
};

export const PAYMENT_CHANNEL: LabelMap = {
  paystation: "PayStation",
  card_tpe: translate("Carte (TPE)"),
  juice: "Juice",
  link: translate("Lien de paiement"),
};

const ROLE: LabelMap = {
  platform_admin: translate("Administrateur plateforme"),
  company_admin: translate("Administrateur"),
  dispatcher: translate("Centrale"),
  finance: translate("Finance"),
  agent: translate("Agent terrain"),
};

export const EXCEPTION_TYPE: LabelMap = {
  delivery_partial: translate("Livraison partielle"),
  delivery_refused: translate("Non-livraison"),
  return: translate("Retour de marchandise"),
  stock_variance: translate("Écart de stock"),
  price_mismatch: translate("Écart de prix"),
  payment_to_verify: translate("Paiement à vérifier"),
  amount_mismatch: translate("Montant notifié incohérent"),
  overpayment: translate("Trop-perçu"),
  conflicting_notification: translate("Notification contradictoire"),
  unknown_credit: translate("Crédit inconnu"),
  duplicate_settlement: translate("Règlement en double"),
  credit_on_failed: translate("Crédit sur paiement échoué"),
  settlement_amount_mismatch: translate("Écart de montant réglé"),
  fee_variance: translate("Écart de frais"),
  erp_sync_failed: translate("Erreur ERP"),
  reference_invalid: translate("Référence de membre incorrecte"),
  unidentified_transfer: translate("Virement non identifié"),
};

/** How a payment was confirmed (shown in lower case inside a sentence). */
export const CONFIRMATION_SOURCE: LabelMap = {
  notification: translate("notification signée"),
  status_query: translate("interrogation du prestataire"),
  bank_statement: translate("relevé bancaire"),
  cash_desk: translate("remise au bureau du club"),
  manual_assignment: translate("affectation par la comptabilité"),
};

/** Shown instead of an expected fee while the provider's fee is to be agreed: no figure is assumed. */
export const FEE_TO_BE_AGREED = translate("à convenir");

/** A club names the same roles after its own departments. */
const CLUB_ROLE: LabelMap = {
  company_admin: translate("Direction du club"),
  dispatcher: translate("Secrétariat"),
  finance: translate("Comptabilité"),
  agent: translate("Accueil et barrière"),
};

/** Role label for the company's modules (club names for a club alone); unknown roles shown as is. */
export const roleLabel = (role: string, modules?: readonly string[] | null): string =>
  (isClubOnly(modules) ? CLUB_ROLE[role] : undefined) ?? ROLE[role] ?? role;

export const MEMBER_STATUS: StatusMap = {
  active: [translate("Actif"), "ok"],
  suspended: [translate("Suspendu"), "err"],
  resigned: [translate("Résilié"), ""],
};

export const MEMBER_PAYMENT_METHOD: LabelMap = {
  link: translate("Paiement en ligne"),
  bank_transfer: translate("Virement"),
  cash: translate("Espèces"),
};

export const CLUB_OUTLET: LabelMap = {
  restaurant: translate("Restaurant"),
  bar: translate("Bar"),
  tennis: translate("Tennis"),
  squash: translate("Squash"),
  golf: translate("Golf"),
  shop: translate("Boutique"),
  events: translate("Événements"),
  other: translate("Autre"),
};

export const ACCESS_DECISION: StatusMap = {
  allow: [translate("Entrée autorisée"), "ok"],
  flag: [translate("Entrée signalée"), "warn"],
  deny: [translate("Entrée refusée"), "err"],
};

export const MEMBER_CHARGE_KIND: LabelMap = {
  dues: translate("Cotisation"),
  consumption: translate("Consommation"),
  fee: translate("Frais"),
};

export const MEMBER_CHARGE_STATUS: StatusMap = {
  open: [translate("À régler"), "warn"],
  paid: [translate("Réglé"), "ok"],
  cancelled: [translate("Annulé"), ""],
};
