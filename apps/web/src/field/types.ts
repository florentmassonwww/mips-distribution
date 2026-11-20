// Data shapes of the server answers the driver's screen reads (route list, receipt, route summary,
// sync results). The offline route bundle and action queue are typed in shared/offline.ts.
import type { RouteStatus } from "../shared/offline.ts";

/** A route as listed by GET /api/agent/routes. */
export interface AgentRoute {
  id: string;
  name: string;
  status: RouteStatus;
  day: string;
  vehicle: string | null;
  stops: number;
  orders_done: number;
  orders_total: number;
}

/** One entry of POST /api/agent/sync's answer. */
export interface SyncResult {
  id: string;
  status: "applied" | "duplicate" | "rejected";
  result?: {
    orderId: string;
    orderNumber: string;
    invoiceId: string | null;
    /** The total shown on the phone differed from the invoice (prices changed while offline). */
    priceMismatch?: { shownMinor: number; invoicedMinor: number };
  };
  code?: string;
  message?: string;
}

export interface PaymentPresentation {
  kind: "qr" | "url" | "terminal" | string;
  value: string | null;
  instructions: string;
}

export interface ReceiptPayment {
  id: string;
  method: string;
  amountMinor: number;
  status: string;
  createdAt: string;
  providerRef: string | null;
  presentation: PaymentPresentation;
  verifyReason: string | null;
  failureReason: string | null;
  confirmedVia: string | null;
}

/** GET /api/invoices/:id/receipt. */
export interface Receipt {
  invoice: {
    id: string;
    number: string;
    customer_outlet_id: string;
    customer_outlet: string;
    company: string;
    address: string;
    order_number: string;
    amount_minor: number;
    paid_minor: number;
    refunded_minor: number;
    status: string;
    issued_at: string;
  };
  lines: { product: string; qty_ordered: number; qty_delivered: number; unit_price_minor: number }[];
  payments: ReceiptPayment[];
  delivery: {
    returns: { product: string; qty: number; unitPriceMinor: number }[];
    pod_name: string | null;
    pod_signature: string | null;
    at: string;
  } | null;
}

/** GET /api/agent/routes/:id/summary. */
export interface RouteSummaryData {
  route: { status: RouteStatus; closed_at: string | null };
  money: { invoiced: number; confirmed: number; pending: number; toVerify: number };
  orders: { total: number; delivered: number; partial: number; refused: number; routeSales: number; toDeliver: number };
  byMethod: { method: string; count: number; amount_minor: number }[];
  stock: { product_id: string; name: string; loaded_qty: number; qty: number; returned_qty: number }[];
}

/** POST /api/demo/payments/:id/simulate. */
export interface SimulationResult {
  result: string;
}
