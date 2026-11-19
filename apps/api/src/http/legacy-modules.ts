// Typed bindings to the business modules that are still in their extracted (legacy) form.
// The distribution, club, payments, finance and connectors modules are being rewritten
// separately; their compiled export names are fixed, so the HTTP layer and the demo seed import
// them here, once, under readable names and with explicit types. When a module is rewritten,
// only this file has to point at the new TypeScript code.
import type { z } from "zod";
import type { Db, Row } from "../core/db.ts";
import type { Actor, Role } from "../core/actor.ts";
import * as m_club_accounting from "../modules/club/accounting.ts";
import * as m_club_bank_reconciliation from "../modules/club/bank-reconciliation.ts";
import * as m_club_charges from "../modules/club/charges.ts";
import * as m_club_dashboard from "../modules/club/dashboard.ts";
import * as m_club_dues from "../modules/club/dues.ts";
import * as m_club_gate from "../modules/club/gate.ts";
import * as m_club_member_payments from "../modules/club/member-payments.ts";
import * as m_club_members from "../modules/club/members.ts";
import * as m_club_payment_view from "../modules/payments/payment-view.ts";
import * as m_club_portal from "../modules/club/portal.ts";
import * as m_club_reminders from "../modules/club/reminders.ts";
import * as m_club_statements from "../modules/club/statements.ts";
import * as m_connectors_index from "../modules/connectors/index.ts";
import * as m_distribution_agent_sync from "../modules/distribution/agent-sync.ts";
import * as m_distribution_dashboard from "../modules/distribution/dashboard.ts";
import * as m_distribution_delivery_routes from "../modules/distribution/delivery-routes.ts";
import * as m_distribution_exceptions from "../modules/distribution/exceptions.ts";
import * as m_distribution_orders from "../modules/distribution/orders.ts";
import * as m_distribution_settings from "../modules/distribution/settings.ts";
import * as m_distribution_stock from "../modules/distribution/stock.ts";
import * as m_finance_index from "../modules/finance/index.ts";
import * as m_payments_index from "../modules/payments/index.ts";

// The legacy modules are plain JavaScript without declarations: their exports arrive untyped
// and receive their types below.

// ---------------------------------------------------------------------------------------------
// Shared vocabulary

export type { PaymentMethod, ClubOutlet, CompanySettings } from "../modules/distribution/settings.ts";
export type { SimulatedOutcome, SignedNotification, DemoConnectorSet as Connectors } from "../modules/connectors/types.ts";
export type { CreateOrderInput as OrderInput } from "../modules/distribution/orders.ts";
export type { CreateRouteInput as RouteInput } from "../modules/distribution/delivery-routes.ts";
export type { SyncActionInput as SyncAction, SyncActionResult } from "../modules/distribution/agent-sync.ts";
export type { CreatePaymentInput as PaymentRequest } from "../modules/payments/schemas.ts";
export type { NotificationOutcome } from "../modules/payments/notifications.ts";
export type { CreateMemberInput as MemberInput, UpdateMemberInput as MemberPatch } from "../modules/club/members.ts";
export type { ChargeMemberInput as ChargeInput } from "../modules/club/charges.ts";
export type { SyncOptions as ErpSyncOptions } from "../modules/finance/accounting-entries.ts";
export type { DailyCloseEntry as DailyClose } from "../modules/finance/daily-close.ts";

export const PAYMENT_METHODS = m_distribution_settings.PAYMENT_METHODS;
/** Roles that run operations (orders, routes, stock). */
export const OPS_ROLES = m_distribution_settings.OPS_ROLES;
/** Roles that handle money (journal, reconciliation, close). */
export const FINANCE_ROLES = m_distribution_settings.FINANCE_ROLES;
export const CLUB_OUTLETS = m_distribution_settings.CLUB_OUTLETS;

export const defaultSettings = m_distribution_settings.defaultCompanySettings;
export const companySettings = m_distribution_settings.readCompanySettings;

export const orderInputSchema = m_distribution_orders.createOrderInput;
export const routeInputSchema = m_distribution_delivery_routes.createRouteInput;
export const syncActionSchema = m_distribution_agent_sync.syncActionInput;

