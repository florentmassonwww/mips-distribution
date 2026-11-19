// Collecting invoices: payment attempts, status checks, cancellation, claims, receipts.
import { z } from "zod";
import {
  cancelPayment,
  checkPayment,
  claimPayment,
  getPayment,
  invoiceReceipt,
  presentPayment,
  requestPayment,
} from "./legacy-modules.ts";
import { type App, type AppDeps, paymentMethodSchema, readJson, requestOrigin, routeParam } from "./context.ts";
import { COMPANY_ROLES } from "./session.ts";

export function registerPaymentRoutes(app: App, deps: AppDeps): void {
  const { db, connectors, session, now, syncErpIfAuto } = deps;
  const collectors = session.requireRole("agent", "finance", "company_admin");

  app.post("/api/payments", collectors, async (c) => {
    const request = await readJson(
      c,
      z.object({
        invoiceId: z.string(),
        method: paymentMethodSchema,
        amountMinor: z.number().int().positive(),
        idempotencyKey: z.string().min(16).max(80),
      }),
    );
    const { payment, replayed } = await requestPayment(db, connectors, c.get("user"), request, requestOrigin(c), now());
    return c.json({ payment: presentPayment(payment), replayed });
  });

  app.get("/api/payments/:id", collectors, (c) => c.json(presentPayment(getPayment(db, c.get("user"), routeParam(c)))));

  app.post("/api/payments/:id/check", collectors, async (c) => {
    const payment = await checkPayment(db, connectors, c.get("user"), routeParam(c), now());
    await syncErpIfAuto(payment.company_id);
    return c.json(presentPayment(payment));
  });

  app.post("/api/payments/:id/cancel", collectors, async (c) =>
    c.json(presentPayment(await cancelPayment(db, connectors, c.get("user"), routeParam(c), now()))),
  );

  // The customer shows a screenshot: the payment goes to verification, it is not confirmed.
  app.post("/api/payments/:id/claim", collectors, (c) => c.json(presentPayment(claimPayment(db, c.get("user"), routeParam(c), now()))));

  app.get("/api/invoices/:id/receipt", session.requireRole(...COMPANY_ROLES), (c) =>
    c.json(invoiceReceipt(db, c.get("user"), routeParam(c))),
  );
}
