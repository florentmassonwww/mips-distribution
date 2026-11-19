-- Clubs de sport : comptes membres, cotisations, consommations, recouvrement, barrière d'accès.
-- Même règles que la distribution : montants en cents, company_id sur chaque table, « confirmé » et « réglé en banque » distincts.

-- Métier de l'entreprise : chaque locataire voit les écrans de son métier.
ALTER TABLE companies ADD COLUMN vertical TEXT NOT NULL DEFAULT 'distribution' CHECK (vertical IN ('distribution','club'));

-- Catégories d'adhésion (individuel, famille, junior...) et leur cotisation.
CREATE TABLE club_plans (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), code TEXT NOT NULL, name TEXT NOT NULL,
  billing TEXT NOT NULL CHECK (billing IN ('annual','monthly')), fee_minor INTEGER NOT NULL CHECK (fee_minor > 0), active INTEGER NOT NULL DEFAULT 1,
  UNIQUE (company_id, code)
);

-- reference : référence structurée (préfixe, numéro, clé de contrôle) à reporter sur tout virement.
-- badge : identifiant présenté à la barrière (carte, QR). portal_token : jeton opaque de la page membre.
CREATE TABLE members (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), number TEXT NOT NULL, name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', plan_id TEXT REFERENCES club_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','resigned')),
  reference TEXT NOT NULL, badge TEXT NOT NULL, portal_token TEXT NOT NULL UNIQUE, joined_at TEXT NOT NULL, created_at TEXT NOT NULL,
  UNIQUE (company_id, number), UNIQUE (company_id, reference), UNIQUE (company_id, badge)
);

-- Ce que doit le membre : cotisations, consommations (restaurant, bar, terrains...), frais, ajustements.
-- allocated_minor est recalculé (affectation des paiements aux dettes les plus anciennes) : jamais saisi.
CREATE TABLE member_charges (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), member_id TEXT NOT NULL REFERENCES members(id), number TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('dues','consumption','fee')), outlet TEXT NOT NULL DEFAULT '', label TEXT NOT NULL, period TEXT,
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0), allocated_minor INTEGER NOT NULL DEFAULT 0, due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','paid','cancelled')), cancel_reason TEXT, cancelled_at TEXT,
  created_by TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE (company_id, number)
);
-- Une cotisation par membre et par période : relancer la facturation ne double rien.
CREATE UNIQUE INDEX idx_dues_once ON member_charges (company_id, member_id, period) WHERE kind = 'dues' AND status != 'cancelled';
CREATE INDEX idx_charges_member ON member_charges (member_id, due_date);

-- Encaissements sur le compte membre : paiement en ligne (lien), virement identifié sur le relevé, espèces au bureau.
CREATE TABLE member_payments (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), member_id TEXT NOT NULL REFERENCES members(id),
  method TEXT NOT NULL CHECK (method IN ('link','bank_transfer','cash')), amount_minor INTEGER NOT NULL CHECK (amount_minor > 0), currency TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','to_verify','confirmed','failed')),
  provider_ref TEXT, idempotency_key TEXT NOT NULL, reference TEXT NOT NULL, failure_reason TEXT, verify_reason TEXT, note TEXT NOT NULL DEFAULT '',
  settlement_status TEXT NOT NULL DEFAULT 'unsettled' CHECK (settlement_status IN ('unsettled','settled')), settled_at TEXT, fee_actual_minor INTEGER, bank_line_id TEXT,
  confirmed_at TEXT, confirmed_via TEXT, created_by TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, expires_at TEXT,
  UNIQUE (company_id, idempotency_key)
);
CREATE UNIQUE INDEX idx_member_payments_ref ON member_payments (method, provider_ref) WHERE provider_ref IS NOT NULL;
CREATE INDEX idx_member_payments_member ON member_payments (member_id, status);

-- Relances : une par membre, par dette la plus ancienne (cycle) et par niveau. Relancer deux fois le moteur n'envoie rien de plus.
CREATE TABLE member_reminders (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, member_id TEXT NOT NULL REFERENCES members(id), cycle TEXT NOT NULL, level INTEGER NOT NULL,
  channel TEXT NOT NULL, amount_minor INTEGER NOT NULL, overdue_days INTEGER NOT NULL, message TEXT NOT NULL, sent_by TEXT NOT NULL, sent_at TEXT NOT NULL,
  UNIQUE (company_id, member_id, cycle, level)
);

-- Lecteurs de la barrière. Le secret de signature d'un lecteur n'est pas stocké : il est dérivé du secret serveur.
CREATE TABLE gate_devices (id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), name TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
CREATE TABLE gate_events (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, member_id TEXT, device_id TEXT, credential_hint TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('allow','flag','deny')), reason TEXT NOT NULL, overdue_minor INTEGER NOT NULL DEFAULT 0, overdue_days INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL CHECK (source IN ('reader','attendant')), at TEXT NOT NULL
);
CREATE INDEX idx_gate_events ON gate_events (company_id, at);
