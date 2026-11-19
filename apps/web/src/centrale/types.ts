// Shapes of the head office (centrale) API responses, as far as these screens read them.
// Amounts are in minor units (cents of a rupee); dates are ISO strings, days are YYYY-MM-DD.

export type OrderKind = "preorder" | "route_sale";
export type RouteStatus = "planned" | "loaded" | "in_progress" | "closed";

export interface RouteSummary {
  id: string;
  name: string;
  day: string;
  agent: string | null;
  vehicle: string | null;
  status: RouteStatus;
  stops: number;
  orders_done: number;
  orders_total: number;
  invoiced_minor: number;
  paid_minor: number;
}

export interface DashboardData {
  day: string;
  sales: { invoiced: number; invoices: number; routeSales: number };
  deliveries: { planned: number; done: number; partial: number; refused: number };
  money: { confirmed: number; settled: number; outstanding: number; pending: number; toVerify: number };
  exceptions: { ops: number; finance: number };
  routes: RouteSummary[];
  byMethod: { method: string; count: number; amount_minor: number }[];
  recent: {
    at: string;
    action: string;
    actor: string | null;
    details: {
      order?: string;
      invoice?: string;
      name?: string;
      customer?: string;
      method?: string;
      amountMinor?: number;
    };
  }[];
}

export interface OrderSummary {
  id: string;
  number: string;
  kind: OrderKind;
  status: string;
  customer: string;
  zone: string;
  route_id: string | null;
  route: string | null;
  route_status: RouteStatus | null;
  ordered_minor: number;
  invoice_number: string | null;
  invoice_minor: number | null;
  invoice_status: string | null;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  price_minor: number;
  /** Quantity in the warehouse. */
  qty: number;
}

/** Reference data for the forms: outlets, catalogue with warehouse stock, field agents. */
export interface ReferenceData {
  customers: { id: string; name: string; zone: string; price_list: string | null }[];
  products: Product[];
  agents: { id: string; name: string }[];
}

/** Product id → quantity entered. */
export type QuantityLines = Record<string, number>;

export interface OrderChainData {
  order: {
    number: string;
    customer: string;
    kind: OrderKind;
    status: string;
    route: string | null;
    note: string | null;
    created_at: string;
    created_by_name: string | null;
  };
  lines: {
    id: string;
    product: string;
    sku: string;
    qty_ordered: number;
    qty_delivered: number;
    unit_price_minor: number;
  }[];
  delivery: {
    at: string;
    outcome: "full" | "partial" | "refused";
    agent: string;
    offline: number | boolean;
    synced_at: string | null;
    reason: string | null;
    returns_minor: number;
    /** JSON array of `{ qty, product }`. */
    returns_json: string;
    pod_name: string | null;
    pod_signature: string | null;
  } | null;
  invoice: {
    number: string;
    amount_minor: number;
    status: string;
    paid_minor: number;
    refunded_minor: number;
  } | null;
  payments: {
    id: string;
    created_at: string;
    method: string;
    amount_minor: number;
    refunded_minor: number;
    status: string;
    confirmed_via: string | null;
    failure_reason: string | null;
    verify_reason: string | null;
    settlement_status: string;
    settled_at: string | null;
    fee_expected_minor: number;
    fee_actual_minor: number | null;
    provider_ref: string | null;
    agent: string | null;
  }[];
  erp: {
    id: string;
    kind: string;
    label: string;
    amount_minor: number;
    status: string;
    external_ref: string | null;
    last_error: string | null;
    attempts: number;
  }[];
}

export interface RouteDetailData {
  route: {
    name: string;
    day: string;
    status: RouteStatus;
    vehicle: string | null;
    agent_id: string | null;
    started_at: string | null;
    closed_at: string | null;
  };
  orders: { total: number; delivered: number; partial: number; refused: number; routeSales: number };
  money: { invoiced: number; confirmed: number; settled: number; pending: number; toVerify: number };
  stops: { customer_id: string; seq: number; name: string; zone: string }[];
  stock: { product_id: string; name: string; loaded_qty: number; qty: number; returned_qty: number }[];
  orderList: OrderSummary[];
}

export interface StockData {
  warehouse: {
    id: string;
    name: string;
    sku: string;
    unit: string;
    price_minor: number;
    qty: number;
    reserved: number;
    on_vehicles: number;
  }[];
  movements: {
    id: string;
    at: string;
    type: string;
    product: string;
    qty: number;
    ref: string | null;
    note: string | null;
    actor: string | null;
  }[];
}

/** An exception (incident or finance discrepancy) as listed by /api/exceptions. */
export interface ExceptionItem {
  id: string;
  type: string;
  message: string;
  details?: Record<string, unknown> | null;
  created_at: string;
  resolution: string | null;
  resolution_note: string | null;
  resolved_by_name: string | null;
  resolved_at: string | null;
}
