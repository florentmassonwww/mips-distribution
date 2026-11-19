// Demo activity of "Boissons Démo Ltée" (and one route of "Grossiste Démo Océan"): five past days
// of routes with deliveries, sales, simulated payments, bank statements, ERP sync and daily close;
// yesterday's route with a manually built statement; today's routes still to be driven.
//
// Every step goes through the business functions and the simulated providers, in a fixed order:
// that order determines every generated identifier, so it must not change.
import { type Db, all, get } from "../core/db.ts";
import type { Actor } from "../core/actor.ts";
import { formatMinor } from "../core/format.ts";
import { addDays, businessDay, iso } from "../core/time.ts";
import { type DemoConnectorSet as Connectors, type SimulatedOutcome } from "../modules/connectors/types.ts";
import { type SyncActionResult, applySyncAction, closeRoute, startRoute } from "../modules/distribution/agent-sync.ts";
import { createRoute, loadRoute } from "../modules/distribution/delivery-routes.ts";
import { resolveException } from "../modules/distribution/exceptions.ts";
import { type CreateOrderInput as OrderInput, createOrder, setOrderStatus } from "../modules/distribution/orders.ts";
import { type PaymentMethod, defaultCompanySettings as defaultSettings } from "../modules/distribution/settings.ts";
import { closeDay, generateDemoStatement as demoBankStatement, importStatement as importBankStatement, syncAccountingEntries as syncErp } from "../modules/finance/index.ts";
import { initiatePayment as requestPayment, processNotification as handleNotification } from "../modules/payments/index.ts";
import { CUSTOMERS, PRODUCTS } from "./catalog.ts";
import { productIdOf, providerRef, seedActor } from "./companies.ts";

/** Origin given to payment requests made by the seed. */
const PAYMENT_ORIGIN = "http://127.0.0.1";
const DAMAGED_CRATE = "Casier endommagé au déchargement";
const STATEMENT_HEADER = "date;reference;libelle;montant_brut;frais;montant_net";
/** Payment methods used in turn on past days. */
const METHOD_ROTATION: PaymentMethod[] = ["paystation", "card_tpe", "juice", "link"];
/** [route name, vehicle] of past days, alternating with the day parity. */
const PAST_ROUTES: Array<[string, string]> = [
  ["Est - Flacq", "Camion 05 (démo)"],
  ["Ouest - Tamarin", "Camion 09 (démo)"],
];
const RECEIVERS = ["M. Paul", "Mme Devi", "M. Ali", "Mme Lakshmi", "M. Kumar"];

type OrderLineInput = OrderInput["lines"][number];
type SaleResult = Extract<SyncActionResult, { status: "applied" | "duplicate" }>["result"] & { invoiceId: string };

const line = (slug: string, sku: string, qty: number): OrderLineInput => ({ productId: productIdOf(slug, sku), qty });

/** Result of a seeded delivery or sale: the seed's own actions always apply and produce an invoice. */
function invoiced(outcome: SyncActionResult): SaleResult {
  if (outcome.status === "rejected") throw new Error(`demo seed action ${outcome.id} rejected: ${outcome.message}`);
  const { result } = outcome;
  if (result.invoiceId === null) throw new Error(`demo seed action ${outcome.id} produced no invoice`);
  return { ...result, invoiceId: result.invoiceId };
}


