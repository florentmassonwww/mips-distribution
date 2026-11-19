// Dues (/club/cotisations): membership plans, billed periods with their collection rate, and the
// dues run of a period (accounting).
import { useState } from "react";
import {
  ACCOUNTING_ROLES,
  api,
  Card,
  Field,
  formatDate,
  formatMoney,
  Loaded,
  PageHead,
  Table,
  t,
  useApi,
  useRole,
  useSession,
  useUi,
} from "./legacy.ts";
import type { DuesData, DuesPeriod } from "./types.ts";

/** A year (annual plans) or a year and month (monthly plans). */
const PERIOD_PATTERN = /^\d{4}(-(0[1-9]|1[0-2]))?$/;

const collectionRate = (period: DuesPeriod): number =>
  Math.round((period.collected_minor / Math.max(1, period.amount_minor)) * 100);

export function Dues() {
  const ui = useUi();
  const role = useRole();
  const { session } = useSession();
  const dues = useApi<DuesData>("/api/club/dues");
  const [period, setPeriod] = useState(session.today.slice(0, 4));

  const runDues = async () => {
    const confirmed = await ui.ask({
      kind: "confirm",
      title: t("Facturer la période {0} ?", period),
      text:
        period.length === 4
          ? t("Adhésions annuelles : une cotisation par membre actif. Un membre déjà facturé pour cette période est ignoré.")
          : t("Adhésions mensuelles : une cotisation par membre actif. Un membre déjà facturé pour cette période est ignoré."),
      confirm: t("Facturer"),
    });
    if (confirmed) {
      await ui.run(async () => {
        const result = await api<{ created: number; skipped: number; amountMinor: number }>("POST", "/api/club/dues/run", {
          period,
        });
        ui.toast(
          t(
            "{0} cotisation(s) facturée(s) pour {1}, {2} déjà facturée(s).",
            result.created,
            formatMoney(result.amountMinor),
            result.skipped,
          ),
        );
        await dues.reload();
      });
    }
  };

  return (
    <>
      <PageHead
        title={t("Cotisations")}
        sub={t("Catégories d'adhésion et facturation récurrente, annuelle ou mensuelle.")}
      />
      <Loaded q={dues}>
        {(data) => (
          <div className="stack">
            {ACCOUNTING_ROLES.includes(role) && (
              <Card title={t("Facturer une période")}>
                <div className="row">
                  <Field label={t("Période (AAAA ou AAAA-MM)")}>
                    <input
                      type="text"
                      value={period}
                      onChange={(event) => setPeriod(event.target.value.trim())}
                      style={{ width: 140 }}
                    />
                  </Field>
                  <button className="secondary sm" onClick={() => setPeriod(session.today.slice(0, 4))}>
                    {t("Année en cours")}
                  </button>
                  <button className="secondary sm" onClick={() => setPeriod(session.today.slice(0, 7))}>
                    {t("Mois en cours")}
                  </button>
                  <button disabled={!PERIOD_PATTERN.test(period)} onClick={runDues}>
                    {t("Facturer")}
                  </button>
                </div>
              </Card>
            )}
            <Card title={t("Catégories d'adhésion")} flush>
              <Table
                rows={data.plans}
                rowKey={(plan) => plan.id}
                empty={t("Aucune catégorie.")}
                cols={[
                  [
                    t("Catégorie"),
                    (plan) => (
                      <>
                        <strong>{t(plan.name)}</strong>
                        <div className="small muted">{plan.code}</div>
                      </>
                    ),
                  ],
                  [t("Rythme"), (plan) => (plan.billing === "monthly" ? t("Mensuel") : t("Annuel"))],
                  [t("Cotisation"), (plan) => formatMoney(plan.fee_minor), "right"],
                  [t("Membres actifs"), (plan) => plan.members, "right"],
                ]}
              />
            </Card>
            <Card title={t("Périodes facturées")} flush>
              <Table
                rows={data.periods}
                rowKey={(billed) => billed.period}
                empty={t("Aucune cotisation facturée.")}
                cols={[
                  [t("Période"), (billed) => <strong>{billed.period}</strong>],
                  [t("Facturée le"), (billed) => formatDate(billed.billed_at)],
                  [t("Cotisations"), (billed) => billed.count, "right"],
                  [t("Montant"), (billed) => formatMoney(billed.amount_minor), "right"],
                  [t("Encaissé"), (billed) => formatMoney(billed.collected_minor), "right"],
                  [
                    t("Taux de recouvrement"),
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
      </Loaded>
    </>
  );
}
