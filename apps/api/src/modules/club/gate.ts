// Gate access: a badge is allowed, flagged (let in, but sent to the desk) or denied, depending on
// the member's status and the age of the overdue amount. Decisions are taken at the desk
// (attendant) or by a reader at the gate, whose requests are signed with a per-device key.
import { createHmac } from "node:crypto";
import { z } from "zod";
import type { Actor } from "../../core/actor.ts";
import { type Db, all, get, run, transaction } from "../../core/db.ts";
import { ApiError } from "../../core/errors.ts";
import { formatMinor } from "../../core/format.ts";
import { newId } from "../../core/ids.ts";
import { businessDay, iso } from "../../core/time.ts";
import { memberAccount } from "./allocation.ts";
import { loadSettings } from "./legacy-deps.ts";
import { actorCompanyId, memberById, portalPath } from "./shared.ts";
import type { ClubConnectors, GateDecision, GateDeviceRow, MemberRow } from "./types.ts";

export const gateCheckInput = z.object({ credential: z.string().min(1).max(64) });

export interface AccessDecision {
  decision: GateDecision;
  reason: string;
  memberId: string | null;
  overdueMinor: number;
  overdueDays: number;
}

const deny = (reason: string, memberId: string | null): AccessDecision => ({
  decision: "deny",
  reason,
  memberId,
  overdueMinor: 0,
  overdueDays: 0,
});

/** Access decision for a badge (case and surrounding spaces ignored). */
export function accessDecision(db: Db, companyId: string, badge: string, now: Date = new Date()): AccessDecision {
  const member = get<MemberRow>(
    db,
    "SELECT * FROM members WHERE company_id = ? AND badge = ?",
    companyId,
    badge.trim().toUpperCase(),
  );
  if (!member) return deny("Badge inconnu.", null);
  if (member.status === "resigned") return deny("Adhésion résiliée.", member.id);
  if (member.status === "suspended") return deny("Membre suspendu par le club.", member.id);

  const gate = loadSettings(db, companyId).club.gate;
  const account = memberAccount(db, member.id, businessDay(now));
  const base = { memberId: member.id, overdueMinor: account.overdueMinor, overdueDays: account.overdueDays };
  const overdueAmount = formatMinor(account.overdueMinor);
  const aboveThreshold = account.overdueMinor >= gate.minAmountMinor;
  // denyAfterDays = 0 disables denial: late members are then only flagged.
  if (aboveThreshold && gate.denyAfterDays > 0 && account.overdueDays >= gate.denyAfterDays) {
    return {
      ...base,
      decision: "deny",
      reason: `Retard de ${account.overdueDays} jour(s) : ${overdueAmount} MUR à régulariser avant l'entrée.`,
    };
  }
  if (aboveThreshold && account.overdueDays >= gate.flagAfterDays) {
    return {
      ...base,
      decision: "flag",
      reason: `Entrée signalée : ${overdueAmount} MUR en retard de ${account.overdueDays} jour(s).`,
    };
  }
  return { ...base, decision: "allow", reason: "Compte à jour." };
}

/** Signing key of a gate reader, derived from the server secret (never stored). */
export const deviceKey = (serverSecret: string, deviceId: string): string =>
  createHmac("sha256", serverSecret).update(`gate:${deviceId}`).digest("hex");

/** Credential as logged: only its last four characters are kept. */
export const credentialHint = (credential: string): string =>
  (credential.length <= 4 ? "****" : `${"*".repeat(credential.length - 4)}${credential.slice(-4)}`).toUpperCase();

function recordGateEvent(
  db: Db,
  companyId: string,
  decision: AccessDecision,
  credential: string,
  source: "reader" | "attendant",
  deviceId: string | null,
  now: Date,
): void {
  run(
    db,
    "INSERT INTO gate_events (id, company_id, member_id, device_id, credential_hint, decision, reason, overdue_minor, overdue_days, source, at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
    newId("gev"),
    companyId,
    decision.memberId,
    deviceId,
    credentialHint(credential),
    decision.decision,
    decision.reason,
    decision.overdueMinor,
    decision.overdueDays,
    source,
    iso(now),
  );
}

/** Check by the desk attendant: the decision, logged, with the member's card. */
export function checkAtDesk(db: Db, actor: Actor, credential: string, now: Date = new Date()) {
  const companyId = actorCompanyId(actor);
  return transaction(db, () => {
    const decision = accessDecision(db, companyId, credential, now);
    recordGateEvent(db, companyId, decision, credential, "attendant", null, now);
    const member = decision.memberId ? memberById(db, decision.memberId) : null;
    return {
      ...decision,
      member: member
        ? {
            id: member.id,
            number: member.number,
            name: member.name,
            status: member.status,
            reference: member.reference,
            portalPath: portalPath(member),
          }
        : null,
    };
  });
}

export interface ReaderAnswer {
  decision: GateDecision;
  /** Whether the barrier opens: flagged members are let in. */
  open: boolean;
  display: string;
}

/** Decision for a gate reader, logged with the device. */
export function readerDecision(
  db: Db,
  companyId: string,
  deviceId: string,
  credential: string,
  now: Date = new Date(),
): ReaderAnswer {
  return transaction(db, () => {
    const decision = accessDecision(db, companyId, credential, now);
    recordGateEvent(db, companyId, decision, credential, "reader", deviceId, now);
    return {
      decision: decision.decision,
      open: decision.decision !== "deny",
      display:
        decision.decision === "allow"
          ? "Bienvenue"
          : decision.decision === "flag"
            ? "Bienvenue - merci de passer à l'accueil"
            : "Accès refusé - voir l'accueil",
    };
  });
}

/** Signed request of a gate reader: verifies the device and its signature, then decides. */
export function handleReaderRequest(
  db: Db,
  connectors: ClubConnectors,
  serverSecret: string,
  deviceId: string,
  rawBody: string,
  signature: string | undefined,
  now: Date = new Date(),
): { requestId: string } & ReaderAnswer {
  const device = get<GateDeviceRow>(db, "SELECT * FROM gate_devices WHERE id = ?", deviceId);
  if (!device || !device.active) throw new ApiError(401, "unknown_device", "Lecteur inconnu ou désactivé.");
  const request = connectors.access.verifyRequest(rawBody, signature, deviceKey(serverSecret, device.id), now);
  return {
    requestId: request.requestId,
    ...readerDecision(db, device.company_id, device.id, request.credential, now),
  };
}

/** Latest 300 gate events, optionally since an instant (ISO). */
export const listGateEvents = (db: Db, companyId: string, since?: string): unknown[] =>
  all(
    db,
    `SELECT e.id, e.at, e.decision, e.reason, e.source, e.credential_hint, e.overdue_minor, e.overdue_days, m.id AS member_id, m.number AS member_number, m.name AS member, d.name AS device
    FROM gate_events e LEFT JOIN members m ON m.id = e.member_id LEFT JOIN gate_devices d ON d.id = e.device_id WHERE e.company_id = ? ${since ? "AND e.at >= ?" : ""} ORDER BY e.at DESC, e.rowid DESC LIMIT 300`,
    companyId,
    ...(since ? [since] : []),
  );
