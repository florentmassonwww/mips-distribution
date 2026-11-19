// Labels of the audit actions recorded around routes, deliveries and payments (shown in the
// back office's history). Translated once, when the module loads, like v0.1.0.
import { translate } from "../i18n/translate.ts";

export const AUDIT_ACTION_LABELS: Record<string, string | undefined> = {
  "delivery.full": translate("Livraison"),
  "delivery.partial": translate("Livraison partielle"),
  "delivery.refused": translate("Non-livraison"),
  "payment.initiated": translate("Paiement lancé"),
  "payment.confirmed": translate("Paiement confirmé"),
  "payment.failed": translate("Paiement échoué"),
  "payment.to_verify": translate("Paiement à vérifier"),
  "payment.settled": translate("Règlement bancaire"),
  "payment.refunded": translate("Remboursement"),
  "route.created": translate("Tournée créée"),
  "route.loaded": translate("Véhicule chargé"),
  "route.started": translate("Tournée démarrée"),
  "route.closed": translate("Tournée clôturée"),
  "route.updated": translate("Tournée modifiée"),
};
