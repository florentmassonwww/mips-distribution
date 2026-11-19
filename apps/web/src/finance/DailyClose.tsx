import { useState } from "react";
import {
  apiRequest,
  Card,
  CsvExportLink,
  formatDate,
  formatDay,
  formatMoney,
  PageHead,
  PAYMENT_METHOD_LABELS,
  QueryView,
  Table,
  Tile,
  t,
  useApi,
  useFeedback,
  useSession,
} from "../centrale/legacy.ts";
import type { DailyCloseData } from "./types.ts";

type ClosePreview = DailyCloseData["preview"];

/** Banner above the totals: closed, blocked by pending payments, or open. */
function CloseStatus({ preview }: { preview: ClosePreview }) {
  const outstandingPoints = preview.toVerify + preview.openExceptions + preview.erpPending;
  if (preview.closed)
    return (
      <div className="notice ok">
        {t(`Journée clôturée le`)} {formatDate(preview.closed.closed_at, true)} {t(`par`)} {preview.closed.closed_by ?? `—`}.
      </div>
    );
  // A pending payment has no known outcome yet: the day cannot be frozen.
  if (preview.pending > 0)
    return (
      <div className="notice err" role="alert">
        <strong>{t(`Clôture bloquée :`)}</strong> {preview.pending}{" "}
        {t(`paiement(s) encore « en attente ». Interrogez le prestataire depuis le Journal pour connaître leur issue.`)}
      </div>
    );
  return (
    <div className="notice">
      {t(`Journée ouverte.`)}{" "}
      {outstandingPoints > 0
        ? t(`Des points restent à traiter ; ils seront consignés dans la clôture.`)
        : t(`Aucun point en suspens.`)}
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
      title: t(`Clôturer le {0} ?`, formatDay(day)),
      text: t(`La clôture fige les totaux de la journée. Elle ne peut pas être refaite.`),
      confirm: t(`Clôturer la journée`),
    });
    if (confirmed)
      await feedback.run(async () => {
        await apiRequest(`POST`, `/api/finance/close`, { day });
        await close.reload();
      }, t(`Journée clôturée.`));
  };

  return (
    <>
      <PageHead
        title={t(`Clôture quotidienne`)}
        sub={t(`Contrôle des encaissements du jour avant de figer les totaux.`)}
      >
        <input
          type="date"
          value={day}
          max={session.today}
          onChange={(event) => setDay(event.target.value)}
          aria-label={t(`Journée`)}
          style={{ width: `auto` }}
        />
        <CsvExportLink href={`/api/finance/close?format=csv`} />
      </PageHead>
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
                  label={t(`Facturé`)}
                  value={formatMoney(preview.invoiced)}
                  hint={t(`reste à encaisser : {0}`, formatMoney(preview.outstanding))}
                />
                <Tile
                  label={t(`Encaissé confirmé`)}
                  value={formatMoney(confirmed)}
                  hint={t(`{0} tentative(s) échouée(s)`, preview.failed)}
                />
                <Tile
                  label={t(`Réglé en banque`)}
                  value={formatMoney(settled)}
                  hint={t(`à recevoir : {0}`, formatMoney(confirmed - settled))}
                />
                <Tile
                  label={t(`Points en suspens`)}
                  value={outstandingPoints}
                  kind={outstandingPoints ? `warn` : ``}
                  hint={t(
                    `{0} à vérifier · {1} exception(s) · {2} écriture(s) ERP`,
                    preview.toVerify,
                    preview.openExceptions,
                    preview.erpPending,
                  )}
                />
              </div>
              <Card title={t(`Encaissements confirmés du {0}`, formatDay(preview.day))} flush>
                <Table
                  rows={preview.byMethod}
                  rowKey={(row) => row.method}
                  empty={t(`Aucun encaissement confirmé ce jour.`)}
                  cols={[
                    [t(`Moyen`), (row) => PAYMENT_METHOD_LABELS[row.method]],
                    [t(`Nombre`), (row) => row.count, `right`],
                    [t(`Confirmé`), (row) => formatMoney(row.confirmed_minor), `right`],
                    [t(`Remboursé`), (row) => formatMoney(row.refunded_minor), `right`],
                    [t(`Frais attendus`), (row) => formatMoney(row.fee_expected_minor), `right`],
                    [t(`Réglé en banque`), (row) => formatMoney(row.settled_minor), `right`],
                    [t(`Frais prélevés`), (row) => formatMoney(row.fee_actual_minor), `right`],
                  ]}
                />
              </Card>
              {!preview.closed && (
                <div>
                  <button disabled={preview.pending > 0} onClick={closeDay}>
                    {t(`Clôturer la journée`)}
                  </button>
                </div>
              )}
              <Card title={t(`Journées clôturées`)} flush>
                <Table
                  rows={closes}
                  rowKey={(entry) => entry.day}
                  empty={t(`Aucune journée clôturée.`)}
                  onRow={(entry) => setDay(entry.day)}
                  cols={[
                    [t(`Journée`), (entry) => formatDay(entry.day)],
                    [t(`Clôturée`), (entry) => formatDate(entry.closed_at, true)],
                    [t(`Par`), (entry) => entry.closed_by ?? `—`],
                    [t(`Facturé`), (entry) => formatMoney(entry.totals.invoiced), `right`],
                    [t(`Reste à encaisser`), (entry) => formatMoney(entry.totals.outstanding), `right`],
                    [t(`À vérifier`), (entry) => entry.totals.toVerify, `right`],
                    [t(`Exceptions`), (entry) => entry.totals.openExceptions, `right`],
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
