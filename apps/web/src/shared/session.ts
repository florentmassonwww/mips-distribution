import { createContext, useContext } from "react";

export type Role = "platform_admin" | "company_admin" | "dispatcher" | "finance" | "agent";

/** Signed-in user, as answered by GET /api/session. */
export interface SessionUser {
  id: string;
  name: string;
  role: Role;
  companyId: string | null;
  companyName: string | null;
  /** Modules enabled for the company, in catalogue order; empty for the platform administrator. */
  modules: string[];
}

/** Answer of GET /api/session. */
export interface Session {
  demoMode: boolean;
  version: string;
  /** Business day "YYYY-MM-DD" (Mauritius time). */
  today: string;
  user: SessionUser | null;
}

export interface SessionContextValue {
  session: Session;
  /** Reloads the session (after login, logout or a change of company). */
  refresh: () => Promise<void>;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

/** Current session; must be used under SessionContext.Provider (set up by the shell). */
export const useSession = (): SessionContextValue => useContext(SessionContext) as SessionContextValue;
