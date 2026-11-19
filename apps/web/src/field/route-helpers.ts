// Small lookups on the route bundle shared by the driver's screens.
import type { Customer, Invoice, RouteBundle } from "./types.ts";

export const findCustomer = (bundle: RouteBundle, customerId: string): Customer | undefined =>
  bundle.customers.find((customer) => customer.id === customerId);

/** What remains to be collected on an invoice (refunds make it due again). */
export const amountDue = (invoice: Pick<Invoice, "amount_minor" | "paid_minor" | "refunded_minor">): number =>
  invoice.amount_minor - (invoice.paid_minor - invoice.refunded_minor);
