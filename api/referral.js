import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// SC accordés selon le plan de l'abonné
const SC_REWARD = { starter: 5, elite: 20 };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { referralCode, newUserId } = req.body || {};
  if (!referralCode || !newUserId) return res.status(400).json({ error: "Paramètres manquants" });

  try {
    // 1. Vérifier que le nouveau user n'a pas déjà un parrain
    const { data: newUser } = await supabase
      .from("profiles")
      .select("id, referred_by")
      .eq("id", newUserId)
      .single();

    if (newUser?.referred_by) return res.status(409).json({ error: "Code déjà utilisé" });

    // 2. Trouver le parrain par son code
    const { data: referrer } = await supabase
      .from("profiles")
      .select("id, store_coins, referral_sc_earned, subscription")
      .eq("referral_code", referralCode.toUpperCase())
      .single();

    if (!referrer) return res.status(404).json({ error: "Code parrain invalide" });
    if (referrer.id === newUserId) return res.status(400).json({ error: "Impossible de se parrainer soi-même" });

    // 3. Créditer le parrain selon son abonnement
    const reward = SC_REWARD[referrer.subscription] || SC_REWARD.starter;
    await supabase
      .from("profiles")
      .update({
        store_coins: (referrer.store_coins || 0) + reward,
        referral_sc_earned: (referrer.referral_sc_earned || 0) + reward,
        updated_at: new Date().toISOString(),
      })
      .eq("id", referrer.id);

    // 4. Marquer le filleul avec le code utilisé
    await supabase
      .from("profiles")
      .update({ referred_by: referralCode.toUpperCase(), updated_at: new Date().toISOString() })
      .eq("id", newUserId);

    return res.status(200).json({ success: true, reward });
  } catch (e) {
    console.error("Referral error:", e);
    return res.status(500).json({ error: e.message });
  }
}
