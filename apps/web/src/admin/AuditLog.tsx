// Audit log of a company (administration) or of the platform (company, user and settings changes).
import { useState } from "react";
import { translate } from "../i18n/translate.ts";
import { type Column, DataTable } from "../shared/DataTable.tsx";
import { formatDate, formatMoney } from "../shared/format.ts";
import { useApi } from "../shared/hooks.ts";
import { roleLabel } from "../shared/labels.ts";
import { Card, CsvExportLink, PageHeader } from "../shared/Layout.tsx";
import { QueryView } from "../shared/QueryView.tsx";
import { useSession } from "../shared/session.ts";

export type AuditScope = "admin" | "platform";

interface AuditEntry {
  id: string;
  at: string;
  action: string;
  entity: string;
  entity_id: string;
  actor: string;
  actor_role: string;
  company: string | null;
  details: Record<string, unknown>;
}

/** "amount : Rs 1,200 · method : link": amounts (keys ending in Minor) are formatted as money. */
const formatDetails = (details: Record<string, unknown>): string =>
  Object.entries(details)
    .map(
      ([key, value]) =>
        `${key.replace(/Minor$/, "")} : ${
          typeof value == "number" && key.endsWith("Minor") ? formatMoney(value) : typeof value == "object" ? JSON.stringify(value) : String(value)
        }`,
    )
    .join(" · ");

export function AuditLogPage({ scope }: { scope: AuditScope }) {
  const vertical = useSession().session.user?.vertical;
  const entries = useApi<AuditEntry[]>(`/api/${scope}/audit`);
  const [filter, setFilter] = useState("");

  const columns: Column<AuditEntry>[] = [
    [translate("Date"), (entry) => <span className="nowrap">{formatDate(entry.at, true)}</span>],
    ...(scope === "platform" ? [[translate("Entreprise"), (entry: AuditEntry) => entry.company ?? "—"] as const] : []),
    [
      translate("Acteur"),
      (entry) => (
        <>
          {entry.actor}
          <div className="small muted">{roleLabel(entry.actor_role, vertical)}</div>
        </>
      ),
    ],
    [translate("Action"), (entry) => <span className="code">{entry.action}</span>],
    [translate("Détails"), (entry) => <span className="small">{formatDetails(entry.details)}</span>],
  ];

  return (
    <>
      <PageHeader
        title={translate("Journal d'audit")}
        sub={translate(
          scope === "platform"
            ? "Actions d'administration : entreprises, utilisateurs, paramètres."
            : "Qui a fait quoi, et quand. Le journal n'est ni modifiable ni supprimable depuis l'application.",
        )}
      >
        <input
          type="text"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder={translate("Filtrer (action, acteur, objet)")}
          aria-label={translate("Filtrer")}
          style={{ width: 260 }}
        />
        <CsvExportLink href={`/api/${scope}/audit?format=csv`} />
      </PageHeader>
      <Card title={translate("500 dernières entrées")} flush>
        <QueryView q={entries}>
          {(rows) => (
            <DataTable
              // The filter matches anywhere in the entry (action, actor, object, details).
              rows={rows.filter((entry) => !filter || JSON.stringify(entry).toLowerCase().includes(filter.toLowerCase()))}
              rowKey={(entry) => entry.id}
              empty={translate("Aucune entrée.")}
              cols={columns}
            />
          )}
        </QueryView>
      </Card>
    </>
  );
}
