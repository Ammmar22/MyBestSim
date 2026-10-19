# MyBestSim eSIM Dashboard

Dashboard d'analyse du catalogue eSIM, construit pour le test de recrutement **Stagiaire Développeur IA & Automatisation** de MyBestSim.

Le programme lit les 18 fichiers CSV fournisseurs, valide les données, calcule les statistiques clés et les affiche dans un dashboard en ligne.

- **Dashboard en ligne :** https://VOTRE-DASHBOARD.vercel.app
- **API (Swagger) :** https://VOTRE-API.onrender.com/docs

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
| 7 | Bonus : rapport d'anomalies, nombre d'offres illimitées, prix moyen par fournisseur, prix moyen illimité vs limité, part de 5G, part de top-up |

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
api/main.py (FastAPI) →  /metrics  /anomalies  /health
        │
        ▼
frontend_2 (React + Vite + Tailwind)  →  dashboard
```

```
.
├── api/            # API FastAPI
├── pipeline/       # chargement, validation, métriques
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

### Frontend

```bash
cd frontend_2
npm install
npm run dev
```

Par défaut, le frontend appelle `http://localhost:8000`. Pour pointer vers une autre API, définir la variable `VITE_API_URL` (par exemple dans `frontend_2/.env`) :

```
VITE_API_URL=https://VOTRE-API.onrender.com
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

<!-- À compléter avec tes mots : quels outils (Claude, Cursor, Codex...), pour quelles étapes, ce que tu as vérifié ou corrigé toi-même. -->

## Partie 2 : article SEO

L'article « Internet en croisière : quelle eSIM choisir ? » se trouve dans le dossier [`SEO/`](./SEO).

## Auteur

**Abderrahmen Ammar** : [LinkedIn](https://linkedin.com/in/abderrahmen-ammar-725449222/) · [GitHub](https://github.com/ammmar22)
