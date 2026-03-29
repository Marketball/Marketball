export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "DELETE") return res.status(405).end();
  
  const { table, id, pwd } = req.query;
  
  // Vérification mot de passe admin
  if (pwd !== process.env.ADMIN_PASSWORD) return res.status(403).json({ error: "Non autorisé" });
  
  // Tables autorisées uniquement
  const allowed = ["custom_markets", "proposed_markets", "rumors"];
  if (!allowed.includes(table)) return res.status(400).json({ error: "Table non autorisée" });

  const res2 = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "DELETE",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      Prefer: "return=minimal",
    },
  });

  if (!res2.ok) return res.status(res2.status).json({ error: "Erreur suppression" });
  return res.status(200).json({ success: true });
}
