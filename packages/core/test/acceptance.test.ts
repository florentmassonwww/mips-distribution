// Acceptance scenarios of the business rules (docs/CAHIER-DE-RECETTE.md), run against @mips/core
// directly: no database, no server. Each scenario is R01…R30, as numbered in the document; the
// last test checks that the document and this file list the same scenarios.
//   node --test packages/core/test/

import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import {
  type ConfirmationSource,
  type PaymentStatus,
  CONFIRMATION_SOURCES,
  OFFLINE_ACTION_TYPES,
  RuleError,
  allocatePayments,
  attemptDeadline,
  balanceDue,
  canConfirm,
  canFail,
  canMarkToVerify,
  checkCancel,
  checkDeliveredQty,
  checkHandover,
  checkLoadLine,
  checkNewAttempt,
  checkRefund,
  checkReplay,
  checkWarehouseLevel,
  claimDecision,
  confirmedBySettlement,
  deliveryOutcome,
  expectedFee,
  fieldTime,
  gateDecision,
  invoiceAmount,
  invoiceStatus,
  isFeeVariance,
  isInProgress,
  isInvoiced,
  isOfflineActionType,
  isStockVariance,
  isValidAdjustment,
  loadQuantities,
  matchStatementLine,
  notificationDecision,
  orderStatusAfter,
  overdue,
  priceMismatch,
  refundKey,
  reminderLevel,
  replayDecision,
  statusAfterRefund,
  statusQueryDecision,
  unitPriceFor,
  wasOffline,
} from "../src/index.ts";

const registered: string[] = [];
/** One acceptance scenario of the document. */
function scenario(id: string, title: string, run: () => void): void {
  registered.push(id);
  test(`${id} · ${title}`, run);
}

/** The rule refuses with this code (and kind). */
function refuses(run: () => unknown, code: string, kind?: "invalid" | "conflict"): void {
  assert.throws(run, (error: unknown) => {
    assert.ok(error instanceof RuleError, "a business rule refusal");
    assert.equal(error.code, code);
    if (kind) assert.equal(error.kind, kind);
    return true;
  });
}

const NOW = new Date("2026-10-17T04:00:00.000Z");
const minutes = (n: number) => new Date(NOW.getTime() + n * 60_000);
const invoice = (amountMinor: number, paidMinor = 0, refundedMinor = 0) => ({ amountMinor, paidMinor, refundedMinor });
const attempt = (overrides: Partial<Parameters<typeof checkNewAttempt>[0]> = {}) => ({
  methodEnabled: true,
  inProgress: null,
  invoice: invoice(1_260_000),
  amountMinor: 1_260_000,
  ...overrides,
});
const proof = (overrides: Partial<Parameters<typeof checkHandover>[1]> = {}) => ({ reason: "", receiverName: "Gérant (démo)", returnLines: 0, ...overrides });

// ───────── Delivery ─────────

scenario("R01", "Full delivery: invoice on the quantities delivered, receiver's name required", () => {
  const outcome = deliveryOutcome(28, 28);
  assert.equal(outcome, "full");
  assert.equal(orderStatusAfter(outcome), "delivered");
  checkHandover(outcome, proof());
  refuses(() => checkHandover(outcome, proof({ receiverName: " A " })), "pod_required", "invalid");
  const amount = invoiceAmount(
    [
      { qty: 6, unitPriceMinor: 90_000 },
      { qty: 10, unitPriceMinor: 45_000 },
    ],
    [],
  );
  assert.deepEqual(amount, { amountMinor: 990_000, returnsMinor: 0 });
  assert.ok(isInvoiced(amount));
});

scenario("R02", "Partial delivery: reason required; the invoice covers the quantity delivered only", () => {
  const outcome = deliveryOutcome(4, 10);
  assert.equal(outcome, "partial");
  assert.equal(orderStatusAfter(outcome), "partially_delivered");
  refuses(() => checkHandover(outcome, proof({ reason: "  " })), "reason_required", "invalid");
  checkHandover(outcome, proof({ reason: "Rupture chez le client" }));
  assert.equal(invoiceAmount([{ qty: 4, unitPriceMinor: 12_500 }], []).amountMinor, 50_000);
});

