CREATE TABLE companies (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  currency TEXT NOT NULL DEFAULT 'MUR',
  plan TEXT NOT NULL DEFAULT 'pilote', subscription_status TEXT NOT NULL DEFAULT 'essai', subscription_renews_at TEXT,
  settings_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL
);

CREATE TABLE users (
  id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id), name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('platform_admin','company_admin','dispatcher','finance','agent')),
  active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
);

CREATE TABLE counters (company_id TEXT NOT NULL, name TEXT NOT NULL, value INTEGER NOT NULL, PRIMARY KEY (company_id, name));

CREATE TABLE price_lists (id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), name TEXT NOT NULL);

CREATE TABLE customers (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), code TEXT NOT NULL, name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '', zone TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '',
  price_list_id TEXT REFERENCES price_lists(id), active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE products (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), sku TEXT NOT NULL, name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'casier', price_minor INTEGER NOT NULL, active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE price_list_items (
  price_list_id TEXT NOT NULL REFERENCES price_lists(id), product_id TEXT NOT NULL REFERENCES products(id), price_minor INTEGER NOT NULL,
  PRIMARY KEY (price_list_id, product_id)
);

CREATE TABLE routes (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), name TEXT NOT NULL, day TEXT NOT NULL,
  agent_id TEXT REFERENCES users(id), vehicle TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','loaded','in_progress','closed')),
  started_at TEXT, closed_at TEXT, created_at TEXT NOT NULL
);

CREATE TABLE route_stops (
  id TEXT PRIMARY KEY, route_id TEXT NOT NULL REFERENCES routes(id), company_id TEXT NOT NULL, customer_id TEXT NOT NULL REFERENCES customers(id),
  seq INTEGER NOT NULL, UNIQUE (route_id, customer_id)
);

CREATE TABLE warehouse_stock (company_id TEXT NOT NULL, product_id TEXT NOT NULL REFERENCES products(id), qty INTEGER NOT NULL, PRIMARY KEY (company_id, product_id));

CREATE TABLE vehicle_stock (
  route_id TEXT NOT NULL REFERENCES routes(id), product_id TEXT NOT NULL REFERENCES products(id), company_id TEXT NOT NULL,
  loaded_qty INTEGER NOT NULL DEFAULT 0, qty INTEGER NOT NULL DEFAULT 0, returned_qty INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (route_id, product_id)
);

CREATE TABLE stock_movements (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, product_id TEXT NOT NULL, route_id TEXT,
  type TEXT NOT NULL, qty INTEGER NOT NULL, ref TEXT, note TEXT, actor TEXT NOT NULL, at TEXT NOT NULL
);

CREATE TABLE orders (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), number TEXT NOT NULL, customer_id TEXT NOT NULL REFERENCES customers(id),
  route_id TEXT REFERENCES routes(id), kind TEXT NOT NULL CHECK (kind IN ('preorder','route_sale')),
  status TEXT NOT NULL CHECK (status IN ('confirmed','prepared','loaded','delivered','partially_delivered','refused','cancelled')),
  note TEXT NOT NULL DEFAULT '', created_by TEXT NOT NULL, created_at TEXT NOT NULL, delivered_at TEXT,
  UNIQUE (company_id, number)
);

CREATE TABLE order_lines (
  id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), company_id TEXT NOT NULL, product_id TEXT NOT NULL REFERENCES products(id),
  qty_ordered INTEGER NOT NULL, qty_delivered INTEGER NOT NULL DEFAULT 0, unit_price_minor INTEGER NOT NULL
);

