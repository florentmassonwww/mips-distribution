// Audit log of a company (administration) or of the platform (company, user and settings changes).
import { useState } from "react";
import { K } from "../legacy/i18n.js";
import {
  type Column,
  Q as Card,
  X as formatMoney,
  Y as useQuery,
  Z as formatDate,
  dv as CsvExportLink,
  fv as PageHead,
  mv as Table,
  pv as Loaded,
  tv as roleLabel,
  xv as useSession,
} from "../legacy/shared.js";

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
  const entries = useQuery<AuditEntry[]>(`/api/${scope}/audit`);
  const [filter, setFilter] = useState("");

  const columns: Column<AuditEntry>[] = [
    [K("Date"), (entry) => <span className="nowrap">{formatDate(entry.at, true)}</span>],
    ...(scope === "platform" ? [[K("Entreprise"), (entry: AuditEntry) => entry.company ?? "—"] as const] : []),
    [
      K("Acteur"),
      (entry) => (
        <>
          {entry.actor}
          <div className="small muted">{roleLabel(entry.actor_role, vertical)}</div>
        </>
      ),
    ],
    [K("Action"), (entry) => <span className="code">{entry.action}</span>],
    [K("Détails"), (entry) => <span className="small">{formatDetails(entry.details)}</span>],
  ];

  return (
    <>
      <PageHead
        title={K("Journal d'audit")}
        sub={K(
          scope === "platform"
            ? "Actions d'administration : entreprises, utilisateurs, paramètres."
            : "Qui a fait quoi, et quand. Le journal n'est ni modifiable ni supprimable depuis l'application.",
        )}
      >
        <input
          type="text"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder={K("Filtrer (action, acteur, objet)")}
          aria-label={K("Filtrer")}
          style={{ width: 260 }}
        />
        <CsvExportLink href={`/api/${scope}/audit?format=csv`} />
      </PageHead>
      <Card title={K("500 dernières entrées")} flush>
        <Loaded q={entries}>
          {(rows) => (
            <Table
              // The filter matches anywhere in the entry (action, actor, object, details).
              rows={rows.filter((entry) => !filter || JSON.stringify(entry).toLowerCase().includes(filter.toLowerCase()))}
              rowKey={(entry) => entry.id}
              empty={K("Aucune entrée.")}
              cols={columns}
            />
          )}
        </Loaded>
      </Card>
    </>
  );
}
