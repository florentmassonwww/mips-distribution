// Labels of the club collections screens (reminder levels, overdue ages, gate decisions).
import { translate } from "../i18n/translate.ts";
import { formatMoney } from "../shared/format.ts";
import type { StatusEntry } from "../shared/labels.ts";

/** Reminder level → [label, badge kind]. Level 0 is the plain statement. */
export const REMINDER_LEVELS: Readonly<Record<number, StatusEntry>> = {
  0: [translate("Relevé envoyé"), "info"],
  1: [translate("Rappel"), "info"],
  2: [translate("Second rappel"), "warn"],
  3: [translate("Dernier rappel"), "err"],
};

/** "12 j": a number of days overdue. */
export const formatOverdueDays = (days: number): string => translate("{0} j", days);

/** A gate decision, as returned by a badge check (camelCase) or the gate log (snake_case). */
export interface GateDecision {
  decision: string;
  reason: string;
  overdueMinor?: number;
  overdue_minor?: number;
  overdueDays?: number;
  overdue_days?: number;
}

/** Explains a gate decision: the overdue amount and age for a debt, otherwise the reason. */
export const describeGateDecision = (check: GateDecision): string => {
  const overdueMinor = check.overdueMinor ?? check.overdue_minor ?? 0;
  const overdueDays = check.overdueDays ?? check.overdue_days ?? 0;
  if (check.decision === "flag") return translate("Signalée : {0} en retard de {1} jour(s).", formatMoney(overdueMinor), overdueDays);
  // Only a refusal caused by the debt gets the amount; other refusals (suspended, unknown badge) keep their reason.
  if (check.decision === "deny" && overdueMinor > 0 && check.reason.startsWith("Retard")) {
    return translate("Refusée : {0} en retard de {1} jour(s), à régulariser avant l'entrée.", formatMoney(overdueMinor), overdueDays);
  }
  return translate(check.reason);
};

/** Ageing buckets of the overdue balance, in display order. */
export const AGEING_BUCKETS: readonly (readonly [key: string, label: string])[] = [
  ["current", translate("Non échu")],
  ["d1_30", translate("1 à 30 j")],
  ["d31_60", translate("31 à 60 j")],
  ["d61_90", translate("61 à 90 j")],
  ["d90", translate("Plus de 90 j")],
];
