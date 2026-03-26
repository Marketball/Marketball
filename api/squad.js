const cache = {};
const CACHE_DURATION = 60 * 60 * 1000; // 1 heure

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { teamId } = req.query;
  if (!teamId) return res.status(400).json({ error: "teamId requis" });

  const cacheKey = `squad_${teamId}`;
  if (cache[cacheKey] && Date.now() - cache[cacheKey].ts < CACHE_DURATION) {
    return res.status(200).json(cache[cacheKey].data);
  }

  try {
    const season = new Date().getFullYear();
    const res2 = await fetch(
      `https://v3.football.api-sports.io/players/squads?team=${teamId}`,
      {
        headers: {
          "x-apisports-key": process.env.API_FOOTBALL_KEY,
          "x-rapidapi-key": process.env.API_FOOTBALL_KEY,
        }
      }
    );

    if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
    const data = await res2.json();

    if (!data?.response?.[0]?.players) throw new Error("Pas de squad");

    // Mapper vers format attendu par App.jsx
    const squad = data.response[0].players.map(p => ({
      id: p.id,
      name: p.name,
      position: mapPosition(p.position),
      photo: p.photo,
      number: p.number,
      age: p.age,
    }));

    const result = { squad };
    cache[cacheKey] = { data: result, ts: Date.now() };
    return res.status(200).json(result);

  } catch (e) {
    if (cache[cacheKey]) return res.status(200).json(cache[cacheKey].data);
    return res.status(500).json({ squad: [] });
  }
}

// Mapper les positions API-Football vers le format attendu par filterScorers
function mapPosition(pos) {
  if (!pos) return "";
  const p = pos.toLowerCase();
  if (p === "goalkeeper") return "Goalkeeper";
  if (p === "defender") return "Centre-Back";
  if (p === "midfielder") return "Central Midfield";
  if (p === "attacker") return "Centre-Forward";
  return pos;
}
