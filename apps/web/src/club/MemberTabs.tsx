// Tabs of the member detail: dues, account statement, payments, reminders, gate passages.
import { describeGateDecision } from "../admin/clubLabels.ts";
import { translate } from "../i18n/translate.ts";
import { Badge, StatusBadge } from "../shared/Badge.tsx";
import { DataTable } from "../shared/DataTable.tsx";
import { formatDate, formatMoney } from "../shared/format.ts";
import {
  ACCESS_DECISION,
  CLUB_OUTLET,
  MEMBER_CHARGE_KIND,
  MEMBER_CHARGE_STATUS,
  MEMBER_PAYMENT_METHOD,
} from "../shared/labels.ts";
import { Card } from "../shared/Layout.tsx";
import { canQueryProvider, channelLabel, PaymentStatusCell, ReminderLevelBadge, SettlementCell } from "./parts.tsx";
import type { MemberCharge, MemberDetailData } from "./types.ts";

export type MemberTab = "dues" | "statement" | "payments" | "reminders" | "gate";

interface MemberTabsProps {
  data: MemberDetailData;
  tab: MemberTab;
  onTab: (tab: MemberTab) => void;
  /** Accounting may cancel a charge that is not cancelled yet. */
  canCancel: boolean;
  onCancelCharge: (charge: MemberCharge) => void;
  onQueryProvider: (paymentId: string) => void;
}

export function MemberTabs({ data, tab, onTab, canCancel, onCancelCharge, onQueryProvider }: MemberTabsProps) {
  const tabs: [MemberTab, string][] = [
    ["dues", translate("Dus")],
    ["statement", translate("Relevé")],
    ["payments", translate("Encaissements")],
    ["reminders", translate("Relances")],
    ["gate", translate("Barrière")],
  ];
  return (
    <>
      <div className="tabs" role="tablist">
        {tabs.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} onClick={() => onTab(key)}>
            {label}
          </button>
        ))}
      </div>
      {tab === "dues" && (
        <Card title={translate("Cotisations, consommations et frais")} flush>
          <DataTable
            rows={data.charges}
            rowKey={(charge) => charge.id}
            empty={translate("Aucun dû.")}
            cols={[
              [translate("Pièce"), (charge) => <span className="code nb">{charge.number}</span>],
              [
                translate("Nature"),
                (charge) => (
                  <>
                    {MEMBER_CHARGE_KIND[charge.kind]}
                    {charge.outlet && <div className="small muted">{CLUB_OUTLET[charge.outlet]}</div>}
                  </>
                ),
              ],
              [translate("Libellé"), (charge) => translate(charge.label)],
              [
                translate("Date d'échéance"),
                (charge) => (
                  <>
                    {formatDate(charge.due_date)}
                    {charge.overdue && (
                      <div>
                        <Badge kind="err">{translate("en retard")}</Badge>
                      </div>
                    )}
                  </>
                ),
              ],
              [translate("Montant"), (charge) => formatMoney(charge.amount_minor), "right"],
              [translate("Reste dû"), (charge) => formatMoney(charge.remaining_minor), "right"],
              [
                translate("État"),
                (charge) => (
                  <>
                    <StatusBadge map={MEMBER_CHARGE_STATUS} value={charge.status} />
                    {charge.cancel_reason && <div className="small muted">{charge.cancel_reason}</div>}
                  </>
                ),
              ],
              [
                "",
                (charge) =>
                  canCancel && charge.status !== "cancelled" ? (
                    <button className="sm danger" onClick={() => onCancelCharge(charge)}>
                      {translate("Annuler")}
                    </button>
                  ) : null,
              ],
            ]}
          />
        </Card>
      )}
      {tab === "statement" && (
        <Card title={translate("Relevé de compte")} flush>
          <DataTable
            rows={data.statement}
            rowKey={(line) => `${line.at}${line.ref}`}
            empty={translate("Aucun mouvement.")}
            cols={[
              [translate("Date"), (line) => formatDate(line.at)],
              [translate("Pièce"), (line) => <span className="code nb">{line.ref}</span>],
              [translate("Libellé"), (line) => translate(line.label)],
              [translate("Débit"), (line) => (line.debit ? formatMoney(line.debit) : ""), "right"],
              [translate("Crédit"), (line) => (line.credit ? formatMoney(line.credit) : ""), "right"],
              [translate("Solde"), (line) => formatMoney(line.balance), "right"],
            ]}
          />
        </Card>
      )}
      {tab === "payments" && (
        <Card title={translate("Encaissements")} flush>
          <DataTable
            rows={data.payments}
            rowKey={(payment) => payment.id}
            empty={translate("Aucun encaissement.")}
            cols={[
              [translate("Date"), (payment) => formatDate(payment.created_at, true)],
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
              [translate("Référence"), (payment) => <span className="code nb">{payment.provider_ref ?? "—"}</span>],
              [
                "",
                (payment) =>
                  canQueryProvider(payment) ? (
                    <button className="sm" onClick={() => onQueryProvider(payment.id)}>
                      {translate("Interroger le prestataire")}
                    </button>
                  ) : null,
              ],
            ]}
          />
        </Card>
      )}
      {tab === "reminders" && (
        <Card title={translate("Relances et relevés envoyés")} flush>
          <DataTable
            rows={data.reminders}
            rowKey={(reminder) => reminder.id}
            empty={translate("Aucune relance.")}
            cols={[
              [translate("Envoyée"), (reminder) => formatDate(reminder.sent_at, true)],
              [translate("Niveau"), (reminder) => <ReminderLevelBadge level={reminder.level} />],
              [translate("Canal"), (reminder) => channelLabel(reminder.channel)],
              [translate("Montant dû"), (reminder) => formatMoney(reminder.amount_minor), "right"],
              [translate("Message"), (reminder) => <span className="small">{reminder.message}</span>],
            ]}
          />
        </Card>
      )}
      {tab === "gate" && (
        <Card title={translate("Passages à la barrière")} flush>
          <DataTable
            rows={data.gateEvents}
            rowKey={(event) => event.id}
            empty={translate("Aucun passage enregistré.")}
            cols={[
              [translate("Date"), (event) => formatDate(event.at, true)],
              [translate("Décision"), (event) => <StatusBadge map={ACCESS_DECISION} value={event.decision} />],
              [translate("Motif"), (event) => describeGateDecision(event)],
              [translate("Contrôle"), (event) => (event.source === "reader" ? translate("lecteur") : translate("accueil"))],
            ]}
          />
        </Card>
      )}
    </>
  );
}
