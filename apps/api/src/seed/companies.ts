// Demo distribution companies: company row, users, catalogue, warehouse stock and customers.
import { type Db, get, run } from "../core/db.ts";
import { type Actor, SYSTEM_ACTOR } from "../core/actor.ts";
import { setCompanyModules } from "../core/modules.ts";
import { addDays, iso } from "../core/time.ts";
import { defaultCompanySettings as defaultSettings } from "../modules/distribution/settings.ts";
import { CUSTOMER_OUTLETS, PRODUCTS, type CustomerOutletSpec, type ProductSpec, type UserSpec } from "./catalog.ts";

export interface CompanySeed {
  id: string;
  name: string;
  /** Short slug, also used to build the users', products' and customer outlets' identifiers. */
  slug: string;
  plan: string;
  subscriptionStatus: string;
  users: readonly UserSpec[];
  products?: readonly ProductSpec[];
  customerOutlets?: readonly CustomerOutletSpec[];
}

/**
 * Inserts a distribution company (Distribution module, one depot) with its users, products (and
 * stock), key-account price list and customer outlets. Fixed identifiers only: no random draw.
 */
export function seedCompany(db: Db, company: CompanySeed, now: Date): void {
  const { id: companyId, slug, products = PRODUCTS, customerOutlets = CUSTOMER_OUTLETS } = company;
  run(
    db,
    "INSERT INTO companies (id, name, slug, plan, subscription_status, subscription_renews_at, settings_json, created_at) VALUES (?,?,?,?,?,?,?,?)",
    companyId,
    company.name,
    slug,
    company.plan,
    company.subscriptionStatus,
    iso(addDays(now, 30)),
    JSON.stringify(defaultSettings()),
    iso(now),
  );
  setCompanyModules(db, companyId, ["distribution"], SYSTEM_ACTOR.id, now);
  run(
    db,
    "INSERT INTO sites (id, company_id, type, code, name, created_at) VALUES (?,?,'depot',?,?,?)",
    `site_${slug}_dep-01`,
    companyId,
    "DEP-01",
    "Dépôt central (démo)",
    iso(now),
  );
  for (const [key, name, role] of company.users) {
    run(
      db,
      "INSERT INTO users (id, company_id, name, email, role, created_at) VALUES (?,?,?,?,?,?)",
      `u_${slug}_${key}`,
      companyId,
      name,
      `${key}@${slug}.exemple.invalid`,
      role,
      iso(now),
    );
  }

  // Key accounts get 5 % off every product.
  const keyAccountList = `pl_${slug}_gc`;
  run(db, "INSERT INTO price_lists (id, company_id, name) VALUES (?,?,?)", keyAccountList, companyId, "Grands comptes (-5 %)");
  for (const [sku, name, unit, priceRupees, stock] of products) {
    const productId = productIdOf(slug, sku);
    run(
      db,
      "INSERT INTO products (id, company_id, sku, name, unit, price_minor) VALUES (?,?,?,?,?,?)",
      productId,
      companyId,
      sku,
      name,
      unit,
      priceRupees * 100,
    );
    run(db, "INSERT INTO warehouse_stock (company_id, product_id, qty) VALUES (?,?,?)", companyId, productId, stock);
    run(
      db,
      "INSERT INTO price_list_items (price_list_id, product_id, price_minor) VALUES (?,?,?)",
      keyAccountList,
      productId,
      Math.round(priceRupees * 95),
    );
  }

  customerOutlets.forEach(([key, name, address, zone, keyAccount], index) =>
    run(
      db,
      "INSERT INTO customer_outlets (id, company_id, code, name, address, zone, phone, price_list_id) VALUES (?,?,?,?,?,?,?,?)",
      `c_${slug}_${key}`,
      companyId,
      `C${String(index + 1).padStart(3, "0")}`,
      name,
      address,
      zone,
      `+230 5000 ${String(1000 + index)}`,
      keyAccount ? keyAccountList : null,
    ),
  );
}

/** Identifier of a seeded product, e.g. `p_bd_col-150`. */
export const productIdOf = (slug: string, sku: string): string => `p_${slug}_${sku.toLowerCase()}`;

/** A seeded user, in the shape the business functions expect as their actor. */
export function seedActor(db: Db, userId: string): Actor & { email: string } {
  const user = get<{ id: string; name: string; email: string; role: Actor["role"]; company_id: string | null }>(
    db,
    "SELECT * FROM users WHERE id = ?",
    userId,
  )!;
  return { id: user.id, name: user.name, email: user.email, role: user.role, companyId: user.company_id };
}

/** Inserts the platform team account and the two demo distribution companies. */
export function seedPlatformAndCompanies(db: Db, now: Date): void {
  run(
    db,
    "INSERT INTO users (id, company_id, name, email, role, created_at) VALUES ('u_platform', NULL, 'Équipe plateforme MIPS (démo)', 'plateforme@mips.exemple.invalid', 'platform_admin', ?)",
    iso(now),
  );
  seedCompany(
    db,
    {
      id: "co_bd",
      name: "Boissons Démo Ltée",
      slug: "bd",
      plan: "pilote",
      subscriptionStatus: "essai",
      users: [
        ["admin", "Anjali R. (démo)", "company_admin"],
        ["centrale", "Kevin L. (démo)", "dispatcher"],
        ["finance", "Sophie M. (démo)", "finance"],
        ["agent1", "Ravi D. (démo)", "agent"],
        ["agent2", "Nadia P. (démo)", "agent"],
      ],
    },
    now,
  );
  seedCompany(
    db,
    {
      id: "co_go",
      name: "Grossiste Démo Océan",
      slug: "go",
      plan: "standard",
      subscriptionStatus: "actif",
      users: [
        ["admin", "Marc T. (démo)", "company_admin"],
        ["centrale", "Priya S. (démo)", "dispatcher"],
        ["finance", "Jean C. (démo)", "finance"],
        ["agent1", "Yusuf A. (démo)", "agent"],
      ],
      products: PRODUCTS.slice(1, 6),
      customerOutlets: CUSTOMER_OUTLETS.slice(4, 8),
    },
    now,
  );
}

/** Provider reference of a seeded payment: every simulated provider returns one at initiation. */
export function providerRef(payment: { id: string; provider_ref: string | null }): string {
  if (payment.provider_ref === null) throw new Error(`demo seed payment ${payment.id} has no provider reference`);
  return payment.provider_ref;
}
