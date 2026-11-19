// Member payment references: `PREFIX-00012-CC`, where CC is an ISO 7064 MOD 97-10 check digit of
// the member number. Members quote it on bank transfers; the check digit catches typos.

/** Check digits of a member number (two digits). */
export const checkDigits = (memberNumber: string): string =>
  String(97 - ((Number(memberNumber) * 100) % 97)).padStart(2, "0");

/** Payment reference of a member. */
export const paymentReference = (prefix: string, memberNumber: string): string =>
  `${prefix}-${memberNumber}-${checkDigits(memberNumber)}`;

export interface FoundReference {
  number: string;
  /** False when the check digits do not match the number (typo, or not a member reference). */
  valid: boolean;
  /** The text as it appears on the statement. */
  raw: string;
}

/** Finds a member reference in free text (bank statement reference and label), separators optional. */
export function findReference(text: string, prefix: string): FoundReference | null {
  const match = new RegExp(`\\b${prefix}[\\s-]?(\\d{5})[\\s-]?(\\d{2})\\b`, "i").exec(text);
  if (!match) return null;
  const number = match[1]!;
  return { number, valid: checkDigits(number) === match[2], raw: match[0] };
}
