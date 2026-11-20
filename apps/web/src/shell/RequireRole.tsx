// Role guard of a route: signed-out visitors go to the home page, other profiles get a notice.
// A route of a module also requires the company to have enabled that module.
import type { ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { translate } from "../i18n/translate.ts";
import { roleLabel } from "../shared/labels.ts";
import { hasModule, MODULE_NOT_ENABLED, type ModuleCode } from "../shared/modules.ts";
import { useSession } from "../shared/session.ts";
import { homePathFor } from "./areas.ts";

export interface RequireRoleProps {
  roles: readonly string[];
  /** Module the company must have enabled; none for the administration and the platform. */
  module?: ModuleCode;
  children?: ReactNode;
}

export function RequireRole({ roles, module, children }: RequireRoleProps) {
  const { session } = useSession();
  const user = session.user;
  if (!user) return <Navigate to="/" replace />;
  // The server enforces the same rules; this only avoids showing a page full of errors.
  const roleAllowed = roles.includes(user.role);
  const moduleEnabled = !module || hasModule(user.modules, module);
  if (!roleAllowed || !moduleEnabled) {
    return (
      <div className="mobile">
        <div className="notice err" role="alert">
          {/* The role is checked first: a platform user is told about their profile, not a module. */}
          {!roleAllowed || !module ? (
            <>
              {translate("Cet espace n'est pas accessible avec votre profil (")}
              {roleLabel(user.role, user.modules)}).
            </>
          ) : (
            MODULE_NOT_ENABLED[module]
          )}
        </div>
        <p style={{ marginTop: 12 }}>
          <Link to={homePathFor(user.role, user.modules)}>{translate("Retour à mon espace")}</Link>
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
