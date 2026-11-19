// Compatibility layer (step 1a): the connectors are now in src/modules/connectors/*.ts; other
// legacy modules still import them under the compiled names. Removed once every module is rewritten.
export { STATEMENT_HEADER as Wd, createDemoConnectors as Yd } from "../modules/connectors/index.ts";
