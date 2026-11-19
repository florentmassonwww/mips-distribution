// Member detail (/club/membres/:id): account tiles, actions (statement, cash, status, plan,
// consumption charge) and the member's dues, statement, payments, reminders and gate passages.
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ACCOUNTING_ROLES,
  api,
  formatDate,
  formatDays,
  formatMoney,
  GATE_DECISION,
  gateReason,
  Loaded,
  newIdempotencyKey,
  OUTLET_LABELS,
  PageHead,
  parseMoney,
  PAYMENT_STATUS,
  StatusBadge,
  t,
  Tile,
  useApi,
  useRole,
  useUi,
} from "./legacy.ts";
import { MemberActions, type ChargeDraft } from "./MemberActions.tsx";
import { MemberTabs, type MemberTab } from "./MemberTabs.tsx";
import { billingSuffix } from "./parts.tsx";
import type { DuesData, MemberCharge, MemberDetailData, SentStatement } from "./types.ts";

export function MemberDetail() {
  const { id } = useParams();
  const ui = useUi();
  const role = useRole();
  const detail = useApi<MemberDetailData>(`/api/club/members/${id}`);
  const dues = useApi<DuesData>("/api/club/dues");
  const [tab, setTab] = useState<MemberTab>("dues");
  const [charge, setCharge] = useState<ChargeDraft>({ outlet: "bar", label: "", amount: "" });
  const [sentStatement, setSentStatement] = useState<SentStatement | null>(null);

  const update = (patch: { status?: string; planId?: string | null }, success: string) =>
    ui.run(async () => {
      await api("PATCH", `/api/club/members/${id}`, patch);
      await detail.reload();
    }, success);

  // A consumption without a label is labelled with its outlet.
  const addCharge = () =>
    ui.run(async () => {
      await api("POST", `/api/club/members/${id}/charges`, {
        kind: "consumption",
        outlet: charge.outlet,
        label: charge.label.trim() || OUTLET_LABELS[charge.outlet],
        amountMinor: parseMoney(charge.amount),
      });
      setCharge({ ...charge, label: "", amount: "" });
      await detail.reload();
    }, t("Consommation imputée au compte."));

  // Cash handed to the office: amount first, then the receipt number, in two dialogs.
  const recordCash = async () => {
    const amount = await ui.ask({
      kind: "money",
      title: t("Espèces remises au bureau"),
      text: t("L'encaissement est confirmé immédiatement et tracé à votre nom."),
      label: t("Montant reçu (Rs)"),
      confirm: t("Continuer"),
    });
    if (!amount) return;
    const note = await ui.ask({
      title: t("Reçu remis"),
      label: t("Numéro du reçu ou remarque"),
      confirm: t("Enregistrer"),
    });
    if (note) {
      await ui.run(async () => {
        await api("POST", `/api/club/members/${id}/cash`, {
          amountMinor: Number(amount),
          note,
          idempotencyKey: newIdempotencyKey(),
        });
        await detail.reload();
      }, t("Encaissement enregistré."));
    }
  };

  const cancelCharge = async (target: MemberCharge) => {
    const reason = await ui.ask({
      title: t("Annuler {0}", target.number),
      text: t("Une écriture inverse est transmise à la comptabilité ; rien n'est effacé."),
      label: t("Motif"),
      confirm: t("Annuler le dû"),
      danger: true,
    });
    if (reason) {
      await ui.run(async () => {
        await api("POST", `/api/club/charges/${target.id}/cancel`, { reason });
        await detail.reload();
      }, t("Dû annulé."));
    }
  };

  const queryProvider = (paymentId: string) =>
    ui.run(async () => {
      const payment = await api<{ status: string }>("POST", `/api/club/payments/${paymentId}/check`);
      ui.toast(t("Réponse du prestataire appliquée : {0}.", PAYMENT_STATUS[payment.status]?.[0] ?? payment.status));
      await detail.reload();
    });

  const sendStatement = () =>
    ui.run(async () => {
      setSentStatement(await api<SentStatement>("POST", `/api/club/members/${id}/statement`));
      await detail.reload();
    });

  return (
    <Loaded q={detail}>
      {(data) => {
        const member = data.member;
        return (
          <>
            <PageHead
              title={member.name}
              sub={
                <>
                  {t("Membre")} {member.number}
                  {" · "}
                  {member.plan
                    ? `${t(member.plan.name)} (${formatMoney(member.plan.fee_minor)}${billingSuffix(member.plan.billing)})`
                    : t("sans catégorie")}
                  {" · "}
                  {t("depuis le")} {formatDate(member.joined_at)}
                </>
              }
            >
              <Link to="/club/membres">{t("← Tous les membres")}</Link>
            </PageHead>
            <div className="stack">
              <div className="grid g4">
                <Tile
                  label={t("Solde dû")}
                  value={formatMoney(data.account.dueMinor)}
                  hint={
                    data.account.creditMinor
                      ? t("avoir : {0}", formatMoney(data.account.creditMinor))
                      : t("facturé {0} · payé {1}", formatMoney(data.account.chargedMinor), formatMoney(data.account.paidMinor))
                  }
                />
                <Tile
                  label={t("Dont en retard")}
                  value={formatMoney(data.account.overdueMinor)}
                  kind={data.account.overdueMinor ? "warn" : ""}
                  hint={
                    data.account.overdueMinor
                      ? t("plus ancien : {0}", formatDays(data.account.overdueDays))
                      : t("rien en retard")
                  }
                />
                <Tile
                  label={t("À la barrière")}
                  value={<StatusBadge map={GATE_DECISION} value={data.gate.decision} />}
                  hint={gateReason(data.gate)}
                />
                <Tile
                  label={t("Référence de paiement")}
                  value={
                    <span className="code nb" style={{ fontSize: "1rem" }}>
                      {member.reference}
                    </span>
                  }
                  hint={t("badge {0} · à indiquer sur tout virement", member.badge)}
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
                canCancel={ACCOUNTING_ROLES.includes(role)}
                onCancelCharge={cancelCharge}
                onQueryProvider={queryProvider}
              />
            </div>
          </>
        );
      }}
    </Loaded>
  );
}
