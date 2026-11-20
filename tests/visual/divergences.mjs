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
  // Counts read naturally ("4 stops", "3 autorisées", "0 failed attempts") instead of "(s)" forms,
  // and texts that bypassed the translation are translated. Only these words change; table columns
  // and line wraps follow the new text width.
  { ids: /^(terrain\.en\.1280|terrain\.en\.1366|terrain\.en\.1920|terrain\.en\.390|terrain\.fr\.1280|terrain\.fr\.1366|terrain\.fr\.1920|terrain\.fr\.390)$/, reason: "real plurals and translated texts (step 1c)" },
  { ids: /^(centrale\.en\.1280|centrale\.en\.1366|centrale\.en\.1920|centrale\.en\.390|centrale\.fr\.1280|centrale\.fr\.1366|centrale\.fr\.1920|centrale\.fr\.390)$/, reason: "real plurals and translated texts (step 1c)" },
  { ids: /^(centrale-commande\.en\.1280|centrale-commande\.en\.1366|centrale-commande\.en\.1920|centrale-commande\.en\.390|centrale-commande\.fr\.1280|centrale-commande\.fr\.1366|centrale-commande\.fr\.1920|centrale-commande\.fr\.390)$/, reason: "real plurals and translated texts (step 1c)" },
  { ids: /^(centrale-tournee\.en\.1280|centrale-tournee\.en\.1366|centrale-tournee\.en\.1920|centrale-tournee\.en\.390|centrale-tournee\.fr\.1280|centrale-tournee\.fr\.1366|centrale-tournee\.fr\.1920|centrale-tournee\.fr\.390)$/, reason: "real plurals and translated texts (step 1c)" },
  { ids: /^(finance-factures\.en\.1280|finance-factures\.en\.1366|finance-factures\.en\.1920|finance-factures\.en\.390|finance-factures\.fr\.1280|finance-factures\.fr\.1366|finance-factures\.fr\.1920|finance-factures\.fr\.390)$/, reason: "real plurals and translated texts (step 1c)" },
  { ids: /^(finance-chaine\.en\.1280|finance-chaine\.en\.1366|finance-chaine\.en\.1920|finance-chaine\.en\.390|finance-chaine\.fr\.1280|finance-chaine\.fr\.1366|finance-chaine\.fr\.1920|finance-chaine\.fr\.390)$/, reason: "real plurals and translated texts (step 1c)" },
  { ids: /^(finance-cloture\.en\.1280|finance-cloture\.en\.1366|finance-cloture\.en\.1920|finance-cloture\.en\.390|finance-cloture\.fr\.1280|finance-cloture\.fr\.1366|finance-cloture\.fr\.1920|finance-cloture\.fr\.390)$/, reason: "real plurals and translated texts (step 1c)" },
  { ids: /^(plateforme\.en\.1280|plateforme\.en\.1366|plateforme\.en\.1920|plateforme\.fr\.1280|plateforme\.fr\.1366|plateforme\.fr\.1920)$/, reason: "real plurals and translated texts (step 1c)" },
  { ids: /^(club\.en\.1280|club\.en\.1366|club\.en\.1920|club\.en\.390|club\.fr\.1280|club\.fr\.1366|club\.fr\.1920|club\.fr\.390)$/, reason: "real plurals and translated texts (step 1c)" },
  { ids: /^(club-barriere\.en\.1280|club-barriere\.en\.1366|club-barriere\.en\.1920|club-barriere\.en\.390|club-barriere\.fr\.1280|club-barriere\.fr\.1366|club-barriere\.fr\.1920|club-barriere\.fr\.390)$/, reason: "real plurals and translated texts (step 1c)" },
  { ids: /^(club-export\.en\.1280|club-export\.en\.1366|club-export\.en\.1920|club-export\.en\.390|club-export\.fr\.1280|club-export\.fr\.1366|club-export\.fr\.1920|club-export\.fr\.390)$/, reason: "real plurals and translated texts (step 1c)" },
  { ids: /^(membre-public\.en\.1280|membre-public\.en\.1366|membre-public\.en\.1920|membre-public\.en\.390|membre-public\.fr\.1280|membre-public\.fr\.1366|membre-public\.fr\.1920|membre-public\.fr\.390)$/, reason: "real plurals and translated texts (step 1c)" },
  // Step 2: modules, sites and fees to be agreed. Each list holds the exact captures that differ;
  // the diff images were reviewed one by one.
  // finance: journal: expected fees read "to be agreed", fees charged by the demo bank are 0.
  { ids: /^(finance\.en\.1280|finance\.en\.1366|finance\.en\.1920|finance\.fr\.1280|finance\.fr\.1366|finance\.fr\.1920)$/, reason: "modules, sites and fees to be agreed (step 2)" },
  // finance-rapprochement: statement lines: no fee deducted, expected fee "to be agreed".
  { ids: /^(finance-rapprochement\.en\.1280|finance-rapprochement\.en\.1366|finance-rapprochement\.en\.1920|finance-rapprochement\.fr\.1280|finance-rapprochement\.fr\.1366|finance-rapprochement\.fr\.1920)$/, reason: "modules, sites and fees to be agreed (step 2)" },
  // finance-erp: bank settlements booked without fees (demo statements charge none while fees are to be agreed).
  { ids: /^(finance-erp\.en\.1280|finance-erp\.en\.1366|finance-erp\.en\.1920|finance-erp\.fr\.1280|finance-erp\.fr\.1366|finance-erp\.fr\.1920)$/, reason: "modules, sites and fees to be agreed (step 2)" },
  // admin-utilisateurs: Sites link in the administration navigation.
  { ids: /^(admin-utilisateurs\.en\.1280|admin-utilisateurs\.en\.1366|admin-utilisateurs\.en\.1920|admin-utilisateurs\.fr\.1280|admin-utilisateurs\.fr\.1366|admin-utilisateurs\.fr\.1920)$/, reason: "modules, sites and fees to be agreed (step 2)" },
  // admin-parametres: Sites link; subscription modules; fees "to be agreed".
  { ids: /^(admin-parametres\.en\.1280|admin-parametres\.en\.1366|admin-parametres\.en\.1920|admin-parametres\.fr\.1280|admin-parametres\.fr\.1366|admin-parametres\.fr\.1920)$/, reason: "modules, sites and fees to be agreed (step 2)" },
  // admin-audit: Sites link in the administration navigation; settlement fees of 0 in the audit details.
  { ids: /^(admin-audit\.en\.1280|admin-audit\.en\.1366|admin-audit\.en\.1920|admin-audit\.fr\.1280|admin-audit\.fr\.1366|admin-audit\.fr\.1920)$/, reason: "modules, sites and fees to be agreed (step 2)" },
  // plateforme: modules per company, Modules action and module checkboxes on creation.
  { ids: /^(plateforme\.en\.390|plateforme\.fr\.390)$/, reason: "modules, sites and fees to be agreed (step 2)" },
  // club-membres: Sites link in the administration navigation.
  { ids: /^(club-membres\.en\.1280|club-membres\.en\.1366|club-membres\.en\.1920|club-membres\.fr\.1280|club-membres\.fr\.1366|club-membres\.fr\.1920)$/, reason: "modules, sites and fees to be agreed (step 2)" },
  // club-membre: Sites link in the administration navigation.
  { ids: /^(club-membre\.en\.1280|club-membre\.en\.1366|club-membre\.en\.1920|club-membre\.fr\.1280|club-membre\.fr\.1366|club-membre\.fr\.1920)$/, reason: "modules, sites and fees to be agreed (step 2)" },
  // club-cotisations: Sites link in the administration navigation.
  { ids: /^(club-cotisations\.en\.1280|club-cotisations\.en\.1366|club-cotisations\.en\.1920|club-cotisations\.fr\.1280|club-cotisations\.fr\.1366|club-cotisations\.fr\.1920)$/, reason: "modules, sites and fees to be agreed (step 2)" },
  // club-relances: Sites link in the administration navigation.
  { ids: /^(club-relances\.en\.1280|club-relances\.en\.1366|club-relances\.en\.1920|club-relances\.fr\.1280|club-relances\.fr\.1366|club-relances\.fr\.1920)$/, reason: "modules, sites and fees to be agreed (step 2)" },
  // club-encaissements: Sites link in the administration navigation; the demo bank charges no fee while fees are to be agreed (Rs 0, gross settlements).
  { ids: /^(club-encaissements\.en\.1280|club-encaissements\.en\.1366|club-encaissements\.en\.1920|club-encaissements\.fr\.1280|club-encaissements\.fr\.1366|club-encaissements\.fr\.1920)$/, reason: "modules, sites and fees to be agreed (step 2)" },
  // club-rapprochement: Sites link in the administration navigation; the demo bank charges no fee while fees are to be agreed (Rs 0, gross settlements).
  { ids: /^(club-rapprochement\.en\.1280|club-rapprochement\.en\.1366|club-rapprochement\.en\.1920|club-rapprochement\.fr\.1280|club-rapprochement\.fr\.1366|club-rapprochement\.fr\.1920)$/, reason: "modules, sites and fees to be agreed (step 2)" },
  // club-exceptions: Sites link in the administration navigation.
  { ids: /^(club-exceptions\.en\.1280|club-exceptions\.en\.1366|club-exceptions\.en\.1920|club-exceptions\.fr\.1280|club-exceptions\.fr\.1366|club-exceptions\.fr\.1920)$/, reason: "modules, sites and fees to be agreed (step 2)" },
  // club-erp: Sites link in the administration navigation; the demo bank charges no fee while fees are to be agreed (Rs 0, gross settlements).
  { ids: /^(club-erp\.en\.1280|club-erp\.en\.1366|club-erp\.en\.1920|club-erp\.fr\.1280|club-erp\.fr\.1366|club-erp\.fr\.1920)$/, reason: "modules, sites and fees to be agreed (step 2)" },
];
