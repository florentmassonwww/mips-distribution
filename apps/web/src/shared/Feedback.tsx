import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { translate } from "../i18n/translate.ts";
import { Field } from "./Form.tsx";
import { parseMoney } from "./format.ts";

export type ToastKind = "ok" | "err" | "warn" | "info";

/**
 * What the dialog asks for: a reason (text of at least 3 characters, the default), an amount
 * ("money", answered as minor units in a string) or a plain confirmation (answered "ok").
 */
export type AskKind = "reason" | "money" | "confirm";

export interface AskOptions {
  title: string;
  text?: ReactNode;
  kind?: AskKind;
  /** Label of the input (default "Motif"). */
  label?: ReactNode;
  /** Initial value of the input. */
  initial?: string;
  /** Text of the confirm button (default "Confirmer"). */
  confirm?: ReactNode;
  /** Red confirm button for destructive actions. */
  danger?: boolean;
}

export interface Feedback {
  toast: (message: string, kind?: ToastKind) => void;
  /** Opens the dialog; resolves with the answer, or null when cancelled. */
  ask: (options: AskOptions) => Promise<string | null>;
  /** Runs an action, toasts `success` or the error message; resolves whether it succeeded. */
  run: (action: () => Promise<unknown>, success?: string) => Promise<boolean>;
}

interface Toast {
  id: number;
  msg: string;
  kind: ToastKind;
}

interface PendingQuestion extends AskOptions {
  resolve: (answer: string | null) => void;
}

export const FeedbackContext = createContext<Feedback | null>(null);

/** Toasts and dialogs of the page; must be used under FeedbackProvider. */
export const useFeedback = (): Feedback => useContext(FeedbackContext) as Feedback;

// Errors stay longer on screen: they usually need to be read.
const TOAST_MS = 3500;
const ERROR_TOAST_MS = 7000;

export function FeedbackProvider({ children }: { children?: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [question, setQuestion] = useState<PendingQuestion | null>(null);
  const [input, setInput] = useState("");

  const toast = useCallback((message: string, kind: ToastKind = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, msg: message, kind }]);
    setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), kind === "err" ? ERROR_TOAST_MS : TOAST_MS);
  }, []);

  const ask = useCallback(
    (options: AskOptions) =>
      new Promise<string | null>((resolve) => {
        setInput(options.initial ?? "");
        setQuestion({ ...options, resolve });
      }),
    [],
  );

  const run = useCallback(
    async (action: () => Promise<unknown>, success?: string) => {
      try {
        await action();
        if (success) toast(success);
        return true;
      } catch (error) {
        toast((error as Error).message, "err");
        return false;
      }
    },
    [toast],
  );

  const answer = (value: string | null) => {
    question?.resolve(value);
    setQuestion(null);
  };

  const kind = question?.kind ?? "reason";
  const valid = kind === "confirm" || (kind === "money" ? (parseMoney(input) ?? 0) > 0 : input.trim().length >= 3);

  return (
    <FeedbackContext.Provider value={{ toast, ask, run }}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((item) => (
          <div key={item.id} className={`toast ${item.kind}`} role={item.kind === "err" ? "alert" : "status"}>
            {item.msg}
          </div>
        ))}
      </div>
      {question && (
        <div
          className="overlay"
          role="dialog"
          aria-modal="true"
          aria-label={question.title}
          onKeyDown={(event) => {
            if (event.key === "Escape") answer(null);
          }}
        >
          <form
            className="dialog stack"
            onSubmit={(event) => {
              event.preventDefault();
              if (valid) answer(kind === "money" ? String(parseMoney(input)) : kind === "confirm" ? "ok" : input.trim());
            }}
          >
            <h2>{question.title}</h2>
            {question.text && <p className="muted">{question.text}</p>}
            {kind !== "confirm" && (
              <Field label={question.label ?? translate("Motif")}>
                {kind === "money" ? (
                  <input
                    type="text"
                    inputMode="decimal"
                    autoFocus
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                  />
                ) : (
                  <textarea autoFocus value={input} onChange={(event) => setInput(event.target.value)} />
                )}
              </Field>
            )}
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button type="button" className="secondary" onClick={() => answer(null)}>
                {translate("Annuler")}
              </button>
              <button type="submit" className={question.danger ? "danger" : ""} disabled={!valid}>
                {question.confirm ?? translate("Confirmer")}
              </button>
            </div>
          </form>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}
