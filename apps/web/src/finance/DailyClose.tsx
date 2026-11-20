import { useState } from "react";
import { translate, translateCount } from "../i18n/translate.ts";
import { apiRequest } from "../shared/api.ts";
import { DataTable } from "../shared/DataTable.tsx";
import { useFeedback } from "../shared/Feedback.tsx";
import { formatDate, formatDayLong, formatMoney } from "../shared/format.ts";
import { useApi } from "../shared/hooks.ts";
import { PAYMENT_CHANNEL } from "../shared/labels.ts";
import { Card, CsvExportLink, PageHeader, Tile } from "../shared/Layout.tsx";
import { QueryView } from "../shared/QueryView.tsx";
import { useSession } from "../shared/session.ts";
import type { DailyCloseData } from "./types.ts";

type ClosePreview = DailyCloseData["preview"];

/** Banner above the totals: closed, blocked by pending payments, or open. */
function CloseStatus({ preview }: { preview: ClosePreview }) {
  const outstandingPoints = preview.toVerify + preview.openExceptions + preview.erpPending;
  if (preview.closed)
    return (
      <div className="notice ok">
        {translate(`Journée clôturée le {0} par {1}.`, formatDate(preview.closed.closed_at, true), preview.closed.closed_by ?? `—`)}
      </div>
    );
  // A pending payment has no known outcome yet: the day cannot be frozen.
  if (preview.pending > 0)
    return (
      <div className="notice err" role="alert">
        <strong>{translate(`Clôture bloquée :`)}</strong> {translateCount(
          preview.pending,
          `{0} paiement encore « en attente ». Interrogez le prestataire depuis le Journal pour connaître son issue.`,
          `{0} paiements encore « en attente ». Interrogez le prestataire depuis le Journal pour connaître leur issue.`,
        )}
      </div>
    );
  return (
    <div className="notice">
      {translate(`Journée ouverte.`)}{" "}
      {outstandingPoints > 0
        ? translate(`Des points restent à traiter ; ils seront consignés dans la clôture.`)
        : translate(`Aucun point en suspens.`)}
    </div>
  );
}

/** Daily close: checks the day's collections, then freezes its totals (once, irreversibly). */
export function DailyClose() {
  const feedback = useFeedback();
  const { session } = useSession();
  const [day, setDay] = useState(session.today);
  const close = useApi<DailyCloseData>(`/api/finance/close?day=${day}`);

  const closeDay = async () => {
    const confirmed = await feedback.ask({
      kind: `confirm`,
      title: translate(`Clôturer le {0} ?`, formatDayLong(day)),
      text: translate(`La clôture fige les totaux de la journée. Elle ne peut pas être refaite.`),
      confirm: translate(`Clôturer la journée`),
    });
    if (confirmed)
      await feedback.run(async () => {
        await apiRequest(`POST`, `/api/finance/close`, { day });
        await close.reload();
      }, translate(`Journée clôturée.`));
  };

  return (
    <>
      <PageHeader
        title={translate(`Clôture quotidienne`)}
        sub={translate(`Contrôle des encaissements du jour avant de figer les totaux.`)}
      >
        <input
          type="date"
          value={day}
          max={session.today}
          onChange={(event) => setDay(event.target.value)}
          aria-label={translate(`Journée`)}
          style={{ width: `auto` }}
        />
        <CsvExportLink href={`/api/finance/close?format=csv`} />
      </PageHeader>
      <QueryView q={close}>
        {({ preview, closes }) => {
          const confirmed = preview.byMethod.reduce((sum, row) => sum + row.confirmed_minor - row.refunded_minor, 0);
          const settled = preview.byMethod.reduce((sum, row) => sum + row.settled_minor, 0);
          const outstandingPoints = preview.toVerify + preview.openExceptions + preview.erpPending;
          return (
            <div className="stack">
              <CloseStatus preview={preview} />
              <div className="grid g4">
                <Tile
                  label={translate(`Facturé`)}
                  value={formatMoney(preview.invoiced)}
                  hint={translate(`reste à encaisser : {0}`, formatMoney(preview.outstanding))}
                />
                <Tile
                  label={translate(`Encaissé confirmé`)}
                  value={formatMoney(confirmed)}
                  hint={translateCount(preview.failed, `{0} tentative échouée`, `{0} tentatives échouées`)}
                />
                <Tile
                  label={translate(`Réglé en banque`)}
                  value={formatMoney(settled)}
                  hint={translate(`à recevoir : {0}`, formatMoney(confirmed - settled))}
                />
                <Tile
                  label={translate(`Points en suspens`)}
                  value={outstandingPoints}
                  kind={outstandingPoints ? `warn` : ``}
                  hint={[
                    translate(`{0} à vérifier`, preview.toVerify),
                    translateCount(preview.openExceptions, `{0} exception`, `{0} exceptions`),
                    translateCount(preview.erpPending, `{0} écriture ERP`, `{0} écritures ERP`),
                  ].join(` · `)}
                />
              </div>
              <Card title={translate(`Encaissements confirmés du {0}`, formatDayLong(preview.day))} flush>
                <DataTable
                  rows={preview.byMethod}
                  rowKey={(row) => row.method}
                  empty={translate(`Aucun encaissement confirmé ce jour.`)}
                  cols={[
                    [translate(`Moyen`), (row) => PAYMENT_CHANNEL[row.method]],
                    [translate(`Nombre`), (row) => row.count, `right`],
                    [translate(`Confirmé`), (row) => formatMoney(row.confirmed_minor), `right`],
                    [translate(`Remboursé`), (row) => formatMoney(row.refunded_minor), `right`],
                    [translate(`Frais attendus`), (row) => formatMoney(row.fee_expected_minor), `right`],
                    [translate(`Réglé en banque`), (row) => formatMoney(row.settled_minor), `right`],
                    [translate(`Frais prélevés`), (row) => formatMoney(row.fee_actual_minor), `right`],
                  ]}
                />
              </Card>
              {!preview.closed && (
                <div>
                  <button disabled={preview.pending > 0} onClick={closeDay}>
                    {translate(`Clôturer la journée`)}
                  </button>
                </div>
              )}
              <Card title={translate(`Journées clôturées`)} flush>
                <DataTable
                  rows={closes}
                  rowKey={(entry) => entry.day}
                  empty={translate(`Aucune journée clôturée.`)}
                  onRow={(entry) => setDay(entry.day)}
                  cols={[
                    [translate(`Journée`), (entry) => formatDayLong(entry.day)],
                    [translate(`Clôturée`), (entry) => formatDate(entry.closed_at, true)],
                    [translate(`Par`), (entry) => entry.closed_by ?? `—`],
                    [translate(`Facturé`), (entry) => formatMoney(entry.totals.invoiced), `right`],
                    [translate(`Reste à encaisser`), (entry) => formatMoney(entry.totals.outstanding), `right`],
                    [translate(`À vérifier`), (entry) => entry.totals.toVerify, `right`],
                    [translate(`Exceptions`), (entry) => entry.totals.openExceptions, `right`],
                  ]}
                />
              </Card>
            </div>
          );
        }}
      </QueryView>
    </>
  );
}
