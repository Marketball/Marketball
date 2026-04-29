// Route API : calcule les cotes dynamiques d'un match
// Lit team_stats depuis Supabase (forme, attaque, défense) pour affiner les cotes
// Appelée par l'app pour enrichir les matchs avec des cotes réalistes

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Force de base par équipe (fallback si pas dans team_stats)
const BASE_STRENGTH = {
  "Manchester City":91,"Man City":91,"Bayern Munich":94,"Bayern":94,"FC Bayern München":94,
  "Liverpool":93,"Paris Saint-Germain":92,"PSG":92,"Paris SG":92,"Arsenal":90,
  "Real Madrid":89,"Internazionale":88,"Inter Milan":88,"Inter":88,"Bayer Leverkusen":87,
  "Barcelona":87,"Atletico Madrid":85,"Atletico de Madrid":85,"Atlético Madrid":85,
  "Borussia Dortmund":84,"Dortmund":84,"RB Leipzig":83,"Chelsea":83,
  "AC Milan":82,"Milan":82,"Napoli":82,"Newcastle":81,"Juventus":81,
  "Aston Villa":80,"Manchester United":79,"Man United":79,"Man Utd":79,
  "Tottenham":79,"Tottenham Hotspur":79,"Atalanta":80,"Roma":78,"Monaco":78,
  "Lille":76,"Porto":77,"Benfica":76,"Feyenoord":76,"Marseille":75,"Lazio":75,
  "Sevilla":75,"Villarreal":75,"West Ham":75,"Brighton":75,"Fiorentina":74,
  "Real Sociedad":74,"Athletic Club":74,"Ajax":74,"Lyon":74,"Lens":73,
  "Celtic":73,"Brentford":73,"Betis":73,"Bologna":73,"Salzburg":72,"Club Brugge":72,
  "Rennes":70,"Nice":70,"Wolves":70,"Wolverhampton":70,"Fulham":72,"Everton":71,
  "Crystal Palace":69,"Nottingham Forest":74,"Bournemouth":70,"Leicester":69,
  "Eintracht Frankfurt":76,"Stuttgart":76,"Hoffenheim":72,"Wolfsburg":71,
  "Freiburg":73,"Girona":74,"Torino":70,"Monza":68,
};

function getBaseStrength(name) {
  if (!name) return 65;
  const n = name.toLowerCase();
  const key = Object.keys(BASE_STRENGTH).find(k =>
    k.toLowerCase() === n || n.includes(k.toLowerCase()) || k.toLowerCase().includes(n)
  );
  return key ? BASE_STRENGTH[key] : 65;
}

async function getTeamStats(teamName) {
  if (!teamName) return null;
  // Recherche par nom (insensible à la casse, partielle)
  const url = `${SUPABASE_URL}/rest/v1/team_stats?team_name=ilike.*${encodeURIComponent(teamName.split(" ")[0])}*&select=team_name,form_score,goals_scored_avg,goals_conceded_avg,injury_penalty,base_strength&limit=5`;
  try {
    const res = await fetch(url, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
      }
    });
    if (!res.ok) return null;
    const rows = await res.json();
    if (!rows?.length) return null;
    // Trouver la meilleure correspondance
    const exact = rows.find(r => r.team_name.toLowerCase() === teamName.toLowerCase());
    return exact || rows[0];
  } catch { return null; }
}

function calcOddsFromStrength(sH, sA) {
  const avgStr = (sH + sA) / 2;
  const homeAdv = avgStr >= 85 ? 3 : avgStr >= 78 ? 5 : 8;
  const diff = (sH + homeAdv) - sA;
  const pHome = 1 / (1 + Math.pow(10, -diff / 40));
  const pAway = 1 / (1 + Math.pow(10, diff / 40));
  const gap = Math.abs(diff);
  const drawBase = gap < 5 ? 0.28 : gap < 10 ? 0.24 : gap < 20 ? 0.20 : 0.14;
  const pDraw = Math.min(0.32, Math.max(0.08, drawBase));
  const total = pHome + pAway + pDraw;
  const pH = pHome / total, pA = pAway / total, pD = pDraw / total;
  const m = 1.05;
  return {
    pHome: pH, pAway: pA, pDraw: pD,
    oddsHome: +(m / pH).toFixed(2),
    oddsDraw: +(m / pD).toFixed(2),
    oddsAway: +(m / pA).toFixed(2),
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=3600"); // cache 1h

  const { home_team, away_team, home_team_id, away_team_id } = req.query;
  if (!home_team || !away_team) {
    return res.status(400).json({ error: "home_team et away_team requis" });
  }

  // Récupérer les stats des deux équipes en parallèle
  const [homeStats, awayStats] = await Promise.all([
    getTeamStats(home_team),
    getTeamStats(away_team),
  ]);

  // Force de base (table statique si pas en DB)
  const baseHome = homeStats?.base_strength || getBaseStrength(home_team);
  const baseAway = awayStats?.base_strength || getBaseStrength(away_team);

  // Ajustement forme : entre -10 et +10 pts
  const formHome = homeStats?.form_score || 0;
  const formAway = awayStats?.form_score || 0;

  // Ajustement attaque/défense : compare les moyennes de buts
  // Si l'équipe marque plus que la moyenne (1.5 buts/match), bonus attaque
  const avgGoals = 1.5;
  const attackHome = homeStats ? (homeStats.goals_scored_avg - avgGoals) * 3 : 0;
  const attackAway = awayStats ? (awayStats.goals_scored_avg - avgGoals) * 3 : 0;
  const defenseHome = homeStats ? (avgGoals - homeStats.goals_conceded_avg) * 2 : 0;
  const defenseAway = awayStats ? (avgGoals - awayStats.goals_conceded_avg) * 2 : 0;

  // Pénalité blessures
  const injHome = homeStats?.injury_penalty || 0;
  const injAway = awayStats?.injury_penalty || 0;

  // Force finale
  const finalHome = Math.max(30, Math.min(100,
    baseHome + formHome + attackHome + defenseHome - injHome
  ));
  const finalAway = Math.max(30, Math.min(100,
    baseAway + formAway + attackAway + defenseAway - injAway
  ));

  const odds = calcOddsFromStrength(finalHome, finalAway);

  return res.status(200).json({
    ...odds,
    // Détail du calcul (utile pour debug)
    debug: {
      home: { base: baseHome, form: formHome, attack: +attackHome.toFixed(1), defense: +defenseHome.toFixed(1), injury: injHome, final: +finalHome.toFixed(1) },
      away: { base: baseAway, form: formAway, attack: +attackAway.toFixed(1), defense: +defenseAway.toFixed(1), injury: injAway, final: +finalAway.toFixed(1) },
    }
  });
}
