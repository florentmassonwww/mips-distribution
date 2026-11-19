// The route bundle cached on the phone, so the route can be driven without network.
// localStorage keys (unchanged from v0.1.0): md_bundle_<route id> holds the last bundle received,
// md_route_<user id> the route the agent has open (null when on the route list).
export { readBundle, saveBundle, readCurrentRoute, writeCurrentRoute, applyQueue, unitPrice } from "./legacy-bridge.js";
