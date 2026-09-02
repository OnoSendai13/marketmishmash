#!/usr/bin/env bash
# Script de démarrage du micro-backend d'analyse MarketMishmash.
# Active un venv si présent (sinon en crée un), installe les dépendances,
# puis lance uvicorn sur le port 8000.
set -e

cd "$(dirname "$0")"

# Création / activation du venv.
if [ ! -d "venv" ]; then
  echo "Création de l'environnement virtuel..."
  python3 -m venv venv
fi
# shellcheck disable=SC1091
source venv/bin/activate

echo "Installation des dépendances..."
pip install --upgrade pip >/dev/null
pip install -r requirements.txt

echo "Démarrage de l'API sur http://localhost:8000 ..."
exec uvicorn main:app --reload --host 0.0.0.0 --port 8000
