// Member payments (/club/encaissements): online payments, identified transfers and cash, filtered
// by status and method. "Confirmed" and "settled in the bank" are tracked separately.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { translate } from "../i18n/translate.ts";
import { apiRequest } from "../shared/api.ts";
import { DataTable } from "../shared/DataTable.tsx";
import { useFeedback } from "../shared/Feedback.tsx";
import { formatDate, formatMoney } from "../shared/format.ts";
import { useApi } from "../shared/hooks.ts";
import { MEMBER_PAYMENT_METHOD, PAYMENT_STATUS } from "../shared/labels.ts";
import { Card, CsvExportLink, PageHeader } from "../shared/Layout.tsx";
import { QueryView } from "../shared/QueryView.tsx";
import { canQueryProvider, filtersQuery, MemberCell, PaymentStatusCell, SettlementCell } from "./parts.tsx";
import type { MemberPaymentListItem } from "./types.ts";

type PaymentFilters = { status: string; method: string };

const FILTERABLE_STATUSES = ["pending", "to_verify", "confirmed", "failed"];

export function MemberPayments() {
  const ui = useFeedback();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<PaymentFilters>({ status: "", method: "" });
  const query = filtersQuery(filters);
  const payments = useApi<MemberPaymentListItem[]>(`/api/club/payments${query ? `?${query}` : ""}`, 8000);

  const queryProvider = (paymentId: string) =>
    ui.run(async () => {
      const payment = await apiRequest<{ status: string }>("POST", `/api/club/payments/${paymentId}/check`);
      ui.toast(translate("Réponse du prestataire appliquée : {0}.", PAYMENT_STATUS[payment.status]?.[0] ?? payment.status));
      await payments.reload();
    });

  return (
    <>
      <PageHeader
        title={translate("Encaissements")}
        sub={translate(
          "Paiements en ligne, virements identifiés sur le relevé, espèces au bureau. « Confirmé » et « réglé en banque » sont suivis séparément.",
        )}
      >
        <select
          value={filters.status}
          onChange={(event) => setFilters({ ...filters, status: event.target.value })}
          aria-label={translate("État")}
          style={{ width: "auto" }}
        >
          <option value="">{translate("Tous les états")}</option>
          {FILTERABLE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {PAYMENT_STATUS[status]?.[0]}
            </option>
          ))}
        </select>
        <select
          value={filters.method}
          onChange={(event) => setFilters({ ...filters, method: event.target.value })}
          aria-label={translate("Moyen")}
          style={{ width: "auto" }}
        >
          <option value="">{translate("Tous les moyens")}</option>
          {Object.entries(MEMBER_PAYMENT_METHOD).map(([method, label]) => (
            <option key={method} value={method}>
              {label}
            </option>
          ))}
        </select>
        <CsvExportLink href={`/api/club/payments?format=csv${query ? `&${query}` : ""}`} />
      </PageHeader>
      <Card title={translate("Encaissements des membres")} flush>
        <QueryView q={payments}>
          {(rows) => (
            <DataTable
              rows={rows}
              rowKey={(payment) => payment.id}
              empty={translate("Aucun encaissement pour ces critères.")}
              onRow={(payment) => navigate(`/club/membres/${payment.member_id}`)}
              cols={[
                [translate("Date"), (payment) => formatDate(payment.created_at, true)],
                [translate("Membre"), (payment) => <MemberCell name={payment.member} number={payment.member_number} />],
                [translate("Moyen"), (payment) => MEMBER_PAYMENT_METHOD[payment.method]],
                [translate("Montant"), (payment) => formatMoney(payment.amount_minor), "right"],
                [
                  translate("Paiement"),
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
                  translate("Règlement bancaire"),
                  (payment) => (
                    <SettlementCell status={payment.status} method={payment.method} settlement={payment.settlement_status} />
                  ),
                ],
                [
                  translate("Frais"),
                  (payment) => (payment.fee_actual_minor === null ? "—" : formatMoney(payment.fee_actual_minor)),
                  "right",
                ],
                [translate("Référence"), (payment) => <span className="code nb">{payment.provider_ref ?? payment.reference}</span>],
                [
                  "",
                  (payment) =>
                    canQueryProvider(payment) ? (
                      // The row opens the member: the button must not.
                      <span onClick={(event) => event.stopPropagation()}>
                        <button className="sm" onClick={() => queryProvider(payment.id)}>
                          {translate("Interroger le prestataire")}
                        </button>
                      </span>
                    ) : null,
                ],
              ]}
            />
          )}
        </QueryView>
      </Card>
    </>
  );
}
