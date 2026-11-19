// Platform team: companies (tenants), their subscription, and the platform audit log.
import { z } from "zod";
import { all, get, run, transaction } from "../core/db.ts";
import { recordAudit } from "../core/audit.ts";
import { ApiError, notFound } from "../core/errors.ts";
import { newId } from "../core/ids.ts";
import { iso } from "../core/time.ts";
import { type App, type AppDeps, readJson, routeParam } from "./context.ts";
import { auditLogResponse } from "./admin-routes.ts";

/** Prefix of the members' payment references of a new club: the slug's letters, 2 to 4 of them. */
const clubReferencePrefix = (slug: string): string => slug.replace(/[^a-z]/g, "").slice(0, 4).toUpperCase().padEnd(2, "X");

export function registerPlatformRoutes(app: App, deps: AppDeps): void {
  const { db, session, now } = deps;
  const platformOnly = session.requireRole("platform_admin");

  app.get("/api/platform/companies", platformOnly, (c) =>
    c.json(
      all(
        db,
        `SELECT co.id, co.name, co.slug, co.vertical, co.status, co.plan, co.subscription_status, co.subscription_renews_at, co.created_at,
      (SELECT COUNT(*) FROM users WHERE company_id = co.id AND active = 1) AS users,
      (SELECT COUNT(*) FROM users WHERE company_id = co.id AND active = 1 AND role = 'agent') AS agents
    FROM companies co ORDER BY co.rowid`,
      ),
    ),
  );

  // New tenant with its first administrator.
  app.post("/api/platform/companies", platformOnly, async (c) => {
    const input = await readJson(
      c,
      z.object({
        name: z.string().min(2).max(80),
        slug: z.string().regex(/^[a-z0-9-]{2,30}$/),
        adminName: z.string().min(2).max(80),
        adminEmail: z.email().max(120),
        vertical: z.enum(["distribution", "club"]).default("distribution"),
      }),
    );
    if (get(db, "SELECT 1 FROM companies WHERE slug = ?", input.slug)) {
      throw new ApiError(409, "slug_taken", "Cet identifiant d'entreprise est déjà pris.");
    }
    if (get(db, "SELECT 1 FROM users WHERE email = ?", input.adminEmail.toLowerCase())) {
      throw new ApiError(409, "email_taken", "Cette adresse est déjà utilisée.");
    }
    const companyId = newId("co");
    transaction(db, () => {
      const settingsJson =
        input.vertical === "club" ? JSON.stringify({ club: { refPrefix: clubReferencePrefix(input.slug) } }) : "{}";
      run(
        db,
        "INSERT INTO companies (id, name, slug, vertical, settings_json, created_at) VALUES (?,?,?,?,?,?)",
        companyId,
        input.name,
        input.slug,
        input.vertical,
        settingsJson,
        iso(now()),
      );
      run(
        db,
        "INSERT INTO users (id, company_id, name, email, role, created_at) VALUES (?,?,?,?,'company_admin',?)",
        newId("usr"),
        companyId,
        input.adminName,
        input.adminEmail.toLowerCase(),
        iso(now()),
      );
      recordAudit(db, c.get("user"), "company.created", "company", companyId, { name: input.name, vertical: input.vertical }, companyId, now());
    });
    return c.json({ id: companyId });
  });

  app.patch("/api/platform/companies/:id", platformOnly, async (c) => {
    const patch = await readJson(
      c,
      z.object({
        status: z.enum(["active", "suspended"]).optional(),
        plan: z.enum(["pilote", "standard", "entreprise"]).optional(),
        subscriptionStatus: z.enum(["essai", "actif", "impayé", "résilié"]).optional(),
        renewsAt: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      }),
    );
    const companyId = routeParam(c);
    if (!get(db, "SELECT 1 FROM companies WHERE id = ?", companyId)) throw notFound("Entreprise");
    transaction(db, () => {
      if (patch.status) run(db, "UPDATE companies SET status = ? WHERE id = ?", patch.status, companyId);
      if (patch.plan) run(db, "UPDATE companies SET plan = ? WHERE id = ?", patch.plan, companyId);
      if (patch.subscriptionStatus) {
        run(db, "UPDATE companies SET subscription_status = ? WHERE id = ?", patch.subscriptionStatus, companyId);
      }
      if (patch.renewsAt) {
        run(db, "UPDATE companies SET subscription_renews_at = ? WHERE id = ?", `${patch.renewsAt}T00:00:00.000Z`, companyId);
      }
      recordAudit(db, c.get("user"), "company.updated", "company", companyId, patch, companyId, now());
    });
    return c.json({ ok: true });
  });

  app.get("/api/platform/audit", platformOnly, (c) => auditLogResponse(c, db, null));
}
