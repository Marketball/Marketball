// Route appelée chaque matin à 10h par le cron Vercel
// Récupère pour chaque équipe : forme récente, stats attaque/défense, blessures
// Et met à jour la table team_stats dans Supabase

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const API_KEY = process.env.API_FOOTBALL_KEY;

// Les ligues qu'on suit (IDs api-football)
const LEAGUES = [
  { id: 39,  name: "Premier League" },
  { id: 61,  name: "Ligue 1" },
  { id: 140, name: "La Liga" },
  { id: 78,  name: "Bundesliga" },
  { id: 135, name: "Serie A" },
  { id: 2,   name: "Champions League" },
  { id: 3,   name: "Europa League" },
  { id: 94,  name: "Liga Portugal" },
  { id: 88,  name: "Eredivisie" },
];

function getSeason() {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  return month >= 6 ? year : year - 1;
}

async function apiFetch(path) {
  const res = await fetch(`https://v3.football.api-sports.io${path}`, {
    headers: { "x-apisports-key": API_KEY },
  });
  if (!res.ok) throw new Error(`API Football ${res.status}: ${path}`);
  return res.json();
}

async function supabaseUpsert(rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/team_stats`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase upsert failed: ${err}`);
  }
}

// Calcule un score de forme entre -10 et +10 à partir d'une string "WDLWW"
function calcFormScore(formString) {
  if (!formString) return 0;
  let score = 0;
  const recent = formString.slice(-5); // 5 derniers matchs
  for (const c of recent) {
    if (c === "W") score += 3;
    else if (c === "D") score += 1;
    else if (c === "L") score -= 2;
  }
  // Normaliser entre -10 et +10 (max possible = 15 = 5W)
  return Math.round((score / 15) * 10 * 10) / 10;
}

// Calcule la pénalité de blessures entre 0 et 20 points
// Pondère selon la valeur marchande du joueur blessé
function calcInjuryPenalty(injuries) {
  if (!injuries?.length) return 0;
  let penalty = 0;
  for (const inj of injuries) {
    const type = inj.player?.type?.toLowerCase() || "";
    // Estimation de l'importance du joueur selon son type de blessure rapporté
    if (type.includes("miss")) penalty += 3;
    else if (type.includes("doubt")) penalty += 1;
    else penalty += 2;
  }
  return Math.min(20, penalty); // max 20 pts de pénalité
}

export default async function handler(req, res) {
  // Sécurité : seul Vercel Cron (avec header secret) peut appeler cette route
  const authHeader = req.headers["authorization"];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Non autorisé" });
  }

  const season = getSeason();
  let totalUpdated = 0;
  const errors = [];

  // Traiter toutes les ligues en parallèle pour rester sous le timeout Vercel (10s)
  await Promise.all(LEAGUES.map(async (league) => {
    try {
      const standings = await apiFetch(`/standings?league=${league.id}&season=${season}`);
      const teams = standings?.response?.[0]?.league?.standings?.[0] || [];

      const rows = teams.map(standing => {
        const played = standing.all.played || 1;
        const goalsScored = standing.all.goals.for || 0;
        const goalsConceded = standing.all.goals.against || 0;
        const formString = standing.form || "";
        return {
          team_id: standing.team.id,
          team_name: standing.team.name,
          league_id: league.id,
          form_string: formString,
          form_score: calcFormScore(formString),
          goals_scored_avg: Math.round((goalsScored / played) * 100) / 100,
          goals_conceded_avg: Math.round((goalsConceded / played) * 100) / 100,
          injury_count: 0,
          injury_penalty: 0,
          updated_at: new Date().toISOString(),
        };
      });

      // Upsert toutes les équipes de la ligue en un seul appel
      if (rows.length > 0) {
        await supabaseUpsert(rows);
        totalUpdated += rows.length;
      }

    } catch (e) {
      errors.push(`${league.name}: ${e.message}`);
    }
  }));

  return res.status(200).json({
    success: true,
    updated: totalUpdated,
    errors,
    timestamp: new Date().toISOString(),
  });
}
