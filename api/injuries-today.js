// Récupère les blessures uniquement pour les équipes qui jouent aujourd'hui
// Appelé par cron à 8h chaque matin — max ~30 équipes = pas de rate limit

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const API_KEY = process.env.API_FOOTBALL_KEY;

const LEAGUES = [39,61,140,78,135,2,3,94,88];

function getSeason() {
  const now = new Date();
  return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
}

async function apiFetch(path) {
  const res = await fetch(`https://v3.football.api-sports.io${path}`, {
    headers: { "x-apisports-key": API_KEY },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

function calcInjuryPenalty(injuries) {
  if (!injuries?.length) return 0;
  let penalty = 0;
  for (const inj of injuries) {
    const type = (inj.player?.type || "").toLowerCase();
    if (type.includes("miss")) penalty += 3;
    else if (type.includes("doubt")) penalty += 1;
    else penalty += 2;
  }
  return Math.min(20, penalty);
}

async function updateTeamInjuries(teamId, injuryCount, injuryPenalty) {
  await fetch(`${SUPABASE_URL}/rest/v1/team_stats?team_id=eq.${teamId}`, {
    method: "PATCH",
    headers: {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ injury_count: injuryCount, injury_penalty: injuryPenalty, updated_at: new Date().toISOString() }),
  });
}

export default async function handler(req, res) {
  const authHeader = req.headers["authorization"];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Non autorisé" });
  }

  const season = getSeason();
  const today = new Date().toISOString().split("T")[0];
  const results = { teams_checked: 0, updated: 0, errors: [] };

  // 1. Récupérer les matchs d'aujourd'hui pour toutes les ligues en parallèle
  const fixtureResults = await Promise.allSettled(
    LEAGUES.map(lid => apiFetch(`/fixtures?league=${lid}&season=${season}&date=${today}`))
  );

  // Collecter les IDs des équipes qui jouent aujourd'hui (sans doublons)
  const teamsToday = new Map(); // teamId → leagueId
  for (const r of fixtureResults) {
    if (r.status !== "fulfilled") continue;
    for (const f of r.value?.response || []) {
      teamsToday.set(f.teams.home.id, f.league.id);
      teamsToday.set(f.teams.away.id, f.league.id);
    }
  }

  if (!teamsToday.size) {
    return res.status(200).json({ ...results, message: "Aucun match aujourd'hui" });
  }

  // 2. Récupérer les blessures pour chaque équipe avec pause 300ms (évite le 429)
  for (const [teamId, leagueId] of teamsToday) {
    try {
      const data = await apiFetch(`/injuries?team=${teamId}&league=${leagueId}&season=${season}`);
      const injuries = data?.response || [];
      const injuryCount = injuries.length;
      const injuryPenalty = calcInjuryPenalty(injuries);
      await updateTeamInjuries(teamId, injuryCount, injuryPenalty);
      results.updated++;
    } catch (e) {
      results.errors.push(`team ${teamId}: ${e.message}`);
    }
    results.teams_checked++;
    // Pause pour respecter le rate limit API
    await new Promise(r => setTimeout(r, 300));
  }

  return res.status(200).json({ success: true, ...results, timestamp: new Date().toISOString() });
}
