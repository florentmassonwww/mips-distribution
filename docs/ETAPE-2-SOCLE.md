# Étape 2 — Socle : modules, abonnements, établissements

## Objectif et critère d'acceptation

Une entreprise peut activer plusieurs modules métier. Le « type d'entreprise » de la v0.1.0
(`companies.vertical` : `distribution` ou `club`) ne décide plus de rien : il est remplacé par des
**abonnements aux modules**.

**Accepté si** une entreprise sans le module Distribution ne peut ni le voir (interface) ni appeler
ses routes (API, refus 403 vérifié par des tests automatisés), et de même pour le module Club.

## Modèle de données (migration `003_modules_sites.sql`)

| Table | Colonnes | Rôle |
|---|---|---|
| `company_modules` | `company_id`, `module` (`distribution` \| `club`), `activated_at`, `activated_by`; clé `(company_id, module)` | Modules actifs d'une entreprise. Une ligne présente = module actif. |
| `sites` | `id`, `company_id`, `type` (`store` \| `warehouse` \| `depot`), `parent_site_id`, `code` (unique par entreprise), `name`, `address`, `timezone` (défaut `Indian/Mauritius`), `status` (`active` \| `inactive`), `created_at` | Lieux de l'entreprise elle-même : magasin, entrepôt, dépôt. |

- **Reprise des données** : chaque entreprise reçoit le module correspondant à son ancien `vertical`.
- **`companies.vertical`** : SQLite ne permet pas de supprimer une colonne qui porte une contrainte
  `CHECK` sans reconstruire la table. La colonne reste donc, mais n'est plus lue ni écrite par le code
  (valeur figée). Elle sera supprimée lors d'une reconstruction de table ultérieure.
- **Données de démonstration** : Boissons Démo Ltée et Grossiste Démo Océan ont le module
  `distribution` et un dépôt chacun (« Dépôt central (démo) »). Club Sportif Démo a le module `club`,
  sans établissement.
- **Stock** : il reste rattaché à l'entreprise (`warehouse_stock`) jusqu'à l'étape 5, où il passera
  aux établissements.

## Règles

- **Catalogue des modules** : une constante du code, dans l'ordre d'affichage `distribution`, `club`.
  La contrainte `CHECK` de la table en est le reflet.
- **Contrôle serveur** sur chaque route d'un module (mêmes préfixes que les gardes `vertical` de la
  v0.1.0). Si l'entreprise de l'utilisateur n'a pas le module, réponse
  `403 module_not_enabled`, avec le message « Le module Distribution n'est pas activé pour cette
  entreprise. » ou « Le module Club n'est pas activé pour cette entreprise. ». Le contrôle
  garde le même ordre de vérification que la v0.1.0 : sur les routes Distribution, il précède
  l'authentification et les rôles (un utilisateur anonyme ou de la plateforme passe et reçoit
  ensuite 401 ou 403 `forbidden`) ; sur les routes Club, il suit l'authentification, les rôles et
  la suspension.
- **Désactivation** : désactiver un module ne supprime aucune donnée. L'entreprise n'y a plus accès
  jusqu'à réactivation. Une entreprise peut n'avoir aucun module : seuls l'administration et l'audit
  restent alors accessibles.
- **Audit** : toute modification des modules est tracée par `company.modules_updated`, avec les
  détails `{ before, after }`.
- **Frais « to be agreed »** :
  - Les frais par défaut de la v0.1.0 (100, 175, 90 et 150 points de base) étaient inventés.
    `feeBps` devient `null` par défaut, ce qui signifie « à convenir ». Il reste modifiable par
    l'administrateur d'entreprise (entier de 0 à 1000, ou `null`).
  - Si les frais sont à convenir :
    - `fee_expected_minor` vaut 0 et `fee_expected_known` vaut 0 (nouvelle colonne, 1 par défaut) ;
    - aucune exception d'écart de frais n'est levée ;
    - le relevé de démonstration ne prélève aucun frais.
  - L'interface affiche « to be agreed » / « à convenir » à la place d'un montant.

## Contrats d'API (changements)

