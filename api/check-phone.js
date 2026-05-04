import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "./_rateLimit.js";

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
  if (rateLimit(req, res, 10, 60_000)) return;

  const { phone } = req.body || {};
  if (!phone) return res.status(400).json({ error: "Numéro manquant" });

  try {
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("phone", phone.trim());

    return res.status(200).json({ exists: (count || 0) > 0 });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
