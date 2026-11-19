// Accounting export (/club/export): balanced entries of a period (current month by default), to
// import into the club's accounting software.
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Badge,
  Card,
  CsvLink,
  formatMoney,
  Loaded,
  PageHead,
  Table,
  t,
  Tile,
  useApi,
  useSession,
} from "./legacy.ts";
import type { AccountingData } from "./types.ts";

/** At most this many entries are listed; the CSV export has them all. */
const MAX_LINES = 400;

export function AccountingExport() {
  const { session } = useSession();
  const [range, setRange] = useState({ from: `${session.today.slice(0, 7)}-01`, to: session.today });
  const query = `from=${range.from}&to=${range.to}`;
  const accounting = useApi<AccountingData>(`/api/club/accounting?${query}`);
  return (
    <>
      <PageHead
        title={t("Export comptable")}
        sub={t("Écritures de la période, équilibrées, à importer dans le logiciel comptable du club.")}
      >
        <input
          type="date"
          value={range.from}
          max={range.to}
          onChange={(event) => setRange({ ...range, from: event.target.value })}
          aria-label={t("Du")}
          style={{ width: "auto" }}
        />
        <input
          type="date"
          value={range.to}
          min={range.from}
          max={session.today}
          onChange={(event) => setRange({ ...range, to: event.target.value })}
          aria-label={t("Au")}
          style={{ width: "auto" }}
        />
        <CsvLink href={`/api/club/accounting?format=csv&${query}`} />
      </PageHead>
      <div className="stack">
        <div className="notice warn">
          {t(
            "Le gabarit de colonnes, le plan comptable et les journaux sont des valeurs de démonstration. L'import automatique dans le logiciel comptable dépend de l'édition utilisée, de ses outils d'import et de la validation par la comptabilité du club : il est à évaluer, rien n'est garanti à ce stade.",
          )}
        </div>
        <Loaded q={accounting}>
          {(data) => (
            <>
              <div className="grid g3">
                <Tile label={t("Total débit")} value={formatMoney(data.totals.debit)} />
                <Tile label={t("Total crédit")} value={formatMoney(data.totals.credit)} />
                <Tile
                  label={t("Équilibre")}
                  value={
                    data.totals.balanced ? <Badge kind="ok">{t("Équilibré")}</Badge> : <Badge kind="err">{t("Déséquilibré")}</Badge>
                  }
                  hint={t("{0} ligne(s)", data.lines.length)}
                />
              </div>
              <Card
                title={t("Écritures")}
                actions={<Link to="/club/erp">{t("File de synchronisation comptable")}</Link>}
                flush
              >
                <Table
                  rows={data.lines.slice(0, MAX_LINES)}
                  rowKey={(line) => `${line.piece}${line.account}${line.debit}${line.credit}${line.date}${line.label}`}
                  empty={t("Aucune écriture sur la période.")}
                  cols={[
                    [t("Date"), (line) => line.date],
                    [t("Journal"), (line) => line.journal],
                    [t("Compte"), (line) => <span className="code nb">{line.account}</span>],
                    [t("Compte tiers"), (line) => line.aux || "—"],
                    [t("Pièce"), (line) => <span className="small">{line.piece}</span>],
                    [t("Libellé"), (line) => <span className="small">{line.label}</span>],
                    [t("Débit"), (line) => (line.debit ? formatMoney(line.debit) : ""), "right"],
                    [t("Crédit"), (line) => (line.credit ? formatMoney(line.credit) : ""), "right"],
                  ]}
                />
              </Card>
            </>
          )}
        </Loaded>
      </div>
    </>
  );
}