CREATE TABLE deliveries (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, order_id TEXT NOT NULL UNIQUE REFERENCES orders(id), route_id TEXT NOT NULL, agent_id TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('full','partial','refused')), reason TEXT NOT NULL DEFAULT '',
  returns_json TEXT NOT NULL DEFAULT '[]', returns_minor INTEGER NOT NULL DEFAULT 0,
  pod_name TEXT NOT NULL DEFAULT '', pod_signature TEXT, pod_note TEXT NOT NULL DEFAULT '',
  at TEXT NOT NULL, synced_at TEXT NOT NULL, offline INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE invoices (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), number TEXT NOT NULL, order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
  customer_id TEXT NOT NULL, route_id TEXT, agent_id TEXT, currency TEXT NOT NULL,
  amount_minor INTEGER NOT NULL, paid_minor INTEGER NOT NULL DEFAULT 0, refunded_minor INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','pending','to_verify','partially_paid','paid','failed','refunded')),
  issued_at TEXT NOT NULL, UNIQUE (company_id, number)
);

CREATE TABLE payments (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), invoice_id TEXT NOT NULL REFERENCES invoices(id), order_id TEXT NOT NULL,
  agent_id TEXT, method TEXT NOT NULL CHECK (method IN ('paystation','card_tpe','juice','link')),
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0), currency TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','to_verify','confirmed','failed','refunded')),
  refunded_minor INTEGER NOT NULL DEFAULT 0, provider_ref TEXT, idempotency_key TEXT NOT NULL, link_token TEXT UNIQUE,
  presentation_json TEXT NOT NULL DEFAULT '{}', failure_reason TEXT, verify_reason TEXT,
  fee_expected_minor INTEGER NOT NULL DEFAULT 0, fee_actual_minor INTEGER,
  settlement_status TEXT NOT NULL DEFAULT 'unsettled' CHECK (settlement_status IN ('unsettled','settled')), settled_at TEXT, bank_line_id TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, expires_at TEXT, confirmed_at TEXT, confirmed_via TEXT,
  UNIQUE (company_id, idempotency_key)
);

CREATE TABLE payment_events (
  id TEXT PRIMARY KEY, provider TEXT NOT NULL, event_id TEXT NOT NULL, company_id TEXT, payment_id TEXT, type TEXT NOT NULL,
  payload_json TEXT NOT NULL, result TEXT NOT NULL, received_at TEXT NOT NULL, UNIQUE (provider, event_id)
);

CREATE TABLE demo_provider_tx (
  provider_ref TEXT PRIMARY KEY, method TEXT NOT NULL, amount_minor INTEGER NOT NULL, currency TEXT NOT NULL,
  status TEXT NOT NULL, refunded_minor INTEGER NOT NULL DEFAULT 0, last_event_json TEXT, created_at TEXT NOT NULL
);

CREATE TABLE bank_statements (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, filename TEXT NOT NULL, imported_by TEXT NOT NULL, imported_at TEXT NOT NULL,
  line_count INTEGER NOT NULL, matched_count INTEGER NOT NULL, skipped_count INTEGER NOT NULL
);

CREATE TABLE bank_lines (
  id TEXT PRIMARY KEY, statement_id TEXT NOT NULL REFERENCES bank_statements(id), company_id TEXT NOT NULL, line_hash TEXT NOT NULL,
  value_date TEXT NOT NULL, reference TEXT NOT NULL, label TEXT NOT NULL, gross_minor INTEGER NOT NULL, fee_minor INTEGER NOT NULL, net_minor INTEGER NOT NULL,
  match_status TEXT NOT NULL CHECK (match_status IN ('matched','unmatched','amount_mismatch','duplicate')), payment_id TEXT,
  UNIQUE (company_id, line_hash)
);

CREATE TABLE exceptions (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, domain TEXT NOT NULL CHECK (domain IN ('ops','finance')), type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')), entity TEXT NOT NULL, entity_id TEXT NOT NULL,
  message TEXT NOT NULL, details_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL,
  resolution TEXT, resolution_note TEXT, resolved_by TEXT, resolved_at TEXT
);

CREATE TABLE erp_entries (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, kind TEXT NOT NULL, entity_id TEXT NOT NULL, label TEXT NOT NULL, amount_minor INTEGER NOT NULL,
  payload_json TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','synced','failed')),
  attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, external_ref TEXT, created_at TEXT NOT NULL, synced_at TEXT,
  UNIQUE (company_id, kind, entity_id)
);

