// Club bank reconciliation (/club/rapprochement): statement import, manual assignment of the
// transfers that could not be matched, online payments awaiting settlement, lines and statements.
import { useState } from "react";
import { Link } from "react-router-dom";
import { translate } from "../i18n/translate.ts";
import { apiRequest } from "../shared/api.ts";
import { StatusBadge } from "../shared/Badge.tsx";
import { DataTable } from "../shared/DataTable.tsx";
import { useFeedback } from "../shared/Feedback.tsx";
import { Field } from "../shared/Form.tsx";
import { formatDate, formatMoney } from "../shared/format.ts";
import { useApi } from "../shared/hooks.ts";
import { RECONCILIATION_STATUS } from "../shared/labels.ts";
import { Card, PageHeader } from "../shared/Layout.tsx";
import { QueryView } from "../shared/QueryView.tsx";
import { useSession } from "../shared/session.ts";
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
  const ui = useFeedback();
  const { session } = useSession();
  const reconciliation = useApi<ReconciliationData>("/api/club/reconciliation");
  const members = useApi<MemberListItem[]>("/api/club/members");
  const [filename, setFilename] = useState("");
  const [content, setContent] = useState("");
  /** Member chosen for each bank line awaiting assignment. */
  const [assignees, setAssignees] = useState<Record<string, string>>({});

  const loadDemoStatement = () =>
    ui.run(async () => {
      const demo = await apiRequest<{ filename: string; content: string }>("GET", "/api/club/statements/demo");
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
      const result = await apiRequest<ImportResult>("POST", "/api/club/statements", {
        filename: filename || "releve.csv",
        content,
      });
      ui.toast(
        translate("{0} ligne(s) rapprochée(s), {1} en exception, {2} déjà importée(s).", result.matched, result.exceptions, result.skipped),
      );
      setContent("");
      setFilename("");
      await reconciliation.reload();
      await members.reload();
    });

  // The justification is recorded in the audit log with the assignment.
  const assign = async (lineId: string) => {
    const note = await ui.ask({
      title: translate("Affecter ce virement"),
      text: translate(
        "Le virement est enregistré comme encaissement du membre choisi. La décision est tracée dans le journal d'audit.",
      ),
      label: translate("Justification (nom sur le virement, appel du membre...)"),
      confirm: translate("Affecter"),
    });
    if (note) {
      await ui.run(async () => {
        await apiRequest("POST", `/api/club/bank-lines/${lineId}/assign`, { memberId: assignees[lineId], note });
        await reconciliation.reload();
        await members.reload();
      }, translate("Virement affecté au membre."));
    }
  };

  return (
    <>
      <PageHeader
        title={translate("Rapprochement bancaire")}
        sub={translate(
          "Chaque virement est identifié par la référence structurée du membre ; les paiements en ligne par la référence du prestataire.",
        )}
      />
      <QueryView q={reconciliation}>
        {(data) => {
          const toAssign = data.lines.filter(awaitingAssignment);
          return (
            <div className="stack">
              <Card title={translate("Importer un relevé")}>
                <div className="stack">
                  <div className="row">
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(event) => void readFile(event.target.files?.[0])}
                      aria-label={translate("Fichier de relevé")}
                      style={{ width: "auto" }}
                    />
                    {session.demoMode && (
                      <button className="secondary" onClick={loadDemoStatement}>
                        {translate("Générer un relevé de démonstration (virements bien et mal référencés)")}
                      </button>
                    )}
                  </div>
                  <Field
                    label={translate("Contenu {0}", filename ? `· ${filename}` : "")}
                    hint={translate(
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
                      {translate("Importer et rapprocher")}
                    </button>
                  </div>
                </div>
              </Card>
              <Card title={translate("Virements à affecter ({0})", toAssign.length)} flush>
                <DataTable
                  rows={toAssign}
                  rowKey={(line) => line.id}
                  empty={translate("Aucun virement en attente d'affectation.")}
                  cols={[
                    [translate("Date de valeur"), (line) => line.value_date],
                    [translate("Libellé"), (line) => <BankLabel line={line} />],
                    [translate("Montant"), (line) => formatMoney(line.gross_minor), "right"],
                    [
                      translate("Membre"),
                      (line) => (
                        <select
                          value={assignees[line.id] ?? ""}
                          onChange={(event) => setAssignees({ ...assignees, [line.id]: event.target.value })}
                          aria-label={translate("Membre à qui affecter")}
                          style={{ minWidth: 220 }}
                        >
                          <option value="">{translate("Choisir un membre")}</option>
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
                          {translate("Affecter")}
                        </button>
                      ),
                    ],
                  ]}
                />
              </Card>
              <Card title={translate("Paiements en ligne confirmés, non réglés en banque ({0})", data.unsettled.length)} flush>
                <DataTable
                  rows={data.unsettled}
                  rowKey={(payment) => payment.id}
                  empty={translate("Tous les paiements en ligne confirmés sont réglés.")}
                  cols={[
                    [translate("Confirmé"), (payment) => formatDate(payment.confirmed_at, true)],
                    [translate("Membre"), (payment) => `${payment.member_number} · ${payment.member}`],
                    [translate("Montant"), (payment) => formatMoney(payment.amount_minor), "right"],
                    [translate("Référence attendue sur le relevé"), (payment) => <span className="code nb">{payment.provider_ref}</span>],
                  ]}
                />
              </Card>
              <Card title={translate("Lignes de relevé")} flush>
                <DataTable
                  rows={data.lines}
                  rowKey={(line) => line.id}
                  empty={translate("Aucun relevé importé.")}
                  cols={[
                    [translate("Date de valeur"), (line) => line.value_date],
                    [translate("Libellé"), (line) => <BankLabel line={line} />],
                    [translate("Brut"), (line) => formatMoney(line.gross_minor), "right"],
                    [translate("Frais"), (line) => formatMoney(line.fee_minor), "right"],
                    [
                      translate("Rapprochement"),
                      (line) => (
                        <>
                          <StatusBadge map={RECONCILIATION_STATUS} value={line.match_status} />
                          {line.confirmed_via === "manual_assignment" && (
                            <div className="small muted">{translate("affecté à la main")}</div>
                          )}
                        </>
                      ),
                    ],
                    [
                      translate("Membre"),
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
              <Card title={translate("Relevés importés")} flush>
                <DataTable
                  rows={data.statements}
                  rowKey={(statement) => statement.id}
                  empty={translate("Aucun relevé importé.")}
                  cols={[
                    [translate("Importé"), (statement) => formatDate(statement.imported_at, true)],
                    [translate("Fichier"), (statement) => statement.filename],
                    [translate("Par"), (statement) => statement.imported_by_name ?? "—"],
                    [translate("Lignes"), (statement) => statement.line_count, "right"],
                    [translate("Rapprochées"), (statement) => statement.matched_count, "right"],
                    [translate("Déjà importées"), (statement) => statement.skipped_count, "right"],
                  ]}
                />
              </Card>
            </div>
          );
        }}
      </QueryView>
    </>
  );
}
