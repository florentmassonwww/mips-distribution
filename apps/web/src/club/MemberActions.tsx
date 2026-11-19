// "Actions" card of the member detail: send the statement, open the member's page, record cash
// (accounting), change status and plan (secretariat), and charge a consumption to an active member.
import {
  ACCOUNTING_ROLES,
  Card,
  Field,
  hashHref,
  MEMBER_STATUS,
  OUTLET_LABELS,
  parseMoney,
  QrCode,
  SECRETARIAT_ROLES,
  t,
} from "./legacy.ts";
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
  const isSecretariat = SECRETARIAT_ROLES.includes(role);
  return (
    <Card title={t("Actions")}>
      <div className="stack">
        <div className="row">
          <button onClick={onSendStatement}>{t("Envoyer le relevé et le lien de paiement")}</button>
          <a className="btn secondary" href={hashHref(portalPath)} target="_blank" rel="noreferrer">
            {t("Ouvrir la page du membre")}
          </a>
          {ACCOUNTING_ROLES.includes(role) && (
            <button className="secondary" onClick={onRecordCash}>
              {t("Enregistrer des espèces")}
            </button>
          )}
          {isSecretariat && (
            <>
              <select
                value={member.status}
                onChange={(event) => onUpdate({ status: event.target.value }, t("État du membre modifié."))}
                aria-label={t("État du membre")}
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
                onChange={(event) => onUpdate({ planId: event.target.value || null }, t("Catégorie modifiée."))}
                aria-label={t("Catégorie d'adhésion")}
                style={{ width: "auto" }}
              >
                <option value="">{t("sans catégorie")}</option>
                {plans?.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {t(plan.name)}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
        {sentStatement && (
          <div className="grid g2">
            <div className="notice">
              <strong>{t("Message enregistré (démonstration : rien n'est réellement envoyé)")}</strong>
              <p className="small" style={{ marginTop: 6 }}>
                {sentStatement.message}
              </p>
            </div>
            <div className="stack">
              <QrCode value={sentStatement.url} />
              <div className="small muted" style={{ textAlign: "center" }}>
                {t("Le membre peut aussi scanner ce code au secrétariat.")}
              </div>
            </div>
          </div>
        )}
        {/* Only active members can be charged a consumption. */}
        {isSecretariat && member.status === "active" && (
          <div className="grid g4">
            <Field label={t("Lieu")}>
              <select value={charge.outlet} onChange={(event) => onChargeChange({ ...charge, outlet: event.target.value })}>
                {Object.entries(OUTLET_LABELS).map(([outlet, label]) => (
                  <option key={outlet} value={outlet}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("Libellé")}>
              <input
                type="text"
                value={charge.label}
                placeholder={OUTLET_LABELS[charge.outlet]}
                onChange={(event) => onChargeChange({ ...charge, label: event.target.value })}
              />
            </Field>
            <Field label={t("Montant (Rs)")}>
              <input
                type="text"
                inputMode="decimal"
                value={charge.amount}
                onChange={(event) => onChargeChange({ ...charge, amount: event.target.value })}
              />
            </Field>
            <div className="row" style={{ alignItems: "flex-end" }}>
              <button className="secondary" disabled={!(parseMoney(charge.amount) ?? 0)} onClick={onAddCharge}>
                {t("Imputer au compte")}
              </button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
