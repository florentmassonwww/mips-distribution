// Company settings (payments, ERP, club accounting) and the role / method constants they rely on.
import { type Db, get } from "../../core/db.ts";
import type { Role } from "../../core/actor.ts";

// Payment methods are defined by the connectors module (one connector per method).
import { PAYMENT_METHODS, type PaymentMethod } from "../connectors/types.ts";
export { PAYMENT_METHODS, type PaymentMethod };

/** Roles that handle operations exceptions (deliveries, stock). */
export const OPS_ROLES: readonly Role[] = ["company_admin", "dispatcher"];
/** Roles that handle finance exceptions (payments, reconciliation). */
export const FINANCE_ROLES: readonly Role[] = ["company_admin", "finance"];

/** Club outlets, each with its own revenue account. */
export const CLUB_OUTLETS = ["restaurant", "bar", "tennis", "squash", "golf", "shop", "events", "other"] as const;
export type ClubOutlet = (typeof CLUB_OUTLETS)[number];
export const isClubOutlet = (value: string): value is ClubOutlet => (CLUB_OUTLETS as readonly string[]).includes(value);

export interface PaymentMethodSettings {
  enabled: boolean;
  feeBps: number;
  merchantRef: string;
}

export interface CompanySettings {
  payments: {
    methods: Record<PaymentMethod, PaymentMethodSettings>;
    settlementAccountLabel: string;
    attemptMinutes: number;
  };
  erp: {
    system: string;
    endpoint: string;
    secretRef: string;
    autoSync: boolean;
    simulateFailure: boolean;
  };
  club: {
    refPrefix: string;
    dueDays: number;
    reminders: { levels: [number, number, number]; minAmountMinor: number };
    gate: { flagAfterDays: number; denyAfterDays: number; minAmountMinor: number };
    accounts: {
      receivable: string;
      bank: string;
      transit: string;
      cash: string;
      fees: string;
      dues: string;
      fee: string;
      outlets: Record<string, string>;
    };
    journals: { sales: string; bank: string; cash: string };
  };
}

/** Settings as stored in companies.settings_json: any subset of the full settings. */
interface StoredSettings {
  payments?: Partial<Omit<CompanySettings["payments"], "methods">> & { methods?: Record<string, PaymentMethodSettings> };
  erp?: Partial<CompanySettings["erp"]>;
  club?: Partial<Omit<CompanySettings["club"], "reminders" | "gate" | "accounts" | "journals">> & {
    reminders?: Partial<CompanySettings["club"]["reminders"]>;
    gate?: Partial<CompanySettings["club"]["gate"]>;
    accounts?: Partial<Omit<CompanySettings["club"]["accounts"], "outlets">> & { outlets?: Record<string, string> };
    journals?: Partial<CompanySettings["club"]["journals"]>;
  };
}

/** Demonstration fees per method, in basis points. */
const DEFAULT_FEE_BPS: Record<PaymentMethod, number> = { paystation: 100, card_tpe: 175, juice: 90, link: 150 };

export function defaultCompanySettings(): CompanySettings {
  return {
    payments: {
      methods: Object.fromEntries(
        PAYMENT_METHODS.map((method) => [
          method,
          { enabled: true, feeBps: DEFAULT_FEE_BPS[method], merchantRef: `DEMO-${method.toUpperCase()}` },
        ]),
      ) as Record<PaymentMethod, PaymentMethodSettings>,
      settlementAccountLabel: "Compte courant MCB du distributeur (libellé de démonstration)",
      attemptMinutes: 10,
    },
    erp: {
      system: "ERP de démonstration",
      endpoint: "https://erp.exemple.invalid/api",
      secretRef: "ERP_API_KEY",
      autoSync: true,
      simulateFailure: false,
    },
    club: {
      refPrefix: "CLB",
      dueDays: 30,
      reminders: { levels: [7, 30, 60], minAmountMinor: 50000 },
      gate: { flagAfterDays: 30, denyAfterDays: 0, minAmountMinor: 50000 },
      accounts: {
        receivable: "411000",
        bank: "512000",
        transit: "511500",
        cash: "530000",
        fees: "627000",
        dues: "706100",
        fee: "708800",
        outlets: {
          restaurant: "707100",
          bar: "707200",
          tennis: "706210",
          squash: "706220",
          golf: "706230",
          shop: "707300",
          events: "706300",
          other: "708000",
        },
      },
      journals: { sales: "VT", bank: "BQ", cash: "CA" },
    },
  };
}

/** Effective settings of a company: stored values merged over the defaults, section by section. */
export function readCompanySettings(db: Db, companyId: string | null): CompanySettings {
  const row = get<{ settings_json: string }>(db, "SELECT settings_json FROM companies WHERE id = ?", companyId);
  const stored = JSON.parse(row?.settings_json || "{}") as StoredSettings;
  const defaults = defaultCompanySettings();
  return {
    payments: {
      ...defaults.payments,
      ...stored.payments,
      methods: { ...defaults.payments.methods, ...stored.payments?.methods },
    },
    erp: { ...defaults.erp, ...stored.erp },
    club: {
      ...defaults.club,
      ...stored.club,
      reminders: { ...defaults.club.reminders, ...stored.club?.reminders },
      gate: { ...defaults.club.gate, ...stored.club?.gate },
      accounts: {
        ...defaults.club.accounts,
        ...stored.club?.accounts,
        outlets: { ...defaults.club.accounts.outlets, ...stored.club?.accounts?.outlets },
      },
      journals: { ...defaults.club.journals, ...stored.club?.journals },
    },
  };
}
