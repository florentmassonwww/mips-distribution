// Members list (/club/membres): search, arrears filter, sort, CSV export, and member creation by
// the secretariat.
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  api,
  Card,
  CsvLink,
  Field,
  formatMoney,
  Loaded,
  PageHead,
  SECRETARIAT_ROLES,
  Table,
  t,
  useApi,
  useRole,
  useUi,
} from "./legacy.ts";
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
  const ui = useUi();
  const navigate = useNavigate();
  const role = useRole();
  const [searchParams] = useSearchParams();
  // The dashboard links here with ?filter=arrears.
  const [filters, setFilters] = useState<MemberFilters>({ q: "", filter: searchParams.get("filter") ?? "", sort: "amount" });
  const query = filtersQuery(filters);
  const members = useApi<MemberListItem[]>(`/api/club/members?${query}`);
  const dues = useApi<DuesData>("/api/club/dues");
  const [draft, setDraft] = useState<NewMember>({ name: "", email: "", phone: "", planId: "" });

  const create = () =>
    ui.run(async () => {
      const created = await api<{ id: string; number: string }>("POST", "/api/club/members", {
        ...draft,
        planId: draft.planId || null,
      });
      ui.toast(t("Membre {0} créé.", created.number));
      navigate(`/club/membres/${created.id}`);
    });

  return (
    <>
      <PageHead
        title={t("Membres")}
        sub={t("Chaque membre a un compte : cotisations et consommations au débit, encaissements confirmés au crédit.")}
      >
        <input
          type="text"
          value={filters.q}
          onChange={(event) => setFilters({ ...filters, q: event.target.value })}
          placeholder={t("Nom, numéro, référence, badge")}
          aria-label={t("Rechercher")}
          style={{ width: 230 }}
        />
        <select
          value={filters.filter}
          onChange={(event) => setFilters({ ...filters, filter: event.target.value })}
          aria-label={t("Filtre")}
          style={{ width: "auto" }}
        >
          <option value="">{t("Tous les membres")}</option>
          <option value="arrears">{t("En retard")}</option>
        </select>
        <select
          value={filters.sort}
          onChange={(event) => setFilters({ ...filters, sort: event.target.value })}
          aria-label={t("Tri")}
          style={{ width: "auto" }}
        >
          <option value="amount">{t("Par montant dû")}</option>
          <option value="age">{t("Par ancienneté du retard")}</option>
          <option value="">{t("Par numéro")}</option>
        </select>
        <CsvLink href={`/api/club/members?format=csv&${query}`} />
      </PageHead>
      <div className="stack">
        <Card title={t("Comptes membres")} flush>
          <Loaded q={members}>
            {(rows) => (
              <Table
                rows={rows}
                rowKey={(member) => member.id}
                empty={t("Aucun membre pour ces critères.")}
                onRow={(member) => navigate(`/club/membres/${member.id}`)}
                cols={memberColumns()}
              />
            )}
          </Loaded>
        </Card>
        {SECRETARIAT_ROLES.includes(role) && (
          <Card title={t("Nouveau membre")}>
            <div className="grid g4">
              <Field label={t("Nom")}>
                <input type="text" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
              </Field>
              <Field label={t("Adresse e-mail")}>
                <input type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
              </Field>
              <Field label={t("Téléphone")}>
                <input type="tel" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} />
              </Field>
              <Field label={t("Catégorie d'adhésion")}>
                <select value={draft.planId} onChange={(event) => setDraft({ ...draft, planId: event.target.value })}>
                  <option value="">—</option>
                  {dues.data?.plans
                    .filter((plan) => plan.active)
                    .map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {t(plan.name)}
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
                {t("Créer le membre")}
              </button>
              <span className="small muted">
                {t("Le numéro, la référence de paiement et le badge sont attribués automatiquement.")}
              </span>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
