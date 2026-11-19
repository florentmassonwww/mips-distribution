// Customers (shops) and the prices that apply to them.
import { type Db, all, get } from "../../core/db.ts";
import { notFound } from "../../core/errors.ts";

/**
 * Unit price of each active product for a customer: the customer's price list when it has an
 * entry for the product, the catalogue price otherwise.
 */
export function customerPrices(db: Db, companyId: string, customerId: string): Map<string, number> {
  const rows = all<{ id: string; price: number }>(
    db,
    `SELECT p.id, COALESCE(pli.price_minor, p.price_minor) AS price FROM products p
    LEFT JOIN customers c ON c.id = ? AND c.company_id = p.company_id
    LEFT JOIN price_list_items pli ON pli.price_list_id = c.price_list_id AND pli.product_id = p.id
    WHERE p.company_id = ? AND p.active = 1`,
    customerId,
    companyId,
  );
  return new Map(rows.map((row) => [row.id, row.price]));
}

/** An active customer of the company, or 404. */
export function requireActiveCustomer(db: Db, companyId: string, customerId: string): { id: string; name: string } {
  const customer = get<{ id: string; name: string }>(
    db,
    "SELECT id, name FROM customers WHERE id = ? AND company_id = ? AND active = 1",
    customerId,
    companyId,
  );
  if (!customer) throw notFound("Commerce");
  return customer;
}
