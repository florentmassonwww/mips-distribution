import type { Key, ReactNode } from "react";

/** [header (also the column key), cell renderer, optional class of the th/td (e.g. "num")]. */
export type Column<Row> = readonly [header: string, render: (row: Row) => ReactNode, className?: string];

interface DataTableProps<Row> {
  rows: readonly Row[];
  cols: readonly Column<Row>[];
  /** Shown instead of the table when there is no row. */
  empty: ReactNode;
  /** Makes rows clickable (and reachable with Tab, opened with Enter). */
  onRow?: ((row: Row) => void) | undefined;
  rowKey: (row: Row) => Key;
}

export function DataTable<Row>({ rows, cols, empty, onRow, rowKey }: DataTableProps<Row>) {
  if (!rows.length) return <div className="empty">{empty}</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {cols.map(([header, , className]) => (
              <th key={header} className={className}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className={onRow ? "click" : ""}
              onClick={onRow ? () => onRow(row) : undefined}
              tabIndex={onRow ? 0 : undefined}
              onKeyDown={
                onRow
                  ? (event) => {
                      if (event.key === "Enter") onRow(row);
                    }
                  : undefined
              }
            >
              {cols.map(([header, render, className]) => (
                <td key={header} className={className}>
                  {render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
