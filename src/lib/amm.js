export const AMM = {
  probYes: (qY, qN) => { const eY = Math.exp(Math.min(qY,500) / 100), eN = Math.exp(Math.min(qN,500) / 100); return Math.max(0.02, Math.min(0.98, eY / (eY + eN))); },
  costToBuy: (qY, qN, shares, side) => {
    const b = 100;
    const qYc=Math.min(qY,500), qNc=Math.min(qN,500);
    const before = b * Math.log(Math.exp(qYc / b) + Math.exp(qNc / b));
    const after = side === "yes" ? b * Math.log(Math.exp((qYc + shares) / b) + Math.exp(qNc / b)) : b * Math.log(Math.exp(qYc / b) + Math.exp((qNc + shares) / b));
    return Math.max(1, Math.round(after - before));
  },
  // Cashout : valeur actuelle des parts selon les cotes du moment
  cashoutValue: (qY, qN, shares, side) => {
    const p = AMM.probYes(qY, qN);
    const currentProb = side === "yes" ? p : 1 - p;
    return Math.max(1, Math.round(shares * currentProb * 0.95)); // 5% frais cashout
  },
};

// Cotes live : recalculées en temps réel selon score + minute
export const calcLiveMatchOdds = (match) => {
  const base = calcMatchOdds(match);
  const isLive = match.status === "IN_PLAY" || match.status === "PAUSED";
  if (!isLive || match.elapsed == null) return base;

  const elapsed = Math.max(1, Math.min(90, match.elapsed));
  const remaining = Math.max(2, 92 - elapsed);
  const homeScore = match.home_score ?? 0;
  const awayScore = match.away_score ?? 0;
  const scoreDiff = homeScore - awayScore;

  let pHome, pAway, pDraw;

  if (scoreDiff === 0) {
    // Match nul : probabilité de match nul croît avec le temps
    const tightness = 1 - remaining / 90;
    pDraw = Math.min(0.78, base.pDraw * (1 + tightness * 2.2));
    const remProb = 1 - pDraw;
    const baseSum = base.pHome + base.pAway;
    pHome = remProb * (base.pHome / baseSum);
    pAway = remProb * (base.pAway / baseSum);
  } else {
    // Écart au score : calcul Poisson sur les buts restants
    // Garantit que pDraw > pAway quand l'équipe mène d'un but (ex: 85min 3-2)
    const poi = (l, k) => { let r = Math.exp(-l); for (let i = 0; i < k; i++) r *= l / (i + 1); return r; };
    const lH = base.pHome * 2.2 + base.pDraw * 1.1;
    const lA = base.pAway * 2.2 + base.pDraw * 1.1;
    const lH_rem = lH * remaining / 90;
    const lA_rem = lA * remaining / 90;
    let pHomeWin = 0, pDrawProb = 0, pAwayWin = 0;
    for (let h = 0; h <= 7; h++) {
      for (let a = 0; a <= 7; a++) {
        const prob = poi(lH_rem, h) * poi(lA_rem, a);
        const finalDiff = scoreDiff + h - a;
        if (finalDiff > 0) pHomeWin += prob;
        else if (finalDiff === 0) pDrawProb += prob;
        else pAwayWin += prob;
      }
    }
    pHome = Math.max(0.005, pHomeWin);
    pDraw = Math.max(0.005, pDrawProb);
    pAway = Math.max(0.005, pAwayWin);
  }

  const total = pHome + pDraw + pAway;
  pHome /= total; pDraw /= total; pAway /= total;
  const m = 1.05;
  return {
    pHome, pAway, pDraw,
    oddsHome: +(m / pHome).toFixed(2),
    oddsDraw: +(m / pDraw).toFixed(2),
    oddsAway: +(m / pAway).toFixed(2),
    isLive: true,
  };
};