scenario("R03", "Nothing delivered: refusal with a reason, no invoice, no return", () => {
  const outcome = deliveryOutcome(0, 10);
  assert.equal(outcome, "refused");
  assert.equal(orderStatusAfter(outcome), "refused");
  refuses(() => checkHandover(outcome, proof({ reason: "no" })), "reason_required");
  refuses(() => checkHandover(outcome, proof({ reason: "Commerce fermé", returnLines: 1 })), "invalid_returns");
  // No receiver's name is needed when nothing is handed over.
  checkHandover(outcome, proof({ reason: "Commerce fermé", receiverName: "" }));
  assert.equal(isInvoiced(invoiceAmount([{ qty: 0, unitPriceMinor: 12_500 }], [])), false);
});

scenario("R04", "A quantity delivered above the quantity ordered is refused", () => {
  checkDeliveredQty(6, 6);
  refuses(() => checkDeliveredQty(7, 6), "qty_exceeds_order", "invalid");
});

scenario("R05", "Returns are deducted at the outlet's price and cannot exceed the delivery", () => {
  assert.deepEqual(invoiceAmount([{ qty: 24, unitPriceMinor: 10_000 }], [{ qty: 2, unitPriceMinor: 4_025 }]), {
    amountMinor: 231_950,
    returnsMinor: 8_050,
  });
  refuses(() => invoiceAmount([{ qty: 1, unitPriceMinor: 1_000 }], [{ qty: 2, unitPriceMinor: 1_000 }]), "returns_exceed_delivery", "invalid");
  // Returns worth the whole delivery: nothing is owed, nothing is invoiced.
  assert.equal(isInvoiced(invoiceAmount([{ qty: 2, unitPriceMinor: 1_000 }], [{ qty: 2, unitPriceMinor: 1_000 }])), false);
});

scenario("R06", "Prices: the outlet's price list when it has the product, otherwise the list price", () => {
  assert.equal(unitPriceFor(90_000, 85_500), 85_500);
  assert.equal(unitPriceFor(90_000, null), 90_000);
  assert.equal(unitPriceFor(90_000, undefined), 90_000);
});

scenario("R07", "A total shown on the phone that differs from the invoice is reported to the driver", () => {
  assert.deepEqual(priceMismatch(1, 1_260_000), { shownMinor: 1, invoicedMinor: 1_260_000 });
  assert.equal(priceMismatch(1_260_000, 1_260_000), null);
  // An action without a shown total (older phone) has nothing to compare.
  assert.equal(priceMismatch(undefined, 1_260_000), null);
});

// ───────── Offline ─────────

scenario("R08", "Only deliveries and on-the-spot sales are queued offline: never a payment", () => {
  assert.deepEqual([...OFFLINE_ACTION_TYPES], ["deliver", "sale"]);
  assert.ok(isOfflineActionType("deliver"));
  assert.ok(isOfflineActionType("sale"));
  for (const type of ["payment", "pay", "confirm_payment", "refund"]) assert.equal(isOfflineActionType(type), false);
});

scenario("R09", "Replaying an action (same id) returns its first result and changes nothing", () => {
  const first = { orderId: "ord_1", outcome: "full", amountMinor: 1_260_000 };
  assert.deepEqual(replayDecision(first), { replay: true, result: first });
  assert.deepEqual(replayDecision(undefined), { replay: false });
});

scenario("R10", "Field time: the device time unless unreadable, in the future or older than a week", () => {
  assert.equal(fieldTime("2026-10-17T03:30:00.000Z", NOW).toISOString(), "2026-10-17T03:30:00.000Z");
  assert.equal(fieldTime("not a date", NOW), NOW);
  assert.equal(fieldTime("2026-10-17T05:00:00.000Z", NOW), NOW);
  assert.equal(fieldTime("2026-10-09T03:59:59.000Z", NOW), NOW);
  // More than two minutes between the field and the server: the action was offline.
  assert.equal(wasOffline(minutes(-3), NOW), true);
  assert.equal(wasOffline(minutes(-2), NOW), false);
});

