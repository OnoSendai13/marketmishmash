# MarketMishmash 📈

Dashboard léger et modulaire de **suivi des marchés financiers** — cryptomonnaies et actions — à exécuter **en local**, sur n'importe quel système (Windows, macOS, Linux).

- ⚡ **React + Vite** : démarrage instantané avec `npm run dev`
- 🎨 **Tailwind CSS** : interface sombre et responsive
- 📊 **Recharts** : graphiques d'évolution avec sélecteur de période
- 🔌 **APIs** : [CoinGecko](https://www.coingecko.com/) (crypto, sans clé) + [Finnhub](https://finnhub.io/) (actions, clé gratuite)

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

Ouvrez l'URL affichée dans le terminal (par défaut **http://localhost:5173**).

Pour générer une version de production :

```bash
npm run build     # génère le dossier dist/
npm run preview   # sert la version de production en local
```

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
│   │   └── AssetManager.jsx      # Panneau de gestion des actifs (ajout/suppression)
│   ├── hooks/
│   │   ├── useAssets.js          # Liste des actifs persistée en localStorage
│   │   ├── useCryptoData.js      # Récupération + rafraîchissement crypto
│   │   └── useStockData.js       # Récupération + rafraîchissement actions
│   ├── services/
│   │   ├── coingecko.js          # Appels API CoinGecko
│   │   └── finnhub.js            # Appels API Finnhub
│   ├── config/
│   │   ├── assets.json           # Liste configurable des actifs suivis
│   │   └── timeframes.js         # Définition des plages temporelles
│   ├── utils/
│   │   └── format.js             # Formatage prix / % / volume / dates
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
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

- Les données proviennent de **CoinGecko** et **Finnhub**. En cas de dépassement des quotas gratuits,
  les appels peuvent être temporairement limités (erreur affichée sur les cartes).
- L'historique des **actions** (graphique) dépend de l'endpoint `stock/candle` de Finnhub ; selon
  votre plan gratuit, il peut être restreint — la cotation temps réel (`/quote`) reste disponible.
- Ce projet est fourni à titre **pédagogique** et ne constitue **pas un conseil en investissement**.
