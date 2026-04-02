export const SUPABASE_URL = "https://aiesvzdvlownkcjbkgjv.supabase.co";
export const SUPABASE_KEY = "sb_publishable_Ipu5bJO_zD1ckygwQmpcuw_Tl5xWmyK";

export const req = async (path, opts = {}) => {
  const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${opts._token || SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation", ...opts.headers };
  delete opts._token;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = data?.message || data?.error_description || JSON.stringify(data);
    if (msg?.includes("JWT") || msg?.includes("expired") || res.status === 401) {
      // Token expire - recharger la page pour forcer reconnexion
      setTimeout(() => window.location.reload(), 1000);
    }
    throw new Error(msg);
  }
  return data;
};

export const authReq = async (path, body) => {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, { method: "POST", headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || "Erreur auth");
  return data;
};

export const squadReq = async (teamId) => { const res = await fetch(`/api/squad?teamId=${teamId}`); if (!res.ok) throw new Error("Erreur squad"); return res.json(); };
