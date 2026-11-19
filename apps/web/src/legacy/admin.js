// Compatibility re-exports under the compiled names still imported by other legacy modules.
// The code lives in src/admin and src/platform.
export { useCurrentRole as $y, FINANCE_ROLES as tb, OPS_ROLES as eb } from "../admin/roles.ts";
export { newIdempotencyKey as Qy } from "../admin/idempotency.ts";
export { AGEING_BUCKETS as ab, describeGateDecision as ib, formatOverdueDays as rb, REMINDER_LEVELS as nb } from "../admin/clubLabels.ts";
export { AuditLogPage as Xy } from "../admin/AuditLog.tsx";
export { SettingsPage as Yy } from "../admin/Settings.tsx";
export { UsersPage as qy } from "../admin/Users.tsx";
export { CompaniesPage as Zy } from "../platform/Companies.tsx";
