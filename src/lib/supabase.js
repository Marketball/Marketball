export const SUPABASE_URL = "https://aiesvzdvlownkcjbkgjv.supabase.co";
export const SUPABASE_KEY = "sb_publishable_Ipu5bJO_zD1ckygwQmpcuw_Tl5xWmyK";

export const req = async (path, opts = {}) => {
  const isPatch = opts.method === "PATCH" || opts.method === "DELETE";
  const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${opts._token || SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: isPatch ? "return=minimal" : "return=representation", ...opts.headers };
  delete opts._token;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers });
  const text = await res.text();
  let data = null;
  try { if (text) data = JSON.parse(text); } catch { /* réponse texte brut */ }
  if (!res.ok) {
    const msg = data?.message || data?.error_description || data?.hint || (typeof data === "string" ? data : null) || text || `HTTP ${res.status}`;
    if (msg?.includes("JWT") || msg?.includes("expired") || res.status === 401) {
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

export const squadReq   = async (teamId)    => { const res = await fetch(`/api/squad?teamId=${teamId}`);    if (!res.ok) throw new Error("Erreur squad");   return res.json(); };
export const fixtureReq = async (fixtureId) => { const res = await fetch(`/api/fixtures?id=${fixtureId}`); if (!res.ok) throw new Error("Erreur fixture"); return res.json(); };
