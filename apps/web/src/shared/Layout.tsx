import type { ReactNode } from "react";
import { translate } from "../i18n/translate.ts";
import type { BadgeKind } from "./Badge.tsx";

interface CardProps {
  title: ReactNode;
  /** Buttons or links shown at the right of the title. */
  actions?: ReactNode;
  children?: ReactNode;
  /** No inner padding (tables that run edge to edge). */
  flush?: boolean;
}

export function Card({ title, actions, children, flush }: CardProps) {
  return (
    <section className="card">
      <header>
        <h2>{title}</h2>
        {actions}
      </header>
      <div className={flush ? "" : "body"}>{children}</div>
    </section>
  );
}

interface TileProps {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  kind?: BadgeKind | undefined;
}

/** Key figure of a dashboard. */
export const Tile = ({ label, value, hint, kind }: TileProps) => (
  <div className={`tile ${kind ?? ""}`}>
    <div className="label">{label}</div>
    <div className="value">{value}</div>
    {hint && <div className="hint">{hint}</div>}
  </div>
);

export const CsvExportLink = ({ href }: { href: string }) => (
  <a href={href} download>
    {translate("Exporter en CSV")}
  </a>
);

interface PageHeaderProps {
  title: ReactNode;
  sub?: ReactNode;
  /** Page actions, at the right. */
  children?: ReactNode;
}

export const PageHeader = ({ title, sub, children }: PageHeaderProps) => (
  <div className="page-head row spread">
    <div>
      <h1>{title}</h1>
      {sub && <div className="muted">{sub}</div>}
    </div>
    {children && <div className="row">{children}</div>}
  </div>
);
