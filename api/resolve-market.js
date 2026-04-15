import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { marketId, winningOption, pwd } = req.body || {};
  if (pwd !== process.env.ADMIN_PASSWORD) return res.status(403).json({ error: "Non autorisé" });
  if (!marketId || !winningOption) return res.status(400).json({ error: "Paramètres manquants" });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  // Récupère tous les paris en cours sur ce marché
  const { data: bets, error: betsErr } = await supabase
    .from("user_bets")
    .select("*")
    .eq("market_id", marketId)
    .eq("status", "pending");

  if (betsErr) return res.status(500).json({ error: betsErr.message });

  for (const bet of bets || []) {
    const isWinner = bet.side === winningOption;
    await supabase.from("user_bets").update({ status: isWinner ? "won" : "lost" }).eq("id", bet.id);

    if (isWinner) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("coins, total_wins, total_profit, weekly_profit")
        .eq("id", bet.user_id)
        .single();
      if (profile) {
        const gain = bet.potential_gain || 0;
        const profit = gain - (bet.cost || 0);
        await supabase.from("profiles").update({
          coins: (profile.coins || 0) + gain,
          total_wins: (profile.total_wins || 0) + 1,
          total_profit: (profile.total_profit || 0) + profit,
          weekly_profit: (profile.weekly_profit || 0) + profit,
        }).eq("id", bet.user_id);
      }
    }
  }

  // Ferme le marché
  await supabase.from("custom_markets").update({ status: "closed" }).eq("id", marketId);

  res.json({ success: true, resolved: bets?.length || 0 });
}
