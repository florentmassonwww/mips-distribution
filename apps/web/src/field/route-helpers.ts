// Small lookups on the route bundle shared by the driver's screens.
import type { BundleCustomerOutlet, BundleInvoice, RouteBundle } from "../shared/offline.ts";

export const findCustomerOutlet = (bundle: RouteBundle, customerOutletId: string): BundleCustomerOutlet | undefined =>
  bundle.customer_outlets.find((outlet) => outlet.id === customerOutletId);

/** What remains to be collected on an invoice (refunds make it due again). */
export const amountDue = (invoice: Pick<BundleInvoice, "amount_minor" | "paid_minor" | "refunded_minor">): number =>
  invoice.amount_minor - (invoice.paid_minor - invoice.refunded_minor);
