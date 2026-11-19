// Company roles and the role checks shared by the admin and club screens.
import { useSession } from "../shared/session.ts";

/** Roles a company administrator can give, in the order of the role pickers. */
export const COMPANY_ROLES = ["company_admin", "dispatcher", "finance", "agent"] as const;

/** Roles that handle operations (deliveries, stock; club: members and charges). */
export const OPS_ROLES: readonly string[] = ["company_admin", "dispatcher"];

/** Roles that handle money (payments, reconciliation, dues). */
export const FINANCE_ROLES: readonly string[] = ["company_admin", "finance"];

/** Role of the signed-in user, or "" when nobody is signed in. */
export const useCurrentRole = (): string => useSession().session.user?.role ?? "";
