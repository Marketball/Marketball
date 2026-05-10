const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;

const sb = async (path, opts = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: opts.method === "PATCH" || opts.method === "DELETE" ? "return=minimal" : "return=representation",
      ...opts.headers,
    },
  });
  const text = await res.text();
  let data = null;
  try { if (text) data = JSON.parse(text); } catch {}
  if (!res.ok) throw new Error(data?.message || data?.error || text || `HTTP ${res.status}`);
  return data;
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { marketId, winningOption, pwd } = req.body || {};
  if (pwd !== process.env.ADMIN_PASSWORD) return res.status(403).json({ error: "Non autorisé" });
  if (!marketId || !winningOption) return res.status(400).json({ error: "Paramètres manquants" });

  try {
    // Récupère tous les paris en attente sur ce marché
    const bets = await sb(`user_bets?market_id=eq.${marketId}&status=eq.pending&select=*`) || [];

    for (const bet of bets) {
      const isWinner = bet.side === winningOption;
      await sb(`user_bets?id=eq.${bet.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: isWinner ? "won" : "lost" }),
      });

      if (isWinner) {
        const profiles = await sb(`profiles?id=eq.${bet.user_id}&select=coins,total_wins,total_profit,weekly_profit`) || [];
        const profile = profiles[0];
        if (profile) {
          const gain   = bet.potential_gain || 0;
          const profit = gain - (bet.cost || 0);
          await sb(`profiles?id=eq.${bet.user_id}`, {
            method: "PATCH",
            body: JSON.stringify({
              coins:        (profile.coins        || 0) + gain,
              total_wins:   (profile.total_wins   || 0) + 1,
              total_profit: (profile.total_profit || 0) + profit,
              weekly_profit:(profile.weekly_profit|| 0) + profit,
            }),
          });
        }
      }
    }

    // Ferme le marché
    await sb(`custom_markets?id=eq.${marketId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "closed", winning_side: winningOption }),
    });

    // Résoudre les défis liés à ce marché
    let challenges = [];
    try { challenges = await sb(`friend_challenges?market_id=eq.${marketId}&status=eq.accepted&select=*`) || []; } catch {}

    for (const challenge of challenges) {
      const challengerWon = challenge.challenger_side === winningOption;
      const winnerId = challengerWon ? challenge.challenger_id : challenge.challenged_id;
      const pot = challenge.amount * 2;

      const winners = await sb(`profiles?id=eq.${winnerId}&select=coins,total_wins,total_profit,weekly_profit`).catch(() => []) || [];
      const winner = winners[0];
      if (winner) {
        const profit = challenge.amount;
        await sb(`profiles?id=eq.${winnerId}`, {
          method: "PATCH",
          body: JSON.stringify({
            coins:        (winner.coins        || 0) + pot,
            total_wins:   (winner.total_wins   || 0) + 1,
            total_profit: (winner.total_profit || 0) + profit,
            weekly_profit:(winner.weekly_profit|| 0) + profit,
          }),
        });
      }
      await sb(`friend_challenges?id=eq.${challenge.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "resolved", winner_id: winnerId }),
      });
    }

    // Annuler les défis en attente (non encore acceptés)
    let pendingChallenges = [];
    try { pendingChallenges = await sb(`friend_challenges?market_id=eq.${marketId}&status=eq.pending&select=*`) || []; } catch {}

    for (const challenge of pendingChallenges) {
      const challengers = await sb(`profiles?id=eq.${challenge.challenger_id}&select=coins`).catch(() => []) || [];
      const challenger = challengers[0];
      if (challenger) {
        await sb(`profiles?id=eq.${challenge.challenger_id}`, {
          method: "PATCH",
          body: JSON.stringify({ coins: (challenger.coins || 0) + challenge.amount }),
        });
      }
      await sb(`friend_challenges?id=eq.${challenge.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      });
    }

    res.json({ success: true, resolved: bets.length, challenges: challenges.length + pendingChallenges.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
