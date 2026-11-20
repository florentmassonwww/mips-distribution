import { translate, translateCount } from "../i18n/translate.ts";
import { apiRequest } from "../shared/api.ts";
import { StatusBadge } from "../shared/Badge.tsx";
import { DataTable } from "../shared/DataTable.tsx";
import { useFeedback } from "../shared/Feedback.tsx";
import { formatDate, formatMoney } from "../shared/format.ts";
import { useApi } from "../shared/hooks.ts";
import { ERP_SYNC_STATUS } from "../shared/labels.ts";
import { Card, CsvExportLink, PageHeader, Tile } from "../shared/Layout.tsx";
import { QueryView } from "../shared/QueryView.tsx";
import type { AccountingEntriesData } from "./types.ts";

const REFRESH_MS = 8e3;

/** Entry kind → label (distribution and club entries: this screen serves both). */
const ENTRY_KIND_LABELS: Record<string, string> = {
  invoice: translate(`Facture`),
  payment: translate(`Encaissement`),
  settlement: translate(`Règlement bancaire`),
  refund: translate(`Remboursement`),
  member_charge: translate(`Dû membre`),
  member_payment: translate(`Encaissement membre`),
};

/** Entries sent to the accounting software (ERP); failed ones stay queued until retried. */
export function AccountingEntries() {
  const feedback = useFeedback();
  const accounting = useApi<AccountingEntriesData>(`/api/finance/erp`, REFRESH_MS);

  // Without ids: sends every pending entry and retries every failed one.
  const sync = (ids?: string[]) =>
    feedback.run(async () => {
      const result = await apiRequest<{ synced: number; failed: number }>(`POST`, `/api/finance/erp/sync`, ids ? { ids } : {});
      feedback.toast(
        `${translateCount(result.synced, `{0} écriture synchronisée`, `{0} écritures synchronisées`)}, ${translate(`{0} en erreur.`, result.failed)}`,
        result.failed ? `err` : `ok`,
      );
      await accounting.reload();
    });

  return (
    <>
      <PageHeader
        title={translate(`Synchronisation ERP`)}
        sub={translate(
          `Une écriture par facture, encaissement, règlement et remboursement. Les erreurs restent dans la file jusqu'à leur reprise.`,
        )}
      >
        <CsvExportLink href={`/api/finance/erp?format=csv`} />
      </PageHeader>
      <QueryView q={accounting}>
        {(data) => {
          const countWithStatus = (status: string) => data.entries.filter((entry) => entry.status === status).length;
          return (
            <div className="stack">
              {data.settings.simulateFailure && (
                <div className="notice warn">
                  {translate(`Panne ERP simulée (Administration › Paramètres) : chaque envoi échoue tant qu'elle est active.`)}
                </div>
              )}
              <div className="grid g4">
                <Tile
                  label={translate(`Connecteur`)}
                  value={translate(data.settings.system)}
                  hint={data.settings.autoSync ? translate(`synchronisation automatique`) : translate(`synchronisation manuelle`)}
                />
                <Tile label={translate(`Synchronisées`)} value={countWithStatus(`synced`)} />
                <Tile
                  label={translate(`En attente`)}
                  value={countWithStatus(`pending`)}
                  kind={countWithStatus(`pending`) ? `info` : ``}
                />
                <Tile label={translate(`En erreur`)} value={countWithStatus(`failed`)} kind={countWithStatus(`failed`) ? `warn` : ``} />
              </div>
              <div>
                <button disabled={countWithStatus(`pending`) + countWithStatus(`failed`) === 0} onClick={() => sync()}>
                  {translate(`Synchroniser et reprendre les erreurs`)}
                </button>
              </div>
              <Card title={translate(`Écritures`)} flush>
                <DataTable
                  rows={data.entries}
                  rowKey={(entry) => entry.id}
                  empty={translate(`Aucune écriture.`)}
                  cols={[
                    [translate(`Créée`), (entry) => formatDate(entry.created_at, true)],
                    [translate(`Type`), (entry) => ENTRY_KIND_LABELS[entry.kind] ?? entry.kind],
                    [translate(`Libellé`), (entry) => entry.label],
                    [translate(`Montant`), (entry) => formatMoney(entry.amount_minor), `right`],
                    [
                      translate(`État`),
                      (entry) => (
                        <>
                          <StatusBadge map={ERP_SYNC_STATUS} value={entry.status} />
                          {entry.last_error && <div className="small muted">{translate(entry.last_error)}</div>}
                        </>
                      ),
                    ],
                    [translate(`Tentatives`), (entry) => entry.attempts, `right`],
                    [
                      translate(`Référence ERP`),
                      (entry) => (entry.external_ref ? <span className="code">{entry.external_ref}</span> : `—`),
                    ],
                    [
                      ``,
                      (entry) =>
                        entry.status === `synced` ? null : (
                          <button className="sm secondary" onClick={() => sync([entry.id])}>
                            {entry.status === `failed` ? translate(`Reprendre`) : translate(`Envoyer`)}
                          </button>
                        ),
                    ],
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
