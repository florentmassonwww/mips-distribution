// Request bodies of the finance endpoints.
import { z } from "zod";

export const importStatementInput = z.object({
  filename: z.string().min(1).max(120),
  content: z.string().min(10).max(2e6),
});
export type ImportStatementInput = z.infer<typeof importStatementInput>;

export const closeDayInput = z.object({ day: z.string() });
export type CloseDayInput = z.infer<typeof closeDayInput>;

export const syncAccountingEntriesInput = z.object({ ids: z.array(z.string()).max(200).optional() });
export type SyncAccountingEntriesInput = z.infer<typeof syncAccountingEntriesInput>;
