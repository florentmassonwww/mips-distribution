// Demo-mode routes: one-click logins, demo reset, and simulated provider outcomes.
import { setCookie } from "hono/cookie";
import { z } from "zod";
import { all, get, type Row } from "../core/db.ts";
import { ApiError, notFound } from "../core/errors.ts";
import { resetDemo } from "../seed/index.ts";
import { requireMemberByPortalToken as memberByToken } from "../modules/club/portal.ts";
import { type SimulatedOutcome } from "../modules/connectors/types.ts";
import { getPaymentForUser as getPayment, processNotification as handleNotification } from "../modules/payments/index.ts";
import { type App, type AppDeps, readJson, routeParam } from "./context.ts";
import { COMPANY_ROLES, COOKIE_LIFETIME_SECONDS, SESSION_COOKIE } from "./session.ts";
import { ONE_MINUTE_MS } from "./rate-limit.ts";

export function registerDemoRoutes(app: App, deps: AppDeps): void {
  const { db, connectors, session, rateLimit, now, syncErpIfAuto } = deps;

  app.get("/api/demo/users", (c) =>
    c.json(
      all(
        db,
        `SELECT u.id, u.name, u.role, c.id AS company_id, c.name AS company_name, c.status AS company_status, c.vertical AS company_vertical
      FROM users u LEFT JOIN companies c ON c.id = u.company_id WHERE u.active = 1 ORDER BY c.rowid, u.rowid`,
      ),
    ),
  );

  app.post("/api/demo/login", async (c) => {
    const { userId } = await readJson(c, z.object({ userId: z.string() }));
    if (!get(db, "SELECT 1 FROM users WHERE id = ? AND active = 1", userId)) throw notFound("Utilisateur");
    setCookie(c, SESSION_COOKIE, session.sign({ uid: userId, exp: now().getTime() + COOKIE_LIFETIME_SECONDS * 1000 }), {
      httpOnly: true,
      sameSite: "Strict",
      secure: false,
      path: "/",
      maxAge: COOKIE_LIFETIME_SECONDS,
    });
    return c.json({ ok: true });
  });

  app.post("/api/demo/reset", session.requireRole("platform_admin"), async (c) => {
    await resetDemo(db, connectors, now());
    return c.json({ ok: true });
  });

  /** Asks the simulated provider for an outcome and processes the notification it sends, if any. */
  const simulateOutcome = async (payment: Row, outcome: SimulatedOutcome): Promise<string> => {
    if (!payment.provider_ref) throw new ApiError(409, "bad_status", "Paiement sans référence prestataire.");
    const notification = connectors.payments[payment.method as keyof typeof connectors.payments].simulate(
      payment.provider_ref,
      outcome,
      now(),
    );
    const result = notification
      ? handleNotification(db, connectors, payment.method, notification.rawBody, notification.signature, now()).result
      : "no_notification";
    await syncErpIfAuto(payment.company_id);
    return result;
  };

  app.post("/api/demo/payments/:id/simulate", session.requireRole(...COMPANY_ROLES), async (c) => {
    const { outcome } = await readJson(
      c,
      z.object({ outcome: z.enum(["success", "failure", "lost_notification", "duplicate", "wrong_amount"]) }),
    );
    return c.json({ result: await simulateOutcome(getPayment(db, c.get("user"), routeParam(c)), outcome) });
  });

  app.post("/api/public/pay/:token/demo", async (c) => {
    rateLimit(`pay:${routeParam(c, "token")}`, 10, ONE_MINUTE_MS);
    const { outcome } = await readJson(c, z.object({ outcome: z.enum(["success", "failure"]) }));
    const payment = get(db, "SELECT * FROM payments WHERE link_token = ? AND method = 'link'", routeParam(c, "token"));
    if (!payment) throw notFound("Lien de paiement");
    if (payment.status !== "pending") throw new ApiError(409, "bad_status", "Ce lien n'est plus payable.");
    return c.json({ result: await simulateOutcome(payment, outcome) });
  });

  app.post("/api/public/member/:token/pay/demo", async (c) => {
    rateLimit(`mpay:${routeParam(c, "token")}`, 10, ONE_MINUTE_MS);
    const { outcome } = await readJson(c, z.object({ outcome: z.enum(["success", "failure"]) }));
    const member = memberByToken(db, routeParam(c, "token"));
    const pending = get(
      db,
      "SELECT * FROM member_payments WHERE member_id = ? AND method = 'link' AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
      member.id,
    );
    if (!pending?.provider_ref) {
      throw new ApiError(409, "bad_status", "Aucun paiement en ligne en attente pour ce compte.");
    }
    const notification = connectors.payments.link.simulate(pending.provider_ref, outcome, now());
    const outcomeOfNotification = notification
      ? handleNotification(db, connectors, "link", notification.rawBody, notification.signature, now())
      : null;
    await syncErpIfAuto(member.company_id);
    return c.json({ result: outcomeOfNotification?.result ?? "no_notification" });
  });
}
