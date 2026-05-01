import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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
    const { data: proposed } = await supabase
      .from("proposed_markets")
      .select("proposer_id")
      .eq("id", proposedId)
      .single();

    if (!proposed?.proposer_id) return res.status(200).json({ success: true, note: "Pas de proposer_id" });

    const { data: proposer } = await supabase
      .from("profiles")
      .select("store_coins")
      .eq("id", proposed.proposer_id)
      .single();

    await supabase
      .from("profiles")
      .update({ store_coins: (proposer?.store_coins || 0) + 2 })
      .eq("id", proposed.proposer_id);

    return res.status(200).json({ success: true, credited: 2 });
  } catch (e) {
    console.error("credit-sc error:", e);
    return res.status(500).json({ error: e.message });
  }
}
