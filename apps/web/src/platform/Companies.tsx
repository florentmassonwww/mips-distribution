// Platform administration: companies (tenants), their plan, subscription and access.
import { useEffect, useRef, useState } from "react";
import { translate, translateCount } from "../i18n/translate.ts";
import { apiRequest } from "../shared/api.ts";
import { Badge } from "../shared/Badge.tsx";
import { DataTable } from "../shared/DataTable.tsx";
import { useFeedback } from "../shared/Feedback.tsx";
import { Field } from "../shared/Form.tsx";
import { formatDate } from "../shared/format.ts";
import { useApi } from "../shared/hooks.ts";
import { inCatalogueOrder, MODULE_LABEL, MODULES, type ModuleCode } from "../shared/modules.ts";
import { forgetDemoData } from "../shared/offline.ts";
import { Card, PageHeader } from "../shared/Layout.tsx";
import { QueryView } from "../shared/QueryView.tsx";

interface Company {
  id: string;
  name: string;
  slug: string;
  /** Enabled modules, in catalogue order (possibly none). */
  modules: string[];
  status: string;
  plan: string;
  subscription_status: string;
  subscription_renews_at: string | null;
  created_at: string;
  users: number;
  agents: number;
}

interface NewCompany {
  name: string;
  slug: string;
  adminName: string;
  adminEmail: string;
  /** At least one module; Distribution by default. */
  modules: ModuleCode[];
}

type CompanyPatch = { plan: string } | { subscriptionStatus: string } | { status: string };

const EMPTY_COMPANY: NewCompany = { name: "", slug: "", adminName: "", adminEmail: "", modules: ["distribution"] };

/** "Distribution · Club de sport", or a mention when the company has no module. */
const modulesText = (modules: readonly string[]): string =>
  modules.length ? inCatalogueOrder(modules).map((module) => MODULE_LABEL[module]).join(" · ") : translate("aucun module");

/** Toggles a module in a list, keeping the catalogue order. */
const toggled = (modules: readonly ModuleCode[], module: ModuleCode, on: boolean): ModuleCode[] =>
  inCatalogueOrder(on ? [...modules, module] : modules.filter((candidate) => candidate !== module));

// Plan and subscription values are French keys, displayed through the translation table.
const PLANS = ["pilote", "standard", "entreprise"];
const SUBSCRIPTION_STATUSES = ["essai", "actif", "impayé", "résilié"];

