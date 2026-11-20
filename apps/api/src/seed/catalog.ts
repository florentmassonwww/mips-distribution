// Fixed tables of the fictitious demo data. Every name, address and phone number is invented and
// marked "(démo)"; e-mail addresses use the reserved `.invalid` top-level domain.
import type { ClubOutlet } from "../modules/distribution/settings.ts";

/** [sku, name, unit, price in rupees, warehouse stock]. */
export type ProductSpec = readonly [sku: string, name: string, unit: string, priceRupees: number, stock: number];

/** [key, name, address, zone, on the "Grands comptes" price list]. */
export type CustomerOutletSpec = readonly [key: string, name: string, address: string, zone: string, keyAccount?: boolean];

/** [key, name, role]. */
export type UserSpec = readonly [key: string, name: string, role: string];

export const PRODUCTS: readonly ProductSpec[] = [
  ["BIE-33", "Bière blonde 33 cl", "casier de 24", 1150, 400],
  ["COL-150", "Boisson gazeuse cola 1,5 L", "pack de 6", 390, 600],
  ["CIT-33", "Soda citron 33 cl", "casier de 24", 520, 350],
  ["EAU-150", "Eau plate 1,5 L", "pack de 6", 150, 900],
  ["EAG-50", "Eau gazeuse 50 cl", "pack de 12", 260, 300],
  ["JUS-100", "Jus de fruits 1 L", "carton de 12", 780, 250],
  ["MAL-33", "Boisson maltée 33 cl", "casier de 24", 690, 200],
  ["ENE-25", "Boisson énergisante 25 cl", "pack de 24", 1320, 120],
];

export const CUSTOMER_OUTLETS: readonly CustomerOutletSpec[] = [
  ["tilakaz", "Boutique Ti Lakaz (démo)", "Route Royale, Grand-Baie", "Nord"],
  ["bellevue", "Supérette Belle Vue (démo)", "Avenue des Flamboyants, Pereybère", "Nord", true],
  ["lagon", "Snack Lagon Bleu (démo)", "Front de mer, Trou-aux-Biches", "Nord"],
  ["flamboyant", "Restaurant Le Flamboyant (démo)", "Rue du Marché, Triolet", "Nord"],
  ["central", "Tabagie Centrale (démo)", "Rue Châteauneuf, Curepipe", "Centre"],
  ["plaza", "Supermarché Plaza (démo)", "Route Saint-Jean, Quatre-Bornes", "Centre", true],
  ["corail", "Hôtel Baie Corail (démo)", "Route côtière, Mahébourg", "Sud", true],
  ["bambou", "Boutique Bambou (démo)", "Rue des Tulipes, Rose-Belle", "Sud"],
  ["soleil", "Snack Soleil (démo)", "Place du Marché, Mahébourg", "Sud"],
];

// ---------------------------------------------------------------------------------------------
// Club

export const CLUB_COMPANY_ID = "co_cs";
/** Origin used to build the members' portal links in the seeded data. */
export const SEED_ORIGIN = "http://127.0.0.1:8788";

/** [code, name, billing, fee in rupees]. */
export type PlanSpec = readonly [code: string, name: string, billing: "annual" | "monthly", feeRupees: number];

export const CLUB_PLANS: readonly PlanSpec[] = [
  ["IND", "Individuel", "annual", 18000],
  ["FAM", "Famille", "annual", 30000],
  ["JUN", "Junior (moins de 18 ans)", "annual", 6000],
  ["SEN", "Senior (65 ans et plus)", "annual", 9000],
  ["MEN", "Mensuel", "monthly", 1800],
];

/** [name, plan code, has an e-mail address]. The index in this list drives the scenario below. */
export type MemberSpec = readonly [name: string, planCode: string, hasEmail: boolean];

export const CLUB_MEMBERS: readonly MemberSpec[] = [
  ["Aditi Ramdin (démo)", "IND", true],
  ["Christophe Lebon (démo)", "FAM", true],
  ["Farah Joomun (démo)", "IND", true],
  ["Kevin Appadoo (démo)", "JUN", false],
  ["Laura Bégué (démo)", "SEN", true],
  ["Nitin Gopaul (démo)", "IND", true],
  ["Sandrine Hoareau (démo)", "FAM", true],
  ["Yannick Ramsamy (démo)", "IND", false],
  ["Zara Peerbux (démo)", "MEN", true],
  ["Olivier Desvaux (démo)", "MEN", true],
  ["Priya Seewoo (démo)", "IND", true],
  ["Thomas Li Kwong (démo)", "FAM", true],
  ["Amina Dulloo (démo)", "JUN", false],
  ["Gérard Maurel (démo)", "SEN", false],
  ["Hélène Tsang (démo)", "IND", true],
];

/** [outlet, label, base amount in rupees]: consumptions charged to members' accounts. */
export type ConsumptionSpec = readonly [outlet: ClubOutlet, label: string, baseRupees: number];

export const CLUB_CONSUMPTIONS: readonly ConsumptionSpec[] = [
  ["bar", "Bar - consommations", 650],
  ["restaurant", "Restaurant - déjeuner", 1450],
  ["tennis", "Location court de tennis", 400],
  ["squash", "Location court de squash", 350],
  ["golf", "Green fee invités", 1200],
  ["shop", "Boutique - balles et accessoires", 890],
  ["events", "Soirée du club", 2500],
  ["restaurant", "Restaurant - dîner", 2200],
];

/** Annual (or monthly) fee of a plan, in minor units. */
export function planFeeMinor(code: string): number {
  return CLUB_PLANS.find(([planCode]) => planCode === code)![3] * 100;
}
