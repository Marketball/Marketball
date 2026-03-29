export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "DELETE") return res.status(405).end();
  
  const { table, id, pwd } = req.query;
  
  if (pwd !== process.env.ADMIN_PASSWORD) return res.status(403).json({ error: "Non autorisé" });
  
  const allowed = ["custom_markets", "proposed_markets", "rumors"];
  if (!allowed.includes(table)) return res.status(400).json({ error: "Table non autorisée" });

  const SUPABASE_URL = "https://aiesvzdvlownkcjbkgjv.supabase.co";
  const SUPABASE_KEY = "sb_publishable_Ipu5bJO_zD1ckygwQmpcuw_Tl5xWmyK";

  const res2 = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "DELETE",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: "return=minimal",
    },
  });

  if (!res2.ok) {
    const err = await res2.text();
    return res.status(res2.status).json({ error: err });
  }
  return res.status(200).json({ success: true });
}
