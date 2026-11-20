// @mips/core: the business rules of MIPS Business Suite, as pure functions (no database, no
// network, no clock or random source of their own). apps/api applies them; the acceptance
// scenarios of docs/CAHIER-DE-RECETTE.md test them directly (packages/core/test).
export * from "./rule-error.ts";
export * from "./money.ts";
export * from "./calendar.ts";
export * from "./invoices.ts";
export * from "./payments.ts";
export * from "./delivery.ts";
export * from "./offline.ts";
export * from "./stock.ts";
export * from "./reconciliation.ts";
export * from "./club.ts";
