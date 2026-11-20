# Étape 3 — Règles métier dans `packages/core`

## Objectif et critère d'acceptation

Les règles métier sortent de `apps/api` et deviennent des fonctions pures dans `@mips/core` : sans
base de données, sans réseau, sans horloge ni tirage aléatoire propres. `apps/api` lit et écrit les
données, puis applique ces règles.

**Accepté si** les 30 scénarios du cahier de recette ([`CAHIER-DE-RECETTE.md`](CAHIER-DE-RECETTE.md))
passent contre `@mips/core`, et si le serveur se comporte comme avant. Deux corrections voulues
font exception ; elles sont décrites plus bas.

Le cahier de recette d'origine (30 scénarios) est perdu avec le source de la v0.1.0. Celui-ci est
reconstruit à partir du cahier des charges et du comportement relevé de la v0.1.0.

## Contenu de `@mips/core`

| Fichier | Règles |
|---|---|
| `rule-error.ts` | `RuleError` : refus d'une règle, avec un `kind` (`invalid` ou `conflict`) et un code stable. L'API le traduit en 400 ou 409, avec le même code et le même message. |
| `money.ts` | Frais attendus (`expectedFee`) : `{ minor, known }`, inconnus tant que le taux est « to be agreed ». |
| `invoices.ts` | Solde dû, état de la facture (une tentative en cours prime sur les montants). |
| `payments.ts` | Sources de confirmation (prestataire seulement), conditions d'une nouvelle tentative (une seule en cours par facture), rejeu par clé d'idempotence, transitions, décisions sur une notification, une interrogation de statut ou une capture d'écran du client, annulation, remboursements. |
| `delivery.ts` | Issue d'une livraison (complète, partielle, refusée), preuve et motif, quantités, montant facturé (livré moins retours), prix du commerce, écart avec le total affiché. |
| `offline.ts` | Actions admises hors ligne (livraison, vente : jamais un paiement), heure terrain, seuil « hors ligne », rejeu idempotent. |
| `stock.ts` | Quantités à charger, stock dépôt suffisant, ajustements, écart de stock véhicule. |
| `reconciliation.ts` | Correspondance d'une ligne de relevé, confirmation par le crédit bancaire, écart de frais seulement contre un taux convenu. |
| `club.ts` | Imputation des paiements aux charges les plus anciennes, retard, niveau de relance, contrôle d'entrée. |
| `calendar.ts` | Calcul sur les jours ouvrés (AAAA-MM-JJ). |

Les messages des refus restent ceux de la v0.1.0, en français : ils font partie des réponses de
l'API, et l'interface les traduit par leur code.

## Ce qui reste dans `apps/api`

- La lecture et l'écriture des données, les transactions et l'ordre des tirages aléatoires
  (identifiants). Cet ordre est fixé par la suite de caractérisation.
- Les exceptions, l'audit et les écritures comptables qu'une décision déclenche.
- La validation de forme des entrées (zod), qui répond `invalid_input`. Le motif d'ajustement
  reprend la longueur minimale définie dans `@mips/core`.
- Ce qui tient à l'accès aux données plutôt qu'à un calcul : isolation des entreprises, rôles,
  modules, signatures, clôture journalière, écritures vers le logiciel comptable.

## Renommage : `customer_outlet`

Les commerces livrés par un distributeur deviennent des `customer_outlet`, à distinguer des
établissements de l'entreprise elle-même (`site`) et des points de vente du club. Le renommage
porte sur la base, le code, l'API et l'interface.

| Avant | Après |
|---|---|
| table `customers` | `customer_outlets` (migration `004_step3.sql`) |
| colonne `customer_id` (`route_stops`, `orders`, `invoices`) | `customer_outlet_id` |
| JSON `customer_id`, `customer` (nom), `customers` | `customer_outlet_id`, `customer_outlet`, `customer_outlets` |
| entrées `customerId`, `customerIds` | `customerOutletId`, `customerOutletIds` |
| détails d'audit, d'exception et de journal comptable `customer`, `customerId` | `customerOutlet`, `customerOutletId` |

Les identifiants (`c_bd_…`) et les libellés de l'interface (« Outlet » / « Commerce ») ne changent
pas.

- **Téléphone du livreur.** Une action mise en file avant la mise à jour garde l'ancien nom
  `customerId` : elle est convertie à la lecture. Une tournée téléchargée avant la mise à jour
  (ancien format) est ignorée, puis téléchargée de nouveau.
- **Suite de caractérisation.** Le renommage n'est pas une évolution des réponses attendues. Le
  banc traduit à la frontière : la requête du scénario part avec les nouveaux noms, la réponse
  revient avec les noms de la v0.1.0 (`RENAMINGS` dans `tests/characterization/evolutions.mjs`).
  La traduction échoue si un ancien nom apparaît encore dans une réponse : le renommage est donc
  complet.

## Corrections voulues (écarts de la v0.1.0)

| Constat v0.1.0 | Correction | Évolution de la suite |
|---|---|---|
| Un total affiché sur le téléphone différent du montant facturé était accepté sans prévenir le livreur. Seule la centrale recevait une exception. | Le résultat de la livraison porte `priceMismatch { shownMinor, invoicedMinor }`, et l'écran du livreur l'affiche. La facture garde le montant du serveur. L'exception est inchangée. | `price-mismatch-reported` |
| Après une notification au mauvais montant, l'interrogation de statut confirmait le paiement sans contrôler le montant. | L'interrogation de statut ne confirme qu'au montant demandé, comme la notification. Le connecteur rapporte le montant reçu (`StatusReport`), et le prestataire simulé conserve ce qu'il a reçu (`demo_provider_tx.received_minor`). Le paiement reste « à vérifier », ses exceptions restent ouvertes, et la finance ne peut pas les lever à la main (`409 needs_provider`). La même règle s'applique aux paiements des membres du club. | `status-query-checks-amount` |

`TODO(mips-team)` : les champs réels de la réponse de statut des prestataires (montant, devise),
à confirmer avant de brancher un vrai connecteur.

## Points à décider

- **Confirmation par le relevé bancaire.** La v0.1.0 confirme un paiement « à vérifier » quand le
  relevé montre le crédit (`confirmed_via = bank_statement`). C'est une preuve venant du côté du
  prestataire, mais le cahier des charges ne cite que la notification et l'interrogation de statut.
  Ce comportement est conservé et documenté (R15, R25) en attendant une décision.
