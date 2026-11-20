// Club dashboard (/club): who owes what, since when, and what came in this month.
import { Link, useNavigate } from "react-router-dom";
import { AGEING_BUCKETS } from "../admin/clubLabels.ts";
import { translate, translateCount } from "../i18n/translate.ts";
import { Badge } from "../shared/Badge.tsx";
import { DataTable } from "../shared/DataTable.tsx";
import { formatDate, formatMoney } from "../shared/format.ts";
import { useApi } from "../shared/hooks.ts";
import { MEMBER_PAYMENT_METHOD } from "../shared/labels.ts";
import { Card, PageHeader, Tile } from "../shared/Layout.tsx";
import { QueryView } from "../shared/QueryView.tsx";
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
      <PageHeader title={translate("Recouvrement")} sub={translate("Qui doit quoi, depuis quand, et ce qui est rentré ce mois-ci.")} />
      <QueryView q={dashboard}>
        {(data) => {
          const largestBucket = Math.max(1, ...Object.values(data.aging));
          const collected = data.collectedMonth.reduce((sum, entry) => sum + entry.amount_minor, 0);
          return (
            <div className="stack">
              <div className="grid g4">
                <Tile
                  label={translate("Total dû par les membres")}
                  value={formatMoney(data.totals.owedMinor)}
                  hint={translateCount(data.totals.members, "{0} membre actif", "{0} membres actifs")}
                />
                <Tile
                  label={translate("Dont en retard")}
                  value={formatMoney(data.totals.overdueMinor)}
                  kind={data.totals.overdueMinor ? "warn" : ""}
                  hint={translateCount(data.totals.inArrears, "{0} membre en retard", "{0} membres en retard")}
                />
                <Tile
                  label={translate("Encaissé ce mois-ci")}
                  value={formatMoney(collected)}
                  hint={
                    data.collectedMonth
                      .map((entry) => `${MEMBER_PAYMENT_METHOD[entry.method]} ${formatMoney(entry.amount_minor)}`)
                      .join(" · ") || translate("aucun encaissement")
                  }
                />
                <Tile
                  label={translate("Paiements en ligne non réglés en banque")}
                  value={formatMoney(data.unsettledOnlineMinor)}
                  kind={data.unsettledOnlineMinor ? "info" : ""}
                  hint={translate("confirmés par le prestataire, en attente du relevé")}
                />
              </div>
              <div className="grid g2">
                <Card title={translate("Ancienneté des sommes dues")}>
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
                <Card title={translate("Aujourd'hui")}>
                  <dl className="kv">
                    <dt>{translate("Barrière")}</dt>
                    <dd>
                      <Badge kind="ok">
                        {translateCount(data.gateToday.allow, "{0} autorisée", "{0} autorisées")}
                      </Badge>{" "}
                      <Badge kind="warn">
                        {translateCount(data.gateToday.flag, "{0} signalée", "{0} signalées")}
                      </Badge>{" "}
                      <Badge kind="err">
                        {translateCount(data.gateToday.deny, "{0} refusée", "{0} refusées")}
                      </Badge>
                    </dd>
                    <dt>{translate("Relances ce mois-ci")}</dt>
                    <dd>{data.remindersMonth}</dd>
                    <dt>{translate("Exceptions à traiter")}</dt>
                    <dd>{data.openExceptions ? <Link to="/club/exceptions">{data.openExceptions}</Link> : 0}</dd>
                    <dt>{translate("Avoirs des membres")}</dt>
                    <dd>{formatMoney(data.totals.creditMinor)}</dd>
                    <dt>{translate("Mis à jour")}</dt>
                    <dd>{formatDate(data.generatedAt, true)}</dd>
                  </dl>
                </Card>
              </div>
              <Card
                title={translate("Membres les plus en retard")}
                actions={<Link to="/club/membres?filter=arrears">{translate("Voir tous les membres en retard")}</Link>}
                flush
              >
                <DataTable
                  rows={data.topDebtors}
                  rowKey={(member) => member.id}
                  empty={translate("Aucun membre en retard.")}
                  onRow={(member) => navigate(`/club/membres/${member.id}`)}
                  cols={memberColumns()}
                />
              </Card>
            </div>
          );
        }}
      </QueryView>
    </>
  );
}
