// Typed bindings to the business modules that are still in their extracted (legacy) form.
// The distribution, club, payments, finance and connectors modules are being rewritten
// separately; their compiled export names are fixed, so the HTTP layer and the demo seed import
// them here, once, under readable names and with explicit types. When a module is rewritten,
// only this file has to point at the new TypeScript code.
import type { z } from "zod";
import type { Db, Row } from "../core/db.ts";
import type { Actor, Role } from "../core/actor.ts";

// The legacy modules are plain JavaScript without declarations: their exports arrive untyped
// and receive their types below.
// @ts-expect-error -- untyped legacy module
import * as distribution from "../legacy/distribution.mjs";
// @ts-expect-error -- untyped legacy module
import * as club from "../legacy/club.mjs";
// @ts-expect-error -- untyped legacy module
import * as payments from "../legacy/payments.mjs";
// @ts-expect-error -- untyped legacy module
import * as finance from "../legacy/finance.mjs";
// @ts-expect-error -- untyped legacy module
import * as connectors from "../legacy/connectors.mjs";

// ---------------------------------------------------------------------------------------------
// Shared vocabulary

export type PaymentMethod = "paystation" | "card_tpe" | "juice" | "link";
export type ClubOutlet = "restaurant" | "bar" | "tennis" | "squash" | "golf" | "shop" | "events" | "other";
/** Outcome a simulated provider can be asked to produce. */
export type SimulatedOutcome = "success" | "failure" | "lost_notification" | "duplicate" | "wrong_amount";

/** A signed provider notification, as the simulated providers emit it. */
export interface SignedNotification {
  rawBody: string;
  signature: string;
}

export interface PaymentProvider {
  readonly method: PaymentMethod;
  readonly label: string;
  readonly demo: boolean;
  readonly capabilities: Record<string, boolean>;
  readonly toVerify: string[];
  /** Settles the provider-side transaction and returns its notification (null when it is "lost"). */
  simulate(providerRef: string, outcome: SimulatedOutcome, now: Date): SignedNotification | null;
}

export interface ConnectorInfo {
  readonly label: string;
  readonly demo: boolean;
  readonly toVerify: string[];
}

export interface Connectors {
  payments: Record<PaymentMethod, PaymentProvider>;
  bank: ConnectorInfo;
  erp: ConnectorInfo;
  access: ConnectorInfo;
}

export interface CompanySettings {
  payments: {
    methods: Record<PaymentMethod, { enabled: boolean; feeBps: number; merchantRef: string }>;
    settlementAccountLabel: string;
    attemptMinutes: number;
  };
  erp: { system: string; endpoint: string; secretRef: string; autoSync: boolean; simulateFailure: boolean };
  club: {
    refPrefix: string;
    dueDays: number;
    reminders: { levels: [number, number, number]; minAmountMinor: number };
    gate: { flagAfterDays: number; denyAfterDays: number; minAmountMinor: number };
    [key: string]: unknown;
  };
}

export interface OrderLineInput {
  productId: string;
  qty: number;
}

export interface OrderInput {
  customerId: string;
  routeId?: string | null;
  note: string;
  lines: OrderLineInput[];
}

export interface RouteInput {
  name: string;
  day: string;
  agentId?: string | null;
  vehicle: string;
  customerIds: string[];
}

/** Offline action sent by an agent's device (delivery or on-the-spot sale). */
export interface SyncAction {
  id: string;
  type: "deliver" | "sale";
  payload: unknown;
}

/** What a delivery or a sale produced: the invoice to collect. */
export interface SaleResult {
  invoiceId: string;
  amountMinor: number;
  [key: string]: unknown;
}

export interface SyncActionResult {
  id: string;
  status: "applied" | "duplicate" | "rejected";
  result: SaleResult;
  code?: string;
  message?: string;
}

export interface PaymentRequest {
  invoiceId: string;
  method: PaymentMethod;
  amountMinor: number;
  idempotencyKey: string;
}

export interface NotificationOutcome {
  result: string;
  paymentId: string | null;
  companyId: string | null;
}

export interface MemberInput {
  name: string;
  email: string;
  phone: string;
  planId: string | null;
  badge?: string;
}

export interface MemberPatch {
  status?: "active" | "suspended" | "resigned";
  planId?: string | null;
  email?: string;
  phone?: string;
}

export interface ChargeInput {
  kind: "consumption" | "fee";
  outlet: ClubOutlet | string;
  label: string;
  amountMinor: number;
}

export interface ErpSyncOptions {
  ids?: string[];
  retryFailed?: boolean;
}

export interface DailyClose extends Row {
  day: string;
  closed_at: string;
  closed_by: string | null;
  totals: { invoiced: number; outstanding: number; toVerify: number; openExceptions: number };
}

// ---------------------------------------------------------------------------------------------
// Distribution

