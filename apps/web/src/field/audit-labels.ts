// Labels of the audit actions recorded around routes, deliveries and payments (shown in the
// back office's history). Translated once, when the module loads, like v0.1.0.
import { t } from "./legacy-bridge.js";

export const AUDIT_ACTION_LABELS: Record<string, string | undefined> = {
  "delivery.full": t("Livraison"),
  "delivery.partial": t("Livraison partielle"),
  "delivery.refused": t("Non-livraison"),
  "payment.initiated": t("Paiement lancé"),
  "payment.confirmed": t("Paiement confirmé"),
  "payment.failed": t("Paiement échoué"),
  "payment.to_verify": t("Paiement à vérifier"),
  "payment.settled": t("Règlement bancaire"),
  "payment.refunded": t("Remboursement"),
  "route.created": t("Tournée créée"),
  "route.loaded": t("Véhicule chargé"),
  "route.started": t("Tournée démarrée"),
  "route.closed": t("Tournée clôturée"),
  "route.updated": t("Tournée modifiée"),
};
