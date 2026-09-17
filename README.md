# Stance

**Stance** est une plateforme IA dédiée à l'analyse RH, pensée pour aider les équipes RH à anticiper les risques d'attrition et à accéder facilement à leurs données. Elle combine un dashboard analytique (heatmap d'attrition par région/secteur, KPIs exécutifs) et **Ask Stance**, un assistant conversationnel qui répond aux questions RH en langage naturel à partir des données de l'entreprise.

Projet développé en solo, du cadrage métier à l'architecture technique — stack Node.js/Express, module RAG en Python, Airtable comme base de données, déployé sur Vercel.

*Démo en production : [stancehr.com](https://stancehr.com)*

---

Plateforme HR Analytics : dashboard Express/React (`server.js` + `assets/`) et un module RAG isolé (`rag/`) pour Ask Stance, exposé en production comme fonction serverless Python (`api/ask.py`).

## Architecture Ask Stance

```
Frontend → POST /api/ask (server.js, Node)
             → POST /api/rag-ask (api/ask.py, Python, @vercel/python)
                 → rag/pipeline.ask() : retrieval Chroma + génération Claude
```

`server.js` ne fait qu'un relais HTTP interne ; toute la logique RAG (ingestion Airtable, chunking, embeddings, retrieval, génération) vit dans `rag/` et n'est pas dupliquée en JS. Voir `rag/README` (docstrings des modules) pour le détail du pipeline.

Le dossier `rag/chroma_db/` (index vectoriel pré-construit, ~20 Mo) est **commité dans le repo** pour être embarqué dans le bundle de déploiement — voir `Rafraîchir l'index` ci-dessous. Il est copié vers `/tmp/chroma_db` au cold start de la fonction Python (le filesystem de déploiement Vercel est en lecture seule ; reconstruire l'index à chaque cold start prend ~50s, trop lent).

## Variables d'environnement — Vercel (Project Settings → Environment Variables)

| Variable | Utilisée par | Description |
|---|---|---|
| `AIRTABLE_API_KEY` | `server.js`, `rag/` | Token Airtable (airtable.com/account) |
| `AIRTABLE_BASE_ID` | `server.js`, `rag/` | ID de la base (`appXXXXXXXXXXXXXX`) |
| `AIRTABLE_EMPLOYEE_TABLE` | `server.js`, `rag/` | Défaut : `Employee Analytics` |
| `AIRTABLE_DEPARTMENT_TABLE` | `server.js`, `rag/` | Défaut : `Department_rollups` |
| `AIRTABLE_EXECUTIVE_TABLE` | `server.js`, `rag/` | Défaut : `Executive_Summaries` |
| `AIRTABLE_STABILITY_TABLE` | `server.js`, `rag/` | Défaut : `Workforce_Stability_Snapshots` |
| `ANTHROPIC_API_KEY` | `api/ask.py` (runtime) | Génération de la réponse Ask Stance |
| `ANTHROPIC_MODEL` | `api/ask.py` (runtime) | Défaut : `claude-sonnet-5` |
| `MAKE_CSV_WEBHOOK_URL` | `server.js` | Upload CSV uniquement (`/api/upload`) — n'a plus de rôle dans Ask Stance |
| `CRON_SECRET` | `server.js` | Authentifie le cron `/api/snapshot-stability` |
| `AIRTABLE_TURNOVER_COST_TABLE` | `server.js` | Défaut : `Turnover_Cost_Assumptions` — hypothèse de coût de remplacement pour Cockpit |
| `AIRTABLE_COCKPIT_BRIEFING_TABLE` | `server.js` | Défaut : `Cockpit_Briefings` — cache de la synthèse IA quotidienne de Cockpit |
| `AIRTABLE_MAPPING_TABLE` | `server.js` | Défaut : `Client_Field_Mappings` — mapping de colonnes mémorisé par client |

`RAG_CHROMA_COLLECTION`, `RAG_CHUNK_MAX_CHARS`, `RAG_CHUNK_OVERLAP_CHARS` sont optionnelles (voir `.env.example`) et n'ont besoin d'être définies que si tu changes le comportement de chunking par rapport aux défauts codés dans `rag/config.py`.

`RAG_API_URL` est un override local uniquement (voir `.env.example`) ; en production, `server.js` appelle son propre domaine + `/api/rag-ask` automatiquement, aucune variable à définir sur Vercel pour ça.

## Cockpit — espace décideur (COMEX / Direction)

`Cockpit` (`/cockpit`, servi par `Stance Cockpit.html` + `assets/cockpit-*`) est un espace de navigation **distinct** du dashboard RH (`/dashboard`, Sentinelle) — pas un onglet de plus dedans. Il n'affiche que des agrégats (jamais de donnée au niveau salarié) : % de profils à risque par département/ancienneté, tendance, estimation du coût de turnover et une synthèse IA courte.

- **Agrégats** (`/api/cockpit/summary`, `/api/cockpit/financial`) : calculés à la volée côté serveur à partir de `Employee Analytics`, pas de table Airtable dédiée à créer.
- **Tendance** (`/api/cockpit/trend`) : réutilise `Workforce_Stability_Snapshots`, étendu avec deux champs `CriticalCount`/`HighCount` (voir `.env.example`).
- **Hypothèse de coût** : table `Turnover_Cost_Assumptions` (champ `Avg Replacement Cost Ratio`, défaut 50% si la table n'existe pas encore) — modifiable dans Airtable sans redéploiement.
- **Synthèse IA** : table `Cockpit_Briefings`, régénérée au plus une fois par jour via un appel direct à Claude (pas de scénario Make) — distincte d'`Executive_Summaries`, qui reste le message CEO de la landing page côté Sentinelle.

**Accès** : différencié par un flag `role` (`RH` / `Direction`) choisi sur `/sign-in`, stocké dans un cookie `stance_role` et lu par le serveur (`getCookie` dans `server.js`) pour rediriger `/cockpit` vers `/sign-in` (pas de rôle) ou `/dashboard` (rôle `RH`). **Ce n'est pas un vrai système de permissions** — il n'y a aujourd'hui aucune authentification réelle dans l'app (le formulaire de `/sign-in` ne valide rien) ; ce flag rend juste l'accès role-différencié plutôt que basé uniquement sur l'obscurité de l'URL.

## Import client — mapping de colonnes intelligent

Sentinelle attend en interne le schéma exact du dataset IBM HR Attrition (`Department`, `YearsAtCompany`, `MonthlyIncome`, `OverTime`, `JobSatisfaction`, etc. — liste complète et niveaux obligatoire/recommandé dans `field-schema.js`). Un client dont l'export CSV/Excel utilise d'autres noms de colonnes n'a plus besoin d'être re-câblé à la main :

```
Dépôt fichier (CSV/Excel)
  → POST /api/import/inspect          lit les en-têtes + quelques lignes d'exemple
  → POST /api/import/mapping/suggest  Claude propose une correspondance par colonne
                                       (réutilise le mapping déjà confirmé pour ce
                                       client s'il existe, ne rappelle Claude que sur
                                       les colonnes encore inconnues)
  → écran de validation (assets/import-flow.jsx) — jamais appliqué sans confirmation,
    bloque tant qu'un champ obligatoire n'a pas de correspondance
  → POST /api/import/mapping/confirm  persiste le mapping dans Client_Field_Mappings,
                                       traduit les lignes vers le schéma interne, puis
                                       réutilise le chemin existant /api/upload →
                                       MAKE_CSV_WEBHOOK_URL, inchangé
```

Cette couche ne touche ni au scénario Make ni aux tables Airtable existantes (`Employee Analytics`, `Department_rollups`, `HR_Uploads`) — c'est une traduction en amont. "Client" est aujourd'hui un simple identifiant texte saisi à l'écran d'import (pas un vrai compte/tenant — l'app n'a pas de système d'authentification), qui sert uniquement à retrouver un mapping déjà validé d'un import à l'autre.

Point technique : la lecture des fichiers `.xlsx` utilise le paquet `xlsx`, installé depuis le CDN officiel SheetJS (`cdn.sheetjs.com`) plutôt que depuis npm — la version publiée sur npm a des CVE non corrigées (prototype pollution, ReDoS), SheetJS ne publie ses builds patchés que sur son propre CDN.

## Rafraîchir l'index Ask Stance (après changement de données Airtable)

L'index Chroma n'est **pas** reconstruit à chaque déploiement automatiquement — il faut le régénérer en local puis redéployer :

```bash
pip install -r rag/requirements.txt
python -m rag.cli build-index   # écrit rag/chroma_db/
vercel --prod                   # redéploie avec le nouvel index embarqué
```

## Tests locaux du module RAG

```bash
python -m unittest discover -s rag/tests -p "test_*.py"

# test complet (Airtable + Claude réels, coûte des appels API) :
RAG_RUN_LIVE_TESTS=1 python -m unittest rag.tests.test_pipeline_live
```
