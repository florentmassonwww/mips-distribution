// Member detail (/club/membres/:id): account tiles, actions (statement, cash, status, plan,
// consumption charge) and the member's dues, statement, payments, reminders and gate passages.
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { describeGateDecision, formatOverdueDays } from "../admin/clubLabels.ts";
import { newIdempotencyKey } from "../admin/idempotency.ts";
import { FINANCE_ROLES, useCurrentRole } from "../admin/roles.ts";
import { translate } from "../i18n/translate.ts";
import { apiRequest } from "../shared/api.ts";
import { StatusBadge } from "../shared/Badge.tsx";
import { useFeedback } from "../shared/Feedback.tsx";
import { formatDate, formatMoney, parseMoney } from "../shared/format.ts";
import { useApi } from "../shared/hooks.ts";
import { ACCESS_DECISION, CLUB_OUTLET, PAYMENT_STATUS } from "../shared/labels.ts";
import { PageHeader, Tile } from "../shared/Layout.tsx";
import { QueryView } from "../shared/QueryView.tsx";
import { MemberActions, type ChargeDraft } from "./MemberActions.tsx";
import { MemberTabs, type MemberTab } from "./MemberTabs.tsx";
import { billingSuffix } from "./parts.tsx";
import type { DuesData, MemberCharge, MemberDetailData, SentStatement } from "./types.ts";

export function MemberDetail() {
  const { id } = useParams();
  const ui = useFeedback();
  const role = useCurrentRole();
  const detail = useApi<MemberDetailData>(`/api/club/members/${id}`);
  const dues = useApi<DuesData>("/api/club/dues");
  const [tab, setTab] = useState<MemberTab>("dues");
  const [charge, setCharge] = useState<ChargeDraft>({ outlet: "bar", label: "", amount: "" });
  const [sentStatement, setSentStatement] = useState<SentStatement | null>(null);

  const update = (patch: { status?: string; planId?: string | null }, success: string) =>
    ui.run(async () => {
      await apiRequest("PATCH", `/api/club/members/${id}`, patch);
      await detail.reload();
    }, success);

  // A consumption without a label is labelled with its outlet.
  const addCharge = () =>
    ui.run(async () => {
      await apiRequest("POST", `/api/club/members/${id}/charges`, {
        kind: "consumption",
        outlet: charge.outlet,
        label: charge.label.trim() || CLUB_OUTLET[charge.outlet],
        amountMinor: parseMoney(charge.amount),
      });
      setCharge({ ...charge, label: "", amount: "" });
      await detail.reload();
    }, translate("Consommation imputée au compte."));

  // Cash handed to the office: amount first, then the receipt number, in two dialogs.
  const recordCash = async () => {
    const amount = await ui.ask({
      kind: "money",
      title: translate("Espèces remises au bureau"),
      text: translate("L'encaissement est confirmé immédiatement et tracé à votre nom."),
      label: translate("Montant reçu (Rs)"),
      confirm: translate("Continuer"),
    });
    if (!amount) return;
    const note = await ui.ask({
      title: translate("Reçu remis"),
      label: translate("Numéro du reçu ou remarque"),
      confirm: translate("Enregistrer"),
    });
    if (note) {
      await ui.run(async () => {
        await apiRequest("POST", `/api/club/members/${id}/cash`, {
          amountMinor: Number(amount),
          note,
          idempotencyKey: newIdempotencyKey(),
        });
        await detail.reload();
      }, translate("Encaissement enregistré."));
    }
  };

  const cancelCharge = async (target: MemberCharge) => {
    const reason = await ui.ask({
      title: translate("Annuler {0}", target.number),
      text: translate("Une écriture inverse est transmise à la comptabilité ; rien n'est effacé."),
      label: translate("Motif"),
      confirm: translate("Annuler le dû"),
      danger: true,
    });
    if (reason) {
      await ui.run(async () => {
        await apiRequest("POST", `/api/club/charges/${target.id}/cancel`, { reason });
        await detail.reload();
      }, translate("Dû annulé."));
    }
  };

  const queryProvider = (paymentId: string) =>
    ui.run(async () => {
      const payment = await apiRequest<{ status: string }>("POST", `/api/club/payments/${paymentId}/check`);
      ui.toast(translate("Réponse du prestataire appliquée : {0}.", PAYMENT_STATUS[payment.status]?.[0] ?? payment.status));
      await detail.reload();
    });

  const sendStatement = () =>
    ui.run(async () => {
      setSentStatement(await apiRequest<SentStatement>("POST", `/api/club/members/${id}/statement`));
      await detail.reload();
    });

  return (
    <QueryView q={detail}>
      {(data) => {
        const member = data.member;
        return (
          <>
            <PageHeader
              title={member.name}
              sub={
                <>
                  {translate("Membre")} {member.number}
                  {" · "}
                  {member.plan
                    ? `${translate(member.plan.name)} (${formatMoney(member.plan.fee_minor)}${billingSuffix(member.plan.billing)})`
                    : translate("sans catégorie")}
                  {" · "}
                  {translate("depuis le")} {formatDate(member.joined_at)}
                </>
              }
            >
              <Link to="/club/membres">{translate("← Tous les membres")}</Link>
            </PageHeader>
            <div className="stack">
              <div className="grid g4">
                <Tile
                  label={translate("Solde dû")}
                  value={formatMoney(data.account.dueMinor)}
                  hint={
                    data.account.creditMinor
                      ? translate("avoir : {0}", formatMoney(data.account.creditMinor))
                      : translate("facturé {0} · payé {1}", formatMoney(data.account.chargedMinor), formatMoney(data.account.paidMinor))
                  }
                />
                <Tile
                  label={translate("Dont en retard")}
                  value={formatMoney(data.account.overdueMinor)}
                  kind={data.account.overdueMinor ? "warn" : ""}
                  hint={
                    data.account.overdueMinor
                      ? translate("plus ancien : {0}", formatOverdueDays(data.account.overdueDays))
                      : translate("rien en retard")
                  }
                />
                <Tile
                  label={translate("À la barrière")}
                  value={<StatusBadge map={ACCESS_DECISION} value={data.gate.decision} />}
                  hint={describeGateDecision(data.gate)}
                />
                <Tile
                  label={translate("Référence de paiement")}
                  value={
                    <span className="code nb" style={{ fontSize: "1rem" }}>
                      {member.reference}
                    </span>
                  }
                  hint={translate("badge {0} · à indiquer sur tout virement", member.badge)}
                />
              </div>
              <MemberActions
                role={role}
                member={member}
                portalPath={data.portalPath}
                plans={dues.data?.plans}
                sentStatement={sentStatement}
                charge={charge}
                onChargeChange={setCharge}
                onSendStatement={sendStatement}
                onRecordCash={recordCash}
                onUpdate={update}
                onAddCharge={addCharge}
              />
              <MemberTabs
                data={data}
                tab={tab}
                onTab={setTab}
                canCancel={FINANCE_ROLES.includes(role)}
                onCancelCharge={cancelCharge}
                onQueryProvider={queryProvider}
              />
            </div>
          </>
        );
      }}
    </QueryView>
  );
}
