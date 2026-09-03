# Lance le backend (FastAPI, port 9100) et le frontend (Vite, port 9000) ensemble.
# Usage : .\start.ps1   (Windows PowerShell)

$ErrorActionPreference = "Stop"

# Se placer à la racine du projet (dossier de ce script)
Set-Location -Path $PSScriptRoot

# Lancement du backend dans une nouvelle fenêtre PowerShell séparée.
Write-Host "Démarrage du backend dans une nouvelle fenêtre..."
Start-Process powershell -ArgumentList "-NoExit", "-File", "backend\start.ps1" -WorkingDirectory "backend"

# Laisser le temps au backend de démarrer.
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "🚀 MarketMishmash démarré !"
Write-Host "Frontend : http://localhost:9000"
Write-Host "Backend  : http://localhost:9100"
Write-Host ""

# Lancement du frontend dans le terminal courant.
npm install ; npm run dev
