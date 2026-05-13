const squadCache = {};
const statsCache = {};
const SQUAD_CACHE_DURATION = 60 * 60 * 1000;   // 1h
const STATS_CACHE_DURATION = 48 * 60 * 60 * 1000; // 48h

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { teamId } = req.query;
  if (!teamId) return res.status(400).json({ error: "teamId requis" });

  const squadKey = `squad_${teamId}`;
  const now = new Date();
  const season = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const statsKey = `stats_${teamId}_${season}`;

  const squadCached = squadCache[squadKey] && Date.now() - squadCache[squadKey].ts < SQUAD_CACHE_DURATION;
  const statsCached = statsCache[statsKey] && Date.now() - statsCache[statsKey].ts < STATS_CACHE_DURATION;

  if (squadCached && statsCached) {
    return res.status(200).json(mergeSquadStats(squadCache[squadKey].data, statsCache[statsKey].data));
  }

  const headers = { "x-apisports-key": process.env.API_FOOTBALL_KEY };

  try {
    const calls = [];
    if (!squadCached) calls.push(fetch(`https://v3.football.api-sports.io/players/squads?team=${teamId}`, { headers }));
    if (!statsCached) calls.push(fetch(`https://v3.football.api-sports.io/players?team=${teamId}&season=${season}&page=1`, { headers }));

    const results = await Promise.allSettled(calls.map(p => p.then(r => r.json())));
    let idx = 0;

    if (!squadCached) {
      const data = results[idx++];
      if (data.status === "fulfilled" && data.value?.response?.[0]?.players) {
        const squad = data.value.response[0].players.map(p => ({
          id: p.id,
          name: p.name,
          position: mapPosition(p.position),
          photo: p.photo,
          number: p.number,
          age: p.age,
        }));
        squadCache[squadKey] = { data: squad, ts: Date.now() };
      }
    }

    if (!statsCached) {
      const data = results[idx++];
      if (data.status === "fulfilled" && data.value?.response) {
        const statsMap = {};
        for (const item of data.value.response) {
          const s = item.statistics?.[0];
          if (!s) continue;
          statsMap[item.player.id] = {
            goals:       s.goals?.total   || 0,
            assists:     s.goals?.assists || 0,
            appearances: s.games?.appearances || 0,
            lineups:     s.games?.lineups || 0,
            rating:      parseFloat(s.games?.rating) || 0,
          };
        }
        statsCache[statsKey] = { data: statsMap, ts: Date.now() };
      }
    }

    if (!squadCache[squadKey]) throw new Error("Pas de squad");

    return res.status(200).json(mergeSquadStats(
      squadCache[squadKey].data,
      statsCache[statsKey]?.data || {}
    ));

  } catch (e) {
    if (squadCache[squadKey]) {
      return res.status(200).json(mergeSquadStats(squadCache[squadKey].data, statsCache[statsKey]?.data || {}));
    }
    return res.status(500).json({ squad: [] });
  }
}

function mergeSquadStats(squad, statsMap) {
  return {
    squad: squad.map(p => ({
      ...p,
      ...(statsMap[p.id] || {}),
    })),
  };
}

function mapPosition(pos) {
  if (!pos) return "";
  const p = pos.toLowerCase();
  if (p === "goalkeeper") return "Goalkeeper";
  if (p === "defender")   return "Centre-Back";
  if (p === "midfielder") return "Central Midfield";
  if (p === "attacker")   return "Centre-Forward";
  return pos;
}