| Route | Avant | Après |
|---|---|---|
| `GET /api/session` | `user.vertical` | `user.modules: string[]` |
| `GET /api/demo/users` | `company_vertical` | `company_modules: string[]` |
| `GET /api/platform/companies` | `vertical` | `modules: string[]` |
| `POST /api/platform/companies` | `vertical` (défaut `distribution`) | `modules: string[]` (au moins un, défaut `["distribution"]`) |
| `PUT /api/platform/companies/:id/modules` | — | `{ modules: string[] }`, réservé à la plateforme, audité |
| `GET /api/admin/settings` | `subscription.vertical` | `subscription.modules` |
| `GET/POST /api/admin/sites`, `PATCH /api/admin/sites/:id` | — | Établissements de l'entreprise, réservés à l'administrateur d'entreprise, audités (`site.created`, `site.updated`) |
| Routes des modules | `403 wrong_vertical` | `403 module_not_enabled` |

## Tests

- **Suite de caractérisation** :
  - Elle continue de comparer le serveur aux réponses de la v0.1.0.
  - Les changements voulus sont décrits dans `tests/characterization/evolutions.mjs`, sous forme de
    transformations appliquées aux réponses attendues avant la comparaison. Exemples : `vertical`
    devient `modules` ; `wrong_vertical` devient `module_not_enabled` ; les frais attendus passent à
    0 / inconnus.
  - Chaque transformation porte sa justification et ne touche que les champs nommés. Tout le reste
    doit rester identique.
- **Nouveaux tests d'API** (`tests/api/*.test.mjs`, `node:test`, serveur en mémoire). Ils couvrent :
  - le refus de chaque route de module sans abonnement ;
  - l'activation et la désactivation par la plateforme (accès ouvert puis fermé, données conservées) ;
  - une entreprise avec les deux modules ;
  - l'audit ;
  - les établissements, y compris l'isolation entre entreprises ;
  - les frais à convenir.
- **Comparaison visuelle** : les écrans touchés sont déclarés dans `tests/visual/divergences.mjs`
  (plateforme, réglages, accueil si le libellé change).

## Mise en œuvre côté serveur : précisions et écarts

- **Création d'entreprise** : le champ `vertical` de la v0.1.0 reste accepté quand `modules` est
  absent (l'entreprise reçoit ce seul module). L'interface actuelle et la suite de caractérisation
  l'envoient encore.
- **`PUT /api/platform/companies/:id/modules`** accepte une liste vide (entreprise sans module) ;
  la création exige au moins un module. Réponse : `{ ok: true, modules }` (ordre du catalogue).
- **Établissements** : `POST` prend `type`, `code`, `name`, et en option `parentSiteId` (défaut
  `null`), `address` (`""`), `timezone` (`Indian/Mauritius`, fuseau IANA vérifié), `status`
  (`active`) ; `PATCH` prend les mêmes champs, tous facultatifs. Le code (lettres, chiffres, tirets,
  20 caractères au plus) est enregistré en majuscules. Parent d'une autre entreprise, inconnu, ou
  descendant de l'établissement : `400 invalid_parent`. Réponse : l'établissement, sans
  `company_id`.
- **Données de démonstration** : les modules et les dépôts reçoivent des identifiants fixes
  (`site_bd_dep-01`, `site_go_dep-01`), sans tirage aléatoire, pour que les identifiants générés
  existants ne bougent pas.
- **Frais** : `fee_expected_known` est fixé dès la création de la tentative de paiement, puis à la
  confirmation avec le taux alors en vigueur. Il est exposé à côté de `fee_expected_minor` (journal,
  lignes de rapprochement, chaîne de commande). Les exports CSV gardent leurs colonnes : frais
  attendus 0.00 quand ils sont à convenir.
- **Routes publiques** (lien de paiement, page membre, lecteurs de barrière) : non soumises au
  contrôle de module, comme les préfixes des gardes `vertical` de la v0.1.0.
- **Suite de caractérisation** : une évolution peut aussi transformer la transcription entière quand
  le changement retire des éléments et renumérote des repères (exception d'écart de frais du
  scénario `finance-statement-anomalies`).

## Hors périmètre de l'étape 2

- Le renommage des commerces clients (`customer_outlet`) : fait à l'étape 3, partout (voir `ETAPE-3-CORE.md`).
- Le stock par établissement (étape 5).
- Les tarifs des modules, affichés « to be agreed ».
