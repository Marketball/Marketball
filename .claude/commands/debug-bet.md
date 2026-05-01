Diagnostique un bug lié aux paris sur MarketBall.

Contexte important :
- Les paris matchs sont dans `src/components/MatchBetModal.jsx`
- Les paris marchés AMM sont dans `src/lib/amm.js` + `src/App.jsx`
- Les cotes dynamiques viennent de `/api/match-odds.js` (lit `team_stats` dans Supabase)
- Les cotes statiques de fallback sont dans `src/lib/amm.js` (fonction `calcMatchOdds`)
- La résolution des paris se fait dans `src/App.jsx` (fonction `resolveBet`)

Étapes :
1. Lis la description du bug fournie en argument ($ARGUMENTS)
2. Identifie quel fichier est probablement concerné
3. Lis ce fichier
4. Explique la cause probable du bug en termes simples
5. Propose un fix précis avec le code exact à modifier
