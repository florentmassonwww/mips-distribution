import { useState } from "react";
import { describeException } from "../centrale/labels.ts";
import type { ExceptionItem } from "../centrale/types.ts";
import { translate } from "../i18n/translate.ts";
import { apiRequest } from "../shared/api.ts";
import { Badge } from "../shared/Badge.tsx";
import { type Column, DataTable } from "../shared/DataTable.tsx";
import { useFeedback } from "../shared/Feedback.tsx";
import { formatDate } from "../shared/format.ts";
import { useApi } from "../shared/hooks.ts";
import { EXCEPTION_TYPE } from "../shared/labels.ts";
import { Card, CsvExportLink, PageHeader } from "../shared/Layout.tsx";
import { QueryView } from "../shared/QueryView.tsx";

const REFRESH_MS = 8e3;

type ExceptionStatus = "open" | "resolved";
type Resolution = "approved" | "rejected";

interface ExceptionsProps {
  /** `ops`: field incidents (head office); otherwise the finance (or club) queue. */
  domain: string;
}

/** Queue of exceptions to approve or reject, with the history of decisions. */
export function Exceptions({ domain }: ExceptionsProps) {
  const feedback = useFeedback();
  const [status, setStatus] = useState<ExceptionStatus>(`open`);
  const exceptions = useApi<ExceptionItem[]>(`/api/exceptions?domain=${domain}&status=${status}`, REFRESH_MS);
  const isOps = domain === `ops`;

  // Every decision needs a written note: it goes to the audit log.
  const resolve = async (exception: ExceptionItem, resolution: Resolution) => {
    const note = await feedback.ask({
      title: translate(resolution === `approved` ? `Valider` : `Rejeter`),
      text: describeException(exception),
      label: translate(`Décision et suite donnée`),
      confirm: translate(resolution === `approved` ? `Valider` : `Rejeter`),
      danger: resolution === `rejected`,
    });
    if (note)
      await feedback.run(async () => {
        await apiRequest(`POST`, `/api/exceptions/${exception.id}/resolve`, { resolution, note });
        await exceptions.reload();
      }, translate(`Décision enregistrée dans le journal d'audit.`));
  };

  const actionColumn: Column<ExceptionItem> = [
    ``,
    (exception) =>
      // A payment to verify is settled by the provider's answer or the bank statement, not by hand.
      exception.type === `payment_to_verify` ? (
        <span className="small muted">
          {translate(`Se lève par l'interrogation du prestataire (Journal) ou par le relevé bancaire.`)}
        </span>
      ) : (
        <div className="row">
          <button className="sm" onClick={() => resolve(exception, `approved`)}>
            {translate(`Valider`)}
          </button>
          <button className="sm danger" onClick={() => resolve(exception, `rejected`)}>
            {translate(`Rejeter`)}
          </button>
        </div>
      ),
  ];

  const resolutionLabels: Record<string, string> = {
    approved: translate(`Validée`),
    rejected: translate(`Rejetée`),
    auto: translate(`Levée automatiquement`),
  };
  const decisionColumn: Column<ExceptionItem> = [
    translate(`Décision`),
    (exception) => (
      <>
        <Badge kind={exception.resolution === `rejected` ? `err` : `ok`}>
          {resolutionLabels[exception.resolution ?? ``] ?? exception.resolution}
        </Badge>
        <div className="small muted">
          {exception.resolution_note}
          {` · `}
          {exception.resolved_by_name ?? translate(`système`)}
          {` · `}
          {formatDate(exception.resolved_at, true)}
        </div>
      </>
    ),
  ];

  return (
    <>
      <PageHeader
        title={translate(isOps ? `Incidents et ajustements` : `File d'exceptions`)}
        sub={translate(
          isOps
            ? `Livraisons partielles, refus, retours et écarts de stock à valider.`
            : `Écarts de rapprochement, paiements à vérifier et erreurs ERP.`,
        )}
      >
        <div className="tabs" style={{ margin: 0 }}>
          <button aria-selected={status === `open`} onClick={() => setStatus(`open`)}>
            {translate(`Ouvertes`)}
          </button>
          <button aria-selected={status === `resolved`} onClick={() => setStatus(`resolved`)}>
            {translate(`Traitées`)}
          </button>
        </div>
        <CsvExportLink href={`/api/exceptions?domain=${domain}&status=${status}&format=csv`} />
      </PageHeader>
      <Card title={translate(status === `open` ? `À traiter` : `Traitées`)} flush>
        <QueryView q={exceptions}>
          {(rows) => (
            <DataTable
              rows={rows}
              rowKey={(exception) => exception.id}
              empty={translate(status === `open` ? `Rien à traiter.` : `Aucune exception traitée.`)}
              cols={[
                [translate(`Créée`), (exception) => formatDate(exception.created_at, true)],
                [
                  translate(`Type`),
                  (exception) => <Badge kind="warn">{EXCEPTION_TYPE[exception.type] ?? exception.type}</Badge>,
                ],
                [translate(`Description`), (exception) => describeException(exception)],
                status === `open` ? actionColumn : decisionColumn,
              ]}
            />
          )}
        </QueryView>
      </Card>
    </>
  );
}
