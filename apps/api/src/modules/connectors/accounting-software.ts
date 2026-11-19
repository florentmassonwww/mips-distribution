// Demo accounting software (ERP): accepts every entry, unless the company settings ask it to
// simulate an outage, so the retry flow can be shown.
import { createHash } from "node:crypto";
import type { AccountingEntry, AccountingSoftware, ErpSettings } from "./types.ts";

export const demoAccountingSoftware: AccountingSoftware = {
  label: "ERP de démonstration",
  demo: true,
  toVerify: [
    "ERP cible, version, et interface d'écriture disponible (API, fichier d'échange, middleware). Pour un club équipé d'un logiciel comptable : édition, outil d'import et droits d'accès.",
    "Plan comptable, journaux et comptes de tiers à utiliser ; traitement de la TVA.",
    "Clé d'idempotence acceptée par l'ERP pour qu'une reprise ne crée pas de doublon.",
    "Sens de la référence maître (clients, articles, prix) : l'ERP ou cette application.",
  ],
  async push(entry: AccountingEntry, settings: ErpSettings): Promise<{ externalRef: string }> {
    if (settings.simulateFailure) throw Error("ERP de démonstration indisponible (panne simulée dans les paramètres).");
    // Derived from the entry id: pushing the same entry again yields the same reference.
    return { externalRef: `ERP-DEMO-${createHash("sha256").update(entry.id).digest("hex").slice(0, 8).toUpperCase()}` };
  },
};
