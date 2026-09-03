# Script de démarrage du micro-backend d'analyse MarketMishmash (Windows PowerShell).
# Crée un venv si absent, installe les dépendances, puis lance uvicorn sur le port 9100.
#
# ⚠️ Si Windows bloque ce script ("l'exécution de scripts est désactivée"), lancez UNE FOIS :
#     Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# ou lancez-le ponctuellement via :  powershell -ExecutionPolicy Bypass -File .\start.ps1

$ErrorActionPreference = "Stop"

# Se placer dans le dossier du script (backend/)
Set-Location -Path $PSScriptRoot

# Création / activation du venv
if (-not (Test-Path "venv")) {
    Write-Host "Création de l'environnement virtuel..."
    python -m venv venv
}
Write-Host "Activation de l'environnement virtuel..."
. .\venv\Scripts\Activate.ps1

Write-Host "Installation des dépendances..."
pip install --upgrade pip | Out-Null
pip install -r requirements.txt

Write-Host "Backend MarketMishmash démarré sur http://localhost:9100"
uvicorn main:app --reload --port 9100
