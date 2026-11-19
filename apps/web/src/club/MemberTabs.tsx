// Tabs of the member detail: dues, account statement, payments, reminders, gate passages.
import {
  Badge,
  Card,
  CHARGE_KIND_LABELS,
  CHARGE_STATUS,
  formatDate,
  formatMoney,
  GATE_DECISION,
  gateReason,
  OUTLET_LABELS,
  PAYMENT_METHOD_LABELS,
  StatusBadge,
  Table,
  t,
} from "./legacy.ts";
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
    ["dues", t("Dus")],
    ["statement", t("Relevé")],
    ["payments", t("Encaissements")],
    ["reminders", t("Relances")],
    ["gate", t("Barrière")],
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
        <Card title={t("Cotisations, consommations et frais")} flush>
          <Table
            rows={data.charges}
            rowKey={(charge) => charge.id}
            empty={t("Aucun dû.")}
            cols={[
              [t("Pièce"), (charge) => <span className="code nb">{charge.number}</span>],
              [
                t("Nature"),
                (charge) => (
                  <>
                    {CHARGE_KIND_LABELS[charge.kind]}
                    {charge.outlet && <div className="small muted">{OUTLET_LABELS[charge.outlet]}</div>}
                  </>
                ),
              ],
              [t("Libellé"), (charge) => t(charge.label)],
              [
                t("Date d'échéance"),
                (charge) => (
                  <>
                    {formatDate(charge.due_date)}
                    {charge.overdue && (
                      <div>
                        <Badge kind="err">{t("en retard")}</Badge>
                      </div>
                    )}
                  </>
                ),
              ],
              [t("Montant"), (charge) => formatMoney(charge.amount_minor), "right"],
              [t("Reste dû"), (charge) => formatMoney(charge.remaining_minor), "right"],
              [
                t("État"),
                (charge) => (
                  <>
                    <StatusBadge map={CHARGE_STATUS} value={charge.status} />
                    {charge.cancel_reason && <div className="small muted">{charge.cancel_reason}</div>}
                  </>
                ),
              ],
              [
                "",
                (charge) =>
                  canCancel && charge.status !== "cancelled" ? (
                    <button className="sm danger" onClick={() => onCancelCharge(charge)}>
                      {t("Annuler")}
                    </button>
                  ) : null,
              ],
            ]}
          />
        </Card>
      )}
      {tab === "statement" && (
        <Card title={t("Relevé de compte")} flush>
          <Table
            rows={data.statement}
            rowKey={(line) => `${line.at}${line.ref}`}
            empty={t("Aucun mouvement.")}
            cols={[
              [t("Date"), (line) => formatDate(line.at)],
              [t("Pièce"), (line) => <span className="code nb">{line.ref}</span>],
              [t("Libellé"), (line) => t(line.label)],
              [t("Débit"), (line) => (line.debit ? formatMoney(line.debit) : ""), "right"],
              [t("Crédit"), (line) => (line.credit ? formatMoney(line.credit) : ""), "right"],
              [t("Solde"), (line) => formatMoney(line.balance), "right"],
            ]}
          />
        </Card>
      )}
      {tab === "payments" && (
        <Card title={t("Encaissements")} flush>
          <Table
            rows={data.payments}
            rowKey={(payment) => payment.id}
            empty={t("Aucun encaissement.")}
            cols={[
              [t("Date"), (payment) => formatDate(payment.created_at, true)],
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
              [t("Référence"), (payment) => <span className="code nb">{payment.provider_ref ?? "—"}</span>],
              [
                "",
                (payment) =>
                  canQueryProvider(payment) ? (
                    <button className="sm" onClick={() => onQueryProvider(payment.id)}>
                      {t("Interroger le prestataire")}
                    </button>
                  ) : null,
              ],
            ]}
          />
        </Card>
      )}
      {tab === "reminders" && (
        <Card title={t("Relances et relevés envoyés")} flush>
          <Table
            rows={data.reminders}
            rowKey={(reminder) => reminder.id}
            empty={t("Aucune relance.")}
            cols={[
              [t("Envoyée"), (reminder) => formatDate(reminder.sent_at, true)],
              [t("Niveau"), (reminder) => <ReminderLevelBadge level={reminder.level} />],
              [t("Canal"), (reminder) => channelLabel(reminder.channel)],
              [t("Montant dû"), (reminder) => formatMoney(reminder.amount_minor), "right"],
              [t("Message"), (reminder) => <span className="small">{reminder.message}</span>],
            ]}
          />
        </Card>
      )}
      {tab === "gate" && (
        <Card title={t("Passages à la barrière")} flush>
          <Table
            rows={data.gateEvents}
            rowKey={(event) => event.id}
            empty={t("Aucun passage enregistré.")}
            cols={[
              [t("Date"), (event) => formatDate(event.at, true)],
              [t("Décision"), (event) => <StatusBadge map={GATE_DECISION} value={event.decision} />],
              [t("Motif"), (event) => gateReason(event)],
              [t("Contrôle"), (event) => (event.source === "reader" ? t("lecteur") : t("accueil"))],
            ]}
          />
        </Card>
      )}
    </>
  );
}
