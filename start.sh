#!/usr/bin/env bash
# Lance le backend (FastAPI, port 9100) et le frontend (Vite, port 9000) ensemble.
# Usage : bash start.sh   (Linux / Mac)
set -e

# Se placer à la racine du projet (dossier de ce script)
cd "$(dirname "$0")"

BACKEND_PID=""

# Arrêt propre : on tue le backend (et son groupe) quand on quitte le frontend.
cleanup() {
  echo ""
  echo "Arrêt de MarketMishmash..."
  if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
    # Tuer aussi les processus enfants (uvicorn) du backend.
    pkill -P "$BACKEND_PID" 2>/dev/null || true
  fi
  exit 0
}
trap cleanup INT TERM

# Lancement du backend en arrière-plan.
echo "Démarrage du backend..."
(cd backend && bash start.sh) &
BACKEND_PID=$!

# Laisser le temps au backend de démarrer.
sleep 3

echo ""
echo "🚀 MarketMishmash démarré !"
echo "Frontend : http://localhost:9000"
echo "Backend  : http://localhost:9100"
echo ""

# Lancement du frontend (au premier plan). À l'arrêt (Ctrl+C), le trap nettoie le backend.
npm install
npm run dev

# Si le frontend s'arrête de lui-même, on nettoie aussi.
cleanup
