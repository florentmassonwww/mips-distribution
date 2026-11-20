// Reminders (/club/relances): reminders and statements sent, and the reminder run (accounting).
import { useNavigate } from "react-router-dom";
import { formatOverdueDays } from "../admin/clubLabels.ts";
import { FINANCE_ROLES, useCurrentRole } from "../admin/roles.ts";
import { translate, translateCount } from "../i18n/translate.ts";
import { apiRequest } from "../shared/api.ts";
import { DataTable } from "../shared/DataTable.tsx";
import { useFeedback } from "../shared/Feedback.tsx";
import { formatDate, formatMoney } from "../shared/format.ts";
import { useApi } from "../shared/hooks.ts";
import { Card, PageHeader } from "../shared/Layout.tsx";
import { QueryView } from "../shared/QueryView.tsx";
import { channelLabel, MemberCell, ReminderLevelBadge } from "./parts.tsx";
import type { Reminder } from "./types.ts";

interface ReminderRun {
  sent: number;
  alreadySent: number;
  byLevel: Record<number, number>;
}

export function Reminders() {
  const ui = useFeedback();
  const navigate = useNavigate();
  const role = useCurrentRole();
  const reminders = useApi<Reminder[]>("/api/club/reminders");

  // One reminder per level and debt cycle: running twice sends nothing more.
  const runReminders = () =>
    ui.run(async () => {
      const run = await apiRequest<ReminderRun>("POST", "/api/club/reminders/run");
      ui.toast(
        `${translateCount(
          run.sent,
          "{0} relance envoyée (niveaux 1 / 2 / 3 : {1} / {2} / {3})",
          "{0} relances envoyées (niveaux 1 / 2 / 3 : {1} / {2} / {3})",
          run.byLevel[1] ?? 0,
          run.byLevel[2] ?? 0,
          run.byLevel[3] ?? 0,
        )}, ${translateCount(run.alreadySent, "{0} déjà faite.", "{0} déjà faites.")}`,
      );
      await reminders.reload();
    });

  return (
    <>
      <PageHeader
        title={translate("Relances")}
        sub={translate(
          "Le moteur relance chaque membre en retard selon l'ancienneté de sa plus vieille dette. Une relance par niveau : relancer deux fois n'envoie rien de plus.",
        )}
      >
        {FINANCE_ROLES.includes(role) && <button onClick={runReminders}>{translate("Lancer les relances")}</button>}
      </PageHeader>
      <div className="stack">
        <div className="notice warn">
          {translate(
            "Démonstration : aucun e-mail ni SMS n'est réellement envoyé. Chaque relance est enregistrée avec son texte, le lien vers la page du membre et sa référence de paiement.",
          )}
        </div>
        <Card title={translate("Relances et relevés envoyés")} flush>
          <QueryView q={reminders}>
            {(rows) => (
              <DataTable
                rows={rows}
                rowKey={(reminder) => reminder.id}
                empty={translate("Aucune relance.")}
                onRow={(reminder) => navigate(`/club/membres/${reminder.member_id}`)}
                cols={[
                  [translate("Envoyée"), (reminder) => formatDate(reminder.sent_at, true)],
                  [translate("Membre"), (reminder) => <MemberCell name={reminder.member} number={reminder.member_number} />],
                  [translate("Niveau"), (reminder) => <ReminderLevelBadge level={reminder.level} />],
                  [translate("Retard"), (reminder) => (reminder.overdue_days ? formatOverdueDays(reminder.overdue_days) : "—"), "right"],
                  [translate("Montant dû"), (reminder) => formatMoney(reminder.amount_minor), "right"],
                  [translate("Canal"), (reminder) => channelLabel(reminder.channel)],
                  [translate("Par"), (reminder) => reminder.sent_by ?? "—"],
                ]}
              />
            )}
          </QueryView>
        </Card>
      </div>
    </>
  );
}
