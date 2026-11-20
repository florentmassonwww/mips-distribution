# Cahier de recette — règles métier

Le cahier de recette de 30 scénarios de la v0.1.0 est perdu avec son source. Celui-ci le remplace.
Il est reconstruit à partir de deux sources : les règles impératives du cahier des charges, et le
comportement de la v0.1.0 relevé par la suite de caractérisation (`tests/characterization`).

Chaque scénario est vérifié à deux niveaux :

- **Règle seule** : `packages/core/test/acceptance.test.ts` appelle directement `@mips/core`, sans
  base de données ni serveur. Le dernier test de ce fichier vérifie qu'il liste exactement les
  scénarios R01 à R30 de ce document, dans cet ordre.
- **De bout en bout** : un ou plusieurs scénarios de la suite de caractérisation jouent la même
  règle à travers l'API, contre la v0.1.0 et contre `apps/api` (colonne « Bout en bout »). Les
  règles qu'aucun scénario de la v0.1.0 ne joue (R07, R10, R17) le sont par
  `tests/api/core-rules.test.mjs`.

```bash
npm run test:core          # les 30 scénarios contre @mips/core (moins d'une seconde)
npm run test:api           # les 52 scénarios de bout en bout contre apps/api
npm run test:api-unit      # tests d'API, dont tests/api/core-rules.test.mjs
```

## Livraison

| N° | Règle | Résultat attendu | Bout en bout |
|---|---|---|---|
| R01 | Livraison complète | Facture sur les quantités livrées ; nom du réceptionnaire obligatoire (2 caractères au moins), sinon `pod_required`. | `agent-deliver-full` |
| R02 | Livraison partielle | Motif obligatoire (3 caractères au moins), sinon `reason_required` ; facture sur la quantité livrée seulement. | `agent-deliver-partial` |
| R03 | Non livrée | Motif obligatoire, aucune facture, aucun retour possible (`invalid_returns`) ; pas de réceptionnaire exigé. | `agent-deliver-refused` |
| R04 | Quantité livrée supérieure à la commande | Refusée (`qty_exceeds_order`). | `agent-deliver-validation` |
| R05 | Retours | Déduits au tarif du commerce ; s'ils valent plus que la livraison, refus (`returns_exceed_delivery`) ; s'ils valent autant, pas de facture. | `agent-deliver-validation` |
| R06 | Prix appliqué | Liste de prix du commerce quand elle contient le produit, sinon prix catalogue. | `centrale-order-lifecycle`, `agent-sale-on-the-spot` |
| R07 | Total affiché différent de la facture | La facture garde le montant du serveur ; l'écart est signalé au livreur (`priceMismatch`) et à la centrale (exception). **Nouveau à l'étape 3** : la v0.1.0 ne prévenait pas le livreur. | `agent-deliver-validation`, `tests/api/core-rules.test.mjs` |

## Hors ligne

| N° | Règle | Résultat attendu | Bout en bout |
|---|---|---|---|
| R08 | Ce qui peut attendre le réseau | Seules les livraisons et les ventes sur place sont mises en file ; aucun paiement, donc aucun paiement électronique confirmé hors ligne. | `agent-sync-idempotent` |
| R09 | Rejeu d'une action | Le même identifiant renvoie le premier résultat et ne change rien. | `agent-sync-idempotent` |
| R10 | Heure terrain | Heure du téléphone, sauf si elle est illisible, dans le futur ou vieille de plus de 7 jours ; plus de 2 minutes d'écart avec le serveur : action marquée hors ligne. | `tests/api/core-rules.test.mjs` |

## Tentatives de paiement

| N° | Règle | Résultat attendu | Bout en bout |
|---|---|---|---|
| R11 | Pas de double débit | Une seule tentative en attente par facture : la seconde est refusée (`attempt_in_progress`). | `payment-one-pending-attempt` |
| R12 | Tentative à vérifier | Elle bloque aussi toute nouvelle tentative. | `payment-cancel-and-claim`, `payment-expiry` |
| R13 | Clé d'idempotence | Même clé et même demande : rejeu de la tentative ; même clé, autre demande : `idempotency_conflict`. | `payment-one-pending-attempt` |
| R14 | Conditions d'une tentative | Moyen activé (`method_disabled`), montant dans le solde (`amount_exceeds_balance`), facture non soldée (`already_paid`) ; échéance = création + délai de tentative de l'entreprise. | `admin-settings-methods`, `payment-partial` |

## Confirmation