// ───────── Payment attempts ─────────

scenario("R11", "No double debit: one attempt pending per invoice at most", () => {
  checkNewAttempt(attempt());
  refuses(() => checkNewAttempt(attempt({ inProgress: "pending" })), "attempt_in_progress", "conflict");
  assert.ok(isInProgress("pending"));
});

scenario("R12", "An attempt to verify blocks a new one too (possible double debit)", () => {
  refuses(() => checkNewAttempt(attempt({ inProgress: "to_verify" })), "attempt_in_progress", "conflict");
  assert.ok(isInProgress("to_verify"));
  for (const status of ["confirmed", "failed", "refunded"] as const) assert.equal(isInProgress(status), false);
});

scenario("R13", "Same idempotency key: the same request is replayed, another request is refused", () => {
  const request = { invoiceId: "inv_1", method: "paystation", amountMinor: 1_260_000 };
  checkReplay(request, { ...request });
  refuses(() => checkReplay(request, { ...request, amountMinor: 600_000 }), "idempotency_conflict", "conflict");
  refuses(() => checkReplay(request, { ...request, method: "juice" }), "idempotency_conflict");
  refuses(() => checkReplay(request, { ...request, invoiceId: "inv_2" }), "idempotency_conflict");
});

scenario("R14", "A new attempt needs an enabled method and an amount within the balance", () => {
  refuses(() => checkNewAttempt(attempt({ methodEnabled: false })), "method_disabled", "invalid");
  refuses(() => checkNewAttempt(attempt({ amountMinor: 1_260_001 })), "amount_exceeds_balance", "invalid");
  refuses(() => checkNewAttempt(attempt({ invoice: invoice(1_260_000, 1_260_000) })), "already_paid", "conflict");
  assert.equal(attemptDeadline(NOW, 10).toISOString(), "2026-10-17T04:10:00.000Z");
});

// ───────── Confirmation ─────────

scenario("R15", "Confirmed only by the provider: signed notification, status query or bank credit", () => {
  assert.deepEqual([...CONFIRMATION_SOURCES], ["notification", "status_query", "bank_statement"]);
  // There is no source for a person: a driver, cashier or finance user cannot confirm.
  const sources: readonly string[] = CONFIRMATION_SOURCES;
  for (const person of ["agent", "driver", "manual", "finance", "customer"]) assert.equal(sources.includes(person), false);
  const requested = { amountMinor: 1_260_000, currency: "MUR" };
  assert.deepEqual(notificationDecision(requested, { type: "payment.succeeded", ...requested }), { action: "confirm" });
  const via: ConfirmationSource = "notification";
  assert.ok(CONFIRMATION_SOURCES.includes(via));
});

scenario("R16", "A notification with another amount or currency goes to verify, never confirmed", () => {
  const requested = { amountMinor: 1_260_000, currency: "MUR" };
  const decision = notificationDecision(requested, { type: "payment.succeeded", amountMinor: 1_259_900, currency: "MUR" });
  assert.equal(decision.action, "to_verify");
  assert.equal(notificationDecision(requested, { type: "payment.succeeded", amountMinor: 1_260_000, currency: "EUR" }).action, "to_verify");
  // A failure with the right amount fails the attempt, with the provider's reason.
  assert.deepEqual(notificationDecision(requested, { type: "payment.failed", ...requested, failureReason: "Refusé" }), { action: "fail", reason: "Refusé" });
});

