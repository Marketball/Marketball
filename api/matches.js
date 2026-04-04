const cache = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const COMPETITIONS = [
  // Clubs
  { id: 39,  slug: "PL",       name: "Premier League",          emoji: "🏴", color: "#3b82f6" },
  { id: 61,  slug: "FL1",      name: "Ligue 1",                 emoji: "🇫🇷", color: "#ef4444" },
  { id: 2,   slug: "CL",       name: "Champions League",        emoji: "🏆", color: "#fbbf24" },
  { id: 140, slug: "PD",       name: "La Liga",                 emoji: "🇪🇸", color: "#f97316" },
  { id: 78,  slug: "BL1",      name: "Bundesliga",              emoji: "🇩🇪", color: "#6b7280" },
  { id: 135, slug: "SA",       name: "Serie A",                 emoji: "🇮🇹", color: "#10b981" },
  { id: 94,  slug: "PPL",      name: "Liga Portugal",           emoji: "🇵🇹", color: "#8b5cf6" },
  { id: 3,   slug: "EL",       name: "Europa League",           emoji: "🔶", color: "#f59e0b" },
  { id: 71,  slug: "BSA",      name: "Brasileirao",             emoji: "🇧🇷", color: "#10b981", calYear: true },
  { id: 253, slug: "MLS",      name: "MLS",                     emoji: "🇺🇸", color: "#ef4444", calYear: true },
  { id: 88,  slug: "ERE",      name: "Eredivisie",              emoji: "🇳🇱", color: "#f97316" },
  { id: 203, slug: "TSL",      name: "Süper Lig",               emoji: "🇹🇷", color: "#ef4444" },
  // Internationaux — saison = année calendaire courante
  { id: 10,  slug: "FR",       name: "Amicaux Internationaux",  emoji: "🤝", color: "#94a3b8", calYear: true },
  { id: 5,   slug: "NL",       name: "Ligue des Nations",       emoji: "🌐", color: "#10b981", intlSeason: true },
  { id: 4,   slug: "EURO",     name: "Euro",                    emoji: "🇪🇺", color: "#3b82f6", calYear: true },
  { id: 1,   slug: "WC",       name: "Coupe du Monde",          emoji: "🌍", color: "#fbbf24", calYear: true },
  { id: 6,   slug: "WCQ_UEFA", name: "Qualif. Mondial UEFA",    emoji: "🌍", color: "#94a3b8", calYear: true },
  { id: 29,  slug: "AFCON",    name: "CAN",                     emoji: "🌍", color: "#f59e0b", calYear: true },
  { id: 13,  slug: "COPA",     name: "Copa América",            emoji: "🌎", color: "#10b981", calYear: true },
  { id: 850, slug: "U21UEFA",  name: "Euro U21 Qualif.",        emoji: "🇪🇺", color: "#60a5fa", calYear: true },
];

async function fetchWithRetry(url, headers, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i === retries) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

function getSeason(comp) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  // Saison calendaire (Brasileirao, MLS, amicaux, compétitions intl)
  if (comp.calYear) return year;
  // Ligue des Nations : saison commence en 2024 pour l'édition 2024-25
  if (comp.intlSeason) return year - 1;
  // Championnats européens : saison démarre en août
  return month >= 6 ? year : year - 1;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=300");

  const { competition } = req.query;

  if (!competition) {
    return res.status(200).json({ competitions: COMPETITIONS });
  }

  const comp = COMPETITIONS.find(c => c.slug === competition);
  if (!comp) return res.status(400).json({ error: "Compétition inconnue", matches: [] });

  const cacheKey = `matches_${comp.id}_${comp.slug}`;
  if (cache[cacheKey] && Date.now() - cache[cacheKey].ts < CACHE_DURATION) {
    return res.status(200).json(cache[cacheKey].data);
  }

  try {
    const season = getSeason(comp);
    const now = new Date();
    // Fenêtre réduite : 2 jours en arrière, 30 jours en avant
    const from = new Date(now - 3 * 86400000).toISOString().split("T")[0]; // 3 jours en arrière pour résolution paris
    const to = new Date(now.getTime() + 30 * 86400000).toISOString().split("T")[0];

    const data = await fetchWithRetry(
      `https://v3.football.api-sports.io/fixtures?league=${comp.id}&season=${season}&from=${from}&to=${to}`,
      { "x-apisports-key": process.env.API_FOOTBALL_KEY }
    );

    if (!data?.response) throw new Error("Pas de données");

    const matches = data.response.map(f => ({
      id: f.fixture.id.toString(),
      home_team: f.teams.home.name,
      away_team: f.teams.away.name,
      home_logo: f.teams.home.logo,
      away_logo: f.teams.away.logo,
      home_team_id: f.teams.home.id,
      away_team_id: f.teams.away.id,
      competition: comp.slug,
      competition_name: comp.name,
      match_date: f.fixture.date,
      status: mapStatus(f.fixture.status.short),
      elapsed: f.fixture.status.elapsed || null,
      home_score: f.goals.home,
      away_score: f.goals.away,
      scorers: (f.events || [])
        .filter(e => e.type === "Goal" && e.detail !== "Missed Penalty")
        .map(e => ({ name: e.player.name, team: e.team.name, minute: e.time.elapsed })),
      venue: f.fixture.venue?.name || "",
    }));

    const result = { matches, competition: comp };
    cache[cacheKey] = { data: result, ts: Date.now() };
    return res.status(200).json(result);

  } catch (e) {
    if (cache[cacheKey]) return res.status(200).json(cache[cacheKey].data);
    return res.status(500).json({ error: e.message, matches: [] });
  }
}

function mapStatus(s) {
  if (["1H","2H","ET","P","LIVE","HT"].includes(s)) return "IN_PLAY";
  if (["FT","AET","PEN"].includes(s)) return "FINISHED";
  if (["PST","CANC","ABD","AWD","WO"].includes(s)) return "POSTPONED";
  return "SCHEDULED";
}
