// Types of the legacy (extracted, untyped) modules that the admin, platform and shell code imports
// while those modules are being rewritten. Only the names used here are declared, under their
// compiled names. Remove a block once its module is TypeScript.

declare module "*/legacy/i18n.js" {
  /** Translates a French source text (French → English table), replacing {0}, {1}… with args. */
  export function K(text: string, ...args: unknown[]): string;
}

declare module "*/legacy/shared.js" {
  import type { Context, ReactElement, ReactNode } from "react";

  /** Error thrown by the API client: HTTP status and error code from the API. */
  export interface ApiError extends Error {
    code: string;
    status: number;
  }

  /** State of a GET request made with the `Y` hook. */
  export interface Query<T> {
    data: T | null;
    error: ApiError | null;
    loading: boolean;
    at: number;
    reload: () => Promise<void>;
  }

  export interface SessionUser {
    id: string;
    name: string;
    role: string;
    companyId: string | null;
    companyName: string | null;
    vertical: string | null;
  }

  /** GET /api/session */
  export interface Session {
    demoMode: boolean;
    version: string;
    today: string;
    user: SessionUser | null;
  }

  export interface SessionContextValue {
    session: Session;
    refresh: () => Promise<void>;
  }

  export interface AskOptions {
    kind?: "confirm" | "reason" | "money";
    title: string;
    text?: string;
    label?: string;
    initial?: string;
    danger?: boolean;
    confirm?: string;
  }

  /** Toasts, dialogs and the "run an action, toast its outcome" helper. */
  export interface UiApi {
    toast: (message: string, kind?: string) => void;
    ask: (options: AskOptions) => Promise<string | null>;
    run: (action: () => Promise<unknown>, successMessage?: string) => Promise<boolean>;
  }

  /** [header, cell renderer, optional class name of the column] */
  export type Column<T> = readonly [header: string, render: (row: T) => ReactNode, className?: string];

  /** Label and badge kind per status. */
  export type StatusMap = Record<string, readonly [label: string, kind: string]>;

  /** API client: same-origin JSON request; throws an ApiError on failure. */
  export function J<T = unknown>(method: string, url: string, body?: unknown): Promise<T>;
  /** GET hook, optionally polled every `intervalMs` while the page is visible. */
  export function Y<T>(url: string | null, intervalMs?: number): Query<T>;
  /** Formats an amount in minor units (Rs). */
  export function X(minor: number | null | undefined): string;
  /** Parses an amount typed in rupees into minor units, or null. */
  export function R_(text: string): number | null;
  /** Minor units → editable rupee amount ("150.50"). */
  export function z_(minor: number): string;
  /** Formats a date (with the time when `withTime`). */
  export function Z(date: string | null | undefined, withTime?: boolean): string;
  /** Role label, club wording for club companies. */
  export function tv(role: string, vertical?: string | null): string;
  /** Payment method labels. */
  export const X_: Record<string, string>;
  /** Payment statuses. */
  export const W_: StatusMap;

  export function cv(props: { kind?: string; children?: ReactNode }): ReactElement;
  export function lv(props: { map: StatusMap; value: string }): ReactElement;
  export function Q(props: { title: ReactNode; actions?: ReactNode; children?: ReactNode; flush?: boolean }): ReactElement;
  export function dv(props: { href: string }): ReactElement;
  export function fv(props: { title: ReactNode; sub?: ReactNode; children?: ReactNode }): ReactElement;
  export function pv<T>(props: { q: Query<T>; children: (data: T) => ReactNode }): ReactElement;
  export function mv<T>(props: {
    rows: T[];
    cols: readonly Column<T>[];
    empty: ReactNode;
    onRow?: (row: T) => void;
    rowKey: (row: T) => string | number;
  }): ReactElement;
  export function $(props: { label: ReactNode; children?: ReactNode; hint?: ReactNode }): ReactElement;
  export function vv(props: { children?: ReactNode }): ReactElement;
  export function yv(props: { light?: boolean }): ReactElement;
  export function _v(): UiApi;
  export const bv: Context<SessionContextValue | null>;
  export function xv(): SessionContextValue;
}

declare module "*/legacy/centrale.js" {
  import type { ReactElement } from "react";
  export function Oy(): ReactElement;
  export function Ay(): ReactElement;
  export function My(props: { back: string }): ReactElement;
  export function Ny(): ReactElement;
  export function Py(): ReactElement;
  export function Iy(): ReactElement;
}

declare module "*/legacy/club.js" {
  import type { ReactElement } from "react";
  export function ob(): ReactElement;
  export function cb(): ReactElement;
  export function lb(): ReactElement;
  export function ub(): ReactElement;
  export function db(): ReactElement;
  export function fb(): ReactElement;
  export function pb(): ReactElement;
  export function mb(): ReactElement;
  export function hb(): ReactElement;
  export function gb(): ReactElement;
  export function _b(): ReactElement;
  export function vb(): ReactElement | null;
}

declare module "*/legacy/field.js" {
  import type { ReactElement } from "react";
  export function uy(): ReactElement;
}

declare module "*/legacy/finance.js" {
  import type { ReactElement } from "react";
  export function zy(props: { domain: "ops" | "finance" }): ReactElement;
  export function By(): ReactElement;
  export function Vy(): ReactElement;
  export function Hy(): ReactElement;
  export function Uy(): ReactElement;
  export function Gy(): ReactElement;
}
