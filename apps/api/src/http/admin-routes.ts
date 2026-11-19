// Company administration: users, settings and the company's audit log.
import { z } from "zod";
import type { Context } from "hono";
import { type Db, all, get, run, transaction } from "../core/db.ts";
import { recordAudit } from "../core/audit.ts";
import { ApiError, notFound } from "../core/errors.ts";
import { newId } from "../core/ids.ts";
import { iso } from "../core/time.ts";
import { type CompanySettings, type PaymentMethod, companySettings } from "./legacy-modules.ts";
import { type App, type AppDeps, companyOf, paymentMethodSchema, readJson, routeParam } from "./context.ts";
import { csvResponse, wantsCsv } from "./csv.ts";
import { COMPANY_ROLES } from "./session.ts";

const roleSchema = z.enum(COMPANY_ROLES as [string, ...string[]]);
const dayCount = (max: number) => z.number().int().min(0).max(max);
const reminderDelay = () => z.number().int().min(1).max(365);

const settingsSchema = z.object({
  payments: z.object({
    methods: z.record(
      paymentMethodSchema,
      z.object({ enabled: z.boolean(), feeBps: z.number().int().min(0).max(1e3), merchantRef: z.string().max(60) }),
    ),
    settlementAccountLabel: z.string().max(120),
    attemptMinutes: z.number().int().min(1).max(60),
  }),
  erp: z.object({
    system: z.string().max(60),
    endpoint: z.url().max(200),
    // Name of the secret holding the ERP key, never the key itself.
    secretRef: z.string().regex(/^[A-Z][A-Z0-9_]{2,63}$/),
    autoSync: z.boolean(),
    simulateFailure: z.boolean(),
  }),
  club: z
    .object({
      dueDays: dayCount(120),
      reminders: z.object({
        levels: z
          .tuple([reminderDelay(), reminderDelay(), reminderDelay()])
          .refine(([first, second, third]) => first < second && second < third, "niveaux croissants"),
        minAmountMinor: z.number().int().min(0).max(1e8),
      }),
      gate: z.object({
        flagAfterDays: dayCount(365),
        denyAfterDays: dayCount(365),
        minAmountMinor: z.number().int().min(0).max(1e8),
      }),
    })
    .optional(),
});

interface AuditRow {
  id: string;
  at: string;
  action: string;
  entity: string;
  entity_id: string;
  actor_role: string;
  details_json: string;
  actor: string;
  company: string | null;
  [key: string]: unknown;
}

/**
 * Audit log, newest first (500 entries): a company's whole log, or for the platform (`null`)
 * the company, user and settings changes of every company.
 */
export function auditLogResponse(c: Context, db: Db, companyId: string | null): Response {
  const rows = all<AuditRow>(
    db,
    `SELECT a.id, a.at, a.action, a.entity, a.entity_id, a.actor_role, a.details_json, COALESCE(u.name, a.actor) AS actor, co.name AS company
    FROM audit_log a LEFT JOIN users u ON u.id = a.actor LEFT JOIN companies co ON co.id = a.company_id ${companyId ? "WHERE a.company_id = ?" : "WHERE a.action LIKE 'company.%' OR a.action LIKE 'user.%' OR a.action LIKE 'settings.%'"} ORDER BY a.at DESC, a.rowid DESC LIMIT 500`,
    ...(companyId ? [companyId] : []),
  );
  if (wantsCsv(c)) {
    return csvResponse(
      c,
      "journal-audit",
      rows.map((row) => ({ ...row, details: row.details_json })),
      [
        ["at", "Date (UTC)"],
        ["company", "Entreprise"],
        ["actor", "Acteur"],
        ["actor_role", "Rôle"],
        ["action", "Action"],
        ["entity", "Objet"],
        ["entity_id", "Identifiant"],
        ["details", "Détails"],
      ],
    );
  }
  return c.json(rows.map((row) => ({ ...row, details_json: undefined, details: JSON.parse(row.details_json) })));
}

