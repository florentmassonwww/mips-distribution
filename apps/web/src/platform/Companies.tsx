// Platform administration: companies (tenants), their plan, subscription and access.
import { useState } from "react";
import { translate, translateCount } from "../i18n/translate.ts";
import { apiRequest } from "../shared/api.ts";
import { Badge } from "../shared/Badge.tsx";
import { DataTable } from "../shared/DataTable.tsx";
import { useFeedback } from "../shared/Feedback.tsx";
import { Field } from "../shared/Form.tsx";
import { formatDate } from "../shared/format.ts";
import { useApi } from "../shared/hooks.ts";
import { forgetDemoData } from "../shared/offline.ts";
import { Card, PageHeader } from "../shared/Layout.tsx";
import { QueryView } from "../shared/QueryView.tsx";

interface Company {
  id: string;
  name: string;
  slug: string;
  vertical: string;
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
  vertical: string;
}

type CompanyPatch = { plan: string } | { subscriptionStatus: string } | { status: string };

const EMPTY_COMPANY: NewCompany = { name: "", slug: "", adminName: "", adminEmail: "", vertical: "distribution" };

// Plan and subscription values are French keys, displayed through the translation table.
const PLANS = ["pilote", "standard", "entreprise"];
const SUBSCRIPTION_STATUSES = ["essai", "actif", "impayé", "résilié"];

export function CompaniesPage() {
  const ui = useFeedback();
  const companies = useApi<Company[]>("/api/platform/companies");
  const [draft, setDraft] = useState<NewCompany>(EMPTY_COMPANY);

  const create = () =>
    ui.run(async () => {
      await apiRequest("POST", "/api/platform/companies", draft);
      setDraft({ name: "", slug: "", adminName: "", adminEmail: "", vertical: "distribution" });
      await companies.reload();
    }, translate("Entreprise créée avec son administrateur."));

  const update = (company: Company, patch: CompanyPatch, successMessage: string) =>
    ui.run(async () => {
      await apiRequest("PATCH", `/api/platform/companies/${company.id}`, patch);
      await companies.reload();
    }, successMessage);

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
    /^\S+@\S+\.\S+$/.test(draft.adminEmail);

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
                          {company.slug} · {company.vertical === "club" ? translate("Club de sport") : translate("Distribution")}
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
            <Field label={translate("Métier")}>
              <select value={draft.vertical} onChange={(event) => setDraft({ ...draft, vertical: event.target.value })}>
                <option value="distribution">{translate("Distribution")}</option>
                <option value="club">{translate("Club de sport")}</option>
              </select>
            </Field>
          </div>
          <div style={{ marginTop: 12 }}>
            <button disabled={!canCreate} onClick={create}>
              {translate("Créer l'entreprise")}
            </button>
          </div>
        </Card>
      </div>
    </>
  );
}
