import { useNavigate } from "react-router-dom";
import {
  Card,
  CsvExportLink,
  ERP_STATUS,
  formatDate,
  formatMoney,
  INVOICE_STATUS,
  PageHead,
  QueryView,
  StatusBadge,
  Table,
  Tile,
  t,
  useApi,
} from "../centrale/legacy.ts";
import type { Invoice } from "./types.ts";

const REFRESH_MS = 1e4;

type SummedField = "amount_minor" | "settled_minor";

/** Invoices with their totals; a row opens the whole chain from order to ERP entry. */
export function Invoices() {
  const navigate = useNavigate();
  const invoices = useApi<Invoice[]>(`/api/finance/invoices`, REFRESH_MS);
  return (
    <>
      <PageHead
        title={t(`Factures`)}
        sub={t(`De la facture à l'écriture ERP : ouvrez une ligne pour voir toute la chaîne.`)}
      >
        <CsvExportLink href={`/api/finance/invoices?format=csv`} />
      </PageHead>
      <QueryView q={invoices}>
        {(rows) => {
          const total = (field: SummedField) => rows.reduce((sum, invoice) => sum + invoice[field], 0);
          // Confirmed by the provider, net of refunds.
          const collected = rows.reduce((sum, invoice) => sum + invoice.paid_minor - invoice.refunded_minor, 0);
          return (
            <div className="stack">
              <div className="grid g4">
                <Tile label={t(`Facturé`)} value={formatMoney(total(`amount_minor`))} hint={`${rows.length} facture(s)`} />
                <Tile label={t(`Encaissé confirmé`)} value={formatMoney(collected)} />
                <Tile
                  label={t(`Réglé en banque`)}
                  value={formatMoney(total(`settled_minor`))}
                  hint={t(`confirmé non réglé : {0}`, formatMoney(collected - total(`settled_minor`)))}
                />
                <Tile label={t(`Reste à encaisser`)} value={formatMoney(total(`amount_minor`) - collected)} />
              </div>
              <Card title={t(`Factures`)} flush>
                <Table
                  rows={rows}
                  rowKey={(invoice) => invoice.id}
                  empty={t(`Aucune facture.`)}
                  onRow={(invoice) => navigate(`/finance/chaine/${invoice.order_id}`)}
                  cols={[
                    [
                      t(`Facture`),
                      (invoice) => (
                        <>
                          <strong>{invoice.number}</strong>
                          <div className="small muted">{invoice.order_number}</div>
                        </>
                      ),
                    ],
                    [t(`Émise`), (invoice) => formatDate(invoice.issued_at, true)],
                    [t(`Commerce`), (invoice) => invoice.customer],
                    [t(`Tournée`), (invoice) => invoice.route ?? `—`],
                    [t(`Montant`), (invoice) => formatMoney(invoice.amount_minor), `right`],
                    [t(`Encaissé confirmé`), (invoice) => formatMoney(invoice.paid_minor - invoice.refunded_minor), `right`],
                    [t(`Réglé en banque`), (invoice) => formatMoney(invoice.settled_minor), `right`],
                    [t(`État`), (invoice) => <StatusBadge map={INVOICE_STATUS} value={invoice.status} />],
                    [`ERP`, (invoice) => (invoice.erp_status ? <StatusBadge map={ERP_STATUS} value={invoice.erp_status} /> : `—`)],
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
