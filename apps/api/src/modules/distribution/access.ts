// Tenant scoping: every distribution action runs inside the actor's company.
import { ApiError } from "../../core/errors.ts";
import type { Actor } from "../../core/actor.ts";

/** Company of the actor; users without a company (platform admins) are refused. */
export function requireCompanyId(actor: Actor): string {
  if (!actor.companyId) throw new ApiError(403, "forbidden", "Accès non autorisé.");
  return actor.companyId;
}
