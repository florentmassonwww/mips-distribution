// Provider fees "to be agreed": no invented default, expected fee unknown (0, fee_expected_known 0),
// no fee-variance exception, demo statements without fee; and a company setting an agreed fee.
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { deliverFirstOrder, payInFull, startServer } from "./lib/server.mjs";

const HEADER = "date;reference;libelle;montant_brut;frais;montant_net";
const rupees = (minor) => (minor / 100).toFixed(2);

/** Data lines of a demo statement, as objects. */
const statementLines = (content) =>
  content
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => {
      const [date, reference, label, gross, fee, net] = line.split(";");
      return { date, reference, label, gross, fee, net };
    });

describe("fees to be agreed", () => {
  let server;
  let admin;
  let agent;
  let finance;
  beforeEach(async () => {
    server = await startServer();
    admin = await server.as("u_bd_admin");
    agent = await server.as("u_bd_agent1");
    finance = await server.as("u_bd_finance");
  });
  afterEach(() => server.close());

  /** Settings with some methods' fees replaced. */
  const settingsWith = async (fees) => {
    const { settings } = (await admin.get("/api/admin/settings")).data;
    const methods = Object.fromEntries(
      Object.entries(settings.payments.methods).map(([method, value]) => [method, { ...value, feeBps: method in fees ? fees[method] : value.feeBps }]),
    );
    return { payments: { ...settings.payments, methods }, erp: settings.erp };
  };

  /** A payment's journal row and provider reference. */
  const paymentRow = async (paymentId) => (await finance.get("/api/finance/journal")).data.find((row) => row.id === paymentId);

  /** Imports a one-line statement settling a payment with the given fee. */
  const importOneLine = async (row, feeMinor) =>
    finance.post("/api/finance/statements", {
      filename: "releve-test.csv",
      content: `${HEADER}\n${row.created_at.slice(0, 10)};${row.provider_ref};REGLEMENT TEST;${rupees(row.amount_minor)};${rupees(feeMinor)};${rupees(row.amount_minor - feeMinor)}\n`,
    });

  const feeVariances = async () => (await finance.get("/api/exceptions?domain=finance")).data.filter((exception) => exception.type === "fee_variance");

  test("every method's fee is to be agreed by default", async () => {
    const { data } = await admin.get("/api/admin/settings");
    for (const [method, settings] of Object.entries(data.settings.payments.methods)) assert.equal(settings.feeBps, null, method);
  });

  test("a fee is null or a whole number of basis points from 0 to 1000", async () => {
    for (const feeBps of [0, 1000, null, 175]) {
      assert.equal((await admin.put("/api/admin/settings", await settingsWith({ juice: feeBps }))).status, 200, String(feeBps));
      assert.equal((await admin.get("/api/admin/settings")).data.settings.payments.methods.juice.feeBps, feeBps);
    }
    for (const feeBps of [-1, 1001, 2.5, "100"]) {
      const res = await admin.put("/api/admin/settings", await settingsWith({ juice: feeBps }));
      assert.equal(res.status, 400, String(feeBps));
      assert.equal(res.data.error.code, "invalid_input");
    }
  });

  test("a payment confirmed while the fee is to be agreed has an unknown expected fee", async () => {
    const invoice = await deliverFirstOrder(agent);
    const pending = await agent.post("/api/payments", {
      invoiceId: invoice.id,
      method: "paystation",
      amountMinor: invoice.amount_minor,
      idempotencyKey: "test-unknown-fee-0001",
    });
    assert.equal((await paymentRow(pending.data.payment.id)).fee_expected_known, 0, "known from the attempt on");
    await agent.post(`/api/demo/payments/${pending.data.payment.id}/simulate`, { outcome: "success" });
    const row = await paymentRow(pending.data.payment.id);
    assert.equal(row.status, "confirmed");
    assert.equal(row.fee_expected_minor, 0);
    assert.equal(row.fee_expected_known, 0);
    // Every seeded payment was confirmed with fees to be agreed as well.
    for (const other of (await finance.get("/api/finance/journal")).data) assert.equal(other.fee_expected_known, 0, other.id);
  });

  test("the demo statement charges no fee, and importing it raises no fee-variance exception", async () => {
    const invoice = await deliverFirstOrder(agent);
    const paymentId = await payInFull(agent, invoice, "juice");
    const row = await paymentRow(paymentId);
    const { data: statement } = await finance.get("/api/finance/statements/demo");
    const lines = statementLines(statement.content);
    assert.ok(lines.length >= 2);
    for (const line of lines) {
      assert.equal(line.fee, "0.00", line.reference);
      assert.equal(line.net, line.gross, line.reference);
    }
    assert.ok(lines.some((line) => line.reference === row.provider_ref));

    const imported = await finance.post("/api/finance/statements", statement);
    assert.deepEqual({ ...imported.data, statementId: undefined }, { statementId: undefined, lines: lines.length, matched: lines.length, exceptions: 0, skipped: 0 });
    const settled = await paymentRow(paymentId);
    assert.equal(settled.settlement_status, "settled");
    assert.equal(settled.fee_actual_minor, 0);
    const bankLine = (await finance.get("/api/finance/reconciliation")).data.lines.find((line) => line.reference === row.provider_ref);
    assert.deepEqual(
      { fee_minor: bankLine.fee_minor, net_minor: bankLine.net_minor, fee_expected_minor: bankLine.fee_expected_minor, fee_expected_known: bankLine.fee_expected_known },
      { fee_minor: 0, net_minor: row.amount_minor, fee_expected_minor: 0, fee_expected_known: 0 },
    );
    assert.deepEqual(await feeVariances(), []);
  });

  test("a bank fee on a payment whose fee is to be agreed is not a variance", async () => {
    const invoice = await deliverFirstOrder(agent);
    const row = await paymentRow(await payInFull(agent, invoice, "card_tpe"));
    const res = await importOneLine(row, 12345);
    assert.equal(res.data.matched, 1);
    assert.equal(res.data.exceptions, 0);
    assert.deepEqual(await feeVariances(), []);
  });

  test("the demo statement with anomalies keeps its extra fee but raises no fee variance", async () => {
    const invoice = await deliverFirstOrder(agent);
    await payInFull(agent, invoice, "card_tpe");
    const { data: anomalies } = await finance.get("/api/finance/statements/demo?anomalies=1");
    const [first, ...others] = statementLines(anomalies.content);
    assert.equal(first.fee, "5.00", "the deliberate extra fee");
    for (const line of others) assert.equal(line.fee, "0.00", line.reference);
    await finance.post("/api/finance/statements", { ...anomalies, filename: "releve-anomalies.csv" });
    const types = (await finance.get("/api/exceptions?domain=finance")).data.map((exception) => exception.type).sort();
    assert.deepEqual(types, ["settlement_amount_mismatch", "unknown_credit"]);
  });

  test("the club demo statement charges no fee on online payments", async () => {
    const club = await server.as("u_cs_compta");
    const { data } = await club.get("/api/club/statements/demo");
    const settlements = statementLines(data.content).filter((line) => line.label.startsWith("REGLEMENT"));
    for (const line of settlements) {
      assert.equal(line.fee, "0.00", line.reference);
      assert.equal(line.net, line.gross, line.reference);
    }
  });

  test("a company that sets an agreed fee gets it expected, checked and charged", async () => {
    assert.equal((await admin.put("/api/admin/settings", await settingsWith({ paystation: 100 }))).status, 200);
    const invoice = await deliverFirstOrder(agent);
    const row = await paymentRow(await payInFull(agent, invoice, "paystation"));
    const expected = Math.round(row.amount_minor / 100);
    assert.equal(row.fee_expected_minor, expected);
    assert.equal(row.fee_expected_known, 1);

    const { data: statement } = await finance.get("/api/finance/statements/demo");
    const line = statementLines(statement.content).find((l) => l.reference === row.provider_ref);
    assert.equal(line.fee, rupees(expected));
    assert.equal(line.net, rupees(row.amount_minor - expected));

    // A different fee on the bank line is now a variance.
    const res = await importOneLine(row, expected + 500);
    assert.equal(res.data.matched, 1);
    const variances = await feeVariances();
    assert.equal(variances.length, 1);
    assert.deepEqual(variances[0].details, { reference: row.provider_ref, feeMinor: expected + 500, expectedMinor: expected, paymentId: row.id });
  });

  test("an agreed fee charged as expected is no variance", async () => {
    await admin.put("/api/admin/settings", await settingsWith({ juice: 90 }));
    const invoice = await deliverFirstOrder(agent);
    const row = await paymentRow(await payInFull(agent, invoice, "juice"));
    assert.equal(row.fee_expected_known, 1);
    const res = await importOneLine(row, row.fee_expected_minor);
    assert.equal(res.data.matched, 1);
    assert.deepEqual(await feeVariances(), []);
    assert.equal((await paymentRow(row.id)).fee_actual_minor, row.fee_expected_minor);
  });
});
