// Connector set of the application. Only simulated connectors exist for now (demo mode).
import type { Db } from "../../core/db.ts";
import { demoAccountingSoftware } from "./accounting-software.ts";
import { demoBankStatement } from "./bank-statement.ts";
import { createDemoGateAccess } from "./gate-access.ts";
import { PAYMENT_PROVIDER_SPECS } from "./payment-providers.ts";
import { SimulatedProvider } from "./provider-simulator.ts";
import type { DemoConnectorSet, PaymentMethod, SimulatedPaymentProvider } from "./types.ts";

export type * from "./types.ts";
export { PAYMENT_METHODS } from "./types.ts";
export { STATEMENT_HEADER, parseStatementAmount } from "./bank-statement.ts";

/**
 * Simulated connectors. `secret` signs the simulated provider notifications; `toleranceSeconds`
 * bounds the age of a signed notification or gate request.
 */
export function createDemoConnectors(db: Db, secret: string, toleranceSeconds: number): DemoConnectorSet {
  const payments = {} as Record<PaymentMethod, SimulatedPaymentProvider>;
  for (const spec of PAYMENT_PROVIDER_SPECS) payments[spec.method] = new SimulatedProvider(db, spec, secret, toleranceSeconds);
  return {
    payments,
    bank: demoBankStatement,
    erp: demoAccountingSoftware,
    access: createDemoGateAccess(toleranceSeconds),
  };
}
