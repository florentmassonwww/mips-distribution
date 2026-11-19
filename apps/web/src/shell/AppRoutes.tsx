// The application: session loading, access gate, demo banner and every route.
import { Link, Route, Routes } from "react-router-dom";
import { AuditLogPage } from "../admin/AuditLog.tsx";
import { SettingsPage } from "../admin/Settings.tsx";
import { UsersPage } from "../admin/Users.tsx";
import { Ay, Iy, My, Ny, Oy, Py } from "../legacy/centrale.js";
import { _b, cb, db, fb, gb, hb, lb, mb, ob, pb, ub, vb } from "../legacy/club.js";
import { uy } from "../legacy/field.js";
import { By, Gy, Hy, Uy, Vy, zy } from "../legacy/finance.js";
import { K } from "../legacy/i18n.js";
import { type Session, Y as useQuery, bv as SessionContext, pv as Loaded } from "../legacy/shared.js";
import { CompaniesPage } from "../platform/Companies.tsx";
import { AccessGate } from "./AccessGate.tsx";
import { AreaLayout } from "./AreaLayout.tsx";
import { BACK_OFFICE_ROLES, FINANCE_AREA_ROLES, OPS_AREA_ROLES } from "./areas.ts";
import { HomePage } from "./HomePage.tsx";
import { PublicPaymentPage } from "./PublicPaymentPage.tsx";
import { RequireRole } from "./RequireRole.tsx";

// Screens of the other areas, still under their compiled names (legacy modules being rewritten).
const OrdersPage = Ay;
const StockPage = Iy;
const OrderPage = My;
const RoutesPage = Ny;
const CentraleDashboard = Oy;
const RoutePage = Py;
const MemberPortalPage = _b;
const MembersPage = cb;
const RemindersPage = db;
const ClubPaymentsPage = fb;
const ReceptionPage = gb;
const GateLogPage = hb;
const MemberPage = lb;
const AccountingExportPage = mb;
const CollectionsDashboard = ob;
const ClubReconciliationPage = pb;
const DuesPage = ub;
const DemoBanner = vb;
const FieldPage = uy;
const TransactionJournalPage = By;
const ErpPage = Gy;
const ReconciliationPage = Hy;
const DailyClosePage = Uy;
const InvoicesPage = Vy;
const ExceptionsPage = zy;

export function AppRoutes() {
  const sessionQuery = useQuery<Session>("/api/session");
  // The server answers every request with the "gate" error until the access code is given.
  if (sessionQuery.error?.code === "gate") return <AccessGate onOk={sessionQuery.reload} />;
  return (
    <Loaded q={sessionQuery}>
      {(session) => (
        <SessionContext.Provider value={{ session, refresh: sessionQuery.reload }}>
          <DemoBanner />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/payer/:token" element={<PublicPaymentPage />} />
            <Route path="/membre/:token" element={<MemberPortalPage />} />
            {/* The reception desk is a full-screen page, without the back-office sidebar. */}
            <Route
              path="/club/accueil"
              element={
                <RequireRole roles={["agent", "dispatcher", "company_admin"]} vertical="club">
                  <ReceptionPage />
                </RequireRole>
              }
            />
            <Route
              path="/club/*"
              element={
                <AreaLayout roles={BACK_OFFICE_ROLES} vertical="club">
                  <Routes>
                    <Route index element={<CollectionsDashboard />} />
                    <Route path="membres" element={<MembersPage />} />
                    <Route path="membres/:id" element={<MemberPage />} />
                    <Route path="cotisations" element={<DuesPage />} />
                    <Route path="relances" element={<RemindersPage />} />
                    <Route path="barriere" element={<GateLogPage />} />
                    <Route path="encaissements" element={<RequireRole roles={FINANCE_AREA_ROLES}><ClubPaymentsPage /></RequireRole>} />
                    <Route path="rapprochement" element={<RequireRole roles={FINANCE_AREA_ROLES}><ClubReconciliationPage /></RequireRole>} />
                    <Route path="exceptions" element={<RequireRole roles={FINANCE_AREA_ROLES}><ExceptionsPage domain="finance" /></RequireRole>} />
                    <Route path="export" element={<RequireRole roles={FINANCE_AREA_ROLES}><AccountingExportPage /></RequireRole>} />
                    <Route path="erp" element={<RequireRole roles={FINANCE_AREA_ROLES}><ErpPage /></RequireRole>} />
                  </Routes>
                </AreaLayout>
              }
            />
            <Route
              path="/terrain"
              element={
                <RequireRole roles={["agent"]} vertical="distribution">
                  <FieldPage />
                </RequireRole>
              }
            />
            <Route
              path="/centrale/*"
              element={
                <AreaLayout roles={BACK_OFFICE_ROLES} vertical="distribution">
                  <Routes>
                    <Route index element={<CentraleDashboard />} />
                    <Route path="commandes" element={<OrdersPage />} />
                    <Route path="commandes/:id" element={<OrderPage back="/centrale/commandes" />} />
                    <Route path="tournees" element={<RoutesPage />} />
                    <Route path="tournees/:id" element={<RoutePage />} />
                    <Route path="stocks" element={<RequireRole roles={OPS_AREA_ROLES}><StockPage /></RequireRole>} />
                    <Route path="incidents" element={<RequireRole roles={OPS_AREA_ROLES}><ExceptionsPage domain="ops" /></RequireRole>} />
                  </Routes>
                </AreaLayout>
              }
            />
            <Route
              path="/finance/*"
              element={
                <AreaLayout roles={FINANCE_AREA_ROLES} vertical="distribution">
                  <Routes>
                    <Route index element={<TransactionJournalPage />} />
                    <Route path="factures" element={<InvoicesPage />} />
                    <Route path="chaine/:id" element={<OrderPage back="/finance/factures" />} />
                    <Route path="rapprochement" element={<ReconciliationPage />} />
                    <Route path="exceptions" element={<ExceptionsPage domain="finance" />} />
                    <Route path="cloture" element={<DailyClosePage />} />
                    <Route path="erp" element={<ErpPage />} />
                  </Routes>
                </AreaLayout>
              }
            />
            {/* Administration is shared by both businesses: no vertical restriction. */}
            <Route
              path="/admin/*"
              element={
                <AreaLayout roles={["company_admin"]}>
                  <Routes>
                    <Route path="utilisateurs" element={<UsersPage />} />
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
    </Loaded>
  );
}

function NotFound() {
  return (
    <div className="mobile">
      <div className="notice">{K("Page introuvable.")}</div>
      <p style={{ marginTop: 12 }}>
        <Link to="/">{K("Retour à l'accueil")}</Link>
      </p>
    </div>
  );
}
