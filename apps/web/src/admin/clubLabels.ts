// Labels of the club collections screens (reminder levels, overdue ages, gate decisions).
import { K } from "../legacy/i18n.js";
import { X as formatMoney } from "../legacy/shared.js";

/** Reminder level → [label, badge kind]. Level 0 is the plain statement. */
export const REMINDER_LEVELS: Record<number, readonly [label: string, kind: string]> = {
  0: [K("Relevé envoyé"), "info"],
  1: [K("Rappel"), "info"],
  2: [K("Second rappel"), "warn"],
  3: [K("Dernier rappel"), "err"],
};

/** "12 j": a number of days overdue. */
export const formatOverdueDays = (days: number): string => K("{0} j", days);

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
  if (check.decision === "flag") return K("Signalée : {0} en retard de {1} jour(s).", formatMoney(overdueMinor), overdueDays);
  // Only a refusal caused by the debt gets the amount; other refusals (suspended, unknown badge) keep their reason.
  if (check.decision === "deny" && overdueMinor > 0 && check.reason.startsWith("Retard")) {
    return K("Refusée : {0} en retard de {1} jour(s), à régulariser avant l'entrée.", formatMoney(overdueMinor), overdueDays);
  }
  return K(check.reason);
};

/** Ageing buckets of the overdue balance, in display order. */
export const AGEING_BUCKETS: readonly (readonly [key: string, label: string])[] = [
  ["current", K("Non échu")],
  ["d1_30", K("1 à 30 j")],
  ["d31_60", K("31 à 60 j")],
  ["d61_90", K("61 à 90 j")],
  ["d90", K("Plus de 90 j")],
];
