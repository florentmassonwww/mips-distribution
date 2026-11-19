// Platform administration: companies (tenants), their plan, subscription and access.
import { useState } from "react";
import { K } from "../legacy/i18n.js";
import {
  $ as Field,
  J as api,
  Q as Card,
  Y as useQuery,
  Z as formatDate,
  _v as useUi,
  cv as Badge,
  fv as PageHead,
  mv as Table,
  pv as Loaded,
} from "../legacy/shared.js";

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
  const ui = useUi();
  const companies = useQuery<Company[]>("/api/platform/companies");
  const [draft, setDraft] = useState<NewCompany>(EMPTY_COMPANY);

  const create = () =>
    ui.run(async () => {
      await api("POST", "/api/platform/companies", draft);
      setDraft({ name: "", slug: "", adminName: "", adminEmail: "", vertical: "distribution" });
      await companies.reload();
    }, K("Entreprise créée avec son administrateur."));

  const update = (company: Company, patch: CompanyPatch, successMessage: string) =>
    ui.run(async () => {
      await api("PATCH", `/api/platform/companies/${company.id}`, patch);
      await companies.reload();
    }, successMessage);

  const resetDemo = async () => {
    const confirmed = await ui.ask({
      kind: "confirm",
      title: K("Réinitialiser la démonstration ?"),
      text: K("Toutes les données sont effacées et le jeu de données fictif est rechargé."),
      danger: true,
      confirm: K("Réinitialiser"),
    });
    if (confirmed) {
      await ui.run(async () => {
        await api("POST", "/api/demo/reset");
        await companies.reload();
      }, K("Données de démonstration rechargées."));
    }
  };

  const canCreate =
    draft.name.trim().length >= 2 &&
    /^[a-z0-9-]{2,30}$/.test(draft.slug) &&
    draft.adminName.trim().length >= 2 &&
    /^\S+@\S+\.\S+$/.test(draft.adminEmail);

  return (
    <>
      <PageHead
        title={K("Entreprises")}
        sub={K("Chaque entreprise a ses données, ses utilisateurs et ses paramètres. La plateforme n'accède pas aux données opérationnelles.")}
      >
        <button className="danger" onClick={resetDemo}>
          {K("Réinitialiser la démonstration")}
        </button>
      </PageHead>
      <div className="stack">
        <Card title={K("Entreprises et abonnements (démonstration)")} flush>
          <Loaded q={companies}>
            {(rows) => (
              <Table
                rows={rows}
                rowKey={(company) => company.id}
                empty={K("Aucune entreprise.")}
                cols={[
                  [
                    K("Entreprise"),
                    (company) => (
                      <>
                        <strong>{company.name}</strong>
                        <div className="small muted">
                          {company.slug} · {company.vertical === "club" ? K("Club de sport") : K("Distribution")}
                        </div>
                      </>
                    ),
                  ],
                  [
                    K("Accès"),
                    (company) => (
                      <Badge kind={company.status === "active" ? "ok" : "err"}>{company.status === "active" ? K("Actif") : K("Suspendu")}</Badge>
                    ),
                  ],
                  [
                    K("Formule"),
                    (company) => (
                      <select
                        value={company.plan}
                        onChange={(event) => update(company, { plan: event.target.value }, K("Formule modifiée."))}
                        aria-label={K("Formule de {0}", company.name)}
                        style={{ width: "auto" }}
                      >
                        {PLANS.map((plan) => (
                          <option key={plan} value={plan}>
                            {K(plan)}
                          </option>
                        ))}
                      </select>
                    ),
                  ],
                  [
                    K("Abonnement"),
                    (company) => (
                      <select
                        value={company.subscription_status}
                        onChange={(event) => update(company, { subscriptionStatus: event.target.value }, K("Abonnement modifié."))}
                        aria-label={K("Abonnement de {0}", company.name)}
                        style={{ width: "auto" }}
                      >
                        {SUBSCRIPTION_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {K(status)}
                          </option>
                        ))}
                      </select>
                    ),
                  ],
                  [K("Échéance"), (company) => formatDate(company.subscription_renews_at)],
                  [K("Utilisateurs"), (company) => K("{0} (dont {1} agent(s))", company.users, company.agents), "right"],
                  [
                    "",
                    (company) => (
                      <button
                        className={`sm ${company.status === "active" ? "danger" : "secondary"}`}
                        onClick={() =>
                          update(
                            company,
                            { status: company.status === "active" ? "suspended" : "active" },
                            company.status === "active" ? K("Accès suspendu.") : K("Accès rétabli."),
                          )
                        }
                      >
                        {company.status === "active" ? K("Suspendre") : K("Rétablir")}
                      </button>
                    ),
                  ],
                ]}
              />
            )}
          </Loaded>
        </Card>
        <Card title={K("Nouvelle entreprise")}>
          <div className="grid g4">
            <Field label={K("Raison sociale")}>
              <input type="text" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            </Field>
            <Field label={K("Identifiant (minuscules, chiffres, tirets)")}>
              <input type="text" value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value.toLowerCase() })} />
            </Field>
            <Field label={K("Nom de l'administrateur")}>
              <input type="text" value={draft.adminName} onChange={(event) => setDraft({ ...draft, adminName: event.target.value })} />
            </Field>
            <Field label={K("E-mail de l'administrateur")}>
              <input type="email" value={draft.adminEmail} onChange={(event) => setDraft({ ...draft, adminEmail: event.target.value })} />
            </Field>
            <Field label={K("Métier")}>
              <select value={draft.vertical} onChange={(event) => setDraft({ ...draft, vertical: event.target.value })}>
                <option value="distribution">{K("Distribution")}</option>
                <option value="club">{K("Club de sport")}</option>
              </select>
            </Field>
          </div>
          <div style={{ marginTop: 12 }}>
            <button disabled={!canCreate} onClick={create}>
              {K("Créer l'entreprise")}
            </button>
          </div>
        </Card>
      </div>
    </>
  );
}