export const PAYMENT_METHODS: PaymentMethod[] = distribution.Gu;
/** Roles that run operations (orders, routes, stock). */
export const OPS_ROLES: Role[] = distribution.Ku;
/** Roles that handle money (journal, reconciliation, close). */
export const FINANCE_ROLES: Role[] = distribution.qu;
export const CLUB_OUTLETS: ClubOutlet[] = distribution.Ju;

export const defaultSettings: () => CompanySettings = distribution.Yu;
export const companySettings: (db: Db, companyId: string) => CompanySettings = distribution.Xu;

export const orderInputSchema: z.ZodType<OrderInput> = distribution.ld;
export const routeInputSchema: z.ZodObject<{
  name: z.ZodString;
  day: z.ZodString;
  agentId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  vehicle: z.ZodDefault<z.ZodString>;
  customerIds: z.ZodDefault<z.ZodArray<z.ZodString>>;
}> = distribution.hd;
export const syncActionSchema: z.ZodType<SyncAction> = distribution.jd;

export const createOrder: (db: Db, actor: Actor, input: OrderInput, now?: Date) => Row & { id: string } = distribution.ud;
export const assignOrder: (db: Db, actor: Actor, orderId: string, routeId: string | null, now?: Date) => void = distribution.dd;
export const setOrderStatus: (db: Db, actor: Actor, orderId: string, status: string, now?: Date) => void = distribution.fd;
export const listOrders: (db: Db, companyId: string, filters: { status?: string; routeId?: string }) => Row[] = distribution.pd;
export const orderChain: (db: Db, companyId: string, id: string) => Row = distribution.md;
export const createRoute: (db: Db, actor: Actor, input: RouteInput, now?: Date) => Row & { id: string } = distribution._d;
export const updateRoute: (db: Db, actor: Actor, routeId: string, patch: Partial<RouteInput>, now?: Date) => void = distribution.vd;
export const loadRoute: (db: Db, actor: Actor, routeId: string, extras: OrderLineInput[], now?: Date) => void = distribution.yd;
export const startRoute: (db: Db, actor: Actor, routeId: string, now?: Date) => void = distribution.Td;
export const routeBundle: (db: Db, actor: Actor, routeId: string, now?: Date) => Row = distribution.Ed;
export const routeSummary: (db: Db, companyId: string, routeId: string) => Row = distribution.xd;
export const listRoutes: (db: Db, companyId: string, agentId?: string) => Row[] = distribution.bd;
export const closeRoute: (db: Db, actor: Actor, routeId: string, now?: Date) => Row = distribution.Ld;
export const applySyncAction: (db: Db, actor: Actor, action: SyncAction, now?: Date) => SyncActionResult = distribution.Id;
export const stockLevels: (db: Db, companyId: string) => Row = distribution.Sd;
export const adjustStock: (db: Db, actor: Actor, productId: string, delta: number, reason: string, now?: Date) => void =
  distribution.Cd;
export const listExceptions: (db: Db, companyId: string, domain: "ops" | "finance", status: "open" | "resolved") => Row[] =
  distribution.td;
export const resolveException: (
  db: Db,
  actor: Actor,
  exceptionId: string,
  domains: string[],
  resolution: "approved" | "rejected",
  note: string,
  now?: Date,
) => void = distribution.Rd;
export const centraleDashboard: (db: Db, companyId: string, now?: Date) => Row = distribution.zd;

// ---------------------------------------------------------------------------------------------
// Payments

export const requestPayment: (
  db: Db,
  connectors: Connectors,
  actor: Actor,
  request: PaymentRequest,
  origin: string,
  now?: Date,
) => Promise<{ payment: Row; replayed: boolean }> = payments.dp;
export const getPayment: (db: Db, actor: Actor, paymentId: string) => Row = payments.up;
export const checkPayment: (db: Db, connectors: Connectors, actor: Actor, paymentId: string, now?: Date) => Promise<Row> =
  payments.fp;
export const cancelPayment: (db: Db, connectors: Connectors, actor: Actor, paymentId: string, now?: Date) => Promise<Row> =
  payments.pp;
export const claimPayment: (db: Db, actor: Actor, paymentId: string, now?: Date) => Row = payments.mp;
export const invoiceReceipt: (db: Db, actor: Actor, invoiceId: string) => Row = payments.vp;
export const refundPayment: (
  db: Db,
  connectors: Connectors,
  actor: Actor,
  paymentId: string,
  amountMinor: number,
  reason: string,
  now?: Date,
) => Promise<Row> = payments._p;
export const handleNotification: (
  db: Db,
  connectors: Connectors,
  method: PaymentMethod,
  rawBody: string,
  signature: string | undefined,
  now?: Date,
) => NotificationOutcome = payments.hp;

// ---------------------------------------------------------------------------------------------
// Finance

