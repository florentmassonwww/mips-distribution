// Who performs an action: a signed-in user, a public member link, or the system itself.
import type { ModuleCode } from "./modules.ts";

export type Role = "platform_admin" | "company_admin" | "dispatcher" | "finance" | "agent";

export interface Actor {
  id: string;
  role: Role | "member" | "system";
  companyId?: string | null;
  name?: string;
}

/** Signed-in user, as resolved from the session cookie. */
export interface SessionUser extends Actor {
  role: Role;
  name: string;
  email: string;
  companyId: string | null;
  companyName: string | null;
  companyStatus: string | null;
  /** Active modules of the user's company, in catalogue order (none for the platform team). */
  modules: ModuleCode[];
}

/** Actor of automatic actions (provider notifications, scheduled runs, seed). */
export const SYSTEM_ACTOR: Actor = { id: "system", role: "system" };

/** Company of an actor, or null for platform-level and system actors. */
export const companyOf = (actor: Actor): string | null => actor.companyId ?? null;
