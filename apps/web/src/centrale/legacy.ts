// Typed access to the legacy modules this area still depends on (shared helpers, translation,
// field labels) while they are rewritten elsewhere.
//
// The legacy modules are plain JavaScript without declarations, so a static `import` from them is
// untyped (and rejected by the strict typecheck). Vite's eager glob compiles to an ordinary static
// import of the same module instance; this file gives it a type. Once those modules are rewritten,
// these bindings can be replaced by direct imports of their typed successors.
import type { ReactNode } from "react";

/** Badge colour classes used by the stylesheet (`badge ok`, `tile warn`, …). */
export type Tone = "" | "ok" | "info" | "warn" | "err";

/** Status code → [translated label, badge tone]. */
export type StatusMap = Record<string, readonly [string, Tone]>;

/** Code → translated label. */
export type LabelMap = Record<string, string>;

/** Result of `useApi`: the last successful response, refreshed on demand or by polling. */
export interface ApiQuery<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  /** Time of the last successful load (ms since epoch), 0 before. */
  at: number;
  /** Reloads in the background (the current data stays visible). */
  reload: () => Promise<void>;
}

export type ToastKind = "ok" | "err";

export interface AskOptions {
  /** `reason` (default): free text of at least 3 characters; `money`: an amount; `confirm`: no input. */
  kind?: "reason" | "money" | "confirm";
  title: string;
  text?: string;
  label?: string;
  confirm?: string;
  danger?: boolean;
  initial?: string;
}

/** Toasts, dialogs and the "run an action, toast its outcome" helper. */
export interface Feedback {
  toast: (message: string, kind?: ToastKind) => void;
  /** Resolves with the entered text (`"ok"` for a confirmation, minor units for money), or null if cancelled. */
  ask: (options: AskOptions) => Promise<string | null>;
  /** Runs `action`; on success toasts `success` (when given), on failure toasts the error. */
  run: (action: () => Promise<void>, success?: string) => Promise<boolean>;
}

export type Role = "platform_admin" | "company_admin" | "dispatcher" | "finance" | "agent";

export interface SessionUser {
  id: string;
  name: string;
  role: Role;
  vertical?: string;
  companyName?: string | null;
}

export interface Session {
  user: SessionUser;
  /** Business day (YYYY-MM-DD, Mauritius time). */
  today: string;
  demoMode: boolean;
}

/** Table column: header (also the cell key), cell renderer, optional class (`right`). */
export type Column<Row> = readonly [header: string, render: (row: Row) => ReactNode, className?: string];

export interface TableProps<Row> {
  rows: readonly Row[];
  cols: readonly Column<Row>[];
  empty: ReactNode;
  onRow?: (row: Row) => void;
  rowKey: (row: Row) => string | number;
}

export interface QueryViewProps<T> {
  q: ApiQuery<T>;
  children: (data: T) => ReactNode;
}

interface SharedModule {
  J: <T = unknown>(method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE", url: string, body?: unknown) => Promise<T>;
  Y: <T>(url: string | null, pollMs?: number) => ApiQuery<T>;
  X: (minor: number | null | undefined) => string;
  Z: (iso: string | null | undefined, withTime?: boolean) => string;
  V_: (ms: number) => string;
  H_: (day: string) => string;
  U_: StatusMap;
  W_: StatusMap;
  G_: StatusMap;
  K_: StatusMap;
  q_: StatusMap;
  J_: StatusMap;
  Y_: StatusMap;
  X_: LabelMap;
  Q_: LabelMap;
  $_: LabelMap;
  Q: (props: { title: ReactNode; actions?: ReactNode; flush?: boolean; children?: ReactNode }) => ReactNode;
  uv: (props: { label: ReactNode; value: ReactNode; hint?: ReactNode; kind?: Tone }) => ReactNode;
  dv: (props: { href: string }) => ReactNode;
  fv: (props: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) => ReactNode;
  pv: <T>(props: QueryViewProps<T>) => ReactNode;
  mv: <Row>(props: TableProps<Row>) => ReactNode;
  $: (props: { label: ReactNode; hint?: ReactNode; children?: ReactNode }) => ReactNode;
  hv: (props: { value: number; onChange: (value: number) => void; min?: number; max?: number; label?: string }) => ReactNode;
  cv: (props: { kind?: Tone; children?: ReactNode }) => ReactNode;
  lv: (props: { map: StatusMap; value: string | null }) => ReactNode;
  _v: () => Feedback;
  xv: () => { session: Session };
}

interface I18nModule {
  K: (text: string, ...args: (string | number | null | undefined)[]) => string;
  A_: () => "fr" | "en";
}

interface FieldModule {
  Dy: LabelMap;
}

function single<T>(modules: Record<string, T>): T {
  const [module] = Object.values(modules);
  if (!module) throw new Error("legacy module not found");
  return module;
}

const shared = single(import.meta.glob<SharedModule>("../legacy/shared.js", { eager: true }));
const i18n = single(import.meta.glob<I18nModule>("../legacy/i18n.js", { eager: true }));
const field = single(import.meta.glob<FieldModule>("../legacy/field.js", { eager: true }));

/** Translation: French source text → current language, `{0}`… replaced by the arguments. */
export const t = i18n.K;
export const currentLanguage = i18n.A_;

export const {
  J: apiRequest,
  Y: useApi,
  X: formatMoney,
  Z: formatDate,
  V_: formatClockTime,
  H_: formatDay,
  U_: INVOICE_STATUS,
  W_: PAYMENT_STATUS,
  G_: SETTLEMENT_STATUS,
  K_: ORDER_STATUS,
  q_: ROUTE_STATUS,
  J_: ERP_STATUS,
  Y_: MATCH_STATUS,
  X_: PAYMENT_METHOD_LABELS,
  Q_: EXCEPTION_TYPE_LABELS,
  $_: CONFIRMED_VIA_LABELS,
  Q: Card,
  uv: Tile,
  dv: CsvExportLink,
  fv: PageHead,
  pv: QueryView,
  mv: Table,
  $: Field,
  hv: Stepper,
  cv: Badge,
  lv: StatusBadge,
  _v: useFeedback,
  xv: useSession,
} = shared;

/** Audit action code → label (dashboard activity feed). */
export const AUDIT_ACTION_LABELS = field.Dy;
