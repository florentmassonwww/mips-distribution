// Front-desk screen (/club/accueil, mobile layout): badge check with the gate's decision, the
// member's arrears and a QR code to pay at once, and today's passages.
import { useState } from "react";
import { describeGateDecision, formatOverdueDays } from "../admin/clubLabels.ts";
import { PaymentQrCode } from "../field/PaymentQrCode.tsx";
import { translate } from "../i18n/translate.ts";
import { apiRequest } from "../shared/api.ts";
import { StatusBadge } from "../shared/Badge.tsx";
import { useFeedback } from "../shared/Feedback.tsx";
import { Field } from "../shared/Form.tsx";
import { formatDate, formatMoney } from "../shared/format.ts";
import { useApi } from "../shared/hooks.ts";
import { ACCESS_DECISION, MEMBER_STATUS } from "../shared/labels.ts";
import { LanguageToggle } from "../shared/LanguageToggle.tsx";
import { absoluteHashUrl, hashHref } from "../shared/links.ts";
import { QueryView } from "../shared/QueryView.tsx";
import { useSession } from "../shared/session.ts";
import type { DeskCheck, GateDecisionValue, GateEvent } from "./types.ts";

/** Demo badges: allowed, flagged and refused members, and an unknown badge. */
const DEMO_BADGES = ["B00001", "B00008", "B00010", "B00014", "B99999"];

const decisionClass = (decision: GateDecisionValue): string =>
  decision === "allow" ? "success" : decision === "flag" ? "notice warn" : "notice err";

export function FrontDesk() {
  const ui = useFeedback();
  const { session, refresh } = useSession();
  const [credential, setCredential] = useState("");
  const [result, setResult] = useState<DeskCheck | null>(null);
  const passages = useApi<GateEvent[]>("/api/club/gate/events?today=1", 6000);

  const check = (typed: string) =>
    ui.run(async () => {
      setResult(await apiRequest<DeskCheck>("POST", "/api/club/gate/check", { credential: typed }));
      setCredential("");
      await passages.reload();
    });

  const switchProfile = async () => {
    await apiRequest("POST", "/api/logout");
    await refresh();
    location.href = hashHref("/");
  };

  const headline: Record<GateDecisionValue, string> = {
    allow: translate("ENTRÉE AUTORISÉE"),
    flag: translate("ENTRÉE SIGNALÉE"),
    deny: translate("ENTRÉE REFUSÉE"),
  };

  return (
    <div className="mobile stack">
      <div className="mobile-head">
        <div className="row spread">
          <h1>{translate("Accueil du club")}</h1>
          <div className="row">
            <LanguageToggle />
            <button className="sm ghost" onClick={switchProfile}>
              {translate("Changer de profil")}
            </button>
          </div>
        </div>
        <div className="muted">
          {session.user?.companyName}
          {" · "}
          {session.user?.name}
        </div>
      </div>
      <form
        className="card"
        onSubmit={(event) => {
          event.preventDefault();
          if (credential.trim()) void check(credential.trim());
        }}
      >
        <div className="body stack">
          <Field label={translate("Badge, carte ou code du membre")}>
            {/* Badges are upper case; typing is forgiving. */}
            <input
              type="text"
              value={credential}
              onChange={(event) => setCredential(event.target.value.toUpperCase())}
              autoFocus
              autoComplete="off"
            />
          </Field>
          <button className="big" disabled={!credential.trim()}>
            {translate("Contrôler")}
          </button>
          {session.demoMode && (
            <div className="chips">
              {DEMO_BADGES.map((badge) => (
                <button key={badge} type="button" className="chip" onClick={() => check(badge)}>
                  {badge}
                </button>
              ))}
            </div>
          )}
        </div>
      </form>
      {result && (
        <div className="card">
          <div className="body stack">
            <div className={decisionClass(result.decision)} style={{ textAlign: "center", padding: 18 }}>
              <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>{headline[result.decision]}</div>
              <div>{describeGateDecision(result)}</div>
            </div>
            {result.member && (
              <dl className="kv">
                <dt>{translate("Membre")}</dt>
                <dd>
                  <strong>{result.member.name}</strong>
                  {" · "}
                  {result.member.number}
                </dd>
                <dt>{translate("État")}</dt>
                <dd>
                  <StatusBadge map={MEMBER_STATUS} value={result.member.status} />
                </dd>
                {result.overdueMinor > 0 && (
                  <>
                    <dt>{translate("En retard")}</dt>
                    <dd>
                      {formatMoney(result.overdueMinor)}
                      {" · "}
                      {formatOverdueDays(result.overdueDays)}
                    </dd>
                  </>
                )}
              </dl>
            )}
            {result.member && result.overdueMinor > 0 && (
              <>
                <div className="small muted">
                  {translate("Le membre peut régulariser tout de suite : il scanne ce code et paie en ligne sur son téléphone.")}
                </div>
                <PaymentQrCode value={absoluteHashUrl(result.member.portalPath)} />
              </>
            )}
          </div>
        </div>
      )}
      <div className="card">
        <header>
          <h2>{translate("Passages du jour")}</h2>
        </header>
        <QueryView q={passages}>
          {(rows) => (
            <ul className="plain" style={{ padding: "0 16px" }}>
              {rows.slice(0, 12).map((event) => (
                <li key={event.id} className="row spread">
                  <span>
                    <StatusBadge map={ACCESS_DECISION} value={event.decision} /> {event.member ?? translate("inconnu")}
                  </span>
                  <span className="small muted">{formatDate(event.at, true)}</span>
                </li>
              ))}
              {!rows.length && <li className="muted">{translate("Aucun passage.")}</li>}
            </ul>
          )}
        </QueryView>
      </div>
    </div>
  );
}
