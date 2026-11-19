import {
  apiRequest,
  Card,
  CsvExportLink,
  ERP_STATUS,
  formatDate,
  formatMoney,
  PageHead,
  QueryView,
  StatusBadge,
  Table,
  Tile,
  t,
  useApi,
  useFeedback,
} from "../centrale/legacy.ts";
import type { AccountingEntriesData } from "./types.ts";

const REFRESH_MS = 8e3;

/** Entry kind → label (distribution and club entries: this screen serves both). */
const ENTRY_KIND_LABELS: Record<string, string> = {
  invoice: t(`Facture`),
  payment: t(`Encaissement`),
  settlement: t(`Règlement bancaire`),
  refund: t(`Remboursement`),
  member_charge: t(`Dû membre`),
  member_payment: t(`Encaissement membre`),
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
        t(`{0} écriture(s) synchronisée(s), {1} en erreur.`, result.synced, result.failed),
        result.failed ? `err` : `ok`,
      );
      await accounting.reload();
    });

  return (
    <>
      <PageHead
        title={t(`Synchronisation ERP`)}
        sub={t(
          `Une écriture par facture, encaissement, règlement et remboursement. Les erreurs restent dans la file jusqu'à leur reprise.`,
        )}
      >
        <CsvExportLink href={`/api/finance/erp?format=csv`} />
      </PageHead>
      <QueryView q={accounting}>
        {(data) => {
          const countWithStatus = (status: string) => data.entries.filter((entry) => entry.status === status).length;
          return (
            <div className="stack">
              {data.settings.simulateFailure && (
                <div className="notice warn">
                  {t(`Panne ERP simulée (Administration › Paramètres) : chaque envoi échoue tant qu'elle est active.`)}
                </div>
              )}
              <div className="grid g4">
                <Tile
                  label={t(`Connecteur`)}
                  value={t(data.settings.system)}
                  hint={data.settings.autoSync ? t(`synchronisation automatique`) : t(`synchronisation manuelle`)}
                />
                <Tile label={t(`Synchronisées`)} value={countWithStatus(`synced`)} />
                <Tile
                  label={t(`En attente`)}
                  value={countWithStatus(`pending`)}
                  kind={countWithStatus(`pending`) ? `info` : ``}
                />
                <Tile label={t(`En erreur`)} value={countWithStatus(`failed`)} kind={countWithStatus(`failed`) ? `warn` : ``} />
              </div>
              <div>
                <button disabled={countWithStatus(`pending`) + countWithStatus(`failed`) === 0} onClick={() => sync()}>
                  {t(`Synchroniser et reprendre les erreurs`)}
                </button>
              </div>
              <Card title={t(`Écritures`)} flush>
                <Table
                  rows={data.entries}
                  rowKey={(entry) => entry.id}
                  empty={t(`Aucune écriture.`)}
                  cols={[
                    [t(`Créée`), (entry) => formatDate(entry.created_at, true)],
                    [t(`Type`), (entry) => ENTRY_KIND_LABELS[entry.kind] ?? entry.kind],
                    [t(`Libellé`), (entry) => entry.label],
                    [t(`Montant`), (entry) => formatMoney(entry.amount_minor), `right`],
                    [
                      t(`État`),
                      (entry) => (
                        <>
                          <StatusBadge map={ERP_STATUS} value={entry.status} />
                          {entry.last_error && <div className="small muted">{t(entry.last_error)}</div>}
                        </>
                      ),
                    ],
                    [t(`Tentatives`), (entry) => entry.attempts, `right`],
                    [
                      t(`Référence ERP`),
                      (entry) => (entry.external_ref ? <span className="code">{entry.external_ref}</span> : `—`),
                    ],
                    [
                      ``,
                      (entry) =>
                        entry.status === `synced` ? null : (
                          <button className="sm secondary" onClick={() => sync([entry.id])}>
                            {entry.status === `failed` ? t(`Reprendre`) : t(`Envoyer`)}
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
