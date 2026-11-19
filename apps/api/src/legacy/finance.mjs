// Compatibility layer (step 1a): the finance code is now in src/modules/finance/*.ts; other legacy
// modules still import it under the compiled names. Removed once every module is rewritten.
export {
  importStatement as Cp,
  listDailyCloses as Dp,
  closeDay as Ep,
  listAccountingEntries as Op,
  generateDemoStatement as Sp,
  getDayTotals as Tp,
  listJournal as bp,
  syncAccountingEntries as kp,
  getReconciliation as wp,
  listInvoices as xp,
} from "../modules/finance/index.ts";
