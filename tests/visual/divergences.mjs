// Screens that differ from v0.1.0 on purpose. A matching capture is not compared pixel by pixel
// with the reference; it must still meet the requirements checked on every capture (no horizontal
// overflow, no console error, accurate demo banner). Its reference, rebuilt and diff images are
// written to tests/visual/output for review. Keep each entry as narrow as possible.
export const DIVERGENCES = [
  {
    // The back-office screens that overflowed by up to 1,160 px at 390 px in v0.1.0 (the platform
    // screens did not, and stay identical).
    ids: /^(centrale|centrale-commandes|centrale-commande|centrale-tournees|centrale-tournee|centrale-stocks|centrale-incidents|finance|finance-factures|finance-chaine|finance-rapprochement|finance-exceptions|finance-cloture|finance-erp|admin-utilisateurs|admin-parametres|admin-audit|club|club-membres|club-membre|club-cotisations|club-relances|club-barriere|club-encaissements|club-rapprochement|club-exceptions|club-export|club-erp)\.(en|fr)\.390$/,
    reason: "back office readable at 390 px without horizontal scrolling (step 1c)",
  },
];
