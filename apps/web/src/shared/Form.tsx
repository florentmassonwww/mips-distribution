import type { ReactNode } from "react";
import { translate } from "../i18n/translate.ts";

interface FieldProps {
  label: ReactNode;
  /** The input, select or textarea; the wrapping label makes the whole field clickable. */
  children?: ReactNode;
  hint?: ReactNode;
}

export function Field({ label, children, hint }: FieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && (
        <span className="small muted" style={{ marginTop: 4 }}>
          {hint}
        </span>
      )}
    </label>
  );
}

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Accessible name of the group and of the number input. */
  label?: string;
}

/** Whole-number input with − / + buttons (quantities); values are clamped to [min, max]. */
export function Stepper({ value, onChange, min = 0, max = 9999, label }: StepperProps) {
  const set = (next: number) => onChange(Math.max(min, Math.min(max, Number.isFinite(next) ? Math.trunc(next) : min)));
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button
        type="button"
        className="secondary"
        onClick={() => set(value - 1)}
        disabled={value <= min}
        aria-label={translate("Moins")}
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        min={min}
        max={max}
        onChange={(event) => set(Number(event.target.value))}
        aria-label={label}
      />
      <button
        type="button"
        className="secondary"
        onClick={() => set(value + 1)}
        disabled={value >= max}
        aria-label={translate("Plus")}
      >
        +
      </button>
    </div>
  );
}
