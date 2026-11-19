import { platform } from "./platform.mjs";
import { centrale } from "./centrale.mjs";
import { agent } from "./agent.mjs";
import { payments } from "./payments.mjs";
import { finance } from "./finance.mjs";
import { admin } from "./admin.mjs";
import { club } from "./club.mjs";

export const scenarios = [...platform, ...centrale, ...agent, ...payments, ...finance, ...admin, ...club];
