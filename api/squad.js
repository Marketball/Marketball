const squadCache = {};
const statsCache = {};
const SQUAD_CACHE_DURATION = 60 * 60 * 1000;    // 1h
const STATS_CACHE_DURATION = 48 * 60 * 60 * 1000; // 48h

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { teamId } = req.query;
  if (!teamId) return res.status(400).json({ error: "teamId requis" });

  const squadKey = `squad_${teamId}`;
  const now = new Date();
  // Saison en cours (commence en août): si on est avant juillet → saison de l'année précédente
  const currentSeason = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  // On utilise la saison PRÉCÉDENTE (terminée, données complètes)
  // La saison en cours n'a souvent que les données UCL dans l'API
  const statsSeason = currentSeason - 1;
  const statsKey = `stats_${teamId}_${statsSeason}`;

  const squadCached = squadCache[squadKey] && Date.now() - squadCache[squadKey].ts < SQUAD_CACHE_DURATION;
  const statsCached = statsCache[statsKey] && Date.now() - statsCache[statsKey].ts < STATS_CACHE_DURATION;

  if (squadCached && statsCached) {
    return res.status(200).json(mergeSquadStats(squadCache[squadKey].data, statsCache[statsKey].data));
  }

  const headers = { "x-apisports-key": process.env.API_FOOTBALL_KEY };
  const statsUrl = (page) => `https://v3.football.api-sports.io/players?team=${teamId}&season=${statsSeason}&page=${page}`;

  try {
    // Fetch squad + pages 1 & 2 des stats en parallèle (40 joueurs couverts)
    const fetches = [];
    if (!squadCached) fetches.push(fetch(`https://v3.football.api-sports.io/players/squads?team=${teamId}`, { headers }).then(r => r.json()));
    if (!statsCached) {
      fetches.push(fetch(statsUrl(1), { headers }).then(r => r.json()));
      fetches.push(fetch(statsUrl(2), { headers }).then(r => r.json()));
      fetches.push(fetch(statsUrl(3), { headers }).then(r => r.json()));
    }

    const results = await Promise.allSettled(fetches);
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
      const page1 = results[idx++];
      const page2 = results[idx++];
      const page3 = results[idx++];
      const statsMap = {};

      for (const pageData of [page1, page2, page3]) {
        if (pageData.status !== "fulfilled" || !pageData.value?.response) continue;
        for (const item of pageData.value.response) {
          const s = item.statistics?.[0];
          if (!s) continue;
          statsMap[item.player.id] = {
            goals:       s.goals?.total      || 0,
            assists:     s.goals?.assists    || 0,
            appearances: s.games?.appearences || 0, // typo volontaire de l'API Football
            lineups:     s.games?.lineups    || 0,
            rating:      parseFloat(s.games?.rating) || 0,
          };
        }
      }
      statsCache[statsKey] = { data: statsMap, ts: Date.now() };
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
