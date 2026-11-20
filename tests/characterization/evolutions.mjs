// Intended changes of the rebuilt server (apps/api) since v0.1.0, applied to the golden
// transcripts before they are compared with apps/api (`--target=api` only). The golden files keep
// recording v0.1.0 as it is, and `--target=reference` still compares them untransformed.
//
// Each evolution names the scenarios it applies to, the step it belongs to, why the response
// changed, and touches only the fields it names. Anything else must still match v0.1.0 exactly.
//
//   { id, step, scenarios: RegExp, reason, entry(entry) → entry }          one transcript entry
//   { id, step, scenarios: RegExp, reason, transcript(entries) → entries } the whole transcript,
//                                                                          for changes that remove
//                                                                          or renumber items
//
// Pure renamings of the API (RENAMINGS, below) are not transcript evolutions: the runner translates
// at the transport boundary instead, the scenario's request to the new names and the response back
// to the v0.1.0 names, so the scenarios keep running unchanged. The translation refuses any v0.1.0
// name still present in a response, which proves the renaming complete.

/** v0.1.0 demonstration fees, in basis points (replaced by "to be agreed" in step 2). */
const V010_FEE_BPS = { paystation: 100, card_tpe: 175, juice: 90, link: 150 };
const MODULE_MESSAGE = {
  distribution: "Le module Distribution n'est pas activé pour cette entreprise.",
  club: "Le module Club n'est pas activé pour cette entreprise.",
};

// ───────── helpers ─────────

const isCall = (entry, method, path) =>
  entry.request?.method === method && (path instanceof RegExp ? path.test(entry.request.path) : entry.request.path === path);

/** Calls `fn(object)` on every object (at any depth) that has the property `key`. */
function eachWithKey(value, key, fn) {
  if (Array.isArray(value)) value.forEach((item) => eachWithKey(item, key, fn));
  else if (value && typeof value === "object") {
    if (Object.hasOwn(value, key)) fn(value);
    Object.values(value).forEach((item) => eachWithKey(item, key, fn));
  }
}

/** Renames `from` to `to` in an object, converting the value. */
function rename(object, from, to, convert) {
  const value = object[from];
  delete object[from];
  object[to] = convert(value);
}

const modulesOfVertical = (vertical) => (vertical ? [vertical] : []);

// CSV exports and statements: rows of raw cells. Cells are split on the delimiter outside quotes
// and joined back unchanged, so only the cells an evolution rewrites differ.
function splitCells(row, delimiter) {
  const cells = [];
  let cell = "";
  let quoted = false;
  for (const char of row) {
    if (char === '"') quoted = !quoted;
    if (char === delimiter && !quoted) {
      cells.push(cell);
      cell = "";
    } else cell += char;
  }
  cells.push(cell);
  return cells;
}

/**
 * Rewrites the data rows of a CSV text: `fn(cells, header)` returns the new cells, or null to drop
 * the row. Line endings and every untouched cell are kept as they are.
 */
function mapCsv(text, delimiter, fn) {
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const [head, ...rows] = text.split(newline);
  const header = splitCells(head, delimiter);
  const mapped = [];
  for (const row of rows) {
    if (row === "") {
      mapped.push(row);
      continue;
    }
    const cells = fn(splitCells(row, delimiter), header);
    if (cells) mapped.push(cells.join(delimiter));
  }
  return [head, ...mapped].join(newline);
}

/** "1234.56" ↔ 123456 (amounts in CSV exports and statements). */
const toMinor = (text) => Math.round(Number(text) * 100);
const fromMinor = (minor) => (minor / 100).toFixed(2);

