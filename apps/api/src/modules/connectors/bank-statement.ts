// Demo bank statement format: semicolon-separated CSV, one credit per line, amounts in decimal.
import { ApiError } from "../../core/errors.ts";
import type { BankStatementFormat, StatementLine } from "./types.ts";

export const STATEMENT_HEADER = "date;reference;libelle;montant_brut;frais;montant_net";

const BOM = 0xfeff;

/** "1250", "1250.5", "-3,05" → minor units; null when unreadable (more than 2 decimals, letters…). */
export function parseStatementAmount(text: string): number | null {
  const match = /^(-?)(\d+)(?:[.,](\d{1,2}))?$/.exec(text.trim());
  if (!match) return null;
  const sign = match[1] ? -1 : 1;
  return sign * (Number(match[2]) * 100 + Number((match[3] ?? "0").padEnd(2, "0")));
}

function parseLine(line: string, index: number): StatementLine {
  const cells = line.split(";");
  const [gross, fee, net] = [
    parseStatementAmount(cells[3] ?? ""),
    parseStatementAmount(cells[4] ?? ""),
    parseStatementAmount(cells[5] ?? ""),
  ];
  // Line numbers in messages count the header as line 1.
  const lineNumber = index + 2;
  const [valueDate, reference, label] = cells as [string, string | undefined, string | undefined];
  if (cells.length !== 6 || !/^\d{4}-\d{2}-\d{2}$/.test(valueDate) || !reference || gross === null || fee === null || net === null) {
    throw new ApiError(400, "bad_statement", `Ligne ${lineNumber} illisible.`);
  }
  if (gross - fee !== net) {
    throw new ApiError(400, "bad_statement", `Ligne ${lineNumber} : brut - frais ne donne pas le net.`);
  }
  return {
    valueDate,
    reference: reference.trim(),
    label: label!.trim(),
    grossMinor: gross,
    feeMinor: fee,
    netMinor: net,
  };
}

export const demoBankStatement: BankStatementFormat = {
  label: "Relevé de démonstration (CSV)",
  demo: true,
  toVerify: [
    "Format réel des relevés (CSV, MT940, camt.053) et canal de mise à disposition par la banque.",
    "Présence de la référence du prestataire sur chaque ligne, ou règlement en lot : un lot impose un rapport de règlement détaillé du prestataire.",
    "Frais prélevés à la source ou facturés à part ; date de valeur et fréquence des règlements.",
  ],
  parse(content: string): StatementLine[] {
    const withoutBom = content.charCodeAt(0) === BOM ? content.slice(1) : content;
    const lines = withoutBom
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines[0]?.toLowerCase() !== STATEMENT_HEADER) {
      throw new ApiError(400, "bad_statement", `En-tête attendu : ${STATEMENT_HEADER}`);
    }
    return lines.slice(1).map(parseLine);
  },
};
