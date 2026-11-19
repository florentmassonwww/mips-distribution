import type { ReactNode } from "react";
import type { StatusMap } from "./labels.ts";

/** Colour variants of `.badge` in style.css ("" is the neutral grey). */
export type BadgeKind = "" | "info" | "warn" | "ok" | "err";

interface BadgeProps {
  kind?: BadgeKind | undefined;
  children?: ReactNode;
}

export const Badge = ({ kind = "", children }: BadgeProps) => <span className={`badge ${kind}`}>{children}</span>;

interface StatusBadgeProps {
  map: StatusMap;
  value: string;
}

/** Badge for an API status; an unknown status is shown raw, in a neutral badge. */
export const StatusBadge = ({ map, value }: StatusBadgeProps) => (
  <Badge kind={map[value]?.[1]}>{map[value]?.[0] ?? value}</Badge>
);
