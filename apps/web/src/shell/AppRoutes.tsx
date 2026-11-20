// The application: session loading, access gate, demo banner and every route.
import { Link, Route, Routes } from "react-router-dom";
import { AuditLogPage } from "../admin/AuditLog.tsx";
import { SettingsPage } from "../admin/Settings.tsx";
import { SitesPage } from "../admin/Sites.tsx";
import { UsersPage } from "../admin/Users.tsx";
import { Dashboard } from "../centrale/Dashboard.tsx";
import { OrderChain } from "../centrale/OrderChain.tsx";
import { Orders } from "../centrale/Orders.tsx";
import { RouteDetail } from "../centrale/RouteDetail.tsx";
import { RouteList } from "../centrale/Routes.tsx";
import { Stock } from "../centrale/Stock.tsx";
import { AccountingExport } from "../club/AccountingExport.tsx";
import { ClubDashboard } from "../club/ClubDashboard.tsx";
import { ClubReconciliation } from "../club/ClubReconciliation.tsx";
import { DemoBanner } from "./DemoBanner.tsx";
import { Dues } from "../club/Dues.tsx";
import { FrontDesk } from "../club/FrontDesk.tsx";
import { Gate } from "../club/Gate.tsx";
import { MemberDetail } from "../club/MemberDetail.tsx";
import { MemberPayments } from "../club/MemberPayments.tsx";
import { MemberPortal } from "../club/MemberPortal.tsx";
import { Members } from "../club/Members.tsx";
import { Reminders } from "../club/Reminders.tsx";
import { FieldApp } from "../field/FieldApp.tsx";
import { AccountingEntries } from "../finance/AccountingEntries.tsx";
import { DailyClose } from "../finance/DailyClose.tsx";
import { Exceptions } from "../finance/Exceptions.tsx";
import { Invoices } from "../finance/Invoices.tsx";
import { Reconciliation } from "../finance/Reconciliation.tsx";
import { TransactionJournal } from "../finance/TransactionJournal.tsx";
import { translate } from "../i18n/translate.ts";
import { CompaniesPage } from "../platform/Companies.tsx";
import { useApi } from "../shared/hooks.ts";
import { QueryView } from "../shared/QueryView.tsx";
import { type Session, SessionContext } from "../shared/session.ts";
import { AccessGate } from "./AccessGate.tsx";
import { AreaLayout } from "./AreaLayout.tsx";
import { BACK_OFFICE_ROLES, FINANCE_AREA_ROLES, OPS_AREA_ROLES } from "./areas.ts";
import { HomePage } from "./HomePage.tsx";
import { PublicPaymentPage } from "./PublicPaymentPage.tsx";
import { RequireRole } from "./RequireRole.tsx";

export function AppRoutes() {
  const sessionQuery = useApi<Session>("/api/session");
  // The server answers every request with the "gate" error until the access code is given.
  if (sessionQuery.error?.code === "gate") return <AccessGate onOk={sessionQuery.reload} />;
  return (
    <QueryView q={sessionQuery}>
      {(session) => (
        <SessionContext.Provider value={{ session, refresh: sessionQuery.reload }}>
          <DemoBanner />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/payer/:token" element={<PublicPaymentPage />} />
            <Route path="/membre/:token" element={<MemberPortal />} />
            {/* The reception desk is a full-screen page, without the back-office sidebar. */}
            <Route
              path="/club/accueil"
              element={
                <RequireRole roles={["agent", "dispatcher", "company_admin"]} module="club">
                  <FrontDesk />
                </RequireRole>
              }
            />
            <Route
              path="/club/*"
              element={
                <AreaLayout roles={BACK_OFFICE_ROLES} module="club">
                  <Routes>
                    <Route index element={<ClubDashboard />} />
                    <Route path="membres" element={<Members />} />
                    <Route path="membres/:id" element={<MemberDetail />} />
                    <Route path="cotisations" element={<Dues />} />
                    <Route path="relances" element={<Reminders />} />
                    <Route path="barriere" element={<Gate />} />
                    <Route path="encaissements" element={<RequireRole roles={FINANCE_AREA_ROLES}><MemberPayments /></RequireRole>} />
                    <Route path="rapprochement" element={<RequireRole roles={FINANCE_AREA_ROLES}><ClubReconciliation /></RequireRole>} />
                    <Route path="exceptions" element={<RequireRole roles={FINANCE_AREA_ROLES}><Exceptions domain="finance" /></RequireRole>} />
                    <Route path="export" element={<RequireRole roles={FINANCE_AREA_ROLES}><AccountingExport /></RequireRole>} />
                    <Route path="erp" element={<RequireRole roles={FINANCE_AREA_ROLES}><AccountingEntries /></RequireRole>} />
                  </Routes>
                </AreaLayout>
              }
            />
            <Route
              path="/terrain"
              element={
                <RequireRole roles={["agent"]} module="distribution">
                  <FieldApp />
                </RequireRole>
              }
            />
            <Route
              path="/centrale/*"
              element={
                <AreaLayout roles={BACK_OFFICE_ROLES} module="distribution">
                  <Routes>
                    <Route index element={<Dashboard />} />
                    <Route path="commandes" element={<Orders />} />
                    <Route path="commandes/:id" element={<OrderChain back="/centrale/commandes" />} />
                    <Route path="tournees" element={<RouteList />} />
                    <Route path="tournees/:id" element={<RouteDetail />} />
                    <Route path="stocks" element={<RequireRole roles={OPS_AREA_ROLES}><Stock /></RequireRole>} />
                    <Route path="incidents" element={<RequireRole roles={OPS_AREA_ROLES}><Exceptions domain="ops" /></RequireRole>} />
                  </Routes>
                </AreaLayout>
              }
            />
            <Route
              path="/finance/*"
              element={
                <AreaLayout roles={FINANCE_AREA_ROLES} module="distribution">
                  <Routes>
                    <Route index element={<TransactionJournal />} />
                    <Route path="factures" element={<Invoices />} />
                    <Route path="chaine/:id" element={<OrderChain back="/finance/factures" />} />
                    <Route path="rapprochement" element={<Reconciliation />} />
                    <Route path="exceptions" element={<Exceptions domain="finance" />} />
                    <Route path="cloture" element={<DailyClose />} />
                    <Route path="erp" element={<AccountingEntries />} />
                  </Routes>
                </AreaLayout>
              }
            />
            {/* Administration is open whatever the modules of the company. */}
            <Route
              path="/admin/*"
              element={
                <AreaLayout roles={["company_admin"]}>
                  <Routes>
                    <Route path="utilisateurs" element={<UsersPage />} />
                    <Route path="etablissements" element={<SitesPage />} />
                    <Route path="parametres" element={<SettingsPage />} />
                    <Route path="audit" element={<AuditLogPage scope="admin" />} />
                  </Routes>
                </AreaLayout>
              }
            />
            <Route
              path="/plateforme/*"
              element={
                <AreaLayout roles={["platform_admin"]}>
                  <Routes>
                    <Route index element={<CompaniesPage />} />
                    <Route path="audit" element={<AuditLogPage scope="platform" />} />
                  </Routes>
                </AreaLayout>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SessionContext.Provider>
      )}
    </QueryView>
  );
}

function NotFound() {
  return (
    <div className="mobile">
      <div className="notice">{translate("Page introuvable.")}</div>
      <p style={{ marginTop: 12 }}>
        <Link to="/">{translate("Retour à l'accueil")}</Link>
      </p>
    </div>
  );
}
