// Dues (/club/cotisations): membership plans, billed periods with their collection rate, and the
// dues run of a period (accounting).
import { useState } from "react";
import { FINANCE_ROLES, useCurrentRole } from "../admin/roles.ts";
import { translate, translateCount } from "../i18n/translate.ts";
import { apiRequest } from "../shared/api.ts";
import { DataTable } from "../shared/DataTable.tsx";
import { useFeedback } from "../shared/Feedback.tsx";
import { Field } from "../shared/Form.tsx";
import { formatDate, formatMoney } from "../shared/format.ts";
import { useApi } from "../shared/hooks.ts";
import { Card, PageHeader } from "../shared/Layout.tsx";
import { QueryView } from "../shared/QueryView.tsx";
import { useSession } from "../shared/session.ts";
import type { DuesData, DuesPeriod } from "./types.ts";

/** A year (annual plans) or a year and month (monthly plans). */
const PERIOD_PATTERN = /^\d{4}(-(0[1-9]|1[0-2]))?$/;

const collectionRate = (period: DuesPeriod): number =>
  Math.round((period.collected_minor / Math.max(1, period.amount_minor)) * 100);

export function Dues() {
  const ui = useFeedback();
  const role = useCurrentRole();
  const { session } = useSession();
  const dues = useApi<DuesData>("/api/club/dues");
  const [period, setPeriod] = useState(session.today.slice(0, 4));

  const runDues = async () => {
    const confirmed = await ui.ask({
      kind: "confirm",
      title: translate("Facturer la période {0} ?", period),
      text:
        period.length === 4
          ? translate("Adhésions annuelles : une cotisation par membre actif. Un membre déjà facturé pour cette période est ignoré.")
          : translate("Adhésions mensuelles : une cotisation par membre actif. Un membre déjà facturé pour cette période est ignoré."),
      confirm: translate("Facturer"),
    });
    if (confirmed) {
      await ui.run(async () => {
        const result = await apiRequest<{ created: number; skipped: number; amountMinor: number }>("POST", "/api/club/dues/run", {
          period,
        });
        ui.toast(
          `${translateCount(
            result.created,
            "{0} cotisation facturée pour {1}",
            "{0} cotisations facturées pour {1}",
            formatMoney(result.amountMinor),
          )}, ${translateCount(result.skipped, "{0} déjà facturée.", "{0} déjà facturées.")}`,
        );
        await dues.reload();
      });
    }
  };

  return (
    <>
      <PageHeader
        title={translate("Cotisations")}
        sub={translate("Catégories d'adhésion et facturation récurrente, annuelle ou mensuelle.")}
      />
      <QueryView q={dues}>
        {(data) => (
          <div className="stack">
            {FINANCE_ROLES.includes(role) && (
              <Card title={translate("Facturer une période")}>
                <div className="row">
                  <Field label={translate("Période (AAAA ou AAAA-MM)")}>
                    <input
                      type="text"
                      value={period}
                      onChange={(event) => setPeriod(event.target.value.trim())}
                      style={{ width: 140 }}
                    />
                  </Field>
                  <button className="secondary sm" onClick={() => setPeriod(session.today.slice(0, 4))}>
                    {translate("Année en cours")}
                  </button>
                  <button className="secondary sm" onClick={() => setPeriod(session.today.slice(0, 7))}>
                    {translate("Mois en cours")}
                  </button>
                  <button disabled={!PERIOD_PATTERN.test(period)} onClick={runDues}>
                    {translate("Facturer")}
                  </button>
                </div>
              </Card>
            )}
            <Card title={translate("Catégories d'adhésion")} flush>
              <DataTable
                rows={data.plans}
                rowKey={(plan) => plan.id}
                empty={translate("Aucune catégorie.")}
                cols={[
                  [
                    translate("Catégorie"),
                    (plan) => (
                      <>
                        <strong>{translate(plan.name)}</strong>
                        <div className="small muted">{plan.code}</div>
                      </>
                    ),
                  ],
                  [translate("Rythme"), (plan) => (plan.billing === "monthly" ? translate("Mensuel") : translate("Annuel"))],
                  [translate("Cotisation"), (plan) => formatMoney(plan.fee_minor), "right"],
                  [translate("Membres actifs"), (plan) => plan.members, "right"],
                ]}
              />
            </Card>
            <Card title={translate("Périodes facturées")} flush>
              <DataTable
                rows={data.periods}
                rowKey={(billed) => billed.period}
                empty={translate("Aucune cotisation facturée.")}
                cols={[
                  [translate("Période"), (billed) => <strong>{billed.period}</strong>],
                  [translate("Facturée le"), (billed) => formatDate(billed.billed_at)],
                  [translate("Cotisations"), (billed) => billed.count, "right"],
                  [translate("Montant"), (billed) => formatMoney(billed.amount_minor), "right"],
                  [translate("Encaissé"), (billed) => formatMoney(billed.collected_minor), "right"],
                  [
                    translate("Taux de recouvrement"),
                    (billed) => (
                      <div style={{ minWidth: 120 }}>
                        <div className="bar">
                          <i style={{ width: `${collectionRate(billed)}%` }} />
                        </div>
                        <span className="small muted">{collectionRate(billed)} %</span>
                      </div>
                    ),
                  ],
                ]}
              />
            </Card>
          </div>
        )}
      </QueryView>
    </>
  );
}
