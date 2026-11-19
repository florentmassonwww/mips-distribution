// Club bank reconciliation (/club/rapprochement): statement import, manual assignment of the
// transfers that could not be matched, online payments awaiting settlement, lines and statements.
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  api,
  Card,
  Field,
  formatDate,
  formatMoney,
  Loaded,
  MATCH_STATUS,
  PageHead,
  StatusBadge,
  Table,
  t,
  useApi,
  useSession,
  useUi,
} from "./legacy.ts";
import type { BankLine, MemberListItem, ReconciliationData } from "./types.ts";

interface ImportResult {
  matched: number;
  exceptions: number;
  skipped: number;
}

/** Incoming transfers the matching left without a member: they wait for a manual assignment. */
const awaitingAssignment = (line: BankLine): boolean =>
  line.match_status === "unmatched" && !line.member_id && line.gross_minor > 0;

/** Label over the reference, as on the bank statement. */
function BankLabel({ line }: { line: BankLine }) {
  return (
    <>
      <span>{line.label}</span>
      <div className="small muted code nb">{line.reference}</div>
    </>
  );
}

export function ClubReconciliation() {
  const ui = useUi();
  const { session } = useSession();
  const reconciliation = useApi<ReconciliationData>("/api/club/reconciliation");
  const members = useApi<MemberListItem[]>("/api/club/members");
  const [filename, setFilename] = useState("");
  const [content, setContent] = useState("");
  /** Member chosen for each bank line awaiting assignment. */
  const [assignees, setAssignees] = useState<Record<string, string>>({});

  const loadDemoStatement = () =>
    ui.run(async () => {
      const demo = await api<{ filename: string; content: string }>("GET", "/api/club/statements/demo");
      setFilename(demo.filename);
      setContent(demo.content);
    });

  const readFile = async (file: File | undefined) => {
    if (file) {
      setFilename(file.name);
      setContent(await file.text());
    }
  };

  const importStatement = () =>
    ui.run(async () => {
      const result = await api<ImportResult>("POST", "/api/club/statements", {
        filename: filename || "releve.csv",
        content,
      });
      ui.toast(
        t("{0} ligne(s) rapprochée(s), {1} en exception, {2} déjà importée(s).", result.matched, result.exceptions, result.skipped),
      );
      setContent("");
      setFilename("");
      await reconciliation.reload();
      await members.reload();
    });

  // The justification is recorded in the audit log with the assignment.
  const assign = async (lineId: string) => {
    const note = await ui.ask({
      title: t("Affecter ce virement"),
      text: t(
        "Le virement est enregistré comme encaissement du membre choisi. La décision est tracée dans le journal d'audit.",
      ),
      label: t("Justification (nom sur le virement, appel du membre...)"),
      confirm: t("Affecter"),
    });
    if (note) {
      await ui.run(async () => {
        await api("POST", `/api/club/bank-lines/${lineId}/assign`, { memberId: assignees[lineId], note });
        await reconciliation.reload();
        await members.reload();
      }, t("Virement affecté au membre."));
    }
  };

  return (
    <>
      <PageHead
        title={t("Rapprochement bancaire")}
        sub={t(
          "Chaque virement est identifié par la référence structurée du membre ; les paiements en ligne par la référence du prestataire.",
        )}
      />
      <Loaded q={reconciliation}>
        {(data) => {
          const toAssign = data.lines.filter(awaitingAssignment);
          return (
            <div className="stack">
              <Card title={t("Importer un relevé")}>
                <div className="stack">
                  <div className="row">
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(event) => void readFile(event.target.files?.[0])}
                      aria-label={t("Fichier de relevé")}
                      style={{ width: "auto" }}
                    />
                    {session.demoMode && (
                      <button className="secondary" onClick={loadDemoStatement}>
                        {t("Générer un relevé de démonstration (virements bien et mal référencés)")}
                      </button>
                    )}
                  </div>
                  <Field
                    label={t("Contenu {0}", filename ? `· ${filename}` : "")}
                    hint={t(
                      "Format de démonstration : date;reference;libelle;montant_brut;frais;montant_net. Le format réel dépend de la banque (à vérifier).",
                    )}
                  >
                    <textarea
                      className="mono"
                      value={content}
                      onChange={(event) => setContent(event.target.value)}
                      rows={6}
                      placeholder="date;reference;libelle;montant_brut;frais;montant_net"
                    />
                  </Field>
                  <div>
                    <button disabled={content.trim().length < 10} onClick={importStatement}>
                      {t("Importer et rapprocher")}
                    </button>
                  </div>
                </div>
              </Card>
              <Card title={t("Virements à affecter ({0})", toAssign.length)} flush>
                <Table
                  rows={toAssign}
                  rowKey={(line) => line.id}
                  empty={t("Aucun virement en attente d'affectation.")}
                  cols={[
                    [t("Date de valeur"), (line) => line.value_date],
                    [t("Libellé"), (line) => <BankLabel line={line} />],
                    [t("Montant"), (line) => formatMoney(line.gross_minor), "right"],
                    [
                      t("Membre"),
                      (line) => (
                        <select
                          value={assignees[line.id] ?? ""}
                          onChange={(event) => setAssignees({ ...assignees, [line.id]: event.target.value })}
                          aria-label={t("Membre à qui affecter")}
                          style={{ minWidth: 220 }}
                        >
                          <option value="">{t("Choisir un membre")}</option>
                          {members.data?.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.number}
                              {" · "}
                              {member.name}
                              {member.overdue_minor ? ` · ${formatMoney(member.overdue_minor)}` : ""}
                            </option>
                          ))}
                        </select>
                      ),
                    ],
                    [
                      "",
                      (line) => (
                        <button className="sm" disabled={!assignees[line.id]} onClick={() => assign(line.id)}>
                          {t("Affecter")}
                        </button>
                      ),
                    ],
                  ]}
                />
              </Card>
              <Card title={t("Paiements en ligne confirmés, non réglés en banque ({0})", data.unsettled.length)} flush>
                <Table
                  rows={data.unsettled}
                  rowKey={(payment) => payment.id}
                  empty={t("Tous les paiements en ligne confirmés sont réglés.")}
                  cols={[
                    [t("Confirmé"), (payment) => formatDate(payment.confirmed_at, true)],
                    [t("Membre"), (payment) => `${payment.member_number} · ${payment.member}`],
                    [t("Montant"), (payment) => formatMoney(payment.amount_minor), "right"],
                    [t("Référence attendue sur le relevé"), (payment) => <span className="code nb">{payment.provider_ref}</span>],
                  ]}
                />
              </Card>
              <Card title={t("Lignes de relevé")} flush>
                <Table
                  rows={data.lines}
                  rowKey={(line) => line.id}
                  empty={t("Aucun relevé importé.")}
                  cols={[
                    [t("Date de valeur"), (line) => line.value_date],
                    [t("Libellé"), (line) => <BankLabel line={line} />],
                    [t("Brut"), (line) => formatMoney(line.gross_minor), "right"],
                    [t("Frais"), (line) => formatMoney(line.fee_minor), "right"],
                    [
                      t("Rapprochement"),
                      (line) => (
                        <>
                          <StatusBadge map={MATCH_STATUS} value={line.match_status} />
                          {line.confirmed_via === "manual_assignment" && (
                            <div className="small muted">{t("affecté à la main")}</div>
                          )}
                        </>
                      ),
                    ],
                    [
                      t("Membre"),
                      (line) =>
                        line.member ? (
                          <Link to={`/club/membres/${line.member_id}`}>
                            {line.member_number}
                            {" · "}
                            {line.member}
                          </Link>
                        ) : (
                          "—"
                        ),
                    ],
                  ]}
                />
              </Card>
              <Card title={t("Relevés importés")} flush>
                <Table
                  rows={data.statements}
                  rowKey={(statement) => statement.id}
                  empty={t("Aucun relevé importé.")}
                  cols={[
                    [t("Importé"), (statement) => formatDate(statement.imported_at, true)],
                    [t("Fichier"), (statement) => statement.filename],
                    [t("Par"), (statement) => statement.imported_by_name ?? "—"],
                    [t("Lignes"), (statement) => statement.line_count, "right"],
                    [t("Rapprochées"), (statement) => statement.matched_count, "right"],
                    [t("Déjà importées"), (statement) => statement.skipped_count, "right"],
                  ]}
                />
              </Card>
            </div>
          );
        }}
      </Loaded>
    </>
  );
}
