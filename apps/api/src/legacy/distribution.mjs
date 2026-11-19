// Compatibility layer (step 1a): the distribution module is now in src/modules/distribution/*.ts;
// legacy modules still import it under the compiled names. Removed once every module is rewritten.
export { PAYMENT_METHODS as Gu, OPS_ROLES as Ku, FINANCE_ROLES as qu, CLUB_OUTLETS as Ju, defaultCompanySettings as Yu, readCompanySettings as Xu } from "../modules/distribution/settings.ts";
export { nextNumber as Zu } from "../modules/distribution/counters.ts";
export { dayBounds as Qu, isValidDay as $u } from "../modules/distribution/days.ts";
export { raiseException as U, autoResolveExceptions as ed, queueErpEntry as W, listExceptions as td, resolveException as Rd } from "../modules/distribution/exceptions.ts";
export { createOrderInput as ld, createOrder as ud, assignOrder as dd, setOrderStatus as fd, listOrders as pd, orderChain as md } from "../modules/distribution/orders.ts";
export { createRouteInput as hd, createRoute as _d, updateRoute as vd, loadRoute as yd, listRoutes as bd, routeSummary as xd } from "../modules/distribution/delivery-routes.ts";
export { readStock as Sd, adjustStock as Cd } from "../modules/distribution/stock.ts";
export { startRoute as Td, routeBundle as Ed, syncActionInput as jd, applySyncAction as Id, closeRoute as Ld } from "../modules/distribution/agent-sync.ts";
export { dashboard as zd } from "../modules/distribution/dashboard.ts";
export { signWebhook as Bd, verifyWebhook as Vd } from "../modules/distribution/webhook-signature.ts";