CREATE TABLE daily_closes (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, day TEXT NOT NULL, closed_by TEXT NOT NULL, closed_at TEXT NOT NULL, totals_json TEXT NOT NULL,
  UNIQUE (company_id, day)
);

CREATE TABLE sync_actions (
  company_id TEXT NOT NULL, action_id TEXT NOT NULL, agent_id TEXT NOT NULL, type TEXT NOT NULL, result_json TEXT NOT NULL, applied_at TEXT NOT NULL,
  PRIMARY KEY (company_id, action_id)
);

CREATE TABLE audit_log (
  id TEXT PRIMARY KEY, at TEXT NOT NULL, actor TEXT NOT NULL, actor_role TEXT NOT NULL, company_id TEXT,
  action TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT, details_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE club_plans (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), code TEXT NOT NULL, name TEXT NOT NULL,
  billing TEXT NOT NULL CHECK (billing IN ('annual','monthly')), fee_minor INTEGER NOT NULL CHECK (fee_minor > 0), active INTEGER NOT NULL DEFAULT 1,
  UNIQUE (company_id, code)
);

CREATE TABLE members (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), number TEXT NOT NULL, name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', plan_id TEXT REFERENCES club_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','resigned')),
  reference TEXT NOT NULL, badge TEXT NOT NULL, portal_token TEXT NOT NULL UNIQUE, joined_at TEXT NOT NULL, created_at TEXT NOT NULL,
  UNIQUE (company_id, number), UNIQUE (company_id, reference), UNIQUE (company_id, badge)
);

CREATE TABLE member_charges (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), member_id TEXT NOT NULL REFERENCES members(id), number TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('dues','consumption','fee')), outlet TEXT NOT NULL DEFAULT '', label TEXT NOT NULL, period TEXT,
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0), allocated_minor INTEGER NOT NULL DEFAULT 0, due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','paid','cancelled')), cancel_reason TEXT, cancelled_at TEXT,
  created_by TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE (company_id, number)
);

CREATE TABLE member_payments (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), member_id TEXT NOT NULL REFERENCES members(id),
  method TEXT NOT NULL CHECK (method IN ('link','bank_transfer','cash')), amount_minor INTEGER NOT NULL CHECK (amount_minor > 0), currency TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','to_verify','confirmed','failed')),
  provider_ref TEXT, idempotency_key TEXT NOT NULL, reference TEXT NOT NULL, failure_reason TEXT, verify_reason TEXT, note TEXT NOT NULL DEFAULT '',
  settlement_status TEXT NOT NULL DEFAULT 'unsettled' CHECK (settlement_status IN ('unsettled','settled')), settled_at TEXT, fee_actual_minor INTEGER, bank_line_id TEXT,
  confirmed_at TEXT, confirmed_via TEXT, created_by TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, expires_at TEXT,
  UNIQUE (company_id, idempotency_key)
);

CREATE TABLE member_reminders (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, member_id TEXT NOT NULL REFERENCES members(id), cycle TEXT NOT NULL, level INTEGER NOT NULL,
  channel TEXT NOT NULL, amount_minor INTEGER NOT NULL, overdue_days INTEGER NOT NULL, message TEXT NOT NULL, sent_by TEXT NOT NULL, sent_at TEXT NOT NULL,
  UNIQUE (company_id, member_id, cycle, level)
);

CREATE TABLE gate_devices (id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), name TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);

CREATE TABLE gate_events (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, member_id TEXT, device_id TEXT, credential_hint TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('allow','flag','deny')), reason TEXT NOT NULL, overdue_minor INTEGER NOT NULL DEFAULT 0, overdue_days INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL CHECK (source IN ('reader','attendant')), at TEXT NOT NULL
);

CREATE TABLE schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`);

