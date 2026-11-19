import { useState } from "react";
import {
  apiRequest,
  Badge,
  Card,
  CsvExportLink,
  formatDate,
  formatMoney,
  MATCH_STATUS,
  PageHead,
  PAYMENT_METHOD_LABELS,
  QueryView,
  StatusBadge,
  Table,
  t,
  useApi,
  useFeedback,
  useSession,
} from "../centrale/legacy.ts";
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
        t(
          `{0} ligne(s) rapprochée(s), {1} en exception, {2} déjà importée(s).`,
          counts.matched,
          counts.exceptions,
          counts.skipped,
        ),
      );
      setContent(``);
      setFilename(``);
      await reconciliation.reload();
    });

  return (
    <>
      <PageHead
        title={t(`Rapprochement bancaire`)}
        sub={t(`Import du relevé, rapprochement par référence et montant, contrôle des frais.`)}
      >
        <CsvExportLink href={`/api/finance/reconciliation?format=csv`} />
      </PageHead>
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
            <Card title={t(`Confirmés par le prestataire, non réglés en banque ({0})`, data.unsettled.length)} flush>
              <Table
                rows={data.unsettled}
                rowKey={(payment) => payment.id}
                empty={t(`Tous les paiements confirmés sont réglés.`)}
                cols={[
                  [t(`Confirmé`), (payment) => formatDate(payment.confirmed_at, true)],
                  [t(`Facture`), (payment) => payment.invoice],
                  [t(`Moyen`), (payment) => PAYMENT_METHOD_LABELS[payment.method]],
                  [t(`Montant`), (payment) => formatMoney(payment.amount_minor), `right`],
                  [t(`Référence attendue sur le relevé`), (payment) => <span className="code">{payment.provider_ref}</span>],
                ]}
              />
            </Card>
            <Card title={t(`Lignes de relevé`)} flush>
              <Table
                rows={data.lines}
                rowKey={(line) => line.id}
                empty={t(`Aucun relevé importé.`)}
                cols={[
                  [t(`Date de valeur`), (line) => line.value_date],
                  [t(`Référence`), (line) => <span className="code">{line.reference}</span>],
                  [t(`Libellé`), (line) => line.label],
                  [t(`Brut`), (line) => formatMoney(line.gross_minor), `right`],
                  [
                    t(`Frais`),
                    (line) => (
                      <>
                        {formatMoney(line.fee_minor)}
                        {/* Fee deducted by the bank differs from the provider's tariff. */}
                        {line.fee_expected_minor !== null &&
                          line.match_status === `matched` &&
                          line.fee_expected_minor !== line.fee_minor && (
                            <div>
                              <Badge kind="warn">
                                {t(`attendu`)} {formatMoney(line.fee_expected_minor)}
                              </Badge>
                            </div>
                          )}
                      </>
                    ),
                    `right`,
                  ],
                  [t(`Net crédité`), (line) => formatMoney(line.net_minor), `right`],
                  [t(`Rapprochement`), (line) => <StatusBadge map={MATCH_STATUS} value={line.match_status} />],
                  [t(`Facture`), (line) => line.invoice ?? `—`],
                ]}
              />
            </Card>
            <Card title={t(`Relevés importés`)} flush>
              <Table
                rows={data.statements}
                rowKey={(statement) => statement.id}
                empty={t(`Aucun relevé importé.`)}
                cols={[
                  [t(`Importé`), (statement) => formatDate(statement.imported_at, true)],
                  [t(`Fichier`), (statement) => statement.filename],
                  [t(`Par`), (statement) => statement.imported_by_name ?? `—`],
                  [t(`Lignes`), (statement) => statement.line_count, `right`],
                  [t(`Rapprochées`), (statement) => statement.matched_count, `right`],
                  [t(`Déjà importées`), (statement) => statement.skipped_count, `right`],
                ]}
              />
            </Card>
          </div>
        )}
      </QueryView>
    </>
  );
}
