// Amounts are integers in the minor unit (cents). No floating-point arithmetic on money except the
// fee rate, rounded once.

/** Expected provider fee. A rate still to be agreed (`null`) gives no expectation at all. */
export interface ExpectedFee {
  minor: number;
  /** False while the rate is to be agreed: `minor` (0) is then not an expectation. */
  known: boolean;
}

/** Fee on the full amount of an attempt, rounded to the minor unit; 0 and unknown while the rate is to be agreed. */
export function expectedFee(amountMinor: number, feeBps: number | null): ExpectedFee {
  return feeBps === null ? { minor: 0, known: false } : { minor: Math.round((amountMinor * feeBps) / 1e4), known: true };
}

/** "1234.50" for 123450. */
export const formatMinor = (minor: number): string => (minor / 100).toFixed(2);
