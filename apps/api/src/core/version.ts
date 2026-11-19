import { createRequire } from "node:module";

/** Application version, from apps/api/package.json. */
export const VERSION: string = createRequire(import.meta.url)("../../package.json").version;
