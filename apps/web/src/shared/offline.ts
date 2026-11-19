// Offline support of the driver screen: what the phone keeps in localStorage (pending actions,
// route bundle, chosen route), the network state (with a forced "offline" switch for the demo),
// and the view of the route once the pending actions are applied locally.
import { useEffect, useState } from "react";
import { translate } from "../i18n/translate.ts";

// ---- localStorage (JSON values; every key starts with "md_" so the demo reset can forget them)

/** Reads a JSON value; `fallback` when missing, unreadable or storage unavailable. */
export function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Writes a JSON value; silently ignored when storage is unavailable or full. */
export function writeStored(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* nothing to do: the value simply is not kept */
  }
}

// ---- Data kept for the route (GET /api/agent/routes/:id/bundle and the offline action queue)

export type RouteStatus = "planned" | "loaded" | "in_progress" | "closed";

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

export interface BundleCustomer {
  id: string;
  name: string;
  code: string;
  zone: string;
  address: string;
  phone: string;
  price_list_id: string | null;
}

export interface BundleProduct {
  id: string;
  sku: string;
  name: string;
  unit: string;
  price_minor: number;
}

export interface BundleOrderLine {
  id: string;
  order_id: string;
  product_id: string;
  qty_ordered: number;
  qty_delivered: number;
  unit_price_minor: number;
}

export interface BundleOrder {
  id: string;
  number: string;
  kind: string;
  status: string;
  customer_id: string;
  note: string;
  delivered_at: string | null;
  lines: BundleOrderLine[];
  /** Sale recorded on the phone and not yet synced (see applyQueuedActions). */
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

export interface BundleInvoice {
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

/** Everything the driver needs to work the route offline, from GET /api/agent/routes/:id/bundle. */
export interface RouteBundle {
  generatedAt: string;
  route: { id: string; name: string; day: string; vehicle: string | null; status: RouteStatus };
  stops: BundleStop[];
  orders: BundleOrder[];
  invoices: BundleInvoice[];
  products: BundleProduct[];
  /** Price list id → product id → unit price (minor units). */
  priceLists: Record<string, Record<string, number>>;
  /** Quantity on the truck per product id. */
  stock: Record<string, number>;
  customers: BundleCustomer[];
  methods: PaymentMethodOption[];
}

/** The bundle with the pending actions applied (see applyQueuedActions). */
export interface LocalRouteView extends RouteBundle {
  /** Orders whose delivery is recorded on the phone but not yet synced. */
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
  /** Client-generated id (newId): the server uses it to ignore an action sent twice. */
  id: string;
  /** "queued" until synced (then removed), "rejected" when the server refused it. */
  state: "queued" | "rejected";
  createdAt: string;
  customerId: string;
  totalMinor: number;
  /** Products leaving the vehicle, to update the stock shown offline. */
  items: QuantityLine[];
  label: string;
  /** Reason given by the server for a rejected action, translated. */
  message?: string | undefined;
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

/** An action recorded on the phone, sent to POST /api/agent/sync when the network allows. */
export type QueuedAction = QueuedDelivery | QueuedSale;

// Keys: md_queue_<user id>, md_bundle_<route id>, md_route_<user id>.
export const readQueue = (userId: string): QueuedAction[] => readStored<QueuedAction[]>(`md_queue_${userId}`, []);
export const writeQueue = (userId: string, queue: QueuedAction[]): void => writeStored(`md_queue_${userId}`, queue);
export const readBundle = (routeId: string): RouteBundle | null => readStored<RouteBundle | null>(`md_bundle_${routeId}`, null);
export const writeBundle = (bundle: RouteBundle): void => writeStored(`md_bundle_${bundle.route.id}`, bundle);
/** Route the driver is working on, kept across reloads. */
export const readCurrentRoute = (userId: string): string | null => readStored<string | null>(`md_route_${userId}`, null);
export const writeCurrentRoute = (userId: string, routeId: string | null): void =>
  writeStored(`md_route_${userId}`, routeId);

/** Random UUID; falls back to random hex where crypto.randomUUID is missing (plain-HTTP origins). */
export function newId(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : [...crypto.getRandomValues(new Uint8Array(16))].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

// ---- Network state

/** localStorage key of the demo switch forcing the offline mode (JSON boolean). */
export const FORCE_OFFLINE_KEY = "md_force_offline";
/** Window event dispatched when the forced mode changes, so every useNetwork updates. */
export const NETWORK_EVENT = "md-network";

export interface NetworkState {
  /** Browser online and offline mode not forced. */
  online: boolean;
  forced: boolean;
  setForced: (forced: boolean) => void;
}

const readNetwork = () => ({ forced: readStored(FORCE_OFFLINE_KEY, false), up: navigator.onLine });

export function useNetwork(): NetworkState {
  const [network, setNetwork] = useState(readNetwork);
  useEffect(() => {
    const update = () => setNetwork(readNetwork());
    for (const event of ["online", "offline", NETWORK_EVENT]) window.addEventListener(event, update);
    return () => {
      for (const event of ["online", "offline", NETWORK_EVENT]) window.removeEventListener(event, update);
    };
  }, []);
  return {
    online: network.up && !network.forced,
    forced: network.forced,
    setForced: (forced) => {
      writeStored(FORCE_OFFLINE_KEY, forced);
      window.dispatchEvent(new Event(NETWORK_EVENT));
    },
  };
}

// ---- Local view of the route

/** Unit price of a product for a customer: their price list when it has one, else the list price. */
export const unitPrice = (
  bundle: RouteBundle,
  customer: BundleCustomer | null | undefined,
  product: BundleProduct,
): number => (customer?.price_list_id ? bundle.priceLists[customer.price_list_id]?.[product.id] : undefined) ?? product.price_minor;

/**
 * Applies the actions still queued on the phone to the bundle, so the driver sees the truck stock
 * and the deliveries as they will be once synced: stock decreases for each item, a delivery marks
 * its order (only while the order is still "loaded"), and a sale appears as a local order.
 */
export function applyQueuedActions(bundle: RouteBundle, queue: QueuedAction[]): LocalRouteView {
  const queued = queue.filter((action) => action.state === "queued");
  const stock = { ...bundle.stock };
  const queuedOrders = new Set<string>();
  const localSales: BundleOrder[] = [];
  for (const action of queued) {
    if (action.type === "deliver" && action.orderId) {
      // Delivery already synced or order changed by the office: nothing left to apply.
      if (bundle.orders.find((order) => order.id === action.orderId)?.status !== "loaded") continue;
      queuedOrders.add(action.orderId);
    } else if (action.type === "sale") {
      localSales.push({
        id: action.id,
        number: translate("Vente à synchroniser"),
        kind: "route_sale",
        status: "delivered",
        customer_id: action.customerId,
        note: "",
        delivered_at: action.createdAt,
        local: true,
        lines: action.items.map((item, index) => ({
          id: `${action.id}-${index}`,
          order_id: action.id,
          product_id: item.productId,
          qty_ordered: item.qty,
          qty_delivered: item.qty,
          unit_price_minor: 0,
        })),
      });
    }
    for (const item of action.items) stock[item.productId] = (stock[item.productId] ?? 0) - item.qty;
  }
  return { ...bundle, stock, orders: [...bundle.orders, ...localSales], queuedOrders };
}
