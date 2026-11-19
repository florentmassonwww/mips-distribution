// Compatibility layer (step 1a): the payments are now in src/modules/payments/*.ts; other legacy
// modules still import them under the compiled names. Removed once every module is rewritten.
export {
  refundPayment as _p,
  initiatePayment as dp,
  checkPaymentStatus as fp,
  settlePayment as gp,
  processNotification as hp,
  claimPayment as mp,
  cancelPayment as pp,
  getPaymentForUser as up,
  getReceipt as vp,
} from "../modules/payments/index.ts";
