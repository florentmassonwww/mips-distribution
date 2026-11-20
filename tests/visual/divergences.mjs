// Screens that differ from v0.1.0 on purpose. A matching capture is not compared pixel by pixel
// with the reference; it must still meet the requirements checked on every capture (no horizontal
// overflow, no console error, accurate demo banner). Its reference, rebuilt and diff images are
// written to tests/visual/output for review. Keep each entry as narrow as possible.
export const DIVERGENCES = [
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
];
