import { useState } from "react";
import { translate, translateCount } from "../i18n/translate.ts";
import { apiRequest } from "../shared/api.ts";
import { Badge, StatusBadge } from "../shared/Badge.tsx";
import { DataTable } from "../shared/DataTable.tsx";
import { useFeedback } from "../shared/Feedback.tsx";
import { formatDate, formatMoney } from "../shared/format.ts";
import { useApi } from "../shared/hooks.ts";
import { PAYMENT_CHANNEL, RECONCILIATION_STATUS } from "../shared/labels.ts";
import { Card, CsvExportLink, PageHeader } from "../shared/Layout.tsx";
import { QueryView } from "../shared/QueryView.tsx";
import { useSession } from "../shared/session.ts";
import { StatementImport } from "./StatementImport.tsx";
import type { ReconciliationData } from "./types.ts";

/** Bank reconciliation: statement import, matching by reference and amount, fee control. */
export function Reconciliation() {
  const feedback = useFeedback();
  const { session } = useSession();
  const reconciliation = useApi<ReconciliationData>(`/api/finance/reconciliation`);
  const [filename, setFilename] = useState(``);
  const [content, setContent] = useState(``);

  const loadDemoStatement = (withAnomalies: boolean) =>
    feedback.run(async () => {
      const statement = await apiRequest<{ filename: string; content: string }>(
        `GET`,
        `/api/finance/statements/demo${withAnomalies ? `?anomalies=1` : ``}`,
      );
      setFilename(statement.filename);
      setContent(statement.content);
    });

  const readFile = async (file: File | undefined) => {
    if (file) {
      setFilename(file.name);
      setContent(await file.text());
    }
  };

  const importStatement = () =>
    feedback.run(async () => {
      const counts = await apiRequest<{ matched: number; exceptions: number; skipped: number }>(
        `POST`,
        `/api/finance/statements`,
        { filename: filename || `releve.csv`, content },
      );
      feedback.toast(
        `${translateCount(counts.matched, `{0} ligne rapprochée`, `{0} lignes rapprochées`)}, ${translate(
          `{0} en exception`,
          counts.exceptions,
        )}, ${translateCount(counts.skipped, `{0} déjà importée.`, `{0} déjà importées.`)}`,
      );
      setContent(``);
      setFilename(``);
      await reconciliation.reload();
    });

  return (
    <>
      <PageHeader
        title={translate(`Rapprochement bancaire`)}
        sub={translate(`Import du relevé, rapprochement par référence et montant, contrôle des frais.`)}
      >
        <CsvExportLink href={`/api/finance/reconciliation?format=csv`} />
      </PageHeader>
      <QueryView q={reconciliation}>
        {(data) => (
          <div className="stack">
            <StatementImport
              filename={filename}
              content={content}
              onContentChange={setContent}
              onFile={readFile}
              onDemo={session.demoMode ? loadDemoStatement : undefined}
              onImport={importStatement}
            />
            <Card title={translate(`Confirmés par le prestataire, non réglés en banque ({0})`, data.unsettled.length)} flush>
              <DataTable
                rows={data.unsettled}
                rowKey={(payment) => payment.id}
                empty={translate(`Tous les paiements confirmés sont réglés.`)}
                cols={[
                  [translate(`Confirmé`), (payment) => formatDate(payment.confirmed_at, true)],
                  [translate(`Facture`), (payment) => payment.invoice],
                  [translate(`Moyen`), (payment) => PAYMENT_CHANNEL[payment.method]],
                  [translate(`Montant`), (payment) => formatMoney(payment.amount_minor), `right`],
                  [translate(`Référence attendue sur le relevé`), (payment) => <span className="code">{payment.provider_ref}</span>],
                ]}
              />
            </Card>
            <Card title={translate(`Lignes de relevé`)} flush>
              <DataTable
                rows={data.lines}
                rowKey={(line) => line.id}
                empty={translate(`Aucun relevé importé.`)}
                cols={[
                  [translate(`Date de valeur`), (line) => line.value_date],
                  [translate(`Référence`), (line) => <span className="code">{line.reference}</span>],
                  [translate(`Libellé`), (line) => line.label],
                  [translate(`Brut`), (line) => formatMoney(line.gross_minor), `right`],
                  [
                    translate(`Frais`),
                    (line) => (
                      <>
                        {formatMoney(line.fee_minor)}
                        {/* Fee deducted by the bank differs from the provider's tariff. */}
                        {line.fee_expected_minor !== null && line.match_status === `matched` && line.fee_expected_known === 0 && (
                          <div className="small muted">{translate(`frais attendus à convenir`)}</div>
                        )}
                        {line.fee_expected_minor !== null &&
                          line.match_status === `matched` &&
                          line.fee_expected_known !== 0 &&
                          line.fee_expected_minor !== line.fee_minor && (
                            <div>
                              <Badge kind="warn">
                                {translate(`attendu`)} {formatMoney(line.fee_expected_minor)}
                              </Badge>
                            </div>
                          )}
                      </>
                    ),
                    `right`,
                  ],
                  [translate(`Net crédité`), (line) => formatMoney(line.net_minor), `right`],
                  [translate(`Rapprochement`), (line) => <StatusBadge map={RECONCILIATION_STATUS} value={line.match_status} />],
                  [translate(`Facture`), (line) => line.invoice ?? `—`],
                ]}
              />
            </Card>
            <Card title={translate(`Relevés importés`)} flush>
              <DataTable
                rows={data.statements}
                rowKey={(statement) => statement.id}
                empty={translate(`Aucun relevé importé.`)}
                cols={[
                  [translate(`Importé`), (statement) => formatDate(statement.imported_at, true)],
                  [translate(`Fichier`), (statement) => statement.filename],
                  [translate(`Par`), (statement) => statement.imported_by_name ?? `—`],
                  [translate(`Lignes`), (statement) => statement.line_count, `right`],
                  [translate(`Rapprochées`), (statement) => statement.matched_count, `right`],
                  [translate(`Déjà importées`), (statement) => statement.skipped_count, `right`],
                ]}
              />
            </Card>
          </div>
        )}
      </QueryView>
    </>
  );
}