export async function seedDistributionHistory(db: Db, connectors: Connectors, now: Date): Promise<void> {
  const today = businessDay(now);
  const yesterday = addDays(now, -1);
  const yesterdayDay = businessDay(yesterday);

  const dispatcher = seedActor(db, "u_bd_centrale");
  const agent1 = seedActor(db, "u_bd_agent1");
  const finance = seedActor(db, "u_bd_finance");
  const customerIds = CUSTOMERS.map(([key]) => `c_bd_${key}`);
  const skus = PRODUCTS.map(([sku]) => sku);

  /** The simulated provider settles the transaction and its notification is processed. */
  const notify = (providerRef: string, method: PaymentMethod, outcome: SimulatedOutcome, at: Date): void => {
    const notification = connectors.payments[method].simulate(providerRef, outcome, at)!;
    handleNotification(db, connectors, method, notification.rawBody, notification.signature, at);
  };
  const orderLines = (orderId: string) =>
    all<{ id: string; qty_ordered: number }>(db, "SELECT id, qty_ordered FROM order_lines WHERE order_id = ?", orderId);
  /** Delivers an order; `shortQty` units of its first line are refused (damaged crate). */
  const deliver = (agent: Actor, orderId: string, receiver: string, shortQty: number, at: Date): SaleResult =>
    invoiced(applySyncAction(
      db,
      agent,
      {
        id: `seed-${orderId}`,
        type: "deliver",
        payload: {
          orderId,
          lines: orderLines(orderId).map((orderLine, index) => ({
            lineId: orderLine.id,
            qtyDelivered: index === 0 ? orderLine.qty_ordered - shortQty : orderLine.qty_ordered,
          })),
          reason: shortQty ? DAMAGED_CRATE : "",
          pod: { name: receiver, note: "" },
          at: iso(at),
        },
      },
      at,
    ));
  const sell = (agent: Actor, actionId: string, routeId: string, customerId: string, lines: OrderLineInput[], receiver: string, at: Date) =>
    invoiced(applySyncAction(
      db,
      agent,
      { id: actionId, type: "sale", payload: { routeId, customerId, lines, pod: { name: receiver, note: "" }, at: iso(at) } },
      at,
    ));
  const pay = async (agent: Actor, sale: SaleResult, method: PaymentMethod, idempotencyKey: string, at: Date) =>
    (
      await requestPayment(
        db,
        connectors,
        agent,
        { invoiceId: sale.invoiceId, method, amountMinor: sale.amountMinor, idempotencyKey },
        PAYMENT_ORIGIN,
        at,
      )
    ).payment;

  // Past days (6 to 2 days ago): a full day each, closed by finance.
  for (let daysAgo = 6; daysAgo >= 2; daysAgo--) {
    const at = addDays(now, -daysAgo);
    const day = businessDay(at);
    const agent = seedActor(db, daysAgo % 2 ? "u_bd_agent1" : "u_bd_agent2");
    const [routeName, vehicle] = PAST_ROUTES[daysAgo % 2]!;
    const routeId = createRoute(db, dispatcher, { name: routeName, day, agentId: agent.id, vehicle, customerIds: [] }, at).id;
    const orderIds = [0, 1, 2].map(
      (n) =>
        createOrder(
          db,
          dispatcher,
          {
            customerId: customerIds[(daysAgo * 2 + n) % customerIds.length]!,
            routeId,
            note: "",
            lines: [
              line("bd", skus[(daysAgo + n) % 8]!, 4 + ((daysAgo + n) % 5) * 2),
              line("bd", skus[(daysAgo + n + 3) % 8]!, 6 + n * 3),
            ],
          },
          at,
        ).id,
    );
    for (const orderId of orderIds) setOrderStatus(db, dispatcher, orderId, "prepared", at);
    loadRoute(db, dispatcher, routeId, [line("bd", "COL-150", 12), line("bd", "EAU-150", 12)], at);
    startRoute(db, agent, routeId, at);

    // Every third day, the second delivery is one unit short.
    const sales = orderIds.map((orderId, n) => {
      const shortQty = Number(n === 1 && daysAgo % 3 == 0);
      return deliver(agent, orderId, `${RECEIVERS[(daysAgo + n) % RECEIVERS.length]} (réception)`, shortQty, at);
    });
    sales.push(
      sell(
        agent,
        `seed-sale-j${daysAgo}`,
        routeId,
        customerIds[(daysAgo * 2 + 4) % customerIds.length]!,
        [line("bd", "COL-150", 3 + daysAgo), line("bd", "EAU-150", 6)],
        RECEIVERS[daysAgo % RECEIVERS.length]!,
        at,
      ),
    );

    for (const [n, sale] of sales.entries()) {
      // On even days the first customer's card is declined once before another payment.
      if (n === 0 && daysAgo % 2 == 0) {
        const refused = await pay(agent, sale, "card_tpe", `seed-${sale.invoiceId}-refus`, at);
        notify(providerRef(refused), "card_tpe", "failure", at);
      }
      const method = METHOD_ROTATION[(daysAgo + n) % METHOD_ROTATION.length]!;
      const payment = await pay(agent, sale, method, `seed-${sale.invoiceId}-${method}`, at);
      notify(providerRef(payment), method, "success", at);
    }

    closeRoute(db, agent, routeId, at);
    importBankStatement(db, connectors, finance, `releve-demo-${day}.csv`, demoBankStatement(db, "co_bd", false, at), at);
    await syncErp(db, connectors, "co_bd", {}, undefined, at);
    for (const exception of all<{ id: string }>(
      db,
      "SELECT id FROM exceptions WHERE company_id = 'co_bd' AND status = 'open' AND domain = 'ops'",
    )) {
      resolveException(db, dispatcher, exception.id, ["ops"], "approved", "Avoir émis au commerce (démonstration)", at);
    }
    closeDay(db, finance, day, at);
  }

  // Yesterday: route closed, statement holding only the Juice settlement, day not closed yet.
  const yesterdayRoute = createRoute(
    db,
    dispatcher,
    { name: "Sud - Mahébourg", day: yesterdayDay, agentId: agent1.id, vehicle: "Camion 12 (démo)", customerIds: [] },
    yesterday,
  ).id;
  const corailOrder = createOrder(
    db,
    dispatcher,
    { customerId: "c_bd_corail", routeId: yesterdayRoute, note: "", lines: [line("bd", "BIE-33", 10), line("bd", "EAU-150", 30)] },
    yesterday,
  ).id;
  const bambouOrder = createOrder(
    db,
    dispatcher,
    { customerId: "c_bd_bambou", routeId: yesterdayRoute, note: "", lines: [line("bd", "COL-150", 12), line("bd", "CIT-33", 6)] },
    yesterday,
  ).id;
  for (const orderId of [corailOrder, bambouOrder]) setOrderStatus(db, dispatcher, orderId, "prepared", yesterday);
  loadRoute(db, dispatcher, yesterdayRoute, [line("bd", "COL-150", 20), line("bd", "JUS-100", 10)], yesterday);
  startRoute(db, agent1, yesterdayRoute, yesterday);

  const payInFull = async (sale: SaleResult, method: PaymentMethod): Promise<void> => {
    const payment = await pay(agent1, sale, method, `seed-${sale.invoiceId}-${method}`, yesterday);
    notify(providerRef(payment), method, "success", yesterday);
  };
  const corailSale = deliver(agent1, corailOrder, "M. Paul (réception)", 0, yesterday);
  await payInFull(corailSale, "juice");
  const bambouSale = deliver(agent1, bambouOrder, "Mme Devi", 1, yesterday);
  await payInFull(bambouSale, "card_tpe");
  const soleilSale = sell(
    agent1,
    "seed-sale-1",
    yesterdayRoute,
    "c_bd_soleil",
    [line("bd", "COL-150", 8), line("bd", "JUS-100", 4)],
    "M. Ali",
    yesterday,
  );
  await payInFull(soleilSale, "paystation");
  closeRoute(db, agent1, yesterdayRoute, yesterday);

  const juiceRef = get<{ provider_ref: string }>(db, "SELECT provider_ref FROM payments WHERE invoice_id = ?", corailSale.invoiceId)!
    .provider_ref;
  const juiceFee = Math.round((corailSale.amountMinor * defaultSettings().payments.methods.juice.feeBps) / 1e4);
  importBankStatement(
    db,
    connectors,
    seedActor(db, "u_bd_finance"),
    `releve-demo-${yesterdayDay}.csv`,
    `${STATEMENT_HEADER}\n${yesterdayDay};${juiceRef};REGLEMENT JUICE;${formatMinor(corailSale.amountMinor)};${formatMinor(juiceFee)};${formatMinor(corailSale.amountMinor - juiceFee)}\n`,
    yesterday,
  );
  await syncErp(db, connectors, "co_bd", {}, undefined, yesterday);

  seedTodayRoutes(db, dispatcher, agent1, today, now);
}

