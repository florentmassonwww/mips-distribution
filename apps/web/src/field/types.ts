// Data shapes of the driver's screen: the offline route bundle, the offline action queue and the
// server answers it reads (route list, receipt, route summary, sync results).

export type RouteStatus = "planned" | "loaded" | "in_progress" | "closed";

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

export interface BundleStop {
  customer_id: string;
  seq: number;
  name: string;
  code: string;
  address: string;
  zone: string;
  phone: string;
  price_list_id: string | null;
}

export interface Customer {
  id: string;
  name: string;
  code: string;
  zone: string;
  address: string;
  phone: string;
  price_list_id: string | null;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  unit: string;
  price_minor: number;
}

export interface OrderLine {
  id: string;
  order_id: string;
  product_id: string;
  qty_ordered: number;
  qty_delivered: number;
  unit_price_minor: number;
}

export interface Order {
  id: string;
  number: string;
  kind: string;
  status: string;
  customer_id: string;
  note: string | null;
  delivered_at: string | null;
  lines: OrderLine[];
  /** Set on the on-the-spot sales still in the offline queue (see applyQueue). */
  local?: boolean;
}

export interface BundlePayment {
  id: string;
  invoice_id: string;
  method: string;
  amount_minor: number;
  refunded_minor: number;
  status: string;
  provider_ref: string | null;
  created_at: string;
  failure_reason: string | null;
  verify_reason: string | null;
}

export interface Invoice {
  id: string;
  number: string;
  order_id: string;
  customer_id: string;
  amount_minor: number;
  paid_minor: number;
  refunded_minor: number;
  status: string;
  issued_at: string;
  payments: BundlePayment[];
}

export interface PaymentMethodOption {
  method: string;
  label: string;
}

/** GET /api/agent/routes/:id/bundle: everything needed to drive the route offline. */
export interface RouteBundle {
  generatedAt: string;
  route: { id: string; name: string; day: string; vehicle: string | null; status: RouteStatus };
  stops: BundleStop[];
  orders: Order[];
  invoices: Invoice[];
  products: Product[];
  /** price list id → product id → unit price (minor units). */
  priceLists: Record<string, Record<string, number | undefined> | undefined>;
  /** product id → quantity on board. */
  stock: Record<string, number | undefined>;
  customers: Customer[];
  methods: PaymentMethodOption[];
}

/** The bundle as the screen shows it: queued offline actions applied on top (see applyQueue). */
export interface RouteWork extends RouteBundle {
  /** Pre-orders whose delivery waits in the offline queue. */
  queuedOrders: Set<string>;
}

export interface QuantityLine {
  productId: string;
  qty: number;
}

export interface ProofOfDelivery {
  name: string;
  /** PNG data URL of the signature pad, or null. */
  signature: string | null;
  note: string;
}

/** Fields common to a delivery and a sale payload, in the order they are serialized. */
export interface HandoverFields {
  returns: QuantityLine[];
  pod: ProofOfDelivery;
  /** Device clock when the agent validated (possibly offline). */
  at: string;
  /** Total shown to the agent, so the server detects prices changed meanwhile. */
  expectedTotalMinor: number;
}

export interface DeliverPayload extends HandoverFields {
  orderId: string;
  lines: { lineId: string; qtyDelivered: number }[];
  reason: string;
}

export interface SalePayload extends HandoverFields {
  routeId: string;
  customerId: string;
  lines: QuantityLine[];
}

interface QueuedActionBase {
  /** Generated on the device; the server applies an action id only once (replay-safe). */
  id: string;
  state: "queued" | "rejected";
  createdAt: string;
  customerId: string;
  totalMinor: number;
  /** Products leaving the vehicle, to update the stock shown offline. */
  items: QuantityLine[];
  label: string;
  /** Server refusal, translated, once rejected. */
  message?: string;
}

export interface QueuedDelivery extends QueuedActionBase {
  type: "deliver";
  orderId: string;
  payload: DeliverPayload;
}

export interface QueuedSale extends QueuedActionBase {
  type: "sale";
  orderId?: undefined;
  payload: SalePayload;
}

/** One entry of the offline queue stored in localStorage (md_queue_<user id>). */
export type QueuedAction = QueuedDelivery | QueuedSale;

/** One entry of POST /api/agent/sync's answer. */
export interface SyncResult {
  id: string;
  status: "applied" | "duplicate" | "rejected";
  result?: { orderId: string; orderNumber: string; invoiceId: string | null };
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
    customer_id: string;
    customer: string;
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
