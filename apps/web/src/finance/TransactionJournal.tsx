import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  apiRequest,
  Card,
  CONFIRMED_VIA_LABELS,
  CsvExportLink,
  formatDate,
  formatMoney,
  PageHead,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS,
  QueryView,
  SETTLEMENT_STATUS,
  StatusBadge,
  Table,
  t,
  useApi,
  useFeedback,
} from "../centrale/legacy.ts";
import type { JournalEntry } from "./types.ts";

const REFRESH_MS = 8e3;

/** Journal filters; an empty value means "all". Sent as query parameters in this order. */
interface JournalFilters {
  status: string;
  method: string;
  settlement: string;
  day: string;
}

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  /** Accessible name, also the label of the "all" option. */
  label: string;
  options: readonly (readonly [value: string, label: string])[];
}

function FilterSelect({ value, onChange, label, options }: FilterSelectProps) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label} style={{ width: `auto` }}>
      <option value="">{label}</option>
      {options.map(([optionValue, optionLabel]) => (
        <option key={optionValue} value={optionValue}>
          {optionLabel}
        </option>
      ))}
    </select>
  );
}

/** Finance home: one line per payment attempt, with provider queries and refunds. */
export function TransactionJournal() {
  const feedback = useFeedback();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<JournalFilters>({ status: ``, method: ``, settlement: ``, day: `` });
  const query = Object.entries(filters)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join(`&`);
  const journal = useApi<JournalEntry[]>(`/api/finance/journal${query ? `?${query}` : ``}`, REFRESH_MS);

  // Asks the provider for the outcome of a pending or doubtful payment.
  const checkWithProvider = (entry: JournalEntry) =>
    feedback.run(async () => {
      const result = await apiRequest<{ status: string }>(`POST`, `/api/payments/${entry.id}/check`);
      feedback.toast(t(`Réponse du prestataire appliquée : {0}.`, PAYMENT_STATUS[result.status]?.[0] ?? result.status));
      await journal.reload();
    });

  // Two steps: the amount (at most the refundable balance, checked by the server), then the reason.
  const refund = async (entry: JournalEntry) => {
    const amountMinor = await feedback.ask({
      kind: `money`,
      title: t(`Rembourser {0}`, entry.invoice),
      text: t(
        `Solde remboursable : {0}. Le remboursement est demandé au prestataire.`,
        formatMoney(entry.amount_minor - entry.refunded_minor),
      ),
      label: t(`Montant à rembourser (Rs)`),
      confirm: t(`Continuer`),
    });
    if (!amountMinor) return;
    const reason = await feedback.ask({ title: t(`Motif du remboursement`), confirm: t(`Rembourser`), danger: true });
    if (reason)
      await feedback.run(async () => {
        await apiRequest(`POST`, `/api/finance/payments/${entry.id}/refund`, { amountMinor: Number(amountMinor), reason });
        await journal.reload();
      }, t(`Remboursement enregistré.`));
  };

  const setFilter = (key: keyof JournalFilters) => (value: string) => setFilters({ ...filters, [key]: value });

  return (
    <>
      <PageHead
        title={t(`Journal des transactions`)}
        sub={t(
          `Une ligne par tentative de paiement. « Confirmé » (prestataire) et « réglé en banque » (relevé) sont suivis séparément.`,
        )}
      >
        <FilterSelect
          value={filters.status}
          onChange={setFilter(`status`)}
          label={t(`Tous les états`)}
          options={Object.entries(PAYMENT_STATUS).map(([status, [label]]) => [status, label] as const)}
        />
        <FilterSelect
          value={filters.method}
          onChange={setFilter(`method`)}
          label={t(`Tous les moyens`)}
          options={Object.entries(PAYMENT_METHOD_LABELS)}
        />
        <FilterSelect
          value={filters.settlement}
          onChange={setFilter(`settlement`)}
          label={t(`Règlement`)}
          options={[
            [`unsettled`, t(`Confirmé, non réglé`)],
            [`settled`, t(`Réglé en banque`)],
          ]}
        />
        <input
          type="date"
          value={filters.day}
          onChange={(event) => setFilters({ ...filters, day: event.target.value })}
          aria-label={t(`Jour`)}
          style={{ width: `auto` }}
        />
        <CsvExportLink href={`/api/finance/journal?format=csv${query ? `&${query}` : ``}`} />
      </PageHead>
      <Card title={t(`Transactions`)} flush>
        <QueryView q={journal}>
          {(rows) => (
            <Table
              rows={rows}
              rowKey={(entry) => entry.id}
              empty={t(`Aucune transaction pour ces critères.`)}
              onRow={(entry) => navigate(`/finance/chaine/${entry.order_id}`)}
              cols={[
                [t(`Créée`), (entry) => formatDate(entry.created_at, true)],
                [
                  t(`Facture`),
                  (entry) => (
                    <>
                      <strong>{entry.invoice}</strong>
                      <div className="small muted">{entry.customer}</div>
                    </>
                  ),
                ],
                // Agent names carry their role in parentheses: show the name only.
                [t(`Agent`), (entry) => entry.agent?.split(` (`)[0] ?? `—`],
                [t(`Moyen`), (entry) => PAYMENT_METHOD_LABELS[entry.method]],
                [
                  t(`Montant`),
                  (entry) => (
                    <>
                      {formatMoney(entry.amount_minor)}
                      {entry.refunded_minor ? (
                        <div className="small muted">
                          {t(`remboursé`)} {formatMoney(entry.refunded_minor)}
                        </div>
                      ) : null}
                    </>
                  ),
                  `right`,
                ],
                [
                  t(`Paiement`),
                  (entry) => (
                    <>
                      <StatusBadge map={PAYMENT_STATUS} value={entry.status} />
                      {entry.confirmed_via && (
                        <div className="small muted">
                          {t(`par`)} {CONFIRMED_VIA_LABELS[entry.confirmed_via]}
                        </div>
                      )}
                      {(entry.failure_reason ?? entry.verify_reason) && (
                        <div className="small muted">{t(entry.failure_reason ?? entry.verify_reason ?? ``)}</div>
                      )}
                    </>
                  ),
                ],
                [
                  t(`Règlement bancaire`),
                  (entry) =>
                    [`confirmed`, `refunded`].includes(entry.status) ? (
                      <StatusBadge map={SETTLEMENT_STATUS} value={entry.settlement_status} />
                    ) : (
                      `—`
                    ),
                ],
                [
                  t(`Frais`),
                  (entry) =>
                    entry.fee_actual_minor === null ? (
                      entry.status === `confirmed` ? (
                        <span className="muted">
                          {formatMoney(entry.fee_expected_minor)} {t(`att.`)}
                        </span>
                      ) : (
                        `—`
                      )
                    ) : (
                      formatMoney(entry.fee_actual_minor)
                    ),
                  `right`,
                ],
                [t(`Référence`), (entry) => <span className="code">{entry.provider_ref ?? `—`}</span>],
                [
                  ``,
                  (entry) => (
                    // The row opens the order chain: keep clicks on the actions from reaching it.
                    <div className="row" onClick={(event) => event.stopPropagation()}>
                      {(entry.status === `pending` || entry.status === `to_verify`) && (
                        <button className="sm" onClick={() => checkWithProvider(entry)}>
                          {t(`Interroger le prestataire`)}
                        </button>
                      )}
                      {entry.status === `confirmed` && (
                        <button className="sm danger" onClick={() => refund(entry)}>
                          {t(`Rembourser`)}
                        </button>
                      )}
                    </div>
                  ),
                ],
              ]}
            />
          )}
        </QueryView>
      </Card>
    </>
  );
}