scenario("R17", "A status query confirms only the amount requested; a lost notification is recovered", () => {
  const pending = { status: "pending" as const, amountMinor: 1_260_000, currency: "MUR", expiresAt: minutes(10).toISOString() };
  // Notification lost: the provider's status confirms it.
  assert.deepEqual(statusQueryDecision(pending, { status: "succeeded", amountMinor: 1_260_000, currency: "MUR" }, NOW), { action: "confirm" });
  // The provider received 1.00 less: still to verify (v0.1.0 confirmed it).
  const short = statusQueryDecision({ ...pending, status: "to_verify" }, { status: "succeeded", amountMinor: 1_259_900, currency: "MUR" }, NOW);
  assert.equal(short.action, "to_verify");
  assert.equal(statusQueryDecision(pending, { status: "failed", amountMinor: null, currency: null }, NOW).action, "fail");
  assert.equal(statusQueryDecision(pending, { status: "unknown", amountMinor: null, currency: null }, NOW).action, "to_verify");
  assert.equal(statusQueryDecision(pending, { status: "pending", amountMinor: null, currency: null }, NOW).action, "none");
});

scenario("R18", "A screenshot shown by the customer only puts the attempt to verify", () => {
  assert.equal(claimDecision("pending").action, "to_verify");
  refuses(() => claimDecision("to_verify"), "bad_status", "conflict");
  refuses(() => claimDecision("confirmed"), "bad_status");
  // "To verify" is not a confirmation, and finance cannot turn it into one by hand: only a
  // provider decision (R15) can.
  assert.equal(canConfirm("to_verify"), true);
  assert.equal(canMarkToVerify("to_verify"), false);
});

scenario("R19", "A failed or cancelled attempt frees the invoice for a new one", () => {
  assert.ok(canFail("pending"));
  assert.ok(canFail("to_verify"));
  assert.equal(canFail("confirmed"), false);
  checkCancel("pending");
  refuses(() => checkCancel("to_verify"), "bad_status", "conflict");
  // Once failed, the attempt no longer blocks the invoice.
  assert.equal(isInProgress("failed"), false);
  checkNewAttempt(attempt({ inProgress: null }));
  assert.equal(invoiceStatus({ ...invoice(1_260_000), hasAttemptToVerify: false, hasPendingAttempt: false, lastAttempt: "failed" }), "failed");
});

scenario("R20", "No answer after the attempt time: to verify, and a new attempt stays blocked", () => {
  const expiresAt = attemptDeadline(NOW, 10).toISOString();
  const pending = { status: "pending" as const, amountMinor: 1_260_000, currency: "MUR", expiresAt };
  const still = { status: "pending" as const, amountMinor: null, currency: null };
  assert.equal(statusQueryDecision(pending, still, minutes(9)).action, "none");
  assert.equal(statusQueryDecision(pending, still, minutes(11)).action, "to_verify");
  refuses(() => checkNewAttempt(attempt({ inProgress: "to_verify" })), "attempt_in_progress");
});

scenario("R21", "Notifications are idempotent: a confirmation applies once", () => {
  assert.equal(canConfirm("pending"), true);
  assert.equal(canConfirm("confirmed"), false);
  assert.equal(canConfirm("refunded"), false);
  // A failure notified after a confirmation changes nothing.
  assert.equal(canFail("confirmed"), false);
});

scenario("R22", "Partial payment: the invoice is partially paid and the balance can be collected", () => {
  const partly = invoice(1_260_000, 600_000);
  assert.equal(balanceDue(partly), 660_000);
  assert.equal(invoiceStatus({ ...partly, hasAttemptToVerify: false, hasPendingAttempt: false, lastAttempt: "confirmed" }), "partially_paid");
  checkNewAttempt(attempt({ invoice: partly, amountMinor: 660_000 }));
  refuses(() => checkNewAttempt(attempt({ invoice: partly, amountMinor: 660_001 })), "amount_exceeds_balance");
});