export function registerAdminRoutes(app: App, deps: AppDeps): void {
  const { db, session, now } = deps;
  const adminOnly = session.requireRole("company_admin");

  app.get("/api/admin/users", adminOnly, (c) =>
    c.json(all(db, "SELECT id, name, email, role, active, created_at FROM users WHERE company_id = ? ORDER BY rowid", companyOf(c))),
  );

  app.post("/api/admin/users", adminOnly, async (c) => {
    const input = await readJson(c, z.object({ name: z.string().min(2).max(80), email: z.email().max(120), role: roleSchema }));
    if (get(db, "SELECT 1 FROM users WHERE email = ?", input.email.toLowerCase())) {
      throw new ApiError(409, "email_taken", "Cette adresse est déjà utilisée.");
    }
    const userId = newId("usr");
    transaction(db, () => {
      run(
        db,
        "INSERT INTO users (id, company_id, name, email, role, created_at) VALUES (?,?,?,?,?,?)",
        userId,
        companyOf(c),
        input.name,
        input.email.toLowerCase(),
        input.role,
        iso(now()),
      );
      recordAudit(db, c.get("user"), "user.created", "user", userId, { name: input.name, role: input.role }, companyOf(c), now());
    });
    return c.json({ id: userId });
  });

  app.patch("/api/admin/users/:id", adminOnly, async (c) => {
    const patch = await readJson(c, z.object({ role: roleSchema.optional(), active: z.boolean().optional() }));
    const target = get<{ name: string }>(db, "SELECT name FROM users WHERE id = ? AND company_id = ?", routeParam(c), companyOf(c));
    if (!target) throw notFound("Utilisateur");
    // An administrator cannot lock themselves out.
    if (routeParam(c) === c.get("user").id) {
      throw new ApiError(409, "self_change", "Vous ne pouvez pas modifier votre propre accès.");
    }
    transaction(db, () => {
      if (patch.role) run(db, "UPDATE users SET role = ? WHERE id = ?", patch.role, routeParam(c));
      if (patch.active !== undefined) run(db, "UPDATE users SET active = ? WHERE id = ?", Number(!!patch.active), routeParam(c));
      recordAudit(db, c.get("user"), "user.updated", "user", routeParam(c), { name: target.name, ...patch }, companyOf(c), now());
    });
    return c.json({ ok: true });
  });

  app.get("/api/admin/settings", adminOnly, (c) =>
    c.json({
      settings: companySettings(db, companyOf(c)),
      subscription: get(
        db,
        "SELECT name, slug, plan, subscription_status, subscription_renews_at, status, currency, vertical FROM companies WHERE id = ?",
        companyOf(c),
      ),
    }),
  );

  // Payments and ERP settings are replaced; club settings are merged (accounts and journals are kept).
  app.put("/api/admin/settings", adminOnly, async (c) => {
    const input = await readJson(c, settingsSchema);
    const current = companySettings(db, companyOf(c));
    const updated: CompanySettings = {
      ...current,
      payments: input.payments as CompanySettings["payments"],
      erp: input.erp,
      club: input.club ? { ...current.club, ...input.club } : current.club,
    };
    transaction(db, () => {
      run(db, "UPDATE companies SET settings_json = ? WHERE id = ?", JSON.stringify(updated), companyOf(c));
      recordAudit(
        db,
        c.get("user"),
        "settings.updated",
        "company",
        companyOf(c),
        {
          methods: Object.fromEntries(
            Object.entries(input.payments.methods).map(([method, settings]) => [method as PaymentMethod, settings.enabled]),
          ),
          erpAutoSync: input.erp.autoSync,
          erpSimulateFailure: input.erp.simulateFailure,
        },
        companyOf(c),
        now(),
      );
    });
    return c.json({ ok: true });
  });

  app.get("/api/admin/audit", adminOnly, (c) => auditLogResponse(c, db, companyOf(c)));
}
