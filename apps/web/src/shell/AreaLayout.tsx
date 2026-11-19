// Layout of a back-office area: sidebar (brand, navigation, profile) and the page.
import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { translate } from "../i18n/translate.ts";
import { apiRequest } from "../shared/api.ts";
import { roleLabel } from "../shared/labels.ts";
import { LanguageToggle } from "../shared/LanguageToggle.tsx";
import { useSession } from "../shared/session.ts";
import { CLUB_NAV, DISTRIBUTION_NAV, EXACT_MATCH_PATHS } from "./areas.ts";
import { RequireRole, type RequireRoleProps } from "./RequireRole.tsx";

export function AreaLayout({ roles, children, vertical }: RequireRoleProps & { children: ReactNode }) {
  const { session, refresh } = useSession();
  const navigate = useNavigate();
  const user = session.user;
  const isClub = user?.vertical === "club";

  // "Switch profile": sign out, then back to the demo profile list.
  const switchProfile = async () => {
    await apiRequest("POST", "/api/logout");
    await refresh();
    navigate("/");
  };

  return (
    <RequireRole roles={roles} vertical={vertical}>
      {user && (
        <div className="shell">
          <aside className="side noprint">
            <div className="brand">
              {isClub ? "MIPS ClubOS" : "MIPS Distribution"}
              <small>{user.companyName ?? translate("Plateforme SaaS")}</small>
            </div>
            <nav aria-label={translate("Navigation principale")}>
              {((isClub ? CLUB_NAV : DISTRIBUTION_NAV)[user.role] ?? []).map(([title, links]) => (
                <div className="group" key={title}>
                  <span>{title}</span>
                  {links.map(([path, label]) => (
                    <NavLink key={path} to={path} end={EXACT_MATCH_PATHS.includes(path)}>
                      {label}
                    </NavLink>
                  ))}
                </div>
              ))}
            </nav>
            <div className="who">
              <div>
                {user.name}
                <br />
                {roleLabel(user.role, user.vertical)}
              </div>
              <button className="sm ghost" onClick={switchProfile}>
                {translate("Changer de profil")}
              </button>{" "}
              <LanguageToggle />
            </div>
          </aside>
          <main className="main">{children}</main>
        </div>
      )}
    </RequireRole>
  );
}