export const paymentJournal: (
  db: Db,
  companyId: string,
  filters: { status?: string; method?: string; day?: string; settlement?: string },
) => Row[] = finance.bp;
export const invoiceList: (db: Db, companyId: string) => Row[] = finance.xp;
export const reconciliation: (db: Db, companyId: string) => Row & { lines: Row[] } = finance.wp;
export const demoBankStatement: (db: Db, companyId: string, withAnomalies: boolean, now?: Date) => string = finance.Sp;
export const importBankStatement: (
  db: Db,
  connectors: Connectors,
  actor: Actor,
  filename: string,
  content: string,
  now?: Date,
) => Row = finance.Cp;
export const dailyCloses: (db: Db, companyId: string) => DailyClose[] = finance.Dp;
export const closePreview: (db: Db, companyId: string, day: string) => Row = finance.Tp;
export const closeDay: (db: Db, actor: Actor, day: string, now?: Date) => Row = finance.Ep;
export const erpEntries: (db: Db, companyId: string) => Row[] = finance.Op;
export const syncErp: (
  db: Db,
  connectors: Connectors,
  companyId: string,
  options?: ErpSyncOptions,
  actor?: Actor,
  now?: Date,
) => Promise<Row> = finance.kp;

// ---------------------------------------------------------------------------------------------
// Club

export const clubDashboard: (db: Db, companyId: string, now?: Date) => Row = club.Mf;
export const listMembers: (
  db: Db,
  companyId: string,
  now: Date,
  options: { q?: string; filter?: string; sort?: string },
) => Row[] = club.jf;
export const createMember: (db: Db, actor: Actor, input: MemberInput, now?: Date) => { id: string; number: string; reference: string } =
  club.pf;
export const memberDetail: (db: Db, companyId: string, memberId: string, now?: Date) => Row = club.Nf;
export const updateMember: (db: Db, actor: Actor, memberId: string, patch: MemberPatch, now?: Date) => void = club.mf;
export const addCharge: (db: Db, actor: Actor, memberId: string, input: ChargeInput, now?: Date) => Row = club.gf;
export const cancelCharge: (db: Db, actor: Actor, chargeId: string, reason: string, now?: Date) => void = club._f;
export const recordCashPayment: (
  db: Db,
  actor: Actor,
  memberId: string,
  amountMinor: number,
  note: string,
  idempotencyKey: string,
  now?: Date,
) => { payment: Row; replayed: boolean } = club.Tf;
export const memberStatement: (db: Db, actor: Actor, memberId: string, origin: string, now?: Date) => Row = club.Lf;
export const listDues: (db: Db, companyId: string) => Row = club.bf;
export const runDues: (db: Db, actor: Actor, period: string, now?: Date) => Row = club.yf;
export const listReminders: (db: Db, companyId: string) => Row[] = club.Rf;
export const runReminders: (db: Db, actor: Actor, origin: string, now?: Date) => Row = club.If;
export const memberPayments: (db: Db, companyId: string, filters: { status?: string; method?: string }) => Row[] = club.kf;
export const checkMemberPayment: (
  db: Db,
  connectors: Connectors,
  actor: Actor,
  paymentId: string,
  now?: Date,
) => Promise<{ id: string; status: string }> = club.Df;
export const clubReconciliation: (db: Db, companyId: string) => Row = club.Qf;
export const demoClubStatement: (db: Db, companyId: string, now?: Date) => string = club.qf;
export const importClubStatement: (
  db: Db,
  connectors: Connectors,
  actor: Actor,
  filename: string,
  content: string,
  now?: Date,
) => Row = club.Xf;
export const assignBankLine: (db: Db, actor: Actor, bankLineId: string, memberId: string, note: string, now?: Date) => Row =
  club.Zf;
export const accountingExport: (db: Db, companyId: string, from: string, to: string) => Row & { lines: Row[] } = club.$f;
export const checkGateCredential: (db: Db, actor: Actor, credential: string, now?: Date) => Row = club.Uf;
export const gateEvents: (db: Db, companyId: string, since?: string) => Row[] = club.Kf;
/** Request from a physical gate reader, authenticated by its signature. */
export const readerAccessCheck: (
  db: Db,
  connectors: Connectors,
  webhookSecret: string,
  device: string,
  rawBody: string,
  signature: string | undefined,
  now?: Date,
) => Row = club.Wf;
/** Reader passage recorded directly (used by the seed to simulate the gate). */
export const recordGatePassage: (db: Db, companyId: string, deviceId: string, credential: string, at?: Date) => Row = club.Gf;
export const publicMemberView: (db: Db, token: string, now?: Date) => Row = club.ep;
export const memberByToken: (db: Db, token: string) => Row = club.tp;
export const startMemberLinkPayment: (
  db: Db,
  connectors: Connectors,
  companyId: string,
  memberId: string,
  idempotencyKey: string,
  origin: string,
  actor: Actor,
  now?: Date,
) => Promise<{ payment: Row; replayed: boolean }> = club.Ef;
/** Public (camelCase) view of a distribution payment row. */
export const presentPayment: (payment: Row) => Row = club.rp;

// ---------------------------------------------------------------------------------------------
// Connectors

export const createConnectors: (db: Db, webhookSecret: string, toleranceSeconds: number) => Connectors = connectors.Yd;
