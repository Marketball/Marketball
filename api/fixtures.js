const cache = {};
const CACHE_DURATION = 30 * 60 * 1000; // 30 min

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "id requis" });

  const cacheKey = `fixture_${id}`;
  if (cache[cacheKey] && Date.now() - cache[cacheKey].ts < CACHE_DURATION) {
    return res.status(200).json(cache[cacheKey].data);
  }

  try {
    const r = await fetch(
      `https://v3.football.api-sports.io/fixtures?id=${id}`,
      { headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY } }
    );
    const data = await r.json();
    const fixture = data.response?.[0];
    if (!fixture) return res.status(404).json({ scorers: [] });

    const scorers = (fixture.events || [])
      .filter(e => e.type === "Goal" && e.detail !== "Missed Penalty")
      .map(e => ({ name: e.player.name, team: e.team.name, minute: e.time.elapsed }));

    // Lineups (available ~1h before kickoff and during match)
    const lineups = fixture.lineups || [];
    const homeLineup = lineups.find(l => l.team.id === fixture.teams?.home?.id);
    const awayLineup = lineups.find(l => l.team.id === fixture.teams?.away?.id);
    const home_starters  = (homeLineup?.startXI    || []).map(p => p.player.name);
    const away_starters  = (awayLineup?.startXI    || []).map(p => p.player.name);
    const home_subs      = (homeLineup?.substitutes || []).map(p => p.player.name);
    const away_subs      = (awayLineup?.substitutes || []).map(p => p.player.name);

    const result = { scorers, home_score: fixture.goals.home, away_score: fixture.goals.away, home_starters, away_starters, home_subs, away_subs };
    cache[cacheKey] = { data: result, ts: Date.now() };
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ scorers: [], error: e.message });
  }
}
