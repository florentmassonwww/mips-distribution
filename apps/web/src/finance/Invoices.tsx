import { useNavigate } from "react-router-dom";
import { translate, translateCount } from "../i18n/translate.ts";
import { StatusBadge } from "../shared/Badge.tsx";
import { DataTable } from "../shared/DataTable.tsx";
import { formatDate, formatMoney } from "../shared/format.ts";
import { useApi } from "../shared/hooks.ts";
import { ERP_SYNC_STATUS, INVOICE_STATUS } from "../shared/labels.ts";
import { Card, CsvExportLink, PageHeader, Tile } from "../shared/Layout.tsx";
import { QueryView } from "../shared/QueryView.tsx";
import type { Invoice } from "./types.ts";

const REFRESH_MS = 1e4;

type SummedField = "amount_minor" | "settled_minor";

/** Invoices with their totals; a row opens the whole chain from order to ERP entry. */
export function Invoices() {
  const navigate = useNavigate();
  const invoices = useApi<Invoice[]>(`/api/finance/invoices`, REFRESH_MS);
  return (
    <>
      <PageHeader
        title={translate(`Factures`)}
        sub={translate(`De la facture à l'écriture ERP : ouvrez une ligne pour voir toute la chaîne.`)}
      >
        <CsvExportLink href={`/api/finance/invoices?format=csv`} />
      </PageHeader>
      <QueryView q={invoices}>
        {(rows) => {
          const total = (field: SummedField) => rows.reduce((sum, invoice) => sum + invoice[field], 0);
          // Confirmed by the provider, net of refunds.
          const collected = rows.reduce((sum, invoice) => sum + invoice.paid_minor - invoice.refunded_minor, 0);
          return (
            <div className="stack">
              <div className="grid g4">
                <Tile label={translate(`Facturé`)} value={formatMoney(total(`amount_minor`))} hint={translateCount(rows.length, `{0} facture`, `{0} factures`)} />
                <Tile label={translate(`Encaissé confirmé`)} value={formatMoney(collected)} />
                <Tile
                  label={translate(`Réglé en banque`)}
                  value={formatMoney(total(`settled_minor`))}
                  hint={translate(`confirmé non réglé : {0}`, formatMoney(collected - total(`settled_minor`)))}
                />
                <Tile label={translate(`Reste à encaisser`)} value={formatMoney(total(`amount_minor`) - collected)} />
              </div>
              <Card title={translate(`Factures`)} flush>
                <DataTable
                  rows={rows}
                  rowKey={(invoice) => invoice.id}
                  empty={translate(`Aucune facture.`)}
                  onRow={(invoice) => navigate(`/finance/chaine/${invoice.order_id}`)}
                  cols={[
                    [
                      translate(`Facture`),
                      (invoice) => (
                        <>
                          <strong>{invoice.number}</strong>
                          <div className="small muted">{invoice.order_number}</div>
                        </>
                      ),
                    ],
                    [translate(`Émise`), (invoice) => formatDate(invoice.issued_at, true)],
                    [translate(`Commerce`), (invoice) => invoice.customer],
                    [translate(`Tournée`), (invoice) => invoice.route ?? `—`],
                    [translate(`Montant`), (invoice) => formatMoney(invoice.amount_minor), `right`],
                    [translate(`Encaissé confirmé`), (invoice) => formatMoney(invoice.paid_minor - invoice.refunded_minor), `right`],
                    [translate(`Réglé en banque`), (invoice) => formatMoney(invoice.settled_minor), `right`],
                    [translate(`État`), (invoice) => <StatusBadge map={INVOICE_STATUS} value={invoice.status} />],
                    [`ERP`, (invoice) => (invoice.erp_status ? <StatusBadge map={ERP_SYNC_STATUS} value={invoice.erp_status} /> : `—`)],
                  ]}
                />
              </Card>
            </div>
          );
        }}
      </QueryView>
    </>
  );
}
