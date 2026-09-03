# MarketMishmash 📈

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Dashboard complet de **suivi et d'analyse des marchés financiers** — cryptomonnaies et actions — à exécuter **en local**, sur n'importe quel système (Windows, macOS, Linux).

MarketMishmash combine un **frontend React/Vite** (dashboard, graphiques, actualités) et un **micro-backend Python (FastAPI)** qui fournit l'analyse technique, les Fair Value Gaps, les fondamentaux, le backtest et les actualités avec sentiment.

- ⚡ **React 18 + Vite 7** : démarrage instantané, interface réactive
- 🎨 **Tailwind CSS** : thème sombre, responsive
- 📊 **TradingView Lightweight Charts** : graphiques en chandeliers professionnels (EMA, Bollinger, RSI, MACD, zones FVG)
- 🐍 **FastAPI** : analyse technique, fondamentaux, backtest et news/sentiment
- 🔌 **APIs** : [CoinGecko](https://www.coingecko.com/) (crypto), [Yahoo Finance](https://finance.yahoo.com/) (historique actions), [Finnhub](https://finnhub.io/) (cotations temps réel), [Alpha Vantage](https://www.alphavantage.co/) (news + sentiment), [Finviz](https://finviz.com/) (fondamentaux + news de repli)

---

## ✨ Fonctionnalités

### 🏠 Dashboard

- Deux sections : **Crypto** et **Actions**, avec une **carte par actif** (nom, prix, variation %, volume/infos).
- **Rafraîchissement automatique** (toutes les 60 s par défaut).
- **Liste d'actifs configurable** depuis l'interface, persistée dans le navigateur.
- Chaque carte est **cliquable** et ouvre une **page de détail** avec ses onglets d'analyse.
- Accès direct à la page **Actualités des marchés** via le bouton « 📰 Actualités ».

### 📊 Analyse technique

- **Graphique en chandeliers** (TradingView Lightweight Charts) avec :
  - Moyennes mobiles exponentielles **EMA 20 / 50 / 200**
  - **Bandes de Bollinger**
  - Sous-graphique **RSI** synchronisé (zones 30 / 70)
  - Sous-graphique **MACD** (histogramme + ligne + signal)
  - **Zones FVG (Fair Value Gaps)** dessinées en rectangles semi-transparents (vert = haussier, rouge = baissier), avec opacité variable selon qu'elles sont comblées ou non
- **Curseur (crosshair) synchronisé** entre tous les panneaux, thème sombre, redimensionnement automatique.
- Résumé des derniers indicateurs (RSI, MACD, ATR…).

> Les **Fair Value Gaps** (Smart Money Concepts) repèrent les déséquilibres de prix laissés par des mouvements brusques, utiles pour identifier des zones de support/résistance potentielles.

### 🏢 Fondamentaux

- Ratios financiers *(actions US uniquement)* via **Finviz** : P/E, P/B, BPA, capitalisation, ROE, dette/capitaux propres, bêta…
- Actualités par valeur avec **score de sentiment** et badges colorés (haussier / neutre / baissier).

### 🔁 Backtest

- Test de stratégies simples sur données historiques :
  - **Croisement SMA 50/200**
  - **Retournement RSI 30/70**
- Résultats : rendement total, ratio de Sharpe, drawdown maximal, taux de gain, nombre de trades, comparaison **Buy & Hold** et **courbe de capital** (equity curve).

### 📰 News & Sentiment

- **Onglet News** sur chaque valeur : dernières actualités liées au ticker avec sentiment.
- **Page Actualités des marchés** (`/news`) : flux **global** agrégé, indépendant d'un actif, avec :
  - **Bandeau de sentiment global** (jauge Baissier ↔ Haussier + compteurs)
  - **Filtres** par thème (Marchés, Macro, Technologie, Earnings, IPO, Crypto, Forex…), **recherche texte** et **filtre par sentiment**
  - **Grille de cartes** responsive avec badge de sentiment, source, date, résumé et **tickers cliquables** renvoyant vers la page de détail
- Source principale **Alpha Vantage** (`NEWS_SENTIMENT`), avec **repli automatique sur Finviz + VADER** si le quota est atteint.
- **Cache mémoire de 15 minutes** côté backend pour préserver les quotas.

---

## ▶️ Lancement rapide

Lance le backend (FastAPI, port **9100**) **et** le frontend (Vite, port **9000**) en une seule commande :

```powershell
# Windows (PowerShell)
.\start.ps1
```

```bash
# Linux / Mac
bash start.sh
```

Puis ouvre **http://localhost:9000** dans ton navigateur.

> ⚠️ **Windows — autoriser les scripts PowerShell (à faire UNE FOIS)** : par défaut,
> Windows **bloque** l'exécution des fichiers `.ps1` (`start.ps1`), d'où un backend qui
> « ne démarre pas ». Ouvre PowerShell **en administrateur** et exécute :
>
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```
>
> Alternative sans changer la politique globale : lancer le script en le débloquant
> uniquement pour cette commande —
> `powershell -ExecutionPolicy Bypass -File .\start.ps1`

### Lancer uniquement le backend

```powershell
# Windows (PowerShell)
cd backend ; .\start.ps1
```

```bash
# Linux / Mac
cd backend && bash start.sh
```

Le frontend et le backend doivent tourner **en parallèle** : le proxy Vite `/api` relaie
les requêtes vers `http://localhost:9100`. La documentation interactive de l'API est
auto-générée sur **http://localhost:9100/docs**.

---

## 🚀 Installation détaillée

### 1. Prérequis

- [Node.js](https://nodejs.org/) version **18 ou supérieure** (inclut `npm`)
- [Python](https://www.python.org/) version **3.11 ou supérieure** (pour le backend d'analyse)

Vérifie ton installation :

```bash
node --version
npm --version
python --version
```

### 2. Installer les dépendances du frontend

Depuis le dossier du projet :

```bash
npm install
```

### 3. Installer les dépendances du backend

Les scripts `start.ps1` / `start.sh` créent automatiquement un environnement virtuel et
installent les dépendances. Pour le faire manuellement :

```bash
cd backend
python -m venv venv

# Activation de l'environnement virtuel
source venv/bin/activate        # Linux / Mac
# .\venv\Scripts\Activate.ps1   # Windows (PowerShell)

pip install -r requirements.txt
uvicorn main:app --reload --port 9100
```

Le backend s'appuie notamment sur `yfinance` (OHLCV), `pandas-ta-classic` (indicateurs),
`finvizfinance` (fondamentaux + news de repli), `vaderSentiment` (sentiment),
`backtesting` (backtest), `alpha_vantage` et `python-dotenv`.

### 4. Configurer la clé Alpha Vantage (news)

Les actualités avec sentiment utilisent **Alpha Vantage**. Une clé gratuite (25 requêtes/jour)
suffit ; sans clé (ou quota épuisé), le backend bascule automatiquement sur **Finviz**.

```bash
# Depuis le dossier backend/
cp .env.example .env            # Linux / Mac
# copy .env.example .env        # Windows (PowerShell)
```

Ouvre `backend/.env` et renseigne ta clé :

```env
ALPHA_VANTAGE_API_KEY=ta_cle_ici
```

> ⚠️ Le fichier `backend/.env` est ignoré par Git : ta clé ne sera jamais committée.
> Obtiens une clé gratuite sur **https://www.alphavantage.co/support/#api-key**.

> 💡 Le frontend possède aussi un fichier `.env.example` à la racine pour une clé
> **Finnhub** optionnelle (`VITE_FINNHUB_API_KEY`). Elle peut également se configurer
> directement dans l'interface (voir ci-dessous).

### 5. Lancer l'application

Le plus simple est d'utiliser les scripts de lancement (`start.ps1` / `start.sh`), qui
démarrent backend **et** frontend. Sinon, dans deux terminaux séparés :

```bash
# Terminal 1 — backend
cd backend && uvicorn main:app --reload --port 9100

# Terminal 2 — frontend
npm run dev
```

Pour générer une version de production du frontend :

```bash
npm run build     # génère le dossier dist/
npm run preview   # sert la version de production en local
```

---

## 🔑 Configurer les APIs

Clique sur le bouton **« 🔑 Configurer les APIs »** dans l'en-tête du dashboard pour gérer
tes clés **sans jamais toucher à un fichier**. Le panneau liste plusieurs plateformes
(définies dans `src/config/apiRegistry.js`), avec badge d'état, catégorie, liens vers la
documentation/inscription et champ de saisie de clé.

| Plateforme | Rôle | Clé requise |
| ---------- | ---- | ----------- |
| **CoinGecko** | Prix crypto temps réel + historiques | Non (optionnelle pour plus de quota) |
| **Yahoo Finance** | Historique OHLCV des actions | Non (via proxy Vite) |
| **Finnhub** | Cotations temps réel des actions | Optionnelle (gratuite) |
| **Alpha Vantage** | News + sentiment (backend) | Optionnelle (gratuite, 25 req/jour) |
| **Finviz** | Fondamentaux + news actions US (repli) | Non |

### Stockage & sécurité

- Les clés saisies dans l'interface sont enregistrées **localement** dans le navigateur
  (`localStorage`, clé `marketmishmash_apis`) et **ne sont jamais transmises** ailleurs.
- La clé Finnhub configurée dans l'interface est **prioritaire** sur la variable
  `VITE_FINNHUB_API_KEY` du `.env` (utilisée en repli).
- La clé **Alpha Vantage** se configure côté backend dans `backend/.env`.
- **Aucune clé n'est obligatoire pour démarrer** : CoinGecko + Yahoo Finance suffisent pour
  afficher prix et graphiques.

---

## ⚙️ Gérer les actifs suivis

### 🖥️ Depuis l'interface (recommandé)

Clique sur **« ⚙️ Gérer mes actifs »** en haut à droite du dashboard pour :

- **Ajouter** une crypto (via son **ID CoinGecko**, ex. `bitcoin`) ou une action (via son **symbole**, ex. `AAPL`)
- **Supprimer** un actif suivi d'un clic
- **Réinitialiser** la liste aux valeurs par défaut

Ta liste est enregistrée automatiquement dans le **`localStorage`** (clé `marketmishmash_assets`) :
elle est conservée entre les sessions, sans modifier le code.

### 📄 Valeurs par défaut (`assets.json`)

Le fichier **`src/config/assets.json`** ne sert que de **valeurs par défaut** au tout premier
lancement (quand le `localStorage` est vide).

```json
{
  "crypto": [
    { "id": "bitcoin", "symbol": "BTC", "name": "Bitcoin" },
    { "id": "ethereum", "symbol": "ETH", "name": "Ethereum" }
  ],
  "stocks": [
    { "symbol": "AAPL", "name": "Apple Inc." },
    { "symbol": "MSFT", "name": "Microsoft Corp." }
  ],
  "settings": {
    "currency": "usd",
    "refreshIntervalMs": 60000
  }
}
```

- **Crypto** — `id` : l'**identifiant CoinGecko** (⚠️ pas le symbole), visible dans l'URL de la
  page CoinGecko ou via `https://api.coingecko.com/api/v3/coins/list`.
- **Action** — `symbol` : le **ticker boursier** (ex. `AAPL`, `TSLA`, `NVDA`).
- **Réglages** — `currency` (devise d'affichage des cryptos) et `refreshIntervalMs`
  (intervalle de rafraîchissement en millisecondes).

---

## 🧩 Structure du projet

```
marketmishmash/
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx          # Assemble les sections crypto & actions + navigation
│   │   ├── CryptoCard.jsx         # Carte d'un actif crypto (cliquable → détail)
│   │   ├── StockCard.jsx          # Carte d'une action (cliquable → détail)
│   │   ├── CandlestickChart.jsx   # Graphique chandeliers (Lightweight Charts) + EMA/Bollinger/RSI/MACD/FVG
│   │   ├── PriceChart.jsx         # Mini-graphique d'évolution des cartes du dashboard
│   │   ├── TimeframeSelector.jsx  # Sélecteur 24h / 7j / 30j / 90j / 1an
│   │   ├── AssetManager.jsx       # Panneau de gestion des actifs (ajout/suppression)
│   │   └── ApiManager.jsx         # Panneau de configuration des APIs (clés)
│   ├── pages/
│   │   ├── DetailPage.jsx         # Page de détail d'une valeur (onglets d'analyse)
│   │   ├── NewsPage.jsx           # Page Actualités des marchés (flux global /news)
│   │   └── tabs/
│   │       ├── TechnicalTab.jsx      # Onglet analyse technique (chandeliers + indicateurs + FVG)
│   │       ├── FundamentalsTab.jsx   # Onglet fondamentaux + news/sentiment
│   │       ├── NewsTab.jsx           # Onglet News de la valeur (Alpha Vantage → Finviz)
│   │       └── BacktestTab.jsx       # Onglet backtest de stratégies
│   ├── hooks/
│   │   ├── useAssets.js           # Liste des actifs persistée en localStorage
│   │   ├── useApiConfig.js        # Configuration des APIs persistée en localStorage
│   │   ├── useCryptoData.js       # Récupération + rafraîchissement crypto
│   │   └── useStockData.js        # Récupération + rafraîchissement actions
│   ├── services/
│   │   ├── apiStore.js            # Magasin partagé des clés API (hors React)
│   │   ├── coingecko.js           # Appels API CoinGecko (crypto)
│   │   ├── finnhub.js             # Appels API Finnhub (cotation temps réel actions)
│   │   ├── yahoo.js               # Appels Yahoo Finance (historique actions)
│   │   └── analysis.js            # Appels au backend d'analyse Python (/api)
│   ├── config/
│   │   ├── assets.json            # Liste configurable des actifs suivis
│   │   ├── apiRegistry.js         # Registre des plateformes d'API connues
│   │   └── timeframes.js          # Définition des plages temporelles
│   ├── utils/
│   │   └── format.js              # Formatage prix / % / volume / dates
│   ├── App.jsx                    # Routage (/, /detail/:ticker, /news)
│   ├── main.jsx                   # Point d'entrée + BrowserRouter
│   └── index.css
├── backend/                       # Micro-backend d'analyse (FastAPI)
│   ├── main.py                    # API : technique, FVG, fondamentaux, news, news global, backtest
│   ├── requirements.txt           # Dépendances Python
│   ├── start.ps1                  # Script de démarrage Windows (venv + uvicorn)
│   ├── start.sh                   # Script de démarrage Linux/Mac (venv + uvicorn)
│   ├── .env.example               # Modèle de configuration (clé Alpha Vantage)
│   └── .env                       # Clé réelle (ignoré par Git)
├── start.ps1                      # Lance backend + frontend (Windows)
├── start.sh                       # Lance backend + frontend (Linux/Mac)
├── .env.example                   # Modèle de configuration frontend (clé Finnhub)
├── .gitignore
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── vite.config.js
```

### Endpoints du backend

| Méthode | Endpoint | Description |
| ------- | -------- | ----------- |
| `GET`  | `/api/analysis/technical/{ticker}` | OHLCV + EMA 20/50/200, Bollinger, RSI, MACD, ATR |
| `GET`  | `/api/analysis/fvg/{ticker}` | Fair Value Gaps (Smart Money Concepts) |
| `GET`  | `/api/analysis/fundamentals/{ticker}` | Ratios financiers (Finviz, actions US) |
| `GET`  | `/api/analysis/news/{ticker}` | News d'une valeur (Alpha Vantage → repli Finviz) + sentiment |
| `GET`  | `/api/analysis/news_av/{ticker}` | News d'une valeur via Alpha Vantage uniquement |
| `POST` | `/api/analysis/backtest/{ticker}` | Backtest (SMA Cross 50/200 ou RSI Reversal 30/70) |
| `GET`  | `/api/news/global` | Flux d'actualités global + sentiment agrégé |
| `GET`  | `/api/news/topics` | Liste des thèmes disponibles pour le filtrage |

---

## 📝 Notes

- **Proxy Yahoo Finance** : Yahoo ne renvoie pas d'en-tête CORS, donc les appels passent par un
  proxy intégré à Vite (chemin `/yahoo`, voir `vite.config.js`). Ce proxy est actif avec
  `npm run dev` **et** `npm run preview`. Un **build statique** (`dist/`) déployé sur un hébergeur
  classique n'a pas ce proxy : il faudrait alors un petit serveur relais (reverse-proxy Nginx ou
  fonction serverless) redirigeant `/yahoo` vers `https://query1.finance.yahoo.com`.
- **Proxy API backend** : de la même façon, le chemin `/api` est relayé vers le backend FastAPI
  (`http://localhost:9100`). Le backend doit donc tourner en parallèle du frontend.
- **Quotas API** : Alpha Vantage limite le plan gratuit à **25 requêtes/jour**. Un **cache mémoire
  de 15 minutes** et un **repli automatique sur Finviz + VADER** évitent les interruptions. En cas
  de dépassement de quota (CoinGecko, Finnhub…), les appels peuvent être temporairement limités.
- **Fondamentaux & news par valeur** : disponibles principalement pour les **actions américaines**.
  Pour les cryptos, seuls les onglets pertinents (analyse technique, backtest) sont exploitables.
- Ce projet est fourni à titre **pédagogique** et ne constitue **pas un conseil en investissement**.

---

## 🗺️ Roadmap

Quelques pistes d'évolution envisagées :

- 🔔 Alertes de prix et de sentiment configurables
- ⭐ Watchlists multiples et portefeuilles
- 🧮 Indicateurs techniques supplémentaires (Ichimoku, VWAP, stochastique…)
- 🧠 Stratégies de backtest additionnelles et paramétrables
- 🌍 Internationalisation (multi-langues, multi-devises étendues)
- 📉 Comparaison multi-actifs sur un même graphique
- 💾 Persistance des données via une base légère (optionnelle)

---

## 📄 Licence & contribution

Distribué sous licence **MIT**. Vous êtes libre d'utiliser, modifier et redistribuer ce projet.

Les contributions sont bienvenues :

1. **Forkez** le dépôt.
2. Créez une branche de fonctionnalité (`git checkout -b feature/ma-fonctionnalite`).
3. **Committez** vos changements avec un message clair.
4. Ouvrez une **Pull Request** décrivant votre contribution.

Pour toute suggestion ou anomalie, ouvrez une **issue** sur le dépôt GitHub.
