# Lance le backend (FastAPI, port 9100) et le frontend (Vite, port 9000) ensemble.
# Usage : .\start.ps1   (Windows PowerShell)
#
# ⚠️ Si Windows bloque ce script ("l'exécution de scripts est désactivée"), lancez UNE FOIS :
#     Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# ou lancez-le ponctuellement via :  powershell -ExecutionPolicy Bypass -File .\start.ps1

$ErrorActionPreference = "Stop"

# Se placer à la racine du projet (dossier de ce script)
Set-Location -Path $PSScriptRoot

# Lancement du backend dans une nouvelle fenêtre PowerShell séparée.
# On passe un chemin ABSOLU vers backend\start.ps1 (via $PSScriptRoot) : sinon
# le chemin relatif est résolu par rapport au dossier de la nouvelle fenêtre et
# échoue. -ExecutionPolicy Bypass évite le blocage des scripts dans la sous-fenêtre.
Write-Host "Démarrage du backend dans une nouvelle fenêtre..."
$backendScript = Join-Path $PSScriptRoot "backend\start.ps1"
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$backendScript`""

# Laisser le temps au backend de démarrer.
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "🚀 MarketMishmash démarré !"
Write-Host "Frontend : http://localhost:9000"
Write-Host "Backend  : http://localhost:9100"
Write-Host ""

# Lancement du frontend dans le terminal courant.
npm install ; npm run dev