/** Method of a simulated provider reference placeholder (`<ref-PS#1>` → paystation). */
const METHOD_OF_REF = { PS: "paystation", TPE: "card_tpe", JCE: "juice", LNK: "link" };
const methodOfRef = (text) => METHOD_OF_REF[/<ref-([A-Z]+)#\d+>/.exec(text)?.[1]];

/**
 * Gross amount of a v0.1.0 settlement whose net was `netMinor` after the demo fee of `method`
 * (gross − round(gross × bps / 10 000) = net). Throws when the net has no single such gross.
 */
function grossOfV010Net(netMinor, method) {
  const bps = V010_FEE_BPS[method];
  const estimate = Math.round(netMinor / (1 - bps / 1e4));
  const candidates = [];
  for (let gross = estimate - 3; gross <= estimate + 3; gross++) {
    if (gross - Math.round((gross * bps) / 1e4) === netMinor) candidates.push(gross);
  }
  const roundRupees = candidates.filter((gross) => gross % 100 === 0);
  const found = candidates.length === 1 ? candidates : roundRupees;
  if (found.length !== 1) throw new Error(`evolutions: no single gross for net ${netMinor} (${method}): ${candidates}`);
  return found[0];
}

/**
 * A v0.1.0 demo statement (`;`-separated) as generated with fees to be agreed: settlement lines
 * carry no fee and their net is the gross. `keepFeeMinor(lineIndex)` keeps a deliberate anomaly.
 */
function statementWithoutFees(content, keepFeeMinor = () => 0) {
  let index = -1;
  return mapCsv(content, ";", (cells) => {
    index++;
    if (!cells[2].startsWith("REGLEMENT")) return cells;
    const fee = keepFeeMinor(index);
    return [cells[0], cells[1], cells[2], cells[3], fromMinor(fee), fromMinor(toMinor(cells[3]) - fee)];
  });
}

// ───────── evolutions ─────────

export const EVOLUTIONS = [
  // Step 2: module subscriptions replace the company "vertical".
  {
    id: "session-user-modules",
    step: 2,
    scenarios: /^(session-anonymous|platform-suspend-company)$/,
    reason: "The session user carries the active modules of its company (user.modules) instead of user.vertical.",
    entry(entry) {
      if (isCall(entry, "GET", "/api/session") && entry.response?.user) rename(entry.response.user, "vertical", "modules", modulesOfVertical);
      return entry;
    },
  },
  {
    id: "demo-users-modules",
    step: 2,
    scenarios: /^session-anonymous$/,
    reason: "Demo users show their company's modules (company_modules) instead of company_vertical.",
    entry(entry) {
      if (isCall(entry, "GET", "/api/demo/users")) entry.response.forEach((user) => rename(user, "company_vertical", "company_modules", modulesOfVertical));
      return entry;
    },
  },
  {
    id: "platform-companies-modules",
    step: 2,
    scenarios: /^platform-companies$/,
    reason: "The platform's company list shows each company's modules instead of its vertical.",
    entry(entry) {
      if (isCall(entry, "GET", "/api/platform/companies")) entry.response.forEach((company) => rename(company, "vertical", "modules", modulesOfVertical));
      return entry;
    },
  },
  {
    id: "company-created-audit-modules",
    step: 2,
    scenarios: /^platform-companies$/,
    reason:
      "The company.created audit details record the modules the company starts with. (The v0.1.0 `vertical` field is still accepted on creation, so the requests are unchanged.)",
    entry(entry) {
      if (isCall(entry, "GET", "/api/platform/audit")) {
        entry.response.filter((row) => row.action === "company.created").forEach((row) => rename(row.details, "vertical", "modules", modulesOfVertical));
      }
      return entry;
    },
  },
  {
    id: "admin-subscription-modules",
    step: 2,
    scenarios: /^admin-settings-methods$/,
    reason: "The company's subscription in the settings lists its modules instead of its vertical.",
    entry(entry) {
      if (isCall(entry, "GET", "/api/admin/settings") && entry.response?.subscription) {
        rename(entry.response.subscription, "vertical", "modules", modulesOfVertical);
      }
      return entry;
    },
  },
  {
    id: "module-not-enabled",
    step: 2,
    scenarios: /^verticals-separated$/,
    reason: "A module route called by a company without that module is refused with 403 module_not_enabled (was wrong_vertical).",
    entry(entry) {
      const error = entry.response?.error;
      if (entry.status === 403 && error?.code === "wrong_vertical") {
        const module = error.message.includes("distribution") ? "distribution" : "club";
        entry.response.error = { code: "module_not_enabled", message: MODULE_MESSAGE[module] };
      }
      return entry;
    },
  },

  // Step 2: payment fees are "to be agreed" until the company sets them. v0.1.0 used invented demo
  // rates (paystation 100, card_tpe 175, juice 90, link 150 bps); the demo data now has none.
  {
    id: "fee-settings-to-be-agreed",
    step: 2,
    scenarios: /^(admin-settings-methods|finance-erp-retry)$/,
    reason:
      "Default feeBps is null (to be agreed) instead of the invented demo rates. The scenarios send back the settings they read, so the request bodies carry null too.",
    entry(entry) {
      if (isCall(entry, "GET", "/api/admin/settings")) eachWithKey(entry.response?.settings?.payments?.methods, "feeBps", (method) => (method.feeBps = null));
      if (isCall(entry, "PUT", "/api/admin/settings")) eachWithKey(entry.request.body?.payments?.methods, "feeBps", (method) => (method.feeBps = null));
      return entry;
    },
  },
  {
    id: "no-demo-fee-charged",
    step: 2,
    scenarios:
      /^(centrale-reference-and-dashboard|payment-duplicate-notification|finance-journal-and-invoices|finance-refund|finance-statement-reconciliation|finance-statement-anomalies|finance-daily-close|admin-users|club-dashboard-and-members|club-charges|club-cash-payment|club-member-portal-and-online-payment|club-statement-reconciliation)$/,
    reason:
      "The demo bank statements (seed and generated) charge no fee while it is to be agreed: settled payments and daily-close totals show fee_actual_minor 0, bank lines a fee of 0 (or only the deliberate 5.00 anomaly) and a net equal to the gross, the payment.settled audit a feeMinor of 0.",
    // Before fee-expected-to-be-agreed: bank line fees are corrected with the v0.1.0 expected fee.
    entry(entry) {
      const read = entry.request.method === "GET" || isCall(entry, "POST", "/api/finance/close");
      if (!read || entry.status !== 200 || typeof entry.response !== "object") return entry;
      eachWithKey(entry.response, "fee_actual_minor", (row) => {
        if (row.fee_actual_minor !== null) row.fee_actual_minor = 0;
      });
      if (/^\/api\/(finance|club)\/reconciliation$/.test(entry.request.path)) {
        entry.response.lines.forEach((line) => {
          // What the bank charged beyond the v0.1.0 expected fee (the anomaly) is still charged.
          line.fee_minor -= line.fee_expected_minor ?? line.fee_minor;
          line.net_minor = line.gross_minor - line.fee_minor;
        });
      }
      eachWithKey(entry.response, "details", (row) => {
        if (row.action === "payment.settled") row.details.feeMinor = 0;
      });
      return entry;
    },
  },
  {
    id: "fee-expected-to-be-agreed",
    step: 2,
    scenarios:
      /^(payment-duplicate-notification|finance-journal-and-invoices|finance-refund|finance-statement-reconciliation|finance-statement-anomalies|finance-daily-close)$/,
    reason:
      "With fees to be agreed the expected fee is 0 and not known: payment rows (journal, reconciliation lines) gain fee_expected_known = 0 (null on a bank line without payment); daily-close totals sum 0.",
    entry(entry) {
      const rows = isCall(entry, "GET", /^\/api\/finance\/journal(\?|$)/)
        ? entry.response
        : isCall(entry, "GET", "/api/finance/reconciliation")
          ? entry.response.lines
          : null;
      if (Array.isArray(rows)) {
        rows.forEach((row) => {
          row.fee_expected_known = row.fee_expected_minor === null ? null : 0;
          if (row.fee_expected_minor !== null) row.fee_expected_minor = 0;
        });
      }
      if (/^\/api\/finance\/close/.test(entry.request.path) && entry.status === 200 && typeof entry.response === "object") {
        eachWithKey(entry.response, "fee_expected_minor", (totals) => (totals.fee_expected_minor = 0));
      }
      return entry;
    },
  },
  {
    id: "demo-statement-without-fees",
    step: 2,
    scenarios: /^(finance-statement-reconciliation|finance-statement-anomalies|club-statement-reconciliation)$/,
    reason:
      "The generated demo statement charges no fee while fees are to be agreed (net = gross); with anomalies, the deliberate extra fee of 5.00 on the first line remains. The scenarios import the statement they read, so the request bodies change too.",
    entry(entry) {
      const anomalies = /anomalies=1/.test(entry.request.path) || /statement with anomalies/.test(entry.step);
      const keep = (index) => (anomalies && index === 0 ? 500 : 0);
      if (isCall(entry, "GET", /^\/api\/(finance|club)\/statements\/demo/)) entry.response.content = statementWithoutFees(entry.response.content, keep);
      if (isCall(entry, "POST", /^\/api\/(finance|club)\/statements$/)) entry.request.body.content = statementWithoutFees(entry.request.body.content, keep);
      return entry;
    },
  },
  {
    id: "no-fee-variance-when-to-be-agreed",
    step: 2,
    scenarios: /^finance-statement-anomalies$/,
    reason:
      "No fee-variance exception is raised while the fee is to be agreed. The fee_variance exception disappears, the exception placeholders after it are renumbered, and the scenario, which resolves the first listed exception, now resolves the amount mismatch (so the open-exceptions CSV no longer lists it).",
    transcript(entries) {
      const listed = entries.find((entry) => isCall(entry, "GET", "/api/exceptions?domain=finance"));
      const removed = listed.response.filter((exception) => exception.type === "fee_variance").map((exception) => exception.id);
      listed.response = listed.response.filter((exception) => exception.type !== "fee_variance");
      const number = (placeholder) => Number(/#(\d+)>/.exec(placeholder)[1]);
      const shift = (n) => n - removed.filter((id) => number(id) < n).length;
      const renumbered = JSON.parse(JSON.stringify(entries).replace(/<exc#(\d+)>/g, (_, n) => `<exc#${shift(Number(n))}>`));
      const first = renumbered.find((entry) => isCall(entry, "GET", "/api/exceptions?domain=finance")).response[0];
      const resolved = renumbered.find((entry) => isCall(entry, "GET", "/api/exceptions?domain=finance&status=resolved"));
      const decision = resolved.response[0];
      resolved.response = [
        {
          ...first,
          status: decision.status,
          resolution: decision.resolution,
          resolution_note: decision.resolution_note,
          resolved_by: decision.resolved_by,
          resolved_at: decision.resolved_at,
          resolved_by_name: decision.resolved_by_name,
        },
      ];
      const csv = renumbered.find((entry) => isCall(entry, "GET", "/api/exceptions?domain=finance&format=csv"));
      csv.response = mapCsv(csv.response, ",", (cells) => (cells[1] === first.type ? null : cells));
      return renumbered;
    },
  },
  {
    id: "erp-settlement-gross",
    step: 2,
    scenarios: /^finance-erp-retry$/,
    reason: "Accounting entries of bank settlements carry the net credited amount, now the gross since the demo statements charge no fee.",
    entry(entry) {
      if (!isCall(entry, "GET", /^\/api\/finance\/erp(\?|$)/)) return entry;
      if (typeof entry.response === "string") {
        entry.response = mapCsv(entry.response, ",", (cells) =>
          cells[1] === "settlement" ? cells.with(3, fromMinor(grossOfV010Net(toMinor(cells[3]), methodOfRef(cells[2])))) : cells,
        );
      } else {
        entry.response.entries
          .filter((row) => row.kind === "settlement")
          .forEach((row) => (row.amount_minor = grossOfV010Net(row.amount_minor, methodOfRef(row.label))));
      }
      return entry;
    },
  },
  {
    id: "club-export-without-fee-lines",
    step: 2,
    scenarios: /^club-accounting-export$/,
    reason:
      "Online payments were settled without a fee: each bank settlement debits the bank with the full amount and has no provider-fee line (627000). Totals are unchanged.",
    entry(entry) {
      if (!isCall(entry, "GET", /^\/api\/club\/accounting/) || entry.status !== 200) return entry;
      const merge = (lines, read, write) => {
        const kept = [];
        for (const line of lines) {
          const { journal, account, piece, debit } = read(line);
          if (journal === "BQ" && account === "627000") {
            const bank = kept.findLast((other) => read(other).journal === "BQ" && read(other).account === "512000" && read(other).piece === piece);
            write(bank, read(bank).debit + debit);
          } else kept.push(line);
        }
        return kept;
      };
      if (typeof entry.response === "string") {
        const rows = [];
        mapCsv(entry.response, ",", (cells) => (rows.push(cells), null));
        const read = (cells) => ({ journal: cells[1], account: cells[2], piece: cells[4], debit: toMinor(cells[6]) });
        const kept = new Set(merge(rows, read, (cells, debit) => (cells[6] = fromMinor(debit))));
        let index = -1;
        entry.response = mapCsv(entry.response, ",", () => {
          index++;
          return kept.has(rows[index]) ? rows[index] : null;
        });
      } else {
        entry.response.lines = merge(entry.response.lines, (line) => line, (line, debit) => (line.debit = debit));
      }
      return entry;
    },
  },
  {
    id: "csv-exports-without-fees",
    step: 2,
    scenarios: /^(finance-journal-and-invoices|finance-statement-reconciliation|admin-users)$/,
    reason: "The journal, reconciliation and audit CSV exports show the same fee changes as their JSON views (0.00 expected and charged, net = gross).",
    entry(entry) {
      if (entry.request.method !== "GET" || typeof entry.response !== "string") return entry;
      const zeroIfSet = (cell) => (cell === "" ? cell : "0.00");
      if (/^\/api\/finance\/journal\?/.test(entry.request.path)) {
        entry.response = mapCsv(entry.response, ",", (cells, header) =>
          cells.map((cell, i) => (["Frais attendus", "Frais prélevés"].includes(header[i]) ? zeroIfSet(cell) : cell)),
        );
      }
      if (/^\/api\/finance\/reconciliation\?/.test(entry.request.path)) {
        entry.response = mapCsv(entry.response, ",", (cells, header) => {
          const at = (name) => header.indexOf(name);
          const fee = toMinor(cells[at("Frais")]) - (cells[at("Frais attendus")] === "" ? toMinor(cells[at("Frais")]) : toMinor(cells[at("Frais attendus")]));
          return cells
            .with(at("Frais"), fromMinor(fee))
            .with(at("Net"), fromMinor(toMinor(cells[at("Brut")]) - fee))
            .with(at("Frais attendus"), zeroIfSet(cells[at("Frais attendus")]));
        });
      }
      if (/^\/api\/admin\/audit\?/.test(entry.request.path)) {
        entry.response = entry.response.replace(/(payment\.settled,.*""feeMinor"":)\d+/g, "$10");
      }
      return entry;
    },
  },

  // Step 3: business rules in @mips/core.
  {
    id: "price-mismatch-reported",
    step: 3,
    scenarios: /^agent-deliver-validation$/,
    reason:
      "A total shown on the phone that differs from the invoice (prices changed while offline) was accepted without telling the driver. The delivery result now carries priceMismatch { shownMinor, invoicedMinor }; the invoice keeps the server amount and the office exception is unchanged.",
    entry(entry) {
      if (!isCall(entry, "POST", "/api/agent/sync")) return entry;
      entry.request.body.actions.forEach((action, index) => {
        const result = entry.response.results?.[index];
        const shownMinor = action.payload?.expectedTotalMinor;
        if (result?.status === "applied" && shownMinor !== undefined && shownMinor !== result.result.amountMinor) {
          result.result.priceMismatch = { shownMinor, invoicedMinor: result.result.amountMinor };
        }
      });
      return entry;
    },
  },
  {
    id: "status-query-checks-amount",
    step: 3,
    scenarios: /^payment-wrong-amount-to-verify$/,
    reason:
      "A status query confirms a payment only for the amount requested, as a notification does. The simulated provider received 1.00 less: the payment stays to verify, its two finance exceptions stay open, and finance cannot resolve them by hand (409 needs_provider).",
    transcript(entries) {
      const at = (step) => entries.findIndex((entry) => entry.step === step);
      const toVerify = entries[at("payment to verify")].response;
      const exceptionBase = {
        company_id: "co_bd",
        domain: "finance",
        status: "open",
        entity: "payment",
        entity_id: toVerify.id,
        created_at: "2026-10-17T04:00:07.000Z",
        resolution: null,
        resolution_note: null,
        resolved_by: null,
        resolved_at: null,
        resolved_by_name: null,
      };
      entries[at("status query on a payment to verify")].response = structuredClone(toVerify);
      const list = at("finance exceptions");
      entries[list].response = [
        {
          id: "<exc#1>",
          ...exceptionBase,
          type: "payment_to_verify",
          message: `Paiement à vérifier sur FAC-000024 (paystation) : ${toVerify.verifyReason}`,
          details: { invoice: "FAC-000024", method: "paystation", amountMinor: toVerify.amountMinor, providerRef: toVerify.providerRef },
        },
        {
          id: "<exc#2>",
          ...exceptionBase,
          type: "amount_mismatch",
          message: "Notification paystation incohérente : 12599 MUR notifié pour 12600 MUR demandé.",
          details: { providerRef: toVerify.providerRef, notifiedMinor: toVerify.amountMinor - 100, expectedMinor: toVerify.amountMinor },
        },
      ];
      entries.splice(list + 1, 0, {
        step: "resolve exception",
        as: "u_bd_finance",
        request: { method: "POST", path: "/api/exceptions/<exc#1>/resolve", body: { resolution: "approved", note: "Vérifié avec le prestataire (démo)" } },
        status: 409,
        response: {
          error: {
            code: "needs_provider",
            message: "Un paiement à vérifier se lève par l'interrogation du prestataire ou par le relevé bancaire, pas par validation manuelle.",
          },
        },
      });
      entries[at("payment after exception resolution")].response = structuredClone(toVerify);
      return entries;
    },
  },
];

// ───────── renamings (translated at the transport boundary) ─────────

export const RENAMINGS = [
  {
    id: "customer-outlet",
    step: 3,
    reason:
      "The businesses a distributor delivers are customer outlets (customer_outlet), as distinct from the company's own sites and the club's points of sale. Table, columns, JSON fields and inputs are renamed; values do not change.",
    request: { customerId: "customerOutletId", customerIds: "customerOutletIds" },
    response: {
      customer_outlet_id: "customer_id",
      customer_outlet: "customer",
      customer_outlets: "customers",
      customerOutletId: "customerId",
      customerOutletIds: "customerIds",
      customerOutlet: "customer",
    },
  },
];

const requestNames = Object.assign({}, ...RENAMINGS.map((r) => r.request));
const responseNames = Object.assign({}, ...RENAMINGS.map((r) => r.response));
const oldNames = new Set(Object.values(responseNames));

function renameKeys(value, names, check) {
  if (Array.isArray(value)) return value.map((item) => renameKeys(item, names, check));
  if (typeof value === "string") return Object.hasOwn(names, value) ? names[value] : value;
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      check?.(key);
      return [Object.hasOwn(names, key) ? names[key] : key, renameKeys(item, names, check)];
    }),
  );
}

/** Request body of a scenario (v0.1.0 names) as sent to apps/api. */
export const toApiRequest = (body) => (body === undefined || typeof body === "string" ? body : renameKeys(body, requestNames));

/**
 * Response of apps/api translated back to the v0.1.0 names. Fails when a v0.1.0 name is still
 * there. Text responses (CSV) carry JSON details with doubled quotes: their keys are mapped too.
 */
export function fromApiResponse(data, where) {
  if (typeof data === "string") {
    for (const name of oldNames) if (data.includes(`""${name}"":`)) throw new Error(`${where}: v0.1.0 name "${name}" still in the text response`);
    return data.replace(/""(\w+)"":/g, (all, key) => (Object.hasOwn(responseNames, key) ? `""${responseNames[key]}"":` : all));
  }
  return renameKeys(data, responseNames, (key) => {
    if (oldNames.has(key)) throw new Error(`${where}: v0.1.0 name "${key}" still in the response`);
  });
}

/** The evolutions that apply to a scenario, in order. */
export const evolutionsFor = (scenario) => EVOLUTIONS.filter((evolution) => evolution.scenarios.test(scenario));

/** Golden transcript of a scenario as apps/api is expected to answer it (a transformed copy). */
export function evolveTranscript(scenario, transcript) {
  let entries = structuredClone(transcript);
  for (const evolution of evolutionsFor(scenario)) {
    if (evolution.transcript) entries = evolution.transcript(entries);
    if (evolution.entry) entries = entries.map((entry) => evolution.entry(entry));
  }
  return entries;
}

export { V010_FEE_BPS, eachWithKey, isCall };
