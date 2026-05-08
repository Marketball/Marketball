const SUPABASE_URL = "https://aiesvzdvlownkcjbkgjv.supabase.co";

async function sbReq(path, opts = {}) {
  const key = process.env.SUPABASE_SERVICE_KEY;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...opts.headers,
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
  return data;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { proposedId, adminPwd } = req.body || {};
  if (adminPwd !== process.env.ADMIN_PASSWORD) return res.status(403).json({ error: "Non autorisé" });
  if (!proposedId) return res.status(400).json({ error: "proposedId manquant" });

  try {
    const proposed = await sbReq(`proposed_markets?id=eq.${proposedId}&select=proposer_id,title`);
    const proposerId = proposed?.[0]?.proposer_id;
    const marketTitle = proposed?.[0]?.title || "ton marché";
    if (!proposerId) return res.status(200).json({ success: true, note: "Pas de proposer_id" });

    const profiles = await sbReq(`profiles?id=eq.${proposerId}&select=store_coins`);
    const current = profiles?.[0]?.store_coins || 0;

    await sbReq(`profiles?id=eq.${proposerId}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ store_coins: current + 2 }),
    });

    await sbReq(`notifications`, {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        user_id: proposerId,
        message: `🎉 Ton marché "${marketTitle}" a été approuvé par l'admin ! Tu reçois +2 SC 💎`,
        read: false,
      }),
    });

    return res.status(200).json({ success: true, credited: 2 });
  } catch (e) {
    console.error("credit-sc error:", e);
    return res.status(500).json({ error: e.message });
  }
}
