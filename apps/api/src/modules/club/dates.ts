// Calendar arithmetic on business days (YYYY-MM-DD), independent of the time zone.

export { addDaysToDay, daysBetween } from "@mips/core";

/** Start of a Mauritius business day, as a Date. */
export const startOfBusinessDay = (day: string): Date => new Date(`${day}T00:00:00+04:00`);
