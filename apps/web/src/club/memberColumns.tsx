// Columns of a members table (members list and the dashboard's top debtors).
import { formatDate, formatDays, formatMoney, MEMBER_STATUS, StatusBadge, t, type Column } from "./legacy.ts";
import { ReminderLevelBadge } from "./parts.tsx";
import type { MemberListItem } from "./types.ts";

/** Built on each render so that the headers follow the current language. */
export const memberColumns = (): Column<MemberListItem>[] => [
  [
    t("Membre"),
    (member) => (
      <>
        <strong>{member.name}</strong>
        <div className="small muted">
          {member.number}
          {" · "}
          {member.plan ? t(member.plan) : "—"}
        </div>
      </>
    ),
  ],
  [t("État"), (member) => <StatusBadge map={MEMBER_STATUS} value={member.status} />],
  [
    t("Solde dû"),
    // A negative balance is a credit in the member's favour.
    (member) =>
      member.balance_minor < 0 ? (
        <span className="muted">
          {t("avoir")} {formatMoney(-member.balance_minor)}
        </span>
      ) : (
        formatMoney(member.balance_minor)
      ),
    "right",
  ],
  [
    t("En retard"),
    (member) =>
      member.overdue_minor ? (
        <>
          <strong>{formatMoney(member.overdue_minor)}</strong>
          <div className="small muted">{formatDays(member.overdue_days)}</div>
        </>
      ) : (
        "—"
      ),
    "right",
  ],
  [
    t("Dernière relance"),
    (member) =>
      member.last_reminder_level ? (
        <>
          <ReminderLevelBadge level={member.last_reminder_level} />
          <div className="small muted">{formatDate(member.last_reminder_at)}</div>
        </>
      ) : (
        "—"
      ),
  ],
  [t("Référence de paiement"), (member) => <span className="code nb">{member.reference}</span>],
];
