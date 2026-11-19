// Member payments (/club/encaissements): online payments, identified transfers and cash, filtered
// by status and method. "Confirmed" and "settled in the bank" are tracked separately.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  api,
  Card,
  CsvLink,
  formatDate,
  formatMoney,
  Loaded,
  PageHead,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS,
  Table,
  t,
  useApi,
  useUi,
} from "./legacy.ts";
import { canQueryProvider, filtersQuery, MemberCell, PaymentStatusCell, SettlementCell } from "./parts.tsx";
import type { MemberPaymentListItem } from "./types.ts";

type PaymentFilters = { status: string; method: string };

const FILTERABLE_STATUSES = ["pending", "to_verify", "confirmed", "failed"];

export function MemberPayments() {
  const ui = useUi();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<PaymentFilters>({ status: "", method: "" });
  const query = filtersQuery(filters);
  const payments = useApi<MemberPaymentListItem[]>(`/api/club/payments${query ? `?${query}` : ""}`, 8000);

  const queryProvider = (paymentId: string) =>
    ui.run(async () => {
      const payment = await api<{ status: string }>("POST", `/api/club/payments/${paymentId}/check`);
      ui.toast(t("Réponse du prestataire appliquée : {0}.", PAYMENT_STATUS[payment.status]?.[0] ?? payment.status));
      await payments.reload();
    });

  return (
    <>
      <PageHead
        title={t("Encaissements")}
        sub={t(
          "Paiements en ligne, virements identifiés sur le relevé, espèces au bureau. « Confirmé » et « réglé en banque » sont suivis séparément.",
        )}
      >
        <select
          value={filters.status}
          onChange={(event) => setFilters({ ...filters, status: event.target.value })}
          aria-label={t("État")}
          style={{ width: "auto" }}
        >
          <option value="">{t("Tous les états")}</option>
          {FILTERABLE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {PAYMENT_STATUS[status]?.[0]}
            </option>
          ))}
        </select>
        <select
          value={filters.method}
          onChange={(event) => setFilters({ ...filters, method: event.target.value })}
          aria-label={t("Moyen")}
          style={{ width: "auto" }}
        >
          <option value="">{t("Tous les moyens")}</option>
          {Object.entries(PAYMENT_METHOD_LABELS).map(([method, label]) => (
            <option key={method} value={method}>
              {label}
            </option>
          ))}
        </select>
        <CsvLink href={`/api/club/payments?format=csv${query ? `&${query}` : ""}`} />
      </PageHead>
      <Card title={t("Encaissements des membres")} flush>
        <Loaded q={payments}>
          {(rows) => (
            <Table
              rows={rows}
              rowKey={(payment) => payment.id}
              empty={t("Aucun encaissement pour ces critères.")}
              onRow={(payment) => navigate(`/club/membres/${payment.member_id}`)}
              cols={[
                [t("Date"), (payment) => formatDate(payment.created_at, true)],
                [t("Membre"), (payment) => <MemberCell name={payment.member} number={payment.member_number} />],
                [t("Moyen"), (payment) => PAYMENT_METHOD_LABELS[payment.method]],
                [t("Montant"), (payment) => formatMoney(payment.amount_minor), "right"],
                [
                  t("Paiement"),
                  (payment) => (
                    <PaymentStatusCell
                      status={payment.status}
                      confirmedVia={payment.confirmed_via}
                      verifyReason={payment.verify_reason}
                      failureReason={payment.failure_reason}
                    />
                  ),
                ],
                [
                  t("Règlement bancaire"),
                  (payment) => (
                    <SettlementCell status={payment.status} method={payment.method} settlement={payment.settlement_status} />
                  ),
                ],
                [
                  t("Frais"),
                  (payment) => (payment.fee_actual_minor === null ? "—" : formatMoney(payment.fee_actual_minor)),
                  "right",
                ],
                [t("Référence"), (payment) => <span className="code nb">{payment.provider_ref ?? payment.reference}</span>],
                [
                  "",
                  (payment) =>
                    canQueryProvider(payment) ? (
                      // The row opens the member: the button must not.
                      <span onClick={(event) => event.stopPropagation()}>
                        <button className="sm" onClick={() => queryProvider(payment.id)}>
                          {t("Interroger le prestataire")}
                        </button>
                      </span>
                    ) : null,
                ],
              ]}
            />
          )}
        </Loaded>
      </Card>
    </>
  );
}