scenario("R23", "Refund: of a confirmed payment only, within what is left, refunded when nothing is left", () => {
  const confirmed = { status: "confirmed" as const, amountMinor: 1_260_000, refundedMinor: 0 };
  checkRefund(confirmed, 260_000);
  assert.equal(statusAfterRefund(confirmed, 260_000), "confirmed");
  const partly = { ...confirmed, refundedMinor: 260_000 };
  refuses(() => checkRefund(partly, 1_000_001), "amount_exceeds_balance", "invalid");
  refuses(() => checkRefund(partly, 0), "amount_exceeds_balance");
  assert.equal(statusAfterRefund(partly, 1_000_000), "refunded");
  for (const status of ["pending", "to_verify", "failed", "refunded"] as PaymentStatus[]) {
    refuses(() => checkRefund({ ...confirmed, status }, 1), "bad_status", "conflict");
  }
  assert.equal(refundKey("pay_1", 260_000), "pay_1:260000");
});

scenario("R24", "Invoice status: an attempt in progress wins over the amounts", () => {
  const state = (overrides: Partial<Parameters<typeof invoiceStatus>[0]>) =>
    invoiceStatus({ ...invoice(1_000), hasAttemptToVerify: false, hasPendingAttempt: false, lastAttempt: undefined, ...overrides });
  assert.equal(state({ hasAttemptToVerify: true, hasPendingAttempt: true, paidMinor: 1_000 }), "to_verify");
  assert.equal(state({ hasPendingAttempt: true, paidMinor: 400 }), "pending");
  assert.equal(state({ paidMinor: 1_000 }), "paid");
  assert.equal(state({ paidMinor: 400 }), "partially_paid");
  assert.equal(state({ paidMinor: 1_000, refundedMinor: 1_000 }), "refunded");
  assert.equal(state({ lastAttempt: "failed" }), "failed");
  assert.equal(state({}), "unpaid");
});

// ───────── Bank reconciliation ─────────

scenario("R25", "Confirmed and settled in the bank are two separate states", () => {
  const confirmed = { status: "confirmed" as const, settlement: "unsettled" as const, amountMinor: 1_260_000, refundedMinor: 0 };
  assert.deepEqual(matchStatementLine(1_260_000, confirmed), { match: "matched" });
  // A credit after a partial refund is the amount kept.
  assert.deepEqual(matchStatementLine(1_000_000, { ...confirmed, refundedMinor: 260_000 }), { match: "matched" });
  // The bank credit is a provider-side proof: an attempt to verify is confirmed by it, then settled.
  assert.equal(confirmedBySettlement("to_verify"), true);
  assert.equal(confirmedBySettlement("pending"), true);
  assert.equal(confirmedBySettlement("confirmed"), false);
});

scenario("R26", "Statement anomalies each open a finance exception", () => {
  const confirmed = { status: "confirmed" as const, settlement: "unsettled" as const, amountMinor: 1_260_000, refundedMinor: 0 };
  assert.deepEqual(matchStatementLine(125_000, undefined), { match: "unmatched", exception: "unknown_credit" });
  assert.deepEqual(matchStatementLine(1_260_000, { ...confirmed, settlement: "settled" }), { match: "duplicate", exception: "duplicate_settlement" });
  assert.deepEqual(matchStatementLine(1_260_000, { ...confirmed, status: "failed" }), { match: "unmatched", exception: "credit_on_failed" });
  assert.deepEqual(matchStatementLine(1_250_000, confirmed), { match: "amount_mismatch", exception: "settlement_amount_mismatch" });
});

scenario("R27", "Fees to be agreed: no expected fee and no variance; an agreed fee is checked", () => {
  assert.deepEqual(expectedFee(1_260_000, null), { minor: 0, known: false });
  assert.equal(isFeeVariance(500, expectedFee(1_260_000, null)), false);
  assert.deepEqual(expectedFee(1_260_000, 175), { minor: 22_050, known: true });
  assert.equal(isFeeVariance(22_550, expectedFee(1_260_000, 175)), true);
  assert.equal(isFeeVariance(22_050, expectedFee(1_260_000, 175)), false);
});

// ───────── Stock ─────────

