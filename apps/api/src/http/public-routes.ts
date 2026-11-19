// Routes reached without a session: public payment and member links, provider notifications,
// gate readers; plus the catalogue of connectors.
import { get } from "../core/db.ts";
import { notFound } from "../core/errors.ts";
import { z } from "zod";
import {
  PAYMENT_METHODS,
  handleNotification,
  memberByToken,
  publicMemberView,
  readerAccessCheck,
  startMemberLinkPayment,
} from "./legacy-modules.ts";
import { type App, type AppDeps, clientKey, paymentMethodSchema, readJson, requestOrigin, routeParam } from "./context.ts";
import { COMPANY_ROLES } from "./session.ts";
import { ONE_MINUTE_MS } from "./rate-limit.ts";
import { idempotencyKeySchema } from "./club-routes.ts";

/** Public payment link, provider notifications and the connectors catalogue. */
export function registerPublicPaymentRoutes(app: App, deps: AppDeps): void {
  const { db, config, connectors, session, rateLimit, now, syncErpIfAuto } = deps;

  app.get("/api/public/pay/:token", (c) => {
    rateLimit(`payget:${clientKey(c)}`, 120, ONE_MINUTE_MS);
    const link = get(
      db,
      `SELECT p.status, p.amount_minor, p.currency, p.expires_at, co.name AS company, i.number AS invoice
      FROM payments p JOIN companies co ON co.id = p.company_id JOIN invoices i ON i.id = p.invoice_id WHERE p.link_token = ? AND p.method = 'link'`,
      routeParam(c, "token"),
    );
    if (!link) throw notFound("Lien de paiement");
    return c.json({ ...link, demoMode: config.demoMode });
  });

  // Signed provider notification; authenticity is checked by the provider connector.
  app.post("/api/webhooks/:method", async (c) => {
    const method = paymentMethodSchema.safeParse(routeParam(c, "method"));
    if (!method.success) throw notFound("Prestataire");
    const rawBody = await c.req.text();
    const outcome = handleNotification(db, connectors, method.data, rawBody, c.req.header("X-Signature"), now());
    if (outcome.paymentId) await syncErpIfAuto(outcome.companyId);
    return c.json({ received: true, result: outcome.result });
  });

  app.get("/api/connectors", session.requireRole(...COMPANY_ROLES, "platform_admin"), (c) =>
    c.json({
      payments: PAYMENT_METHODS.map((method) => {
        const provider = connectors.payments[method];
        return {
          method,
          label: provider.label,
          demo: provider.demo,
          capabilities: provider.capabilities,
          toVerify: provider.toVerify,
        };
      }),
      bank: { label: connectors.bank.label, demo: connectors.bank.demo, toVerify: connectors.bank.toVerify },
      erp: { label: connectors.erp.label, demo: connectors.erp.demo, toVerify: connectors.erp.toVerify },
      access: { label: connectors.access.label, demo: connectors.access.demo, toVerify: connectors.access.toVerify },
    }),
  );
}

/** Gate readers and the members' public portal. */
export function registerPublicMemberRoutes(app: App, deps: AppDeps): void {
  const { db, config, connectors, rateLimit, now } = deps;

  // Signed request from a gate reader, identified by its X-Device header.
  app.post("/api/access/check", async (c) => {
    rateLimit(`access:${c.req.header("X-Device") ?? "?"}`, 120, ONE_MINUTE_MS);
    return c.json(
      readerAccessCheck(
        db,
        connectors,
        config.webhookSecret,
        c.req.header("X-Device") ?? "",
        await c.req.text(),
        c.req.header("X-Signature"),
        now(),
      ),
    );
  });

  app.get("/api/public/member/:token", (c) => {
    rateLimit(`member:${clientKey(c)}`, 120, ONE_MINUTE_MS);
    return c.json({ ...publicMemberView(db, routeParam(c, "token"), now()), demoMode: config.demoMode });
  });

  app.post("/api/public/member/:token/pay", async (c) => {
    rateLimit(`mpaystart:${routeParam(c, "token")}`, 10, ONE_MINUTE_MS);
    const { idempotencyKey } = await readJson(c, z.object({ idempotencyKey: idempotencyKeySchema }));
    const member = memberByToken(db, routeParam(c, "token"));
    const started = await startMemberLinkPayment(
      db,
      connectors,
      member.company_id,
      member.id,
      idempotencyKey,
      requestOrigin(c),
      { id: `member:${member.number}`, role: "member", companyId: member.company_id },
      now(),
    );
    return c.json({
      status: started.payment.status,
      amountMinor: started.payment.amount_minor,
      replayed: started.replayed,
    });
  });
}
