// "Actions" card of the member detail: send the statement, open the member's page, record cash
// (accounting), change status and plan (secretariat), and charge a consumption to an active member.
import { FINANCE_ROLES, OPS_ROLES } from "../admin/roles.ts";
import { PaymentQrCode } from "../field/PaymentQrCode.tsx";
import { translate } from "../i18n/translate.ts";
import { Field } from "../shared/Form.tsx";
import { parseMoney } from "../shared/format.ts";
import { CLUB_OUTLET, MEMBER_STATUS } from "../shared/labels.ts";
import { Card } from "../shared/Layout.tsx";
import { hashHref } from "../shared/links.ts";
import type { MemberDetailData, Plan, SentStatement } from "./types.ts";

/** Consumption being typed: outlet key, optional label, amount as typed (rupees). */
export interface ChargeDraft {
  outlet: string;
  label: string;
  amount: string;
}

interface MemberActionsProps {
  role: string;
  member: MemberDetailData["member"];
  portalPath: string;
  plans: Plan[] | undefined;
  sentStatement: SentStatement | null;
  charge: ChargeDraft;
  onChargeChange: (charge: ChargeDraft) => void;
  onSendStatement: () => void;
  onRecordCash: () => void;
  onUpdate: (patch: { status?: string; planId?: string | null }, success: string) => void;
  onAddCharge: () => void;
}

export function MemberActions({
  role,
  member,
  portalPath,
  plans,
  sentStatement,
  charge,
  onChargeChange,
  onSendStatement,
  onRecordCash,
  onUpdate,
  onAddCharge,
}: MemberActionsProps) {
  const isSecretariat = OPS_ROLES.includes(role);
  return (
    <Card title={translate("Actions")}>
      <div className="stack">
        <div className="row">
          <button onClick={onSendStatement}>{translate("Envoyer le relevé et le lien de paiement")}</button>
          <a className="btn secondary" href={hashHref(portalPath)} target="_blank" rel="noreferrer">
            {translate("Ouvrir la page du membre")}
          </a>
          {FINANCE_ROLES.includes(role) && (
            <button className="secondary" onClick={onRecordCash}>
              {translate("Enregistrer des espèces")}
            </button>
          )}
          {isSecretariat && (
            <>
              <select
                value={member.status}
                onChange={(event) => onUpdate({ status: event.target.value }, translate("État du membre modifié."))}
                aria-label={translate("État du membre")}
                style={{ width: "auto" }}
              >
                {Object.entries(MEMBER_STATUS).map(([status, [label]]) => (
                  <option key={status} value={status}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                value={member.plan?.id ?? ""}
                onChange={(event) => onUpdate({ planId: event.target.value || null }, translate("Catégorie modifiée."))}
                aria-label={translate("Catégorie d'adhésion")}
                style={{ width: "auto" }}
              >
                <option value="">{translate("sans catégorie")}</option>
                {plans?.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {translate(plan.name)}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
        {sentStatement && (
          <div className="grid g2">
            <div className="notice">
              <strong>{translate("Message enregistré (démonstration : rien n'est réellement envoyé)")}</strong>
              <p className="small" style={{ marginTop: 6 }}>
                {sentStatement.message}
              </p>
            </div>
            <div className="stack">
              <PaymentQrCode value={sentStatement.url} />
              <div className="small muted" style={{ textAlign: "center" }}>
                {translate("Le membre peut aussi scanner ce code au secrétariat.")}
              </div>
            </div>
          </div>
        )}
        {/* Only active members can be charged a consumption. */}
        {isSecretariat && member.status === "active" && (
          <div className="grid g4">
            <Field label={translate("Lieu")}>
              <select value={charge.outlet} onChange={(event) => onChargeChange({ ...charge, outlet: event.target.value })}>
                {Object.entries(CLUB_OUTLET).map(([outlet, label]) => (
                  <option key={outlet} value={outlet}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={translate("Libellé")}>
              <input
                type="text"
                value={charge.label}
                placeholder={CLUB_OUTLET[charge.outlet]}
                onChange={(event) => onChargeChange({ ...charge, label: event.target.value })}
              />
            </Field>
            <Field label={translate("Montant (Rs)")}>
              <input
                type="text"
                inputMode="decimal"
                value={charge.amount}
                onChange={(event) => onChargeChange({ ...charge, amount: event.target.value })}
              />
            </Field>
            <div className="row" style={{ alignItems: "flex-end" }}>
              <button className="secondary" disabled={!(parseMoney(charge.amount) ?? 0)} onClick={onAddCharge}>
                {translate("Imputer au compte")}
              </button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
