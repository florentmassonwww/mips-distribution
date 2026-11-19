// Members list (/club/membres): search, arrears filter, sort, CSV export, and member creation by
// the secretariat.
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { OPS_ROLES, useCurrentRole } from "../admin/roles.ts";
import { translate } from "../i18n/translate.ts";
import { apiRequest } from "../shared/api.ts";
import { DataTable } from "../shared/DataTable.tsx";
import { useFeedback } from "../shared/Feedback.tsx";
import { Field } from "../shared/Form.tsx";
import { formatMoney } from "../shared/format.ts";
import { useApi } from "../shared/hooks.ts";
import { Card, CsvExportLink, PageHeader } from "../shared/Layout.tsx";
import { QueryView } from "../shared/QueryView.tsx";
import { memberColumns } from "./memberColumns.tsx";
import { billingSuffix, filtersQuery } from "./parts.tsx";
import type { DuesData, MemberListItem } from "./types.ts";

type MemberFilters = {
  q: string;
  /** "" or "arrears". */
  filter: string;
  /** "amount", "age", or "" (by number). */
  sort: string;
};

interface NewMember {
  name: string;
  email: string;
  phone: string;
  planId: string;
}

export function Members() {
  const ui = useFeedback();
  const navigate = useNavigate();
  const role = useCurrentRole();
  const [searchParams] = useSearchParams();
  // The dashboard links here with ?filter=arrears.
  const [filters, setFilters] = useState<MemberFilters>({ q: "", filter: searchParams.get("filter") ?? "", sort: "amount" });
  const query = filtersQuery(filters);
  const members = useApi<MemberListItem[]>(`/api/club/members?${query}`);
  const dues = useApi<DuesData>("/api/club/dues");
  const [draft, setDraft] = useState<NewMember>({ name: "", email: "", phone: "", planId: "" });

  const create = () =>
    ui.run(async () => {
      const created = await apiRequest<{ id: string; number: string }>("POST", "/api/club/members", {
        ...draft,
        planId: draft.planId || null,
      });
      ui.toast(translate("Membre {0} créé.", created.number));
      navigate(`/club/membres/${created.id}`);
    });

  return (
    <>
      <PageHeader
        title={translate("Membres")}
        sub={translate("Chaque membre a un compte : cotisations et consommations au débit, encaissements confirmés au crédit.")}
      >
        <input
          type="text"
          value={filters.q}
          onChange={(event) => setFilters({ ...filters, q: event.target.value })}
          placeholder={translate("Nom, numéro, référence, badge")}
          aria-label={translate("Rechercher")}
          style={{ width: 230 }}
        />
        <select
          value={filters.filter}
          onChange={(event) => setFilters({ ...filters, filter: event.target.value })}
          aria-label={translate("Filtre")}
          style={{ width: "auto" }}
        >
          <option value="">{translate("Tous les membres")}</option>
          <option value="arrears">{translate("En retard")}</option>
        </select>
        <select
          value={filters.sort}
          onChange={(event) => setFilters({ ...filters, sort: event.target.value })}
          aria-label={translate("Tri")}
          style={{ width: "auto" }}
        >
          <option value="amount">{translate("Par montant dû")}</option>
          <option value="age">{translate("Par ancienneté du retard")}</option>
          <option value="">{translate("Par numéro")}</option>
        </select>
        <CsvExportLink href={`/api/club/members?format=csv&${query}`} />
      </PageHeader>
      <div className="stack">
        <Card title={translate("Comptes membres")} flush>
          <QueryView q={members}>
            {(rows) => (
              <DataTable
                rows={rows}
                rowKey={(member) => member.id}
                empty={translate("Aucun membre pour ces critères.")}
                onRow={(member) => navigate(`/club/membres/${member.id}`)}
                cols={memberColumns()}
              />
            )}
          </QueryView>
        </Card>
        {OPS_ROLES.includes(role) && (
          <Card title={translate("Nouveau membre")}>
            <div className="grid g4">
              <Field label={translate("Nom")}>
                <input type="text" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
              </Field>
              <Field label={translate("Adresse e-mail")}>
                <input type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
              </Field>
              <Field label={translate("Téléphone")}>
                <input type="tel" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} />
              </Field>
              <Field label={translate("Catégorie d'adhésion")}>
                <select value={draft.planId} onChange={(event) => setDraft({ ...draft, planId: event.target.value })}>
                  <option value="">—</option>
                  {dues.data?.plans
                    .filter((plan) => plan.active)
                    .map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {translate(plan.name)}
                        {" · "}
                        {formatMoney(plan.fee_minor)}
                        {billingSuffix(plan.billing)}
                      </option>
                    ))}
                </select>
              </Field>
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <button disabled={draft.name.trim().length < 2} onClick={create}>
                {translate("Créer le membre")}
              </button>
              <span className="small muted">
                {translate("Le numéro, la référence de paiement et le badge sont attribués automatiquement.")}
              </span>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