export function CompaniesPage() {
  const ui = useFeedback();
  const companies = useApi<Company[]>("/api/platform/companies");
  const [draft, setDraft] = useState<NewCompany>(EMPTY_COMPANY);
  /** Company whose modules are being changed in the dialog. */
  const [modulesOf, setModulesOf] = useState<Company | null>(null);

  const create = () =>
    ui.run(async () => {
      await apiRequest("POST", "/api/platform/companies", draft);
      setDraft(EMPTY_COMPANY);
      await companies.reload();
    }, translate("Entreprise créée avec son administrateur."));

  const update = (company: Company, patch: CompanyPatch, successMessage: string) =>
    ui.run(async () => {
      await apiRequest("PATCH", `/api/platform/companies/${company.id}`, patch);
      await companies.reload();
    }, successMessage);

  /** Saves the modules chosen in the dialog; removing a module is confirmed first. Resolves whether it was saved. */
  const saveModules = async (company: Company, modules: ModuleCode[]): Promise<boolean> => {
    const removed = inCatalogueOrder(company.modules).filter((module) => !modules.includes(module));
    if (removed.length) {
      const confirmed = await ui.ask({
        kind: "confirm",
        title: translate("Retirer {0} à {1} ?", removed.map((module) => MODULE_LABEL[module]).join(" · "), company.name),
        text: translate(
          "Les données du module sont conservées, mais ses écrans et ses routes sont fermés aux utilisateurs de l'entreprise jusqu'à sa réactivation.",
        ),
        danger: true,
        confirm: translate("Retirer le module"),
      });
      if (!confirmed) return false;
    }
    return ui.run(async () => {
      await apiRequest("PUT", `/api/platform/companies/${company.id}/modules`, { modules });
      await companies.reload();
    }, translate("Modules de {0} : {1}.", company.name, modulesText(modules)));
  };

  const resetDemo = async () => {
    const confirmed = await ui.ask({
      kind: "confirm",
      title: translate("Réinitialiser la démonstration ?"),
      text: translate("Toutes les données sont effacées pour tous les utilisateurs du serveur et le jeu de données fictif est rechargé."),
      danger: true,
      confirm: translate("Réinitialiser"),
    });
    if (confirmed) {
      await ui.run(async () => {
        await apiRequest("POST", "/api/demo/reset");
        forgetDemoData();
        await companies.reload();
      }, translate("Données de démonstration rechargées."));
    }
  };

  const canCreate =
    draft.name.trim().length >= 2 &&
    /^[a-z0-9-]{2,30}$/.test(draft.slug) &&
    draft.adminName.trim().length >= 2 &&
    /^\S+@\S+\.\S+$/.test(draft.adminEmail) &&
    draft.modules.length > 0;

  return (
    <>
      <PageHeader
        title={translate("Entreprises")}
        sub={translate("Chaque entreprise a ses données, ses utilisateurs et ses paramètres. La plateforme n'accède pas aux données opérationnelles.")}
      >
        <button className="danger" onClick={resetDemo}>
          {translate("Réinitialiser la démonstration")}
        </button>
      </PageHeader>
      <div className="stack">
        <Card title={translate("Entreprises et abonnements (démonstration)")} flush>
          <QueryView q={companies}>
            {(rows) => (
              <DataTable
                rows={rows}
                rowKey={(company) => company.id}
                empty={translate("Aucune entreprise.")}
                cols={[
                  [
                    translate("Entreprise"),
                    (company) => (
                      <>
                        <strong>{company.name}</strong>
                        <div className="small muted">
                          {company.slug} · {modulesText(company.modules)}
                        </div>
                      </>
                    ),
                  ],
                  [
                    translate("Accès"),
                    (company) => (
                      <Badge kind={company.status === "active" ? "ok" : "err"}>{company.status === "active" ? translate("Actif") : translate("Suspendu")}</Badge>
                    ),
                  ],
                  [
                    translate("Formule"),
                    (company) => (
                      <select
                        value={company.plan}
                        onChange={(event) => update(company, { plan: event.target.value }, translate("Formule modifiée."))}
                        aria-label={translate("Formule de {0}", company.name)}
                        style={{ width: "auto" }}
                      >
                        {PLANS.map((plan) => (
                          <option key={plan} value={plan}>
                            {translate(plan)}
                          </option>
                        ))}
                      </select>
                    ),
                  ],
                  [
                    translate("Abonnement"),
                    (company) => (
                      <select
                        value={company.subscription_status}
                        onChange={(event) => update(company, { subscriptionStatus: event.target.value }, translate("Abonnement modifié."))}
                        aria-label={translate("Abonnement de {0}", company.name)}
                        style={{ width: "auto" }}
                      >
                        {SUBSCRIPTION_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {translate(status)}
                          </option>
                        ))}
                      </select>
                    ),
                  ],
                  [translate("Échéance"), (company) => formatDate(company.subscription_renews_at)],
                  [translate("Utilisateurs"), (company) => translateCount(company.agents, "{1} (dont {0} agent)", "{1} (dont {0} agents)", company.users), "right"],
                  [
                    "",
                    (company) => (
                      <span className="row" style={{ flexWrap: "nowrap", justifyContent: "flex-end" }}>
                      <button
                        className="sm secondary"
                        onClick={() => setModulesOf(company)}
                        aria-label={translate("Modules de {0}", company.name)}
                        aria-haspopup="dialog"
                      >
                        {translate("Modules")}
                      </button>
                      <button
                        className={`sm ${company.status === "active" ? "danger" : "secondary"}`}
                        onClick={() =>
                          update(
                            company,
                            { status: company.status === "active" ? "suspended" : "active" },
                            company.status === "active" ? translate("Accès suspendu.") : translate("Accès rétabli."),
                          )
                        }
                      >
                        {company.status === "active" ? translate("Suspendre") : translate("Rétablir")}
                      </button>
                      </span>
                    ),
                  ],
                ]}
              />
            )}
          </QueryView>
        </Card>
        <Card title={translate("Nouvelle entreprise")}>
          <div className="grid g4">
            <Field label={translate("Raison sociale")}>
              <input type="text" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            </Field>
            <Field label={translate("Identifiant (minuscules, chiffres, tirets)")}>
              <input type="text" value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value.toLowerCase() })} />
            </Field>
            <Field label={translate("Nom de l'administrateur")}>
              <input type="text" value={draft.adminName} onChange={(event) => setDraft({ ...draft, adminName: event.target.value })} />
            </Field>
            <Field label={translate("E-mail de l'administrateur")}>
              <input type="email" value={draft.adminEmail} onChange={(event) => setDraft({ ...draft, adminEmail: event.target.value })} />
            </Field>
          </div>
          <fieldset style={{ border: 0, margin: "12px 0 0", padding: 0 }}>
            <legend className="small muted" style={{ marginBottom: 6, padding: 0 }}>
              {translate("Modules (au moins un)")}
            </legend>
            <div className="row">
              {MODULES.map((module) => (
                <label className="check" key={module}>
                  <input
                    type="checkbox"
                    checked={draft.modules.includes(module)}
                    onChange={(event) => setDraft({ ...draft, modules: toggled(draft.modules, module, event.target.checked) })}
                  />
                  <span>{MODULE_LABEL[module]}</span>
                </label>
              ))}
            </div>
            {draft.modules.length === 0 && <div className="small" role="alert" style={{ color: "var(--err)", marginTop: 4 }}>{translate("Choisissez au moins un module.")}</div>}
          </fieldset>
          <div style={{ marginTop: 12 }}>
            <button disabled={!canCreate} onClick={create}>
              {translate("Créer l'entreprise")}
            </button>
          </div>
        </Card>
      </div>
      {modulesOf && (
        <ModulesDialog
          company={modulesOf}
          onCancel={() => setModulesOf(null)}
          onSave={async (modules) => {
            if (await saveModules(modulesOf, modules)) setModulesOf(null);
          }}
        />
      )}
    </>
  );
}

