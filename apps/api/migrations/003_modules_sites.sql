-- Étape 2 : abonnements aux modules, établissements de l'entreprise, frais « à convenir ».

-- Modules actifs d'une entreprise : une ligne présente = module actif. Le CHECK reflète le catalogue
-- du code (apps/api/src/core/modules.ts).
CREATE TABLE company_modules (
  company_id TEXT NOT NULL REFERENCES companies(id),
  module TEXT NOT NULL CHECK (module IN ('distribution','club')),
  activated_at TEXT NOT NULL, activated_by TEXT NOT NULL,
  PRIMARY KEY (company_id, module)
);

-- Reprise : chaque entreprise reçoit le module de son ancien métier. companies.vertical reste
-- (SQLite ne supprime pas une colonne portant un CHECK sans reconstruire la table) mais n'est plus lue.
INSERT INTO company_modules (company_id, module, activated_at, activated_by)
  SELECT id, vertical, created_at, 'migration' FROM companies;

-- Lieux de l'entreprise elle-même : magasin, entrepôt, dépôt.
CREATE TABLE sites (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id),
  type TEXT NOT NULL CHECK (type IN ('store','warehouse','depot')),
  parent_site_id TEXT REFERENCES sites(id),
  code TEXT NOT NULL, name TEXT NOT NULL, address TEXT NOT NULL DEFAULT '',
  timezone TEXT NOT NULL DEFAULT 'Indian/Mauritius',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TEXT NOT NULL,
  UNIQUE (company_id, code)
);

-- 0 quand les frais du moyen de paiement sont « à convenir » : fee_expected_minor (0) n'est alors pas un montant attendu.
ALTER TABLE payments ADD COLUMN fee_expected_known INTEGER NOT NULL DEFAULT 1;
