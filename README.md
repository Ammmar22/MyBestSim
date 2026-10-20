# MyBestSim eSIM Dashboard

Dashboard d'analyse du catalogue eSIM, construit pour le test de recrutement **Stagiaire Développeur IA & Automatisation** de MyBestSim.

Le programme lit les 18 fichiers CSV fournisseurs, valide les données, calcule les statistiques clés et les affiche dans un dashboard en ligne, avec un assistant IA qui répond aux questions sur le catalogue.

- **Dashboard en ligne :** https://my-best-sim-chi.vercel.app/
- **API (Swagger) :** https://mybestsim.onrender.com/docs
- **Code :** https://github.com/Ammmar22/MyBestSim
- **Article SEO (partie 2) :** https://jazzy-selkie-d20261.netlify.app/

> L'API est hébergée sur l'offre gratuite de Render : après une période d'inactivité, le premier chargement peut prendre 30 à 60 secondes (le temps que le serveur se réveille).

## Ce que le dashboard affiche

| # | Indicateur |
|---|------------|
| 1 | Nombre total de cartes eSIM |
| 2 | Nombre de produits à plus de 100 € |
| 3 | Fourchette de prix globale (min / max) |
| 4 | Moyenne de data (Go) par carte |
| 5 | Prix moyen global (et médian) |
| 6 | Répartition par fournisseur |
| 7 | Bonus : rapport d'anomalies filtrable (par fournisseur et par motif), nombre d'offres illimitées, part de produits premium, part de lignes rejetées, assistant IA |

## Architecture

```
CSV fournisseurs (data/raw)
        │
        ▼
pipeline/load.py      →  lecture et concaténation des 18 fichiers
pipeline/validate.py  →  règles de validation, séparation valides / anomalies
pipeline/metrics.py   →  calcul des indicateurs
        │
        ▼
api/main.py (FastAPI) →  /metrics  /anomalies  /health  /ai/ask
        │
        ▼
frontend_2 (React + Vite + Tailwind)  →  dashboard + chat IA
```

```
.
├── api/            # API FastAPI
├── pipeline/       # chargement, validation, métriques
├── services/       # assistant IA
├── data/raw/       # les 18 CSV fournisseurs
├── frontend_2/     # dashboard React
├── tests/          # tests
├── docs/           # documentation
├── SEO/            # partie 2 : article de blog
└── requirements.txt
```

## Règles de validation

Une ligne est rejetée pour sa **première** anomalie rencontrée. Aucune ligne n'est supprimée en silence : chaque rejet apparaît dans le rapport d'anomalies avec sa raison.

1. Champs texte obligatoires présents (`sku`, `supplier`, `product_name`)
2. Prix présent et numérique
3. Prix strictement positif
4. Devise = EUR
5. Data (Go) présente, sauf pour les offres illimitées
6. Doublon strict = même SKU déjà vu

## Choix assumés

- **Doublons :** seul le SKU définit un doublon. Deux offres du même fournisseur, avec le même nom et le même prix, mais un SKU, un réseau ou un top-up différent, sont considérées comme des produits distincts.
- **Offres illimitées :** détectées via `data_display` ("Illimité" / "Unlimited"). Elles sont exclues de la moyenne de data (leur `data_gb` est vide) et comptées à part.
- **Arrondis :** un arrondi intermédiaire évite les erreurs de type 20.695 → 20.69.
- **Anomalies :** les lignes rejetées sont conservées et affichées plutôt que supprimées, pour que le catalogue reste auditable.

## Assistant IA

Le bouton en bas à droite du dashboard ouvre un chat : on pose une question en langage naturel sur les métriques, les prix ou les anomalies du catalogue.

- Le frontend envoie la question à `POST /ai/ask`.
- L'API répond à partir des données calculées par le pipeline.
- Le modèle de langage tourne via **Ollama**, exposé à l'API par un relais (`ollama_relay.py`) et un tunnel Cloudflare.

**Pourquoi Ollama plutôt qu'une API cloud ?** C'est un choix assumé :

- **Gratuit :** aucun coût par requête, aucune clé d'API à protéger.
- **Confidentialité :** les données du catalogue sont traitées par un modèle qui tourne sur ma machine, et ne sont envoyées à aucun fournisseur de LLM tiers.
- **Contrepartie :** un modèle local sur du matériel personnel répond plus lentement qu'un LLM cloud. Les réponses peuvent prendre quelques secondes, voire plus, d'où le message « L'assistant réfléchit... » dans le chat.

Le modèle étant auto-hébergé, l'assistant dépend aussi de la disponibilité du relais. Le dashboard et les statistiques, eux, fonctionnent indépendamment de l'assistant.

## Lancer le projet en local

### Backend

```bash
python -m venv .venv
# Windows : .venv\Scripts\activate    |    macOS/Linux : source .venv/bin/activate
pip install -r requirements.txt
uvicorn api.main:app --reload
```

L'API tourne sur http://localhost:8000 (documentation interactive sur `/docs`).

| Route | Description |
|-------|-------------|
| `GET /metrics` | Indicateurs clés du catalogue |
| `GET /anomalies?limit=20` | Lignes rejetées avec leur raison |
| `GET /health` | État du chargement des données |
| `POST /ai/ask` | Question à l'assistant IA (`{"question": "..."}`) |

### Frontend

```bash
cd frontend_2
npm install
npm run dev
```

Par défaut, le frontend appelle l'API déployée sur Render. Pour pointer vers une autre API (par exemple en local), définir `VITE_API_URL` dans `frontend_2/.env` :

```
VITE_API_URL=http://localhost:8000
```

### Tests

```bash
pytest
```

## Déploiement

- **Backend :** Render (Web Service). Build : `pip install -r requirements.txt`. Start : `uvicorn api.main:app --host 0.0.0.0 --port $PORT`.
- **Frontend :** Vercel, dossier racine `frontend_2`, variable d'environnement `VITE_API_URL`.

Chaque `git push` sur `main` redéploie automatiquement les deux services.

## Comment j'ai utilisé l'IA

J'ai travaillé avec Claude comme assistant de développement, pendant tout le test :

- **Cadrage :** découpage de l'architecture (CSV → validation → métriques → API → dashboard) et définition des indicateurs bonus.
- **Revue de code :** repérage de problèmes avant la mise en ligne (chemins de fichiers qui ne marchent qu'en local, valeurs `NaN` impossibles à sérialiser en JSON dans `/anomalies`, configuration CORS).
- **Déploiement :** débogage de Render et de Vercel (conflit de dépendances TypeScript, build qui servait une ancienne version).
- **Assistant IA du dashboard :** un chat qui interroge le catalogue via un modèle Ollama local (gratuit, sans envoyer les données à un LLM cloud, au prix de réponses plus lentes).

Les décisions de fond sont les miennes et sont documentées plus haut : un doublon se définit par le SKU, les offres illimitées sont exclues de la moyenne de data, aucune ligne n'est supprimée en silence. J'ai testé chaque étape en local et en ligne avant de livrer.

## Partie 2 : article SEO

L'article « Internet en croisière : quelle eSIM choisir ? » est en ligne : https://jazzy-selkie-d20261.netlify.app/

Les sources sont dans le dossier [`SEO/`](./SEO).

## Auteur

**Abderrahmen Ammar** : [LinkedIn](https://linkedin.com/in/abderrahmen-ammar-725449222/) · [GitHub](https://github.com/ammmar22)