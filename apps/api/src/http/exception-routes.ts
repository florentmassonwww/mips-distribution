// Exceptions queue: anomalies to decide on, split between operations and finance.
import { z } from "zod";
import type { SessionUser } from "../core/actor.ts";
import { forbidden } from "../core/errors.ts";
import { FINANCE_ROLES, OPS_ROLES, listExceptions, resolveException } from "./legacy-modules.ts";
import { type App, type AppDeps, companyOf, readJson, routeParam } from "./context.ts";
import { csvResponse, wantsCsv } from "./csv.ts";

/** Exception domains a user may see and decide: operations roles get "ops", finance roles "finance". */
const exceptionDomains = (user: SessionUser): string[] => [
  ...(OPS_ROLES.includes(user.role) ? ["ops"] : []),
  ...(FINANCE_ROLES.includes(user.role) ? ["finance"] : []),
];

export function registerExceptionRoutes(app: App, deps: AppDeps): void {
  const { db, session, now } = deps;
  const viewers = session.requireRole("company_admin", "dispatcher", "finance");

  app.get("/api/exceptions", viewers, (c) => {
    const domain = c.req.query("domain") === "finance" ? "finance" : "ops";
    if (!exceptionDomains(c.get("user")).includes(domain)) throw forbidden();
    const exceptions = listExceptions(db, companyOf(c), domain, c.req.query("status") === "resolved" ? "resolved" : "open");
    return wantsCsv(c)
      ? csvResponse(c, `exceptions-${domain}`, exceptions, [
          ["created_at", "Créée le"],
          ["type", "Type"],
          ["message", "Description"],
          ["status", "État"],
          ["resolution", "Décision"],
          ["resolution_note", "Note"],
          ["resolved_at", "Traitée le"],
        ])
      : c.json(exceptions);
  });

  app.post("/api/exceptions/:id/resolve", viewers, async (c) => {
    const decision = await readJson(
      c,
      z.object({ resolution: z.enum(["approved", "rejected"]), note: z.string().min(3).max(300) }),
    );
    resolveException(
      db,
      c.get("user"),
      routeParam(c),
      exceptionDomains(c.get("user")),
      decision.resolution,
      decision.note,
      now(),
    );
    return c.json({ ok: true });
  });
}