// Force par équipe (sur 100) — noms exacts API-Football, saison 2024-25
// IMPORTANT : les clés doivent correspondre aux noms renvoyés par l'API
const TEAM_STRENGTH = {
  // ⚽ Elite mondiale
  "Manchester City":    91, "Man City":91,
  "Bayern Munich":      94, "Bayern":94, "FC Bayern":94, "FC Bayern München":94,
  "Liverpool":          93,
  "Paris Saint-Germain":92, "PSG":92, "Paris SG":92, "Paris":92,
  "Arsenal":            90,
  "Real Madrid":        89,
  "Internazionale":     88, "Inter Milan":88, "Inter":88, "FC Internazionale":88,
  "Bayer Leverkusen":   87,
  "Barcelona":          87,
  "Atletico Madrid":    85, "Atletico de Madrid":85, "Atlético Madrid":85,
  "Borussia Dortmund":  84, "Dortmund":84, "BVB":84,
  "RB Leipzig":         83,
  "Chelsea":            83,
  "AC Milan":           82, "Milan":82,
  "Napoli":             82,
  "Newcastle":          81,
  "Juventus":           81,
  "Aston Villa":        80,
  "Manchester United":  79, "Man United":79, "Man Utd":79,
  "Tottenham":          79, "Tottenham Hotspur":79, "Spurs":79,
  // 🌍 Niveau européen
  "Atalanta":           80,
  "Roma":               78,
  "Monaco":             78,
  "Lille":              76,
  "Porto":              77,
  "Benfica":            76,
  "Feyenoord":          76,
  "Marseille":          75,
  "Lazio":              75,
  "Sevilla":            75,
  "Villarreal":         75,
  "West Ham":           75,
  "Brighton":           75,
  "Fiorentina":         74,
  "Real Sociedad":      74,
  "Athletic Club":      74,
  "Ajax":               74,
  "Lyon":               74,
  "Lens":               73,
  "Celtic":             73,
  "Brentford":          73,
  "Betis":              73,
  "Bologna":            73,
  "Shakhtar":           73,
  "Salzburg":           72,
  "Club Brugge":        72,
  "Rennes":             70,
  "Nice":               70,
  "Strasbourg":         68,
  "Reims":              67,
  // 🏴 Premier League — équipes mid/bas de tableau
  "Wolves":             70, "Wolverhampton":70, "Wolverhampton Wanderers":70,
  "Fulham":             72,
  "Everton":            71,
  "Crystal Palace":     69,
  "Nottingham Forest":  74,
  "Bournemouth":        70,
  "Brentford":          73,
  "Leicester":          69, "Leicester City":69,
  "Burnley":            65,
  "Luton":              63, "Luton Town":63,
  "Sheffield United":   63, "Sheffield Utd":63,
  "Sunderland":         67,
  "Leeds":              69, "Leeds United":69,
  "Ipswich":            67, "Ipswich Town":67,
  "Southampton":        65, "Southampton FC":65,
  // 🇩🇪 Bundesliga — équipes manquantes
  "Eintracht Frankfurt":76, "Frankfurt":76,
  "Stuttgart":          76, "VfB Stuttgart":76,
  "Hoffenheim":         72, "TSG Hoffenheim":72,
  "Augsburg":           68,
  "Wolfsburg":          71, "VfL Wolfsburg":71,
  "Freiburg":           73, "SC Freiburg":73,
  "Union Berlin":       70,
  "Mainz":              69, "Mainz 05":69,
  "Werder Bremen":      70,
  "Heidenheim":         66,
  "Bochum":             65,
  "Darmstadt":          63,
  // 🇫🇷 Ligue 1 — équipes manquantes
  "Nantes":             68,
  "Lorient":            65,
  "Metz":               64,
  "Clermont":           63,
  "Montpellier":        67,
  "Brest":              70,
  "Toulouse":           69,
  "Le Havre":           65,
  // 🇪🇸 La Liga — équipes manquantes
  "Getafe":             67,
  "Rayo Vallecano":     68, "Rayo":68,
  "Celta Vigo":         69, "Celta":69,
  "Alaves":             65, "Deportivo Alaves":65,
  "Las Palmas":         65,
  "Mallorca":           68,
  "Osasuna":            68,
  "Girona":             74,
  "Valencia":           70,
  "Cadiz":              63,
  "Granada":            63,
  // 🇮🇹 Serie A — équipes manquantes
  "Empoli":             66,
  "Frosinone":          64,
  "Salernitana":        63,
  "Monza":              68,
  "Udinese":            67,
  "Sassuolo":           68,
  "Torino":             70,
  "Cagliari":           66,
  "Genoa":              68,
  "Lecce":              65,
  "Verona":             67, "Hellas Verona":67,
};