/** Today's routes: one loaded and ready to start, one still being prepared, one unassigned order. */
function seedTodayRoutes(db: Db, dispatcher: Actor, agent1: Actor, today: string, now: Date): void {
  const northRoute = createRoute(
    db,
    dispatcher,
    {
      name: "Nord - Grand-Baie",
      day: today,
      agentId: agent1.id,
      vehicle: "Camion 07 (démo)",
      customerIds: ["c_bd_tilakaz", "c_bd_bellevue", "c_bd_lagon", "c_bd_flamboyant"],
    },
    now,
  ).id;
  const northOrders = [
    createOrder(
      db,
      dispatcher,
      {
        customerId: "c_bd_tilakaz",
        routeId: northRoute,
        note: "Livrer avant 11 h",
        lines: [line("bd", "BIE-33", 6), line("bd", "COL-150", 10), line("bd", "EAU-150", 12)],
      },
      now,
    ).id,
    createOrder(
      db,
      dispatcher,
      {
        customerId: "c_bd_bellevue",
        routeId: northRoute,
        note: "",
        lines: [line("bd", "COL-150", 24), line("bd", "CIT-33", 8), line("bd", "JUS-100", 6)],
      },
      now,
    ).id,
    createOrder(
      db,
      dispatcher,
      { customerId: "c_bd_lagon", routeId: northRoute, note: "", lines: [line("bd", "BIE-33", 4), line("bd", "EAG-50", 5)] },
      now,
    ).id,
  ];
  for (const orderId of northOrders) setOrderStatus(db, dispatcher, orderId, "prepared", now);
  loadRoute(
    db,
    dispatcher,
    northRoute,
    [line("bd", "COL-150", 30), line("bd", "EAU-150", 40), line("bd", "BIE-33", 10), line("bd", "MAL-33", 8), line("bd", "ENE-25", 4)],
    now,
  );

  const centreRoute = createRoute(
    db,
    dispatcher,
    {
      name: "Centre - Curepipe",
      day: today,
      agentId: "u_bd_agent2",
      vehicle: "Camion 03 (démo)",
      customerIds: ["c_bd_central", "c_bd_plaza"],
    },
    now,
  ).id;
  createOrder(
    db,
    dispatcher,
    { customerId: "c_bd_central", routeId: centreRoute, note: "", lines: [line("bd", "COL-150", 6), line("bd", "EAU-150", 10)] },
    now,
  );
  createOrder(
    db,
    dispatcher,
    {
      customerId: "c_bd_plaza",
      routeId: centreRoute,
      note: "Quai de livraison n° 2",
      lines: [line("bd", "BIE-33", 20), line("bd", "JUS-100", 15), line("bd", "ENE-25", 6)],
    },
    now,
  );
  // Not on any route yet.
  createOrder(
    db,
    dispatcher,
    { customerId: "c_bd_corail", note: "À affecter", lines: [line("bd", "EAU-150", 50), line("bd", "EAG-50", 20)] },
    now,
  );

  // Second company: one route with a prepared order.
  const oceanDispatcher = seedActor(db, "u_go_centrale");
  const oceanRoute = createRoute(
    db,
    oceanDispatcher,
    {
      name: "Centre - Quatre-Bornes",
      day: today,
      agentId: "u_go_agent1",
      vehicle: "Fourgon 1 (démo)",
      customerIds: ["c_go_central", "c_go_plaza"],
    },
    now,
  ).id;
  const oceanOrder = createOrder(
    db,
    oceanDispatcher,
    { customerId: "c_go_plaza", routeId: oceanRoute, note: "", lines: [line("go", "COL-150", 10), line("go", "EAU-150", 20)] },
    now,
  ).id;
  setOrderStatus(db, oceanDispatcher, oceanOrder, "prepared", now);
  loadRoute(db, oceanDispatcher, oceanRoute, [line("go", "CIT-33", 10)], now);
}
