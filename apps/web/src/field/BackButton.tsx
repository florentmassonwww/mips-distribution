import type { ReactNode } from "react";

interface BackButtonProps {
  onClick: () => void;
  children?: ReactNode;
}

/** "← <where>" link-style button at the top of the driver's sub-screens. */
export function BackButton({ onClick, children }: BackButtonProps) {
  return (
    <button className="secondary sm" onClick={onClick}>
      {"← "}
      {children}
    </button>
  );
}