interface ModulesDialogProps {
  company: Company;
  onCancel: () => void;
  onSave: (modules: ModuleCode[]) => Promise<void>;
}

/** Chooses a company's modules (possibly none: only administration and audit then stay open). */
function ModulesDialog({ company, onCancel, onSave }: ModulesDialogProps) {
  const [modules, setModules] = useState<ModuleCode[]>(inCatalogueOrder(company.modules));
  const [saving, setSaving] = useState(false);
  // Focus goes back to the button that opened the dialog when it closes.
  const opener = useRef<Element | null>(null);
  useEffect(() => {
    opener.current = document.activeElement;
    return () => (opener.current as HTMLElement | null)?.focus?.();
  }, []);
  const unchanged = modules.join() === inCatalogueOrder(company.modules).join();
  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modules-title"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !saving) onCancel();
      }}
    >
      <form
        className="dialog stack"
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          await onSave(modules);
          setSaving(false);
        }}
      >
        <h2 id="modules-title">{translate("Modules de {0}", company.name)}</h2>
        <p className="muted">
          {translate("Retirer un module ne supprime aucune donnée : l'accès est fermé jusqu'à sa réactivation. Sans module, seules l'administration et l'audit restent accessibles.")}
        </p>
        <fieldset style={{ border: 0, margin: 0, padding: 0 }} className="stack">
          <legend className="small muted" style={{ padding: 0 }}>
            {translate("Modules activés")}
          </legend>
          {MODULES.map((module, index) => (
            <label className="check" key={module}>
              <input
                type="checkbox"
                autoFocus={index === 0}
                checked={modules.includes(module)}
                onChange={(event) => setModules(toggled(modules, module, event.target.checked))}
              />
              <span>
                {MODULE_LABEL[module]}
                {company.modules.includes(module) && !modules.includes(module) && (
                  <span className="small" style={{ color: "var(--err)" }}>
                    {" "}
                    {translate("(sera retiré)")}
                  </span>
                )}
                {!company.modules.includes(module) && modules.includes(module) && (
                  <span className="small" style={{ color: "var(--ok)" }}>
                    {" "}
                    {translate("(sera activé)")}
                  </span>
                )}
              </span>
            </label>
          ))}
        </fieldset>
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="secondary" onClick={onCancel} disabled={saving}>
            {translate("Annuler")}
          </button>
          <button type="submit" disabled={unchanged || saving}>
            {translate("Enregistrer les modules")}
          </button>
        </div>
      </form>
    </div>
  );
}
