# Tests de caractérisation de la v0.1.0

Le source de la v0.1.0, ses 43 tests et son cahier de recette sont perdus. Ils sont remplacés par
une **suite de caractérisation** : 52 scénarios, 706 appels d'API, joués contre la v0.1.0 compilée
(`reference/v0.1.0/`) et enregistrés dans `tests/characterization/golden/`. Toute
reconstruction doit produire les mêmes réponses.

## Lancer la suite

```bash
npm test                                   # compare les 52 scénarios aux fichiers de référence
node tests/characterization/run.mjs --only=payment   # seulement les scénarios dont le nom contient « payment »
node tests/characterization/run.mjs --print --only=payment-partial   # affiche la transcription
npm run golden:update                      # réenregistre depuis la référence (à ne faire que si un scénario change)
```

Prérequis : Node 22.13 ou plus et Chromium pour Playwright (`npx playwright install chromium`).
Durée : environ 35 secondes.

## Fonctionnement

- **Pilotage par l'API.** Chaque scénario ouvre une instance neuve de la référence dans Chromium
  (stockage vide, base réinitialisée), se connecte avec les profils de démonstration
  (`POST /api/demo/login`) et appelle l'API comme le ferait l'interface, en-tête CSRF compris.
- **Déterminisme.** L'horloge est figée au samedi 17 octobre 2026, 08:00 (heure de Maurice) et
  avance d'une seconde par appel. Le générateur aléatoire de la page est remplacé par un générateur
  à graine fixe. Deux exécutions donnent donc exactement le même résultat.
- **Normalisation.** Les identifiants générés (`ord_…`, `pay_…`, UUID), les jetons de lien,
  les références simulées des prestataires (`PS-DEMO-…`) et l'adresse des liens publics sont
  remplacés par des repères stables (`<ord#1>`, `<token#1>`, `<origin>/payer/…`), numérotés
  par ordre d'apparition. Un autre serveur, qui génère d'autres valeurs aléatoires, peut ainsi
  être comparé à la référence. Les montants, états, messages et dates ne sont pas touchés.
- **Identifiants découverts, jamais écrits en dur.** Les scénarios lisent les tournées, commandes
  et factures par l'API avant de les utiliser.
- **Comparaison stricte.** Statut HTTP et corps de réponse complets, à chaque appel. Le scénario
  `roles-access-matrix` ne garde que les statuts (117 appels) : son objet est la matrice des droits.

## Ce que l'étape 1 en fera

Le serveur reconstruit (`apps/api`) sera une deuxième cible de la même suite : mêmes scénarios,
mêmes fichiers de référence, sans les modifier. L'étape 1a est acceptée quand les 52 scénarios
passent contre lui.

## Scénarios