scenario("R28", "Stock: loading needs what the warehouse holds; adjustments need a reason and never go below zero", () => {
  const toLoad = loadQuantities(
    [{ productId: "p1", qty: 10 }],
    [
      { productId: "p1", qty: 5 },
      { productId: "p2", qty: 3 },
      { productId: "p3", qty: 0 },
    ],
  );
  assert.deepEqual([...toLoad], [["p1", 15], ["p2", 3]]);
  refuses(() => loadQuantities([], [{ productId: "p1", qty: 0 }]), "nothing_to_load", "conflict");
  checkLoadLine("Bière blonde 33 cl", 333, 333);
  refuses(() => checkLoadLine("Bière blonde 33 cl", 333, 1_333), "insufficient_stock", "conflict");
  assert.equal(isValidAdjustment(-4, "Casse"), true);
  assert.equal(isValidAdjustment(0, "Inventaire"), false);
  assert.equal(isValidAdjustment(5, "ok"), false);
  checkWarehouseLevel(0);
  refuses(() => checkWarehouseLevel(-1), "negative_stock", "conflict");
  // A handover beyond the vehicle stock is accepted but flagged as an inventory gap.
  assert.equal(isStockVariance(-3), true);
  assert.equal(isStockVariance(0), false);
});

// ───────── Club ─────────

scenario("R29", "Club: payments go to the oldest charges first; reminders by level above a threshold", () => {
  const charges = [
    { id: "c1", amountMinor: 1_000, dueDate: "2026-08-31" },
    { id: "c2", amountMinor: 1_000, dueDate: "2026-09-30" },
    { id: "c3", amountMinor: 1_000, dueDate: "2026-10-31" },
  ];
  assert.deepEqual(allocatePayments(1_500, charges), [
    { id: "c1", allocatedMinor: 1_000, status: "paid" },
    { id: "c2", allocatedMinor: 500, status: "open" },
    { id: "c3", allocatedMinor: 0, status: "open" },
  ]);
  const account = overdue(
    [
      { id: "c2", dueDate: "2026-09-30", restMinor: 500 },
      { id: "c3", dueDate: "2026-10-31", restMinor: 1_000 },
    ],
    "2026-10-17",
  );
  assert.deepEqual(account, { overdueMinor: 500, overdueDays: 17, oldestOverdueId: "c2" });
  assert.equal(reminderLevel(account, 100, [7, 15, 30]), 2);
  assert.equal(reminderLevel(account, 1_000, [7, 15, 30]), 0);
  assert.equal(reminderLevel(overdue([], "2026-10-17"), 0, [7]), 0);
});

scenario("R30", "Club gate: allowed, flagged or denied by status and by the age of the debt", () => {
  const rules = { minAmountMinor: 100, flagAfterDays: 15, denyAfterDays: 45 };
  const debt = (overdueMinor: number, overdueDays: number) => ({ overdueMinor, overdueDays, oldestOverdueId: overdueMinor ? "c1" : null });
  assert.equal(gateDecision("active", debt(0, 0), rules).decision, "allow");
  assert.equal(gateDecision("active", debt(500, 20), rules).decision, "flag");
  assert.equal(gateDecision("active", debt(500, 50), rules).decision, "deny");
  assert.equal(gateDecision("active", debt(50, 50), rules).decision, "allow");
  assert.equal(gateDecision("active", debt(500, 50), { ...rules, denyAfterDays: 0 }).decision, "flag");
  assert.equal(gateDecision("suspended", debt(0, 0), rules).decision, "deny");
  assert.equal(gateDecision("resigned", debt(0, 0), rules).decision, "deny");
});

// ───────── The document and this file list the same scenarios ─────────

test("docs/CAHIER-DE-RECETTE.md lists exactly these scenarios", () => {
  const doc = fs.readFileSync(new URL("../../../docs/CAHIER-DE-RECETTE.md", import.meta.url), "utf8");
  const documented = [...doc.matchAll(/^\| (R\d\d) \|/gm)].map((match) => match[1]);
  assert.deepEqual(documented, registered);
  assert.equal(registered.length, 30);
});
