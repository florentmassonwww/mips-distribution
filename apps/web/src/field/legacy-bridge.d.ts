// Types of the shared legacy helpers used by the driver's screen (see legacy-bridge.js).
import type { ReactNode, JSX } from "react";
import type { QueuedAction, RouteBundle, RouteWork, Customer, Product } from "./types.ts";

/** Translation: French source text → current language, with {0}, {1}… placeholders. */
export function t(text: string, ...args: unknown[]): string;
/** Translates a server error message (by message, then by code) when the interface is in English. */
export function translateServerMessage(code: string, message: string): string;

/** Error thrown by api(): HTTP status (0 when the network is down) and the server's error code. */
export interface ApiError extends Error {
  status: number;
  code: string;
}
/** fetch() on the API with the CSRF header; JSON body when given; throws ApiError. */
export function api<T = unknown>(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", url: string, body?: unknown): Promise<T>;

export interface ApiQuery<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  at: number;
  /** Reloads silently (keeps the data shown). */
  reload: () => Promise<void>;
}
/** GET url (nothing when null), optionally polled every pollMs while the page is visible. */
export function useApi<T>(url: string | null, pollMs?: number): ApiQuery<T>;

export function formatMoney(minor: number | null | undefined): string;
export function parseMoney(text: string): number | null;
/** Minor units → text for a money input ("1234.5" style, no currency). */
export function moneyInputValue(minor: number): string;
export function formatDate(iso: string | null | undefined, withTime?: boolean): string;
export function formatTime(at: string | number): string;
export function formatDay(day: string): string;

/** status → [label, badge kind]. */
export type StatusMap = Record<string, [string, string] | undefined>;
export const INVOICE_STATUS: StatusMap;
export const PAYMENT_STATUS: StatusMap;
export const ORDER_STATUS: StatusMap;
export const ROUTE_STATUS: StatusMap;
export const PAYMENT_METHOD_LABELS: Record<string, string | undefined>;
export const CONFIRMED_VIA_LABELS: Record<string, string | undefined>;

export function Badge(props: { kind?: string; children?: ReactNode }): JSX.Element;
export function StatusBadge(props: { map: StatusMap; value: string }): JSX.Element;
export function Field(props: { label: ReactNode; hint?: ReactNode; children?: ReactNode }): JSX.Element;
export function Stepper(props: { value: number; onChange: (value: number) => void; min?: number; max?: number; label: string }): JSX.Element;
export function QueryView<T>(props: { q: ApiQuery<T>; children: (data: T) => ReactNode }): JSX.Element;
export function LanguageToggle(props: { light?: boolean }): JSX.Element;

export interface AskOptions {
  kind?: "confirm" | "reason" | "money";
  title: string;
  text?: string;
  label?: string;
  confirm?: string;
  danger?: boolean;
  initial?: string;
}
export interface Ui {
  toast: (message: string, kind?: "ok" | "err") => void;
  /** Opens the dialog; resolves to the answer ("ok" for a confirmation) or null when cancelled. */
  ask: (options: AskOptions) => Promise<string | null>;
  /** Runs an action, toasts its error (or the success message); resolves to whether it succeeded. */
  run: (action: () => Promise<unknown> | unknown, successMessage?: string) => Promise<boolean>;
}
export function useUi(): Ui;

export interface Session {
  user: { id: string; name: string; companyName: string };
  demoMode: boolean;
}
export function useSession(): { session: Session; refresh: () => Promise<void> };

/** localStorage md_queue_<userId>. */
export function readQueue(userId: string): QueuedAction[];
export function writeQueue(userId: string, queue: QueuedAction[]): void;
/** localStorage md_bundle_<routeId>. */
export function readBundle(routeId: string): RouteBundle | null;
export function saveBundle(bundle: RouteBundle): void;
/** localStorage md_route_<userId>: the route the agent has open. */
export function readCurrentRoute(userId: string): string | null;
export function writeCurrentRoute(userId: string, routeId: string | null): void;
/** Random id (crypto.randomUUID when available). */
export function newId(): string;

export interface Network {
  /** navigator.onLine, unless offline is simulated. */
  online: boolean;
  /** Offline simulated (demo), stored in md_force_offline. */
  forced: boolean;
  setForced: (forced: boolean) => void;
}
export function useNetwork(): Network;

/** Unit price for a customer: its price list when it has one, else the base price. */
export function unitPrice(bundle: RouteBundle, customer: Customer | undefined, product: Product): number;
/** The bundle with the queued actions applied: stock decreased, queued sales listed as local orders. */
export function applyQueue(bundle: RouteBundle, queue: QueuedAction[]): RouteWork;
