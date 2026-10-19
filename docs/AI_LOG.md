# Journal de bord de l'IA (AI_LOG)

Ce fichier consigne l'historique des interactions, des demandes, des codes produits et des choix validés avec l'assistant IA, conformément aux règles du test MyBestSim.

## Étape 1 : Analyse des exigences et des données
- **Ce que j'ai demandé :** Analyser l'énoncé de la Partie 1 (dashboard eSIM) et de la Partie 2 (SEO), ainsi que les structures des 18 fichiers CSV.
- **Ce que l'IA a produit :** Une spécification détaillée des indicateurs obligatoires, des règles de validation (gestion des prix négatifs, devises, valeurs manquantes) et des choix structurants (traitement des données illimitées).
- **Ce que j'ai corrigé / validé :** Validation des valeurs de référence exactes obtenues par pandas (5 056 lignes, 56 produits > 100 €, fourchette de 5,36 € à 154,63 €, moyenne de 14,49 Go hors illimité, prix moyen de 29,30 €). Validation du traitement des 653 cartes illimitées (exclues de la moyenne de data, signalées à part) et de la règle de contrôle des devises (alerte dans le rapport d'anomalies si non-EUR).
- **Mode de vérification :** Revue croisée des indicateurs fournis avec les calculs de référence.

## Étape 2 : Squelette du dépôt et documentation
- **Ce que j'ai demandé :** Mettre en place l'arborescence complète du projet (backend, pipeline, frontend, docs) avec le README et le journal de bord.
- **Ce que l'IA a produit :** La structure des dossiers et le contenu initial des fichiers de documentation (`AI_LOG.md` et `README.md`).
- **Ce que j'ai corrigé / validé :** Validation de l'architecture découplée (pipeline Python pur + FastAPI + React/Tailwind).