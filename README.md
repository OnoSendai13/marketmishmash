# MarketMishmash 📈

Dashboard léger et modulaire de **suivi des marchés financiers** — cryptomonnaies et actions — à exécuter **en local**, sur n'importe quel système (Windows, macOS, Linux).

- ⚡ **React + Vite** : démarrage instantané avec `npm run dev`
- 🎨 **Tailwind CSS** : interface sombre et responsive
- 📊 **Recharts** : graphiques d'évolution avec sélecteur de période
- 🔌 **APIs** : [CoinGecko](https://www.coingecko.com/) (crypto, sans clé) + [Finnhub](https://finnhub.io/) (actions, prix temps réel) + [Yahoo Finance](https://finance.yahoo.com/) (historique des actions, sans clé)

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

---

## ✨ Fonctionnalités

- Deux sections : **Crypto** et **Actions**
- Une **carte par actif** : nom, prix actuel, variation en %, volume/infos
- **Graphique d'évolution** avec sélecteur de plage temporelle : **24h · 7j · 30j · 90j · 1an**
- **Rafraîchissement automatique** (toutes les 60 s par défaut)
- **Liste d'actifs configurable** via un simple fichier JSON
- Structure **modulaire** : chaque widget/section est un composant séparé, facile à étendre

---

## 🚀 Démarrage rapide

### 1. Prérequis

- [Node.js](https://nodejs.org/) version **18 ou supérieure** (inclut `npm`)

Vérifiez votre installation :

```bash
node --version
npm --version
```

### 2. Installer les dépendances

Depuis le dossier du projet :

```bash
npm install
```

### 3. Obtenir une clé API Finnhub (gratuite)

La section **Actions** utilise Finnhub, qui nécessite une clé API gratuite :

1. Rendez-vous sur **https://finnhub.io/** et cliquez sur **« Get free API key »** (ou *Sign up*).
2. Créez un compte (email + mot de passe — 30 secondes).
3. Une fois connecté, votre clé s'affiche dans le **Dashboard** Finnhub (section *API Key*).
4. Copiez cette clé.

> 💡 La section **Crypto** fonctionne **sans aucune clé** (CoinGecko public).

> 💡 **Alternative sans fichier `.env`** : vous pouvez aussi saisir votre clé Finnhub
> directement dans l'interface via le bouton **« 🔑 Configurer les APIs »** (voir la section
> [Configurer les APIs](#-configurer-les-apis)). La clé est alors enregistrée dans le navigateur
> (localStorage) et prioritaire sur le `.env`.

### 4. Configurer le fichier `.env`

Copiez le fichier d'exemple puis collez votre clé Finnhub :

```bash
# macOS / Linux
cp .env.example .env

# Windows (PowerShell)
copy .env.example .env
```

Ouvrez `.env` et remplacez la valeur :

```env
VITE_FINNHUB_API_KEY=votre_cle_finnhub_ici
```

> ⚠️ Le fichier `.env` est ignoré par Git : votre clé ne sera jamais committée.

### 5. Lancer le dashboard

```bash
npm run dev
```

Ouvrez l'URL affichée dans le terminal (par défaut **http://localhost:9000**).

Pour générer une version de production :

```bash
npm run build     # génère le dossier dist/
npm run preview   # sert la version de production en local
```

---

## 🔬 Phase 1 — Analyse des valeurs

Chaque carte du tableau de bord (crypto ou action) est désormais **cliquable** et
ouvre une **page de détail** (`/detail/:ticker`) proposant trois onglets d'analyse :

- **Analyse Technique** — graphique de cours avec moyennes mobiles (EMA 20/50/200)
  et bandes de Bollinger, plus deux sous-graphiques RSI (zones 30/70) et MACD
  (histogramme + signal), et un résumé des derniers indicateurs (RSI, MACD, ATR…).
- **Fondamentaux & News** *(actions US uniquement)* — ratios financiers
  (P/E, P/B, BPA, capitalisation, ROE, dette/capitaux, bêta…), dernières actualités
  et **score de sentiment** (VADER) avec badges colorés (haussier / neutre / baissier).
- **Backtest** — test de stratégies simples (**Croisement SMA 50/200** ou
  **Retournement RSI 30/70**) avec rendement, Sharpe, drawdown max, taux de gain,
  nombre de trades et **courbe de capital** (equity curve).

Ces analyses sont fournies par un **micro-backend Python (FastAPI)** situé dans le
dossier [`backend/`](backend/), qui s'appuie sur `yfinance` (données OHLCV),
`pandas-ta-classic` (indicateurs), `finvizfinance` (fondamentaux + news),
`vaderSentiment` (sentiment) et `backtesting` (backtest).

### Lancer le backend d'analyse

Le backend doit tourner **en parallèle** du frontend (le proxy Vite `/api` le relaie
vers `http://localhost:9100`).

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload      # démarre l'API sur http://localhost:9100
```

Ou plus simplement, via le script fourni (crée un venv, installe et lance) :

```bash
cd backend
./start.sh
```

Puis, dans un **autre terminal**, lancez le frontend :

```bash
npm run dev
```

> ℹ️ Les endpoints exposés : `GET /api/analysis/technical/{ticker}`,
> `GET /api/analysis/fundamentals/{ticker}`, `GET /api/analysis/news/{ticker}`,
> `POST /api/analysis/backtest/{ticker}`. Documentation interactive auto-générée
> sur http://localhost:9100/docs.
>
> Les fondamentaux et news ne concernent que les **actions américaines** ; pour les
> cryptos, seuls les onglets « Analyse Technique » et « Backtest » sont disponibles.

---

## ⚙️ Configurer les actifs suivis

### 🖥️ Depuis l'interface (recommandé)

Cliquez sur le bouton **« ⚙️ Gérer mes actifs »** en haut à droite du dashboard pour ouvrir le panneau de gestion :

- **Ajouter** une crypto (via son **ID CoinGecko**, ex. `bitcoin`) ou une action (via son **symbole Finnhub**, ex. `AAPL`)
- **Supprimer** un actif suivi d'un clic
- **Réinitialiser** la liste aux valeurs par défaut

Votre liste est enregistrée automatiquement dans le **`localStorage`** du navigateur (clé `marketmishmash_assets`) : elle est conservée entre les sessions, sans modifier le code.

> Le fichier `src/config/assets.json` ne sert plus que de **valeurs par défaut** au tout premier lancement (quand le `localStorage` est vide).

### 📄 Valeurs par défaut (`assets.json`)

La liste par défaut se trouve dans **`src/config/assets.json`**.

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

### Ajouter / retirer une crypto

- `id` : l'**identifiant CoinGecko** de la crypto (⚠️ pas le symbole).
  Pour le trouver : ouvrez la page CoinGecko de la crypto, l'`id` figure dans l'URL
  (ex. `https://www.coingecko.com/fr/pièces/**bitcoin**` → `id = "bitcoin"`).
  Vous pouvez aussi consulter la liste complète : `https://api.coingecko.com/api/v3/coins/list`.
- `symbol` et `name` sont libres (affichage).

### Ajouter / retirer une action

- `symbol` : le **ticker boursier** reconnu par Finnhub (ex. `AAPL`, `TSLA`, `NVDA`).
- `name` : libellé libre affiché sur la carte.

---

## 🔑 Configurer les APIs

Cliquez sur le bouton **« 🔑 Configurer les APIs »** dans l'en-tête du dashboard pour ouvrir le panneau de configuration. Il vous permet de gérer vos clés **sans jamais toucher à un fichier**.

### Plateformes intégrées

Le panneau liste plusieurs plateformes connues (définies dans `src/config/apiRegistry.js`) :

| Plateforme | Catégorie | Clé requise |
| ---------- | --------- | ----------- |
| **Finnhub** | Actions | Oui |
| **CoinGecko** | Crypto | Non (optionnelle pour plus de quota) |
| **Alpha Vantage** | Actions | Oui |
| **CoinMarketCap** | Crypto | Oui |
| **Financial Modeling Prep** | Actions | Oui |

Pour chaque plateforme, vous disposez : d'un badge d'état (**Configurée ✅** / **Non configurée** / **Fonctionnelle sans clé**), d'un badge de catégorie (Crypto / Actions), de liens vers la **documentation** et l'**inscription**, et d'un bouton pour **saisir / modifier / supprimer** la clé.

### Ajouter une plateforme manuellement

En bas du panneau, un formulaire permet d'enregistrer une plateforme non listée (**Nom**, **URL de base**, **Clé API** facultative). Elle est sauvegardée comme entrée personnalisée.

### Stockage & sécurité

- Les clés sont enregistrées **localement** dans le navigateur (`localStorage`, clé `marketmishmash_apis`) et **ne sont jamais transmises** ailleurs.
- La clé Finnhub configurée ici est **prioritaire** sur la variable `VITE_FINNHUB_API_KEY` du `.env` (qui reste utilisée comme repli si le `localStorage` est vide).
- Si Finnhub n'est pas configurée, un avertissement discret s'affiche dans la section **Actions** avec un raccourci vers le panneau.

---

### Réglages généraux (`settings`)

| Clé                 | Description                                        | Exemple  |
| ------------------- | -------------------------------------------------- | -------- |
| `currency`          | Devise d'affichage des cryptos (`usd`, `eur`, ...) | `"usd"`  |
| `refreshIntervalMs` | Intervalle de rafraîchissement auto (millisecondes)| `60000`  |

---

## 🧩 Structure du projet

```
marketmishmash/
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx         # Assemble les sections crypto & actions
│   │   ├── CryptoCard.jsx        # Carte d'un actif crypto + graphique
│   │   ├── StockCard.jsx         # Carte d'une action + graphique
│   │   ├── PriceChart.jsx        # Graphique d'évolution (Recharts)
│   │   ├── TimeframeSelector.jsx # Sélecteur 24h / 7j / 30j / 90j / 1an
│   │   ├── AssetManager.jsx      # Panneau de gestion des actifs (ajout/suppression)
│   │   └── ApiManager.jsx        # Panneau de configuration des APIs (clés)
│   ├── hooks/
│   │   ├── useAssets.js          # Liste des actifs persistée en localStorage
│   │   ├── useApiConfig.js       # Configuration des APIs persistée en localStorage
│   │   ├── useCryptoData.js      # Récupération + rafraîchissement crypto
│   │   └── useStockData.js       # Récupération + rafraîchissement actions
│   ├── pages/
│   │   ├── DetailPage.jsx        # Page de détail d'une valeur (Phase 1, 3 onglets)
│   │   └── tabs/
│   │       ├── TechnicalTab.jsx  # Onglet analyse technique (RSI, MACD, Bollinger…)
│   │       ├── FundamentalsTab.jsx # Onglet fondamentaux + news/sentiment
│   │       └── BacktestTab.jsx   # Onglet backtest de stratégies
│   ├── services/
│   │   ├── apiStore.js           # Magasin partagé des clés API (hors React)
│   │   ├── coingecko.js          # Appels API CoinGecko (crypto)
│   │   ├── finnhub.js            # Appels API Finnhub (cotation temps réel actions)
│   │   ├── yahoo.js              # Appels Yahoo Finance (historique actions)
│   │   └── analysis.js           # Appels au backend d'analyse Python (/api)
│   ├── config/
│   │   ├── assets.json           # Liste configurable des actifs suivis
│   │   ├── apiRegistry.js        # Registre des plateformes d'API connues
│   │   └── timeframes.js         # Définition des plages temporelles
│   ├── utils/
│   │   └── format.js             # Formatage prix / % / volume / dates
│   ├── App.jsx                   # Routage (dashboard + page de détail)
│   ├── main.jsx                  # Point d'entrée + BrowserRouter
│   └── index.css
├── backend/                      # Micro-backend d'analyse (Phase 1, FastAPI)
│   ├── main.py                   # API : technique, fondamentaux, news, backtest
│   ├── requirements.txt          # Dépendances Python
│   └── start.sh                  # Script de démarrage (venv + uvicorn)
├── .env.example                  # Modèle de configuration (clé Finnhub)
├── .gitignore
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── vite.config.js
```

### Ajouter un nouveau widget/module

L'architecture est volontairement modulaire :

1. Créez un service dans `src/services/` si une nouvelle source de données est nécessaire.
2. Créez un hook dans `src/hooks/` pour la récupération/rafraîchissement.
3. Créez un composant carte dans `src/components/`.
4. Ajoutez la nouvelle section dans `Dashboard.jsx`.

---

## 📝 Notes

- Les données proviennent de **CoinGecko**, **Finnhub** et **Yahoo Finance**. En cas de dépassement
  des quotas gratuits, les appels peuvent être temporairement limités (erreur affichée sur les cartes).
- Pour les **actions**, deux sources se complètent :
  - **Finnhub** fournit la **cotation temps réel** (`/quote`, gratuit) — nécessite une clé.
  - **Yahoo Finance** fournit l'**historique des graphiques** (24h → 1 an) — gratuit et sans clé.
  L'endpoint `stock/candle` de Finnhub (historique) étant réservé aux plans payants, il n'est plus utilisé.
- ⚠️ **Proxy Yahoo Finance** : Yahoo ne renvoie pas d'en-tête CORS, donc les appels passent par un
  proxy intégré à Vite (chemin `/yahoo`, voir `vite.config.js`). Ce proxy est actif avec
  `npm run dev` **et** `npm run preview`. En revanche, un **build statique** (`dist/`) déployé sur un
  hébergeur classique n'a pas ce proxy : il faudrait alors un petit serveur relais (ex. un reverse-proxy
  Nginx ou une fonction serverless) pour rediriger `/yahoo` vers `https://query1.finance.yahoo.com`.
- Ce projet est fourni à titre **pédagogique** et ne constitue **pas un conseil en investissement**.
