# MarketBall — Context & Instructions pour Claude Code

## 🎯 Qui je suis
Je suis un débutant complet en développement. Je n'ai aucune connaissance en code. J'ai créé cette application entièrement guidé par Claude (claude.ai) qui me donnait des instructions clic par clic. Mon rôle a été de :
- Copier-coller des commandes dans le terminal
- Uploader/remplacer des fichiers
- Configurer des interfaces web (Supabase, Vercel, Stripe, Namecheap)

**Ne présume jamais que je connais une notion technique.** Explique toujours brièvement ce que tu fais et pourquoi.

---

## 🏗️ Architecture du projet

### Stack technique
- **Frontend** : React + Vite (fichier principal : `src/App.jsx` — ~2200 lignes, tout en un seul fichier pour l'instant)
- **Backend** : Supabase (PostgreSQL + Auth + Storage)
- **API Routes** : Vercel Serverless Functions (`/api/*.js`)
- **Déploiement** : Vercel (auto-deploy depuis GitHub)
- **Domaine** : `market-ball.com` (Namecheap) → redirige vers Vercel
- **Email pro** : `contact@market-ball.com` (Namecheap Private Email)
- **Paiements** : Stripe (en cours de configuration avec vrai compte)
- **Automatisation** : n8n (workflow prêt, pas encore payé/activé)
- **API Football** : api-football.com plan PRO (clé dans Vercel env vars)

### Variables d'environnement Vercel
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_SERVICE_KEY=sb_secret_...
SUPABASE_URL=https://aiesvzdvlownkcjbkgjv.supabase.co
API_FOOTBALL_KEY=40533740436accde88c55c99151b68cf
ADMIN_PASSWORD=adminmarketball9233005
```

### Supabase
- **URL** : https://aiesvzdvlownkcjbkgjv.supabase.co
- **Clé publiable** : `sb_publishable_Ipu5bJO_zD1ckygwQmpcuw_Tl5xWmyK`

### Tables Supabase
- `profiles` — id, username, coins, store_coins, xp, level, subscription (starter/pro/elite), stripe_customer_id, stripe_subscription_id, total_bets, total_wins, total_profit, weekly_profit, streak, last_spin, ads_watched_today, last_login, created_at
- `match_bets` — id, user_id, match_title, bet_type, prediction, cost, potential_gain, status (pending/won/lost/cashed_out), created_at
- `user_bets` — id, user_id, market_id, market_title, side, amount, cost, potential_gain, status, created_at
- `custom_markets` — id, title, category, source, proposed_by, closes_at, q_yes, q_no, total_volume, participants, status (open/closed), created_by, created_at
- `proposed_markets` — id, title, category, proposed_by, proposer_id, status (pending/approved/rejected), admin_note, created_at
- `rumors` — alimenté par n8n, contient les rumeurs de transferts

---

## 📁 Structure des fichiers clés
```
marketball/
├── src/
│   └── App.jsx              # Frontend complet (~2200 lignes) — À MODULARISER
├── api/
│   ├── matches.js           # Fetch matchs via api-football.com
│   ├── fixtures.js          # Fetch buteurs par fixture ID
│   ├── squad.js             # Fetch squad d'une équipe
│   ├── create-subscription.js  # Stripe abonnements
│   ├── webhook.js           # Stripe webhook → met à jour Supabase
│   └── admin-delete.js      # DELETE sécurisé pour l'admin
├── public/
│   ├── admin-mb9233.html    # Interface admin (protégée par mdp)
│   ├── legal.html           # Mentions légales + RGPD
│   └── favicon.svg          # Logo MarketBall
└── index.html               # Entry point
```

---

## 🎮 Ce que fait l'application

**MarketBall** est une plateforme de prédictions football (bourse de prédiction) :
- Les users parient des **MarketCoins (MC)** virtuels (sans valeur monétaire réelle)
- Sur des **marchés de prédiction** (transferts, rumeurs) via un système AMM (Automated Market Maker)
- Et sur des **matchs** (vainqueur, score exact, buteurs, over/under)
- Ils gagnent des **StoreCoins (SC)** échangeables contre de vrais cadeaux
- Système de **niveaux/badges** (Rookie → Scout → Analyst → Pro → Legend)
- **3 abonnements** : Starter (gratuit), Pro (4.99€/mois), Elite (14.99€/mois)
- Les **membres Elite** peuvent proposer des marchés
- **Cashout** disponible Pro/Elite sur les paris en cours

---

## 🔴 Bugs connus & Todo

### Bugs actifs
1. **Webhook Stripe** — paiement reçu mais `subscription` pas mise à jour dans Supabase
2. **Cotes matchs statiques** — ne changent pas selon le score en cours (ex: toujours la même cote à 0-0 et 3-0)
3. **Classement pas remis à zéro** — devrait se reset chaque lundi (prévu via n8n)

### Fonctionnalités à compléter
- n8n + Apify (automatisation rumeurs transferts) — workflow prêt, pas encore activé
- Stripe live (nouveau compte avec email pro `contact@market-ball.com`)
- Mentions légales (placeholders [NOM], [SIRET], [ADRESSE] à remplir)
- Partage social sur les matchs (fait sur les marchés uniquement)
- Onboarding nouveaux utilisateurs

### Améliorations prévues
- Modulariser `App.jsx` en composants séparés
- Skeleton loaders pendant chargement
- Notif badge rouge sur Wallet quand pari résolu
- Profils publics via URL `/u/username`
- Page 404 custom
- Graphique progression gains profil

---

## 🛠️ Comment travailler avec moi

### Règles importantes
1. **Explique brièvement** ce que tu fais avant de le faire
2. **Préfère les petites commandes bash** aux gros fichiers à re-télécharger quand c'est possible
3. **Toujours tester** avant de me demander de pusher
4. **Git** : je travaille depuis `~/marketball/src/` — les commandes git utilisent `git -C ~/marketball`
5. **Jamais de secrets** dans le code committé (GitHub les bloque)

### Pour pusher du code
```bash
git -C ~/marketball add [fichiers]
git -C ~/marketball commit -m "description"
git -C ~/marketball push
```

### Pour les petits changements dans App.jsx
Utilise `sed` ou des commandes bash directes plutôt que régénérer tout le fichier :
```bash
sed -i '' 's/ancien texte/nouveau texte/' ~/marketball/src/App.jsx
```

---

## 🚀 Priorités immédiates

1. **Modulariser App.jsx** — le découper en composants (`components/`, `pages/`, `hooks/`) pour faciliter la maintenance
2. **Débugger le webhook Stripe** — c'est bloquant pour la monétisation
3. **Améliorer la sécurité** — RLS Supabase plus stricte, validation côté serveur
4. **Performance** — lazy loading, memoization des composants lourds
5. **Tests** — au moins des tests basiques sur les fonctions critiques (AMM, resolveBet)

---

## 💡 Initiatives encouragées

Tu as **carte blanche** pour :
- Modulariser et refactoriser le code
- Améliorer les performances (React.memo, useMemo, useCallback)
- Renforcer la sécurité (RLS Supabase, validation inputs)
- Créer des skills/tools/context supplémentaires pour toi-même
- Proposer et implémenter de nouvelles features si elles ont du sens
- Optimiser les requêtes Supabase
- Améliorer l'expérience mobile
- Mettre en place du monitoring (logs d'erreurs, etc.)

**Toujours expliquer brièvement** ce que tu fais et pourquoi, car je suis débutant et je veux comprendre les grandes lignes même si je ne code pas moi-même.
