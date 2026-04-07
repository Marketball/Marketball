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
    // Écart au score : le retard devient exponentiellemement improbable
    const gap = Math.abs(scoreDiff);
    const timePressure = 1 - remaining / 92; // 0 au début → 1 à la fin
    const comebackProb = Math.exp(-gap * 2.2 * timePressure);
    if (scoreDiff > 0) {
      pHome = Math.min(0.97, base.pHome + (1 - base.pHome) * (1 - comebackProb));
      pDraw  = Math.max(0.005, base.pDraw * comebackProb);
      pAway  = Math.max(0.005, 1 - pHome - pDraw);
    } else {
      pAway = Math.min(0.97, base.pAway + (1 - base.pAway) * (1 - comebackProb));
      pDraw  = Math.max(0.005, base.pDraw * comebackProb);
      pHome  = Math.max(0.005, 1 - pAway - pDraw);
    }
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

export const calcMatchOdds = (match) => {
  const BIG = ["Real Madrid","Barcelona","Bayern","Man City","PSG","Liverpool","Arsenal","Chelsea","Inter","Juventus","Atletico","Dortmund","Man United","Tottenham","Newcastle"];
  const MED = ["Monaco","Lyon","Marseille","Sevilla","Villarreal","Napoli","Roma","Lazio","Leverkusen","RB Leipzig","Aston Villa","West Ham","Benfica","Porto","Ajax","Celtic","Feyenoord"];
  const hS = BIG.some(c => match.home_team?.includes(c)) ? 3 : MED.some(c => match.home_team?.includes(c)) ? 2 : 1;
  const aS = BIG.some(c => match.away_team?.includes(c)) ? 3 : MED.some(c => match.away_team?.includes(c)) ? 2 : 1;
  const total = hS + aS + 1.5;
  const pHome = Math.min(0.75, Math.max(0.15, hS / total + 0.1));
  const pAway = Math.min(0.65, Math.max(0.10, aS / total));
  const pDraw = Math.max(0.10, 1 - pHome - pAway);
  const m = 1.05;
  return { pHome, pAway, pDraw, oddsHome: +(m / pHome).toFixed(2), oddsDraw: +(m / pDraw).toFixed(2), oddsAway: +(m / pAway).toFixed(2) };
};

export const calcExactScoreOdds = (hG, aG, odds) => {
  const lH = odds.pHome * 2.2 + odds.pDraw * 1.1, lA = odds.pAway * 2.2 + odds.pDraw * 1.1;
  const poi = (l, k) => { let r = Math.exp(-l); for (let i = 0; i < k; i++) r *= l / (i + 1); return r; };
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

// Filtre joueurs : uniquement attaquants et milieux offensifs
export const filterScorers = (squad) => {
  if (!squad?.length) return [];
  const INCLUDE = ["Forward","Midfielder","Centre-Forward","Left Winger","Right Winger","Attacking Midfield","Central Midfield","Left Midfield","Right Midfield","Second Striker","Attacker"];
  const EXCLUDE = ["Goalkeeper","Centre-Back","Left-Back","Right-Back","Defensive Midfield","Sweeper","Keeper","Goalie"];
  return squad
    .filter(p => {
      const pos = p.position || "";
      if (EXCLUDE.some(e => pos.includes(e))) return false;
      return INCLUDE.some(i => pos.includes(i)) || pos === "Midfielder" || pos === "Forward" || pos === "Attacker";
    })
    .map(p => ({ name: p.name, position: p.position || "" }))
    .slice(0, 14);
};
