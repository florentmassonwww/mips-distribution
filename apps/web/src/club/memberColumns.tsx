// Columns of a members table (members list and the dashboard's top debtors).
import { formatOverdueDays } from "../admin/clubLabels.ts";
import { translate } from "../i18n/translate.ts";
import { StatusBadge } from "../shared/Badge.tsx";
import type { Column } from "../shared/DataTable.tsx";
import { formatDate, formatMoney } from "../shared/format.ts";
import { MEMBER_STATUS } from "../shared/labels.ts";
import { ReminderLevelBadge } from "./parts.tsx";
import type { MemberListItem } from "./types.ts";

/** Built on each render so that the headers follow the current language. */
export const memberColumns = (): Column<MemberListItem>[] => [
  [
    translate("Membre"),
    (member) => (
      <>
        <strong>{member.name}</strong>
        <div className="small muted">
          {member.number}
          {" · "}
          {member.plan ? translate(member.plan) : "—"}
        </div>
      </>
    ),
  ],
  [translate("État"), (member) => <StatusBadge map={MEMBER_STATUS} value={member.status} />],
  [
    translate("Solde dû"),
    // A negative balance is a credit in the member's favour.
    (member) =>
      member.balance_minor < 0 ? (
        <span className="muted">
          {translate("avoir")} {formatMoney(-member.balance_minor)}
        </span>
      ) : (
        formatMoney(member.balance_minor)
      ),
    "right",
  ],
  [
    translate("En retard"),
    (member) =>
      member.overdue_minor ? (
        <>
          <strong>{formatMoney(member.overdue_minor)}</strong>
          <div className="small muted">{formatOverdueDays(member.overdue_days)}</div>
        </>
      ) : (
        "—"
      ),
    "right",
  ],
  [
    translate("Dernière relance"),
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
  [translate("Référence de paiement"), (member) => <span className="code nb">{member.reference}</span>],
];