const getStrength = (teamName) => {
  if (!teamName) return 65;
  const n = teamName.toLowerCase();
  // 1. Correspondance exacte (insensible à la casse)
  const exactKey = Object.keys(TEAM_STRENGTH).find(k => k.toLowerCase() === n);
  if (exactKey) return TEAM_STRENGTH[exactKey];
  // 2. Le nom reçu CONTIENT une clé (insensible à la casse)
  const containsKey = Object.keys(TEAM_STRENGTH).find(k => n.includes(k.toLowerCase()));
  if (containsKey) return TEAM_STRENGTH[containsKey];
  // 3. Une clé CONTIENT le nom reçu
  const reverseKey = Object.keys(TEAM_STRENGTH).find(k => k.toLowerCase().includes(n));
  if (reverseKey) return TEAM_STRENGTH[reverseKey];
  console.warn(`[amm] équipe inconnue: "${teamName}" → force par défaut 65`);
  return 65;
};

export const calcMatchOdds = (match) => {
  const sH = getStrength(match.home_team);
  const sA = getStrength(match.away_team);

  // Avantage domicile : réduit quand les deux équipes sont d'élite
  const avgStr = (sH + sA) / 2;
  const homeAdv = avgStr >= 85 ? 3 : avgStr >= 78 ? 5 : 8;

  // Formule ELO : probabilité basée sur l'écart de force
  const diff = (sH + homeAdv) - sA;
  const pHome = 1 / (1 + Math.pow(10, -diff / 40));
  const pAway = 1 / (1 + Math.pow(10, diff / 40));

  // Probabilité de nul : plus élevée quand les équipes sont proches
  const gap = Math.abs(diff);
  const drawBase = gap < 5 ? 0.28 : gap < 10 ? 0.24 : gap < 20 ? 0.20 : 0.14;
  const pDraw = Math.min(0.32, Math.max(0.08, drawBase));

  // Normaliser pour que la somme = 1
  const total = pHome + pAway + pDraw;
  const pH = pHome / total, pA = pAway / total, pD = pDraw / total;

  const m = 1.05; // marge bookmaker 5%
  return {
    pHome: pH, pAway: pA, pDraw: pD,
    oddsHome: +(m / pH).toFixed(2),
    oddsDraw: +(m / pD).toFixed(2),
    oddsAway: +(m / pA).toFixed(2),
  };
};

export const calcExactScoreOdds = (hG, aG, odds, match = null) => {
  const poi = (l, k) => { let r = Math.exp(-l); for (let i = 0; i < k; i++) r *= l / (i + 1); return r; };
  const isLive = match && (match.status === "IN_PLAY" || match.status === "PAUSED");
  if (isLive) {
    const hs = match.home_score ?? 0, as_ = match.away_score ?? 0;
    const elapsed = Math.max(1, Math.min(93, match.elapsed || 45));
    const remaining = Math.max(1, 94 - elapsed);
    // Score déjà impossible
    if (hG < hs || aG < as_) return 200;
    const hNeed = hG - hs, aNeed = aG - as_;
    const frac = remaining / 90;
    const lH = (odds.pHome * 2.2 + odds.pDraw * 1.1) * frac;
    const lA = (odds.pAway * 2.2 + odds.pDraw * 1.1) * frac;
    return Math.min(200, Math.max(1.05, +((1 / Math.max(poi(lH, hNeed) * poi(lA, aNeed), 0.0001)) * 1.1).toFixed(1)));
  }
  const lH = odds.pHome * 2.2 + odds.pDraw * 1.1, lA = odds.pAway * 2.2 + odds.pDraw * 1.1;
  return Math.min(200, Math.max(3, +((1 / Math.max(poi(lH, hG) * poi(lA, aG), 0.001)) * 1.1).toFixed(1)));
};

