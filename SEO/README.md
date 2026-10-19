# MyBestSim - Test de Recrutement : Data Engineering & Dashboard eSIM

Projet réalisé dans le cadre du test de recrutement pour le poste de **Stagiaire Développeur IA & Automatisation** chez MyBestSim.

## 🎯 Objectifs
1. **Pipeline de Données & Dashboard (Partie 1) :** Ingestion, validation rigoureuse et calculs déterministes à partir de 18 fichiers CSV fournisseurs pour générer un dashboard interactif en ligne.
2. **Rédaction SEO (Partie 2) :** Article optimisé pour le référencement Google : « Internet en croisière : quelle eSIM choisir ? ».

## 🛠️ Stack Technique
- **Traitement de données :** Python 3.11, Pandas
- **API Backend :** FastAPI, Pydantic, Pytest
- **Frontend :** React, TypeScript, Tailwind CSS (Vite)
- **Qualité & Traçabilité :** Rapport d'anomalies systématique, journalisation des interactions IA (`docs/AI_LOG.md`).

## 📁 Structure du Projet
- `data/raw/` : Fichiers CSV sources des fournisseurs.
- `pipeline/` : Modules de chargement, validation et calculs statistiques.
- `api/` : Application FastAPI exposant les endpoints de métriques et d'anomalies.
- `frontend/` : Interface utilisateur React.
- `docs/` : Documentation et journal de bord (`AI_LOG.md`).

## 🚀 Lancement Rapide (Backend & Pipeline)
```bash
# Installation des dépendances
pip install -r requirements.txt

# Lancement des tests du pipeline
pytest