| N° | Règle | Résultat attendu | Bout en bout |
|---|---|---|---|
| R15 | Qui confirme | Seulement le prestataire : notification signée, interrogation de statut, ou crédit sur le relevé bancaire. Aucune source « personne » : ni le livreur, ni la finance. | `payment-paystation-success`, `payment-each-method-success` |
| R16 | Notification au mauvais montant | Montant ou devise différents de la demande : « à vérifier », jamais confirmé. | `payment-wrong-amount-to-verify` |
| R17 | Interrogation de statut | Une notification perdue est rattrapée par le statut. Le statut confirme seulement au montant demandé ; sinon le paiement reste « à vérifier ». **Nouveau à l'étape 3** : la v0.1.0 confirmait sans contrôler le montant. | `payment-lost-notification-status-query`, `payment-wrong-amount-to-verify`, `tests/api/core-rules.test.mjs` |
| R18 | Capture d'écran du client | La tentative passe « à vérifier », jamais « confirmé » ; aucune validation manuelle possible. | `payment-cancel-and-claim`, `payment-wrong-amount-to-verify` |
| R19 | Échec et annulation | L'échec libère la facture pour une nouvelle tentative ; seule une tentative en attente s'annule. | `payment-failure-then-retry`, `payment-cancel-and-claim` |
| R20 | Sans réponse après le délai | La tentative passe « à vérifier » et la facture reste bloquée. | `payment-expiry` |
| R21 | Notifications idempotentes | Une confirmation ne s'applique qu'une fois ; un échec notifié après une confirmation ne change rien. | `payment-duplicate-notification` |
| R22 | Paiement partiel | Facture partiellement payée ; le solde peut être encaissé par un autre moyen. | `payment-partial` |
| R23 | Remboursement | D'un paiement confirmé seulement (`bad_status`), dans le reste remboursable (`amount_exceeds_balance`) ; « remboursé » quand plus rien ne reste. | `finance-refund`, `finance-refund-not-confirmed` |
| R24 | État de la facture | Une tentative en cours prime : « à vérifier », puis « en attente » ; ensuite payée, partiellement payée, remboursée, échouée, impayée. | `payment-partial`, `finance-journal-and-invoices` |

## Rapprochement bancaire

| N° | Règle | Résultat attendu | Bout en bout |
|---|---|---|---|
| R25 | Confirmé et réglé en banque | Deux états séparés : la ligne du relevé règle le paiement ; un paiement en attente ou à vérifier est d'abord confirmé par le crédit, puis réglé. | `finance-statement-reconciliation` |
| R26 | Anomalies du relevé | Crédit sans paiement, second crédit, crédit sur un paiement échoué, écart de montant : chacun ouvre une exception finance. | `finance-statement-anomalies` |
| R27 | Frais | Frais « to be agreed » : aucun montant attendu, aucun écart signalé. Frais convenus : l'écart est signalé, sans empêcher le rapprochement. | `finance-statement-anomalies`, `admin-settings-methods` |

## Stock

| N° | Règle | Résultat attendu | Bout en bout |
|---|---|---|---|
| R28 | Chargement et ajustements | On charge les commandes préparées plus le stock de vente ; rien à charger ou stock dépôt insuffisant : refus, rien ne bouge. Ajustement : variation non nulle et motif obligatoire ; le dépôt ne passe jamais sous zéro. Une remise au-delà du stock du véhicule est acceptée, mais signalée comme écart d'inventaire. | `centrale-route-create-load`, `centrale-load-insufficient-stock`, `centrale-stock-adjust` |

## Club

| N° | Règle | Résultat attendu | Bout en bout |
|---|---|---|---|
| R29 | Compte membre | Les paiements soldent les charges les plus anciennes d'abord ; retard = charges échues non soldées ; relance au niveau atteint, au-dessus du seuil de montant. | `club-cash-payment`, `club-charges`, `club-dues-and-reminders` |
| R30 | Contrôle d'entrée | Membre résilié ou suspendu : refusé ; au-dessus du seuil, retard au-delà du délai de refus : refusé ; au-delà du délai de signalement : signalé ; sinon : autorisé. | `club-gate` |

## Hors de ce cahier

Ces règles restent vérifiées de bout en bout seulement, par la suite de caractérisation et les tests
d'API, parce qu'elles tiennent à l'accès aux données plutôt qu'à un calcul :

- l'isolation des entreprises (`isolation-between-companies`) ;
- les rôles (`roles-access-matrix`) ;
- les modules (`tests/api/modules.test.mjs`) ;
- la signature des notifications (`payment-webhook-signature`) ;
- la clôture journalière (`finance-daily-close`) ;
- les écritures vers le logiciel comptable (`finance-erp-retry`).