export const createOrder = m_distribution_orders.createOrder;
export const assignOrder = m_distribution_orders.assignOrder;
export const setOrderStatus = m_distribution_orders.setOrderStatus;
export const listOrders = m_distribution_orders.listOrders;
export const orderChain = m_distribution_orders.orderChain;
export const createRoute = m_distribution_delivery_routes.createRoute;
export const updateRoute = m_distribution_delivery_routes.updateRoute;
export const loadRoute = m_distribution_delivery_routes.loadRoute;
export const startRoute = m_distribution_agent_sync.startRoute;
export const routeBundle = m_distribution_agent_sync.routeBundle;
export const routeSummary = m_distribution_delivery_routes.routeSummary;
export const listRoutes = m_distribution_delivery_routes.listRoutes;
export const closeRoute = m_distribution_agent_sync.closeRoute;
export const applySyncAction = m_distribution_agent_sync.applySyncAction;
export const stockLevels = m_distribution_stock.readStock;
export const adjustStock = m_distribution_stock.adjustStock;
export const listExceptions = m_distribution_exceptions.listExceptions;
export const resolveException = m_distribution_exceptions.resolveException;
export const centraleDashboard = m_distribution_dashboard.dashboard;

// ---------------------------------------------------------------------------------------------
// Payments

export const requestPayment = m_payments_index.initiatePayment;
export const getPayment = m_payments_index.getPaymentForUser;
export const checkPayment = m_payments_index.checkPaymentStatus;
export const cancelPayment = m_payments_index.cancelPayment;
export const claimPayment = m_payments_index.claimPayment;
export const invoiceReceipt = m_payments_index.getReceipt;
export const refundPayment = m_payments_index.refundPayment;
export const handleNotification = m_payments_index.processNotification;

// ---------------------------------------------------------------------------------------------
// Finance

export const paymentJournal = m_finance_index.listJournal;
export const invoiceList = m_finance_index.listInvoices;
export const reconciliation = m_finance_index.getReconciliation;
export const demoBankStatement = m_finance_index.generateDemoStatement;
export const importBankStatement = m_finance_index.importStatement;
export const dailyCloses = m_finance_index.listDailyCloses;
export const closePreview = m_finance_index.getDayTotals;
export const closeDay = m_finance_index.closeDay;
export const erpEntries = m_finance_index.listAccountingEntries;
export const syncErp = m_finance_index.syncAccountingEntries;

// ---------------------------------------------------------------------------------------------
// Club

export const clubDashboard = m_club_dashboard.clubDashboard;
export const listMembers = m_club_members.listMembers;
export const createMember = m_club_members.createMember;
export const memberDetail = m_club_members.memberDetail;
export const updateMember = m_club_members.updateMember;
export const addCharge = m_club_charges.chargeMember;
export const cancelCharge = m_club_charges.cancelCharge;
export const recordCashPayment = m_club_member_payments.recordCashPayment;
export const memberStatement = m_club_statements.sendStatement;
export const listDues = m_club_dues.duesOverview;
export const runDues = m_club_dues.runDues;
export const listReminders = m_club_reminders.listReminders;
export const runReminders = m_club_reminders.runReminders;
export const memberPayments = m_club_member_payments.listMemberPayments;
export const checkMemberPayment = m_club_member_payments.checkMemberPaymentStatus;
export const clubReconciliation = m_club_bank_reconciliation.reconciliationOverview;
export const demoClubStatement = m_club_bank_reconciliation.demoStatement;
export const importClubStatement = m_club_bank_reconciliation.importStatement;
export const assignBankLine = m_club_bank_reconciliation.assignBankLine;
export const accountingExport = m_club_accounting.accountingExport;
export const checkGateCredential = m_club_gate.checkAtDesk;
export const gateEvents = m_club_gate.listGateEvents;
/** Request from a physical gate reader, authenticated by its signature. */
export const readerAccessCheck = m_club_gate.handleReaderRequest;
/** Reader passage recorded directly (used by the seed to simulate the gate). */
export const recordGatePassage = m_club_gate.readerDecision;
export const publicMemberView = m_club_portal.memberPortal;
export const memberByToken = m_club_portal.requireMemberByPortalToken;
export const startMemberLinkPayment = m_club_member_payments.startLinkPayment;
/** Public (camelCase) view of a distribution payment row. */
export const presentPayment = m_club_payment_view.serializePayment;

// ---------------------------------------------------------------------------------------------
// Connectors

export const createConnectors = m_connectors_index.createDemoConnectors;
