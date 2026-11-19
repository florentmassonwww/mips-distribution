// Compatibility layer (step 1a): the club module is now in src/modules/club/*.ts; legacy modules
// still import it under the compiled names. Removed once every module is rewritten.
export { accountingExport as $f } from "../modules/club/accounting.ts";
export { assignBankLine as Zf, demoStatement as qf, importStatement as Xf, reconciliationOverview as Qf } from "../modules/club/bank-reconciliation.ts";
export { cancelCharge as _f, chargeMember as gf } from "../modules/club/charges.ts";
export { clubDashboard as Mf } from "../modules/club/dashboard.ts";
export { duesOverview as bf, runDues as yf } from "../modules/club/dues.ts";
export { checkAtDesk as Uf, handleReaderRequest as Wf, listGateEvents as Kf, readerDecision as Gf } from "../modules/club/gate.ts";
export {
  applyMemberPaymentNotification as Of,
  checkMemberPaymentStatus as Df,
  listMemberPayments as kf,
  recordCashPayment as Tf,
  startLinkPayment as Ef,
} from "../modules/club/member-payments.ts";
export { createMember as pf, listMembers as jf, memberDetail as Nf, updateMember as mf } from "../modules/club/members.ts";
export { requireCompanyPayment as np, serializePayment as rp } from "../modules/club/payment-view.ts";
export { memberPortal as ep, requireMemberByPortalToken as tp } from "../modules/club/portal.ts";
export { listReminders as Rf, runReminders as If } from "../modules/club/reminders.ts";
export { sendStatement as Lf } from "../modules/club/statements.ts";
