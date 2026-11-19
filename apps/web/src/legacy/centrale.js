// Compatibility: the head office screens are now in src/centrale/ (readable TSX). Other legacy
// modules still import them under their compiled names.
export { Dashboard as Oy } from "../centrale/Dashboard.tsx";
export { Orders as Ay } from "../centrale/Orders.tsx";
export { OrderChain as My } from "../centrale/OrderChain.tsx";
export { RouteList as Ny } from "../centrale/Routes.tsx";
export { RouteDetail as Py } from "../centrale/RouteDetail.tsx";
export { Stock as Iy } from "../centrale/Stock.tsx";
export { describeException as Ry } from "../centrale/labels.ts";