export const calcScorerOdds = (player, isFirst, position) => {
  // Utilise la position API si disponible, sinon fallback sur le nom
  const pos = position || "";
  const isFwd = pos.includes("Forward") || pos.includes("Centre-Forward") || pos.includes("Winger") || pos.includes("Striker");
  const isMid = pos.includes("Midfield") && !pos.includes("Defensive");
  const isDef = pos.includes("Back") || pos.includes("Defensive") || pos.includes("Goalkeeper") || pos.includes("Keeper");

  // Fallback noms connus si pas de position
  const TOP = ["Haaland","Kane","Mbappe","Salah","Vinicius","Lewandowski","Lautaro","Vlahovic","Osimhen","Guirassy","Watkins","Isak"];
  const isTopName = TOP.some(a => player?.includes(a));

  let pScore;
  if (isTopName) pScore = 0.52;
  else if (isFwd) pScore = 0.35;
  else if (isMid) pScore = 0.18;
  else if (isDef) pScore = 0.05;
  else pScore = 0.22; // inconnu = attaquant probable vu le filtrage

  const pFirst = isFirst ? pScore / 4.0 : pScore;
  return Math.min(isFirst ? 35 : 15, Math.max(isFirst ? 2.5 : 1.4, +((1.05 / Math.max(pFirst, 0.02))).toFixed(1)));
};

export const calcOverUnderOdds = (line, isOver, odds) => {
  const eg = odds.pHome * 2.2 + odds.pAway * 1.8 + 0.8 * 1.1;
  const op = { 1.5: Math.min(0.85, Math.max(0.45, 0.5 + (eg - 2.5) * 0.15)), 2.5: Math.min(0.75, Math.max(0.30, 0.5 + (eg - 2.5) * 0.12)), 3.5: Math.min(0.60, Math.max(0.20, 0.5 + (eg - 2.5) * 0.10)) };
  const p = isOver ? (op[line] || 0.5) : 1 - (op[line] || 0.5);
  return Math.min(8, Math.max(1.2, +(1.05 / Math.max(p, 0.01)).toFixed(2)));
};

export const resolveBet = (bet, matchResult) => {
  const { bet_type, prediction } = bet;
  const { homeScore, awayScore, homeTeam, awayTeam, scorers } = matchResult;
  // Ne pas resoudre si le match n'est pas termine ou scores invalides
  if (homeScore === null || homeScore === undefined || awayScore === null || awayScore === undefined) return false;
  if (bet_type === "winner") {
    const winner = homeScore > awayScore ? homeTeam : awayScore > homeScore ? awayTeam : "Nul";
    return prediction === winner;
  }
  if (bet_type === "exact_score") return prediction === `${homeScore}-${awayScore}`;
  if (bet_type === "first_scorer") {
    const first = scorers?.[0]?.name || scorers?.[0]?.scorer?.name || "";
    if (!first || !prediction) return false;
    return first.toLowerCase().includes(prediction.toLowerCase().split(" ").pop().toLowerCase());
  }
  if (bet_type === "scorer") {
    return (scorers || []).some(s => {
      const n = s.name || s.scorer?.name || "";
      return n && prediction && n.toLowerCase().includes(prediction.toLowerCase().split(" ").pop().toLowerCase());
    });
  }
  if (bet_type === "over_under") {
    const total = homeScore + awayScore;
    const line = prediction.includes("1.5") ? 1.5 : prediction.includes("3.5") ? 3.5 : 2.5;
    return prediction.startsWith("Plus") ? total > line : total < line;
  }
  return false;
};

// Filtre joueurs : attaquants et milieux offensifs, triés par priorité buteur
export const filterScorers = (squad) => {
  if (!squad?.length) return [];
  const EXCLUDE = ["Goalkeeper","Centre-Back","Left-Back","Right-Back","Defensive Midfield","Sweeper","Keeper","Goalie"];
  // Priorité : attaquants d'abord, milieux ensuite
  const priority = (pos) => {
    if (["Centre-Forward","Second Striker","Attacker","Forward"].some(p => pos.includes(p))) return 0;
    if (["Left Winger","Right Winger","Attacking Midfield","Winger"].some(p => pos.includes(p))) return 1;
    if (["Central Midfield","Left Midfield","Right Midfield","Midfielder"].some(p => pos.includes(p))) return 2;
    return 3;
  };
  return squad
    .filter(p => {
      const pos = p.position || "";
      return !EXCLUDE.some(e => pos.includes(e)) && priority(pos) < 3;
    })
    .sort((a, b) => priority(a.position || "") - priority(b.position || ""))
    .map(p => ({ name: p.name, position: p.position || "" }))
    .slice(0, 20);
};