| Scénario | Ce qu'il vérifie | Appels |
|---|---|---|
| `session-anonymous` | Without a session: session endpoint, demo users, and a protected route refused with 401. | 5 |
| `csrf-header-required` | A state-changing request without the X-Requested-With header is refused (403 csrf); webhooks are exempt. | 6 |
| `roles-access-matrix` | Each role of each company hits the same set of endpoints: allowed, 403 forbidden or 403 wrong vertical. | 117 |
| `isolation-between-companies` | A user of Boissons Démo cannot read or change the routes, orders, payments or users of Grossiste Démo Océan (404). | 19 |
| `verticals-separated` | A club user cannot use distribution endpoints and a distribution user cannot use club endpoints. | 7 |
| `platform-companies` | Platform admin lists, creates (distribution and club) and updates companies; duplicates are refused; audit records it. | 12 |
| `platform-suspend-company` | A suspended company's users are refused (403 company_suspended) until it is reactivated. | 9 |
| `platform-connectors` | Connector catalogue (all simulated) as seen by the platform and a company admin. | 4 |
| `demo-reset` | Only the platform admin can reset the demo; after a reset the seeded data is back. | 7 |
| `centrale-reference-and-dashboard` | Dispatcher reads the dashboard, reference data, orders, routes and stock. | 7 |
| `centrale-order-lifecycle` | Create an order at the customer's price list, read its chain, assign it to a route, prepare it, cancel another one; invalid inputs refused. | 17 |
| `centrale-route-create-load` | Create a route with stops and an agent, rename it, assign an order, load it (warehouse to vehicle stock, with extras), then try to change a loaded route. | 14 |
| `centrale-load-insufficient-stock` | Loading more than the warehouse holds is refused and nothing moves. | 5 |
| `centrale-stock-adjust` | Warehouse adjustments need a reason (≥ 3 characters) and a non-zero delta; each one is a traced movement. | 10 |
| `agent-route-start-and-bundle` | The driver sees only their routes, starts today's route, downloads the offline bundle; a closed route cannot start. | 9 |
| `agent-deliver-full` | Full delivery with receiver name and signature: invoice on delivered quantities, vehicle stock decreases. | 9 |
| `agent-deliver-partial` | Partial delivery: refused without reason, accepted with a reason; invoice is on the delivered quantity only. | 7 |
| `agent-deliver-refused` | Refused delivery (nothing delivered): reason required, no invoice, no return allowed. | 8 |
| `agent-deliver-validation` | Delivery validation: receiver name required, returns valued at the customer price, returns cannot exceed the delivery, expected total checked. | 10 |
| `agent-sync-idempotent` | Replaying the same offline action (same id) returns the first result and changes nothing; a batch mixes new and replayed actions. | 10 |
| `agent-sale-on-the-spot` | On-the-spot sale to an outlet not on the route, from vehicle stock; stock limits and customer price list apply. | 8 |
| `agent-route-close` | Closing the route: summary of delivered, refused, collected; remaining stock returned to the warehouse; closed route is read-only. | 21 |
| `payment-paystation-success` | PayStation payment: pending, then confirmed by the signed notification; invoice paid; receipt. | 11 |
| `payment-each-method-success` | Card on terminal, Juice and payment link each go pending then confirmed by notification. | 17 |
| `payment-failure-then-retry` | A failed attempt frees the invoice; a new attempt (new key) can then succeed. | 12 |
| `payment-one-pending-attempt` | No double charge: a second attempt on the same invoice is refused while one is pending; the same key replays the first attempt. | 12 |
| `payment-partial` | Partial payment confirmed: invoice partially paid; the balance can be collected with another method. | 12 |
| `payment-lost-notification-status-query` | Notification lost: the payment stays pending until the status query confirms it (confirmed_via status query). | 11 |
| `payment-duplicate-notification` | A duplicated notification adds nothing (idempotent): one confirmation, one amount. | 15 |
| `payment-wrong-amount-to-verify` | A notification with a different amount puts the payment in 'to verify' with a finance exception; it is never confirmed by hand. | 13 |
| `payment-cancel-and-claim` | A pending attempt can be cancelled; a customer claim ('I paid') only moves it to 'to verify', never to confirmed. | 14 |
| `payment-expiry` | A pending attempt expires after the configured attempt time; the invoice can be collected again. | 9 |
| `payment-link-public-page` | Payment link: public page without login, simulated payment by the customer, link no longer payable afterwards. | 13 |
| `payment-webhook-signature` | Provider notifications: unknown provider, missing or wrong signature are rejected and change nothing. | 13 |
| `finance-journal-and-invoices` | Journal (with filters and CSV export) and invoice list, including seeded history. | 16 |
| `finance-refund` | Partial then full refund of a confirmed payment; refund above the remaining amount and without reason refused; agent cannot refund. | 16 |
| `finance-refund-not-confirmed` | A pending payment cannot be refunded. | 9 |
| `finance-statement-reconciliation` | Demo bank statement generated, imported and matched: confirmed payments become settled; re-import detects duplicate lines. | 16 |
| `finance-statement-anomalies` | Statement with anomalies: unmatched lines and amount mismatches create finance exceptions, resolved with a note. | 20 |
| `finance-daily-close` | Daily close preview, close of the day, second close refused, CSV export. | 16 |
| `finance-erp-retry` | Accounting-software entries: automatic sync, simulated failure kept with attempts and last error, then retried successfully. | 21 |
| `admin-users` | Company admin creates users, changes a role, deactivates a user (who can no longer log in); own access and duplicate email refused. | 12 |
| `admin-settings-methods` | Settings read and update: a disabled payment method disappears from the driver's bundle and cannot be used; invalid settings refused. | 16 |
| `club-dashboard-and-members` | Club dashboard, member list with search, filters, sort and CSV export, member detail. | 9 |
| `club-member-create-update` | Secretariat creates a member (reference and badge generated), updates plan and status; invalid inputs refused; finance cannot create. | 11 |
| `club-charges` | Consumption and fee charges per outlet; finance cancels a charge with a reason; balances follow. | 11 |
| `club-cash-payment` | Cash payment at the desk by finance: idempotent on its key, allocated to the oldest charges. | 8 |
| `club-dues-and-reminders` | Monthly dues run for a period (twice refused or idempotent), reminder run by level and threshold. | 8 |
| `club-member-portal-and-online-payment` | Statement sent to a member, public member page by token, online payment pending then confirmed by notification, status check. | 13 |
| `club-statement-reconciliation` | Club bank statement import: transfers matched by member reference, online payments settled, unmatched line assigned by hand with a note. | 11 |
| `club-accounting-export` | Accounting export (balanced journal lines) for the default period, a given range and as CSV. | 6 |
| `club-gate` | Gate check at the desk by badge: allow, flag (arrears) or deny; events of the day; device list; signed device endpoint rejects unsigned calls. | 14 |

## Comportements de la v0.1.0 à revoir plus tard

La suite enregistre la v0.1.0 **telle qu'elle est**. Les points suivants contredisent le cahier des
charges actuel. Ils restent inchangés à l'étape 1 (comportement identique) et seront traités
dans l'étape indiquée, avec mise à jour explicite des fichiers de référence concernés.

| Constat | Scénario qui le montre | Étape proposée |
|---|---|---|
| Les frais par défaut sont des chiffres inventés : PayStation 1,00 %, carte 1,75 %, Juice 0,90 %, lien 1,50 % (`feeBps`). La règle est « to be agreed ». | `admin-settings-methods` | 2 — **corrigé** |
| Une vente sur place peut dépasser le stock à bord : le stock du véhicule devient négatif (−3). | `agent-sale-on-the-spot` | 5 (stock) |
| Le type d'entreprise (`vertical` : distribution ou club) tient lieu d'abonnement aux modules. | `verticals-separated` | 2 — **corrigé** |
| Un montant total attendu différent de celui du serveur (`expectedTotalMinor`) est accepté sans prévenir le livreur : la facture prend le montant du serveur. | `agent-deliver-validation` | 3 — **corrigé** (`priceMismatch`, voir `ETAPE-3-CORE.md`) |
| Après une notification au mauvais montant (« à vérifier »), l'interrogation de statut confirme le paiement. C'est conforme à la règle (le statut du prestataire fait foi), mais le contrôle du montant lors de cette interrogation est à vérifier. | `payment-wrong-amount-to-verify` | 3 — **corrigé** (le statut ne confirme qu'au montant demandé) |
| Espèces, chèque, QR et Push to Phone n'existent pas encore côté distribution. | `payment-one-pending-attempt` | 4 (moyens de paiement) |
