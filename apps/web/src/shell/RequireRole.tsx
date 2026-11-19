// Role guard of a route: signed-out visitors go to the home page, other profiles get a notice.
import type { ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { K } from "../legacy/i18n.js";
import { tv as roleLabel, xv as useSession } from "../legacy/shared.js";
import { homePathFor } from "./areas.ts";

export interface RequireRoleProps {
  roles: readonly string[];
  /** Business of the company ("distribution" or "club"); any when omitted. */
  vertical?: string;
  children?: ReactNode;
}

export function RequireRole({ roles, vertical, children }: RequireRoleProps) {
  const { session } = useSession();
  const user = session.user;
  if (!user) return <Navigate to="/" replace />;
  // The server enforces the same rules; this only avoids showing a page full of errors.
  if (!roles.includes(user.role) || (vertical && user.vertical !== vertical)) {
    return (
      <div className="mobile">
        <div className="notice err" role="alert">
          {K("Cet espace n'est pas accessible avec votre profil (")}
          {roleLabel(user.role, user.vertical)}).
        </div>
        <p style={{ marginTop: 12 }}>
          <Link to={homePathFor(user.role, user.vertical)}>{K("Retour à mon espace")}</Link>
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
