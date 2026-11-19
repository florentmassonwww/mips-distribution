// Accounting export (/club/export): balanced entries of a period (current month by default), to
// import into the club's accounting software.
import { useState } from "react";
import { Link } from "react-router-dom";
import { translate } from "../i18n/translate.ts";
import { Badge } from "../shared/Badge.tsx";
import { DataTable } from "../shared/DataTable.tsx";
import { formatMoney } from "../shared/format.ts";
import { useApi } from "../shared/hooks.ts";
import { Card, CsvExportLink, PageHeader, Tile } from "../shared/Layout.tsx";
import { QueryView } from "../shared/QueryView.tsx";
import { useSession } from "../shared/session.ts";
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
      <PageHeader
        title={translate("Export comptable")}
        sub={translate("Écritures de la période, équilibrées, à importer dans le logiciel comptable du club.")}
      >
        <input
          type="date"
          value={range.from}
          max={range.to}
          onChange={(event) => setRange({ ...range, from: event.target.value })}
          aria-label={translate("Du")}
          style={{ width: "auto" }}
        />
        <input
          type="date"
          value={range.to}
          min={range.from}
          max={session.today}
          onChange={(event) => setRange({ ...range, to: event.target.value })}
          aria-label={translate("Au")}
          style={{ width: "auto" }}
        />
        <CsvExportLink href={`/api/club/accounting?format=csv&${query}`} />
      </PageHeader>
      <div className="stack">
        <div className="notice warn">
          {translate(
            "Le gabarit de colonnes, le plan comptable et les journaux sont des valeurs de démonstration. L'import automatique dans le logiciel comptable dépend de l'édition utilisée, de ses outils d'import et de la validation par la comptabilité du club : il est à évaluer, rien n'est garanti à ce stade.",
          )}
        </div>
        <QueryView q={accounting}>
          {(data) => (
            <>
              <div className="grid g3">
                <Tile label={translate("Total débit")} value={formatMoney(data.totals.debit)} />
                <Tile label={translate("Total crédit")} value={formatMoney(data.totals.credit)} />
                <Tile
                  label={translate("Équilibre")}
                  value={
                    data.totals.balanced ? <Badge kind="ok">{translate("Équilibré")}</Badge> : <Badge kind="err">{translate("Déséquilibré")}</Badge>
                  }
                  hint={translate("{0} ligne(s)", data.lines.length)}
                />
              </div>
              <Card
                title={translate("Écritures")}
                actions={<Link to="/club/erp">{translate("File de synchronisation comptable")}</Link>}
                flush
              >
                <DataTable
                  rows={data.lines.slice(0, MAX_LINES)}
                  rowKey={(line) => `${line.piece}${line.account}${line.debit}${line.credit}${line.date}${line.label}`}
                  empty={translate("Aucune écriture sur la période.")}
                  cols={[
                    [translate("Date"), (line) => line.date],
                    [translate("Journal"), (line) => line.journal],
                    [translate("Compte"), (line) => <span className="code nb">{line.account}</span>],
                    [translate("Compte tiers"), (line) => line.aux || "—"],
                    [translate("Pièce"), (line) => <span className="small">{line.piece}</span>],
                    [translate("Libellé"), (line) => <span className="small">{line.label}</span>],
                    [translate("Débit"), (line) => (line.debit ? formatMoney(line.debit) : ""), "right"],
                    [translate("Crédit"), (line) => (line.credit ? formatMoney(line.credit) : ""), "right"],
                  ]}
                />
              </Card>
            </>
          )}
        </QueryView>
      </div>
    </>
  );
}
