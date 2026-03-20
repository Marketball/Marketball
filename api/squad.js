export default async function handler(req, res) {
  const { teamId } = req.query;
  const response = await fetch(
    `https://api.football-data.org/v4/teams/${teamId}`,
    { headers: { "X-Auth-Token": "39f143541b354376af79527e278c3149" } }
  );
  const data = await response.json();
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json(data);
}
