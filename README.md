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

`RAG_CHROMA_COLLECTION`, `RAG_CHUNK_MAX_CHARS`, `RAG_CHUNK_OVERLAP_CHARS` sont optionnelles (voir `.env.example`) et n'ont besoin d'être définies que si tu changes le comportement de chunking par rapport aux défauts codés dans `rag/config.py`.

`RAG_API_URL` est un override local uniquement (voir `.env.example`) ; en production, `server.js` appelle son propre domaine + `/api/rag-ask` automatiquement, aucune variable à définir sur Vercel pour ça.

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
