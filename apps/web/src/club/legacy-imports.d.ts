// Types of the legacy (extracted, untyped) modules the club screens still import under their
// compiled names. They are being rewritten in parallel; these declarations describe only what the
// club area uses and go away once those modules are TypeScript.

declare module "*/legacy/i18n.js" {
  /** Translates a French text (identity in French); `{0}`, `{1}`… are replaced by `args`. */
  export function K(text: string, ...args: (string | number)[]): string;
}

declare module "*/legacy/shared.js" {
  import type { ReactNode, ReactElement } from "react";

  /** `[label, badge kind]` per status value. */
  export type StatusMap = Record<string, readonly [string, string]>;

  export interface ApiError extends Error {
    status: number;
    code: string;
  }

  export interface Query<T> {
    data: T | null;
    error: ApiError | null;
    loading: boolean;
    at: number;
    reload: () => Promise<void>;
  }

  export interface AskOptions {
    /** "reason" (default): text of at least 3 characters; "money": positive amount; "confirm": no input. */
    kind?: "reason" | "money" | "confirm";
    title: string;
    text?: string;
    label?: string;
    confirm?: string;
    danger?: boolean;
    initial?: string;
  }

  export interface Ui {
    toast: (message: string, kind?: string) => void;
    /** Resolves to the typed value (amount in minor units as a string for "money", "ok" for "confirm"), or null when cancelled. */
    ask: (options: AskOptions) => Promise<string | null>;
    /** Runs an action, toasts `success` when it worked or the error message otherwise. */
    run: (action: () => Promise<void>, success?: string) => Promise<boolean>;
  }

  export interface SessionUser {
    id: string;
    name: string;
    role: string;
    companyId: string;
    companyName: string;
    vertical: string;
  }

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

  /** `[header, cell renderer, cell class name]`. */
  export type Column<T> = readonly [string, (row: T) => ReactNode, string?];

  export function J<T = unknown>(method: string, url: string, body?: unknown): Promise<T>;
  export function Y<T>(url: string | null, refreshMs?: number): Query<T>;
  export function X(minor: number | null | undefined): string;
  export function R_(text: string): number | null;
  export function Z(iso: string | null | undefined, withTime?: boolean): string;
  export function F_(path: string): string;
  export function I_(path: string): string;
  export function _v(): Ui;
  export function xv(): SessionContextValue;

  export function $(props: { label: ReactNode; hint?: ReactNode; children?: ReactNode }): ReactElement;
  export function Q(props: { title: ReactNode; actions?: ReactNode; flush?: boolean; children?: ReactNode }): ReactElement;
  export function cv(props: { kind?: string | undefined; children?: ReactNode }): ReactElement;
  export function lv(props: { map: StatusMap; value: string }): ReactElement;
  export function uv(props: { label: ReactNode; value: ReactNode; hint?: ReactNode; kind?: string }): ReactElement;
  export function dv(props: { href: string }): ReactElement;
  export function fv(props: { title: ReactNode; sub?: ReactNode; children?: ReactNode }): ReactElement;
  export function pv<T>(props: { q: Query<T>; children: (data: T) => ReactNode }): ReactElement;
  export function mv<T>(props: {
    rows: T[];
    cols: Column<T>[];
    empty: ReactNode;
    onRow?: (row: T) => unknown;
    rowKey: (row: T) => string | number;
  }): ReactElement;
  export function yv(props: { light?: boolean }): ReactElement;

  export const $_: Record<string, string>;
  export const G_: StatusMap;
  export const W_: StatusMap;
  export const Y_: StatusMap;
  export const av: StatusMap;
  export const nv: StatusMap;
  export const sv: StatusMap;
  export const iv: Record<string, string>;
  export const ov: Record<string, string>;
  export const rv: Record<string, string>;
}

declare module "*/legacy/admin.js" {
  /** Role of the signed-in user ("" when signed out). */
  export function $y(): string;
  /** A fresh idempotency key. */
  export function Qy(): string;
  /** Text explaining a gate decision. */
  export function ib(outcome: {
    decision: string;
    reason: string;
    overdueMinor?: number;
    overdue_minor?: number;
    overdueDays?: number;
    overdue_days?: number;
  }): string;
  /** "{0} j" (days). */
  export function rb(days: number): string;
  /** Roles of the club secretariat. */
  export const eb: readonly string[];
  /** Roles of the club accounting. */
  export const tb: readonly string[];
  /** `[label, badge kind]` per reminder level. */
  export const nb: Record<number, readonly [string, string]>;
  /** `[bucket, label]` of the ageing of amounts due. */
  export const ab: readonly (readonly [string, string])[];
}

declare module "*/legacy/field.js" {
  import type { ReactElement } from "react";
  /** QR code of `value`. */
  export function xy(props: { value: string }): ReactElement;
}
