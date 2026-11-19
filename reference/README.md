# Référence v0.1.0

Le code source de MIPS Distribution 0.1.0 (avec MIPS ClubOS) est perdu. Il ne reste que sa
**démonstration hors ligne compilée**, qui contient l'application complète : serveur Hono, base
SQLite (compilée en WebAssembly) et interface React. Les appels `/api/*` y sont servis dans le
navigateur. Ce dossier la conserve telle quelle comme **référence de comportement** : la
reconstruction (étape 1) doit reproduire ses réponses.

## Contenu de `v0.1.0/`

| Fichier | Rôle | SHA-256 |
|---|---|---|
| `app.js` | Application compilée (serveur + base + interface) | `5af0fd29bdd625f74bcf45dbae7adf415c6377fed0cad940ba64cce48fd8cdad` |
| `index.html` | Page de la démonstration | `440ca199e4807299d61a62e40b8c8ab7884c466278ae474c29bb328905474e03` |
| `style.css` | Styles | `e84cf06e4ec52bc2b7ad2435b0189ec9d1d1dd87514b88cfb78a9137b9b8fbb3` |
| `LISEZ-MOI.txt` | Notice d'origine de la démonstration | |
| `schema.sql` | Les 34 tables, extraites mot pour mot de `app.js` | |
| `routes.txt` | Les 86 routes de l'API, extraites de `app.js` | |

Provenance : archive « MyMIPS-Modules-Mockup » (construite le 23 octobre 2026), dossier
`apps/distribution/`. Seuls ces fichiers ont été repris : la maquette du back-office MyMIPS,
le CRM interne et les autres démos ne font pas partie du dépôt.

Toutes les données sont fictives et marquées « (démo) ». Aucun nom de client réel.

## Utiliser la référence

- **Démonstration** : ouvrir `v0.1.0/index.html` dans Chrome ou Edge, sans serveur.
- **Tests de caractérisation** : `npm test` pilote cette référence par son API et compare chaque
  réponse aux fichiers de `tests/characterization/golden/`. Voir
  [`docs/REFERENCE-V0.1.0.md`](../docs/REFERENCE-V0.1.0.md).

Ces fichiers ne doivent pas être modifiés : une référence modifiée ne prouve plus rien.
