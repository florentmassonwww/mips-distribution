// Compatibility re-exports: the driver's screen now lives in src/field/ (readable TSX). Other
// legacy modules still import these under their compiled names.
export { FieldApp as uy } from "../field/FieldApp.tsx";
export { PaymentQrCode as xy } from "../field/PaymentQrCode.tsx";
export { AUDIT_ACTION_LABELS as Dy } from "../field/audit-labels.ts";
