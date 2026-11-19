// Club dashboard (/club): who owes what, since when, and what came in this month.
import { Link, useNavigate } from "react-router-dom";
import {
  AGEING_BUCKETS,
  Badge,
  Card,
  formatDate,
  formatMoney,
  Loaded,
  PageHead,
  PAYMENT_METHOD_LABELS,
  Table,
  Tile,
  t,
  useApi,
} from "./legacy.ts";
import { memberColumns } from "./memberColumns.tsx";
import type { ClubDashboardData } from "./types.ts";

/** Ageing bars: no colour override while not yet due, amber up to 30 days, red beyond. */
const agingColour = (bucket: string): string | undefined =>
  bucket === "current" ? undefined : bucket === "d1_30" ? "#d9a520" : "#c0392b";

export function ClubDashboard() {
  const navigate = useNavigate();
  const dashboard = useApi<ClubDashboardData>("/api/club/dashboard", 10000);
  return (
    <>
      <PageHead title={t("Recouvrement")} sub={t("Qui doit quoi, depuis quand, et ce qui est rentré ce mois-ci.")} />
      <Loaded q={dashboard}>
        {(data) => {
          const largestBucket = Math.max(1, ...Object.values(data.aging));
          const collected = data.collectedMonth.reduce((sum, entry) => sum + entry.amount_minor, 0);
          return (
            <div className="stack">
              <div className="grid g4">
                <Tile
                  label={t("Total dû par les membres")}
                  value={formatMoney(data.totals.owedMinor)}
                  hint={t("{0} membre(s) actif(s)", data.totals.members)}
                />
                <Tile
                  label={t("Dont en retard")}
                  value={formatMoney(data.totals.overdueMinor)}
                  kind={data.totals.overdueMinor ? "warn" : ""}
                  hint={t("{0} membre(s) en retard", data.totals.inArrears)}
                />
                <Tile
                  label={t("Encaissé ce mois-ci")}
                  value={formatMoney(collected)}
                  hint={
                    data.collectedMonth
                      .map((entry) => `${PAYMENT_METHOD_LABELS[entry.method]} ${formatMoney(entry.amount_minor)}`)
                      .join(" · ") || t("aucun encaissement")
                  }
                />
                <Tile
                  label={t("Paiements en ligne non réglés en banque")}
                  value={formatMoney(data.unsettledOnlineMinor)}
                  kind={data.unsettledOnlineMinor ? "info" : ""}
                  hint={t("confirmés par le prestataire, en attente du relevé")}
                />
              </div>
              <div className="grid g2">
                <Card title={t("Ancienneté des sommes dues")}>
                  <div className="stack">
                    {AGEING_BUCKETS.map(([bucket, label]) => (
                      <div key={bucket}>
                        <div className="row spread small">
                          <span>{label}</span>
                          <strong>{formatMoney(data.aging[bucket] ?? 0)}</strong>
                        </div>
                        <div className="bar">
                          <i
                            style={{
                              width: `${Math.round(((data.aging[bucket] ?? 0) / largestBucket) * 100)}%`,
                              background: agingColour(bucket),
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card title={t("Aujourd'hui")}>
                  <dl className="kv">
                    <dt>{t("Barrière")}</dt>
                    <dd>
                      <Badge kind="ok">
                        {data.gateToday.allow} {t("autorisée(s)")}
                      </Badge>{" "}
                      <Badge kind="warn">
                        {data.gateToday.flag} {t("signalée(s)")}
                      </Badge>{" "}
                      <Badge kind="err">
                        {data.gateToday.deny} {t("refusée(s)")}
                      </Badge>
                    </dd>
                    <dt>{t("Relances ce mois-ci")}</dt>
                    <dd>{data.remindersMonth}</dd>
                    <dt>{t("Exceptions à traiter")}</dt>
                    <dd>{data.openExceptions ? <Link to="/club/exceptions">{data.openExceptions}</Link> : 0}</dd>
                    <dt>{t("Avoirs des membres")}</dt>
                    <dd>{formatMoney(data.totals.creditMinor)}</dd>
                    <dt>{t("Mis à jour")}</dt>
                    <dd>{formatDate(data.generatedAt, true)}</dd>
                  </dl>
                </Card>
              </div>
              <Card
                title={t("Membres les plus en retard")}
                actions={<Link to="/club/membres?filter=arrears">{t("Voir tous les membres en retard")}</Link>}
                flush
              >
                <Table
                  rows={data.topDebtors}
                  rowKey={(member) => member.id}
                  empty={t("Aucun membre en retard.")}
                  onRow={(member) => navigate(`/club/membres/${member.id}`)}
                  cols={memberColumns()}
                />
              </Card>
            </div>
          );
        }}
      </Loaded>
    </>
  );
}
