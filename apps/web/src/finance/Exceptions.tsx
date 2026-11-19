import { useState } from "react";
import { describeException } from "../centrale/labels.ts";
import {
  apiRequest,
  Badge,
  Card,
  type Column,
  CsvExportLink,
  EXCEPTION_TYPE_LABELS,
  formatDate,
  PageHead,
  QueryView,
  Table,
  t,
  useApi,
  useFeedback,
} from "../centrale/legacy.ts";
import type { ExceptionItem } from "../centrale/types.ts";

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
      title: t(resolution === `approved` ? `Valider` : `Rejeter`),
      text: describeException(exception),
      label: t(`Décision et suite donnée`),
      confirm: t(resolution === `approved` ? `Valider` : `Rejeter`),
      danger: resolution === `rejected`,
    });
    if (note)
      await feedback.run(async () => {
        await apiRequest(`POST`, `/api/exceptions/${exception.id}/resolve`, { resolution, note });
        await exceptions.reload();
      }, t(`Décision enregistrée dans le journal d'audit.`));
  };

  const actionColumn: Column<ExceptionItem> = [
    ``,
    (exception) =>
      // A payment to verify is settled by the provider's answer or the bank statement, not by hand.
      exception.type === `payment_to_verify` ? (
        <span className="small muted">
          {t(`Se lève par l'interrogation du prestataire (Journal) ou par le relevé bancaire.`)}
        </span>
      ) : (
        <div className="row">
          <button className="sm" onClick={() => resolve(exception, `approved`)}>
            {t(`Valider`)}
          </button>
          <button className="sm danger" onClick={() => resolve(exception, `rejected`)}>
            {t(`Rejeter`)}
          </button>
        </div>
      ),
  ];

  const resolutionLabels: Record<string, string> = {
    approved: t(`Validée`),
    rejected: t(`Rejetée`),
    auto: t(`Levée automatiquement`),
  };
  const decisionColumn: Column<ExceptionItem> = [
    t(`Décision`),
    (exception) => (
      <>
        <Badge kind={exception.resolution === `rejected` ? `err` : `ok`}>
          {resolutionLabels[exception.resolution ?? ``] ?? exception.resolution}
        </Badge>
        <div className="small muted">
          {exception.resolution_note}
          {` · `}
          {exception.resolved_by_name ?? t(`système`)}
          {` · `}
          {formatDate(exception.resolved_at, true)}
        </div>
      </>
    ),
  ];

  return (
    <>
      <PageHead
        title={t(isOps ? `Incidents et ajustements` : `File d'exceptions`)}
        sub={t(
          isOps
            ? `Livraisons partielles, refus, retours et écarts de stock à valider.`
            : `Écarts de rapprochement, paiements à vérifier et erreurs ERP.`,
        )}
      >
        <div className="tabs" style={{ margin: 0 }}>
          <button aria-selected={status === `open`} onClick={() => setStatus(`open`)}>
            {t(`Ouvertes`)}
          </button>
          <button aria-selected={status === `resolved`} onClick={() => setStatus(`resolved`)}>
            {t(`Traitées`)}
          </button>
        </div>
        <CsvExportLink href={`/api/exceptions?domain=${domain}&status=${status}&format=csv`} />
      </PageHead>
      <Card title={t(status === `open` ? `À traiter` : `Traitées`)} flush>
        <QueryView q={exceptions}>
          {(rows) => (
            <Table
              rows={rows}
              rowKey={(exception) => exception.id}
              empty={t(status === `open` ? `Rien à traiter.` : `Aucune exception traitée.`)}
              cols={[
                [t(`Créée`), (exception) => formatDate(exception.created_at, true)],
                [
                  t(`Type`),
                  (exception) => <Badge kind="warn">{EXCEPTION_TYPE_LABELS[exception.type] ?? exception.type}</Badge>,
                ],
                [t(`Description`), (exception) => describeException(exception)],
                status === `open` ? actionColumn : decisionColumn,
              ]}
            />
          )}
        </QueryView>
      </Card>
    </>
  );
}
