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
  const results = { updated: 0, errors: [] };

  for (const league of LEAGUES) {
    try {
      // 1 seul appel par ligue — standings contient forme + stats attaque/défense
      const standings = await apiFetch(`/standings?league=${league.id}&season=${season}`);

      const teams = standings?.response?.[0]?.league?.standings?.[0] || [];

      for (const standing of teams) {
        const teamId = standing.team.id;
        const teamName = standing.team.name;

        // 2. Stats d'attaque/défense depuis le classement
        const played = standing.all.played || 1;
        const goalsScored = standing.all.goals.for || 0;
        const goalsConceded = standing.all.goals.against || 0;
        const goalsScored_avg = Math.round((goalsScored / played) * 100) / 100;
        const goalsConceded_avg = Math.round((goalsConceded / played) * 100) / 100;

        // 3. Forme récente (string "WDLWW")
        const formString = standing.form || "";
        const formScore = calcFormScore(formString);

        // Blessures : récupérées séparément via /api/injuries-today pour éviter le rate limit
        const injuryCount = 0, injuryPenalty = 0;

        // 5. Force calculée finale
        // base_strength : on garde la valeur existante si déjà en base, sinon 65
        // computed_strength = base_strength + formScore - injuryPenalty
        // (base_strength sera mis à jour manuellement ou via une future migration ELO)
        const row = {
          team_id: teamId,
          team_name: teamName,
          league_id: league.id,
          form_string: formString,
          form_score: formScore,
          goals_scored_avg: goalsScored_avg,
          goals_conceded_avg: goalsConceded_avg,
          injury_count: injuryCount,
          injury_penalty: injuryPenalty,
          updated_at: new Date().toISOString(),
        };

        await supabaseUpsert([row]);
        results.updated++;

        // Rate limiting : pause 200ms entre chaque équipe pour ne pas dépasser les limites API
        await new Promise(r => setTimeout(r, 200));
      }

    } catch (e) {
      results.errors.push(`${league.name}: ${e.message}`);
    }

    // Pause 1s entre chaque ligue
    await new Promise(r => setTimeout(r, 1000));
  }

  return res.status(200).json({
    success: true,
    updated: results.updated,
    errors: results.errors,
    timestamp: new Date().toISOString(),
  });
}
