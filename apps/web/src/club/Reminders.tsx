// Reminders (/club/relances): reminders and statements sent, and the reminder run (accounting).
import { useNavigate } from "react-router-dom";
import {
  ACCOUNTING_ROLES,
  api,
  Card,
  formatDate,
  formatDays,
  formatMoney,
  Loaded,
  PageHead,
  Table,
  t,
  useApi,
  useRole,
  useUi,
} from "./legacy.ts";
import { channelLabel, MemberCell, ReminderLevelBadge } from "./parts.tsx";
import type { Reminder } from "./types.ts";

interface ReminderRun {
  sent: number;
  alreadySent: number;
  byLevel: Record<number, number>;
}

export function Reminders() {
  const ui = useUi();
  const navigate = useNavigate();
  const role = useRole();
  const reminders = useApi<Reminder[]>("/api/club/reminders");

  // One reminder per level and debt cycle: running twice sends nothing more.
  const runReminders = () =>
    ui.run(async () => {
      const run = await api<ReminderRun>("POST", "/api/club/reminders/run");
      ui.toast(
        t(
          "{0} relance(s) envoyée(s) (niveaux 1 / 2 / 3 : {1} / {2} / {3}), {4} déjà faite(s).",
          run.sent,
          run.byLevel[1] ?? 0,
          run.byLevel[2] ?? 0,
          run.byLevel[3] ?? 0,
          run.alreadySent,
        ),
      );
      await reminders.reload();
    });

  return (
    <>
      <PageHead
        title={t("Relances")}
        sub={t(
          "Le moteur relance chaque membre en retard selon l'ancienneté de sa plus vieille dette. Une relance par niveau : relancer deux fois n'envoie rien de plus.",
        )}
      >
        {ACCOUNTING_ROLES.includes(role) && <button onClick={runReminders}>{t("Lancer les relances")}</button>}
      </PageHead>
      <div className="stack">
        <div className="notice warn">
          {t(
            "Démonstration : aucun e-mail ni SMS n'est réellement envoyé. Chaque relance est enregistrée avec son texte, le lien vers la page du membre et sa référence de paiement.",
          )}
        </div>
        <Card title={t("Relances et relevés envoyés")} flush>
          <Loaded q={reminders}>
            {(rows) => (
              <Table
                rows={rows}
                rowKey={(reminder) => reminder.id}
                empty={t("Aucune relance.")}
                onRow={(reminder) => navigate(`/club/membres/${reminder.member_id}`)}
                cols={[
                  [t("Envoyée"), (reminder) => formatDate(reminder.sent_at, true)],
                  [t("Membre"), (reminder) => <MemberCell name={reminder.member} number={reminder.member_number} />],
                  [t("Niveau"), (reminder) => <ReminderLevelBadge level={reminder.level} />],
                  [t("Retard"), (reminder) => (reminder.overdue_days ? formatDays(reminder.overdue_days) : "—"), "right"],
                  [t("Montant dû"), (reminder) => formatMoney(reminder.amount_minor), "right"],
                  [t("Canal"), (reminder) => channelLabel(reminder.channel)],
                  [t("Par"), (reminder) => reminder.sent_by ?? "—"],
                ]}
              />
            )}
          </Loaded>
        </Card>
      </div>
    </>
  );
}
