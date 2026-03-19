import { useState, useEffect, useCallback } from "react";

// ============================================================
// CONFIG
// ============================================================
const SUPABASE_URL = "https://aiesvzdvlownkcjbkgjv.supabase.co";
const SUPABASE_KEY = "sb_publishable_Ipu5bJO_zD1ckygwQmpcuw_Tl5xWmyK";

const req = async (path, opts = {}) => {
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${opts._token || SUPABASE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
    ...opts.headers,
  };
  delete opts._token;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message || data?.error_description || JSON.stringify(data));
  return data;
};

const authReq = async (path, body) => {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || "Erreur auth");
  return data;
};

const footballReq = async (competition) => {
  const res = await fetch(`/api/matches?competition=${competition}`);
  if (!res.ok) throw new Error("Erreur API football");
  return res.json();
};

// ============================================================
// AMM
// ============================================================
const AMM = {
  probYes: (qY, qN) => { const eY = Math.exp(qY / 100), eN = Math.exp(qN / 100); return eY / (eY + eN); },
  costToBuy: (qY, qN, shares, side) => {
    const b = 100;
    const before = b * Math.log(Math.exp(qY / b) + Math.exp(qN / b));
    const after = side === "yes" ? b * Math.log(Math.exp((qY + shares) / b) + Math.exp(qN / b)) : b * Math.log(Math.exp(qY / b) + Math.exp((qN + shares) / b));
    return Math.max(1, Math.round(after - before));
  },
};

// ============================================================
// SYSTEME XP / BADGES / NIVEAUX
// ============================================================
const BADGES = [
  { id: "rookie", label: "Rookie", minLevel: 1, maxLevel: 10, color: "#6b7280", icon: "R" },
  { id: "scout", label: "Scout", minLevel: 11, maxLevel: 25, color: "#3b82f6", icon: "S" },
  { id: "analyst", label: "Analyst", minLevel: 26, maxLevel: 50, color: "#8b5cf6", icon: "A" },
  { id: "pro", label: "Pro", minLevel: 51, maxLevel: 80, color: "#f59e0b", icon: "P" },
  { id: "legend", label: "Legend", minLevel: 81, maxLevel: 999, color: "#10b981", icon: "L" },
];

const XP_PER_LEVEL = 100;

const getBadge = (level) => BADGES.find(b => level >= b.minLevel && level <= b.maxLevel) || BADGES[0];
const getLevel = (xp) => Math.floor(xp / XP_PER_LEVEL) + 1;
const getXPProgress = (xp) => xp % XP_PER_LEVEL;

// ============================================================
// SYSTEME STORE COINS
// ============================================================
// 1 SC = 0.1€ (1€ = 10 SC)
// Reward store accessible selon badge
const STORE_ITEMS = [
  { id: "s1", name: "Badge digital exclusif", value: "Digital", cost: 10, icon: "★", requiredBadge: "rookie", description: "Badge unique sur ton profil" },
  { id: "s2", name: "Carte cadeau Amazon 5€", value: "5€", cost: 50, icon: "A", requiredBadge: "scout", description: "Code envoyé par email" },
  { id: "s3", name: "Carte cadeau 20€", value: "20€", cost: 200, icon: "C", requiredBadge: "analyst", description: "Amazon, Uber, Foot Locker" },
  { id: "s4", name: "Maillot de foot au choix", value: "~90€", cost: 900, icon: "M", requiredBadge: "pro", description: "Replica officielle, taille au choix" },
  { id: "s5", name: "Place VIP + rencontre joueur", value: "Priceless", cost: 2000, icon: "V", requiredBadge: "legend", description: "Experience unique, sur demande" },
  { id: "sc1", name: "Pack 50 MC", value: "50 MC", cost: 5, isMCPack: true, priceEur: 5, icon: "MC", requiredBadge: "rookie", description: "5€ = 50 MarketCoins de jeu" },
  { id: "sc2", name: "Pack 100 MC", value: "100 MC", cost: 10, isMCPack: true, priceEur: 10, icon: "MC", requiredBadge: "rookie", description: "10€ = 100 MarketCoins de jeu" },
];

const WEEKLY_MC_LIMIT = 200;

// ============================================================
// COTES PERSISTANTES
// ============================================================
const BASE_MARKETS = [
  { id: "00000000-0000-0000-0000-000000000001", title: "Mbappe rejoint Arsenal avant le 31 aout ?", q_yes: 320, q_no: 180, total_volume: 8400, participants: 142, closes_at: new Date(Date.now() + 12 * 86400000).toISOString(), category: "Transferts", source: "Fabrizio Romano" },
  { id: "00000000-0000-0000-0000-000000000002", title: "Barcelona signe Lamine Yamal pro avant janvier ?", q_yes: 480, q_no: 120, total_volume: 12600, participants: 287, closes_at: new Date(Date.now() + 5 * 86400000).toISOString(), category: "Contrats", source: "Marca" },
  { id: "00000000-0000-0000-0000-000000000003", title: "PSG remporte la Champions League cette saison ?", q_yes: 200, q_no: 400, total_volume: 31200, participants: 891, closes_at: new Date(Date.now() + 45 * 86400000).toISOString(), category: "Competitions", source: "L'Equipe" },
  { id: "00000000-0000-0000-0000-000000000004", title: "Erling Haaland quitte City cet ete ?", q_yes: 150, q_no: 350, total_volume: 9800, participants: 203, closes_at: new Date(Date.now() + 28 * 86400000).toISOString(), category: "Transferts", source: "Sky Sports" },
  { id: "00000000-0000-0000-0000-000000000005", title: "Vinicius Jr. Ballon d'Or 2025 ?", q_yes: 260, q_no: 240, total_volume: 19400, participants: 534, closes_at: new Date(Date.now() + 180 * 86400000).toISOString(), category: "Recompenses", source: "France Football" },
  { id: "00000000-0000-0000-0000-000000000006", title: "Bellingham marque plus de 25 buts en PL ?", q_yes: 190, q_no: 310, total_volume: 7200, participants: 168, closes_at: new Date(Date.now() + 60 * 86400000).toISOString(), category: "Performances", source: "BBC Sport" },
];

const loadSavedOdds = () => { try { const s = localStorage.getItem("mb_odds"); return s ? JSON.parse(s) : {}; } catch { return {}; } };
const saveOdds = (markets) => { try { const o = {}; markets.forEach(m => { o[m.id] = { q_yes: m.q_yes, q_no: m.q_no, total_volume: m.total_volume, participants: m.participants }; }); localStorage.setItem("mb_odds", JSON.stringify(o)); } catch {} };
const getSeedMarkets = () => { const saved = loadSavedOdds(); return BASE_MARKETS.map(m => ({ ...m, ...(saved[m.id] || {}), status: "open" })); };

const SPIN_REWARDS = [10, 20, 10, 50, 20, 100, 10, 200];
const COMPETITIONS = ["PL", "FL1", "CL", "PD", "BL1"];

// ============================================================
// HELPERS
// ============================================================
const fmt = (n) => (n ?? 0).toLocaleString("fr-FR");
const fmtPct = (n) => `${Math.round(n * 100)}%`;
const timeLeft = (date) => { const diff = new Date(date) - Date.now(); if (diff < 0) return "Termine"; const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000); return d > 0 ? `${d}j ${h}h` : `${h}h`; };
const catColor = (c) => ({ "Transferts": "#3b82f6", "Contrats": "#8b5cf6", "Competitions": "#f59e0b", "Recompenses": "#ec4899", "Performances": "#10b981" })[c] || "#6b7280";
const compLabel = (c) => ({ "PL": "Premier League", "FL1": "Ligue 1", "CL": "Champ. League", "PD": "La Liga", "BL1": "Bundesliga" })[c] || c;
const compColor = (c) => ({ "PL": "#3b82f6", "FL1": "#ef4444", "CL": "#f59e0b", "PD": "#f97316", "BL1": "#6b7280" })[c] || "#6b7280";
const compFlag = (c) => ({ "PL": "EN", "FL1": "FR", "CL": "CL", "PD": "ES", "BL1": "DE" })[c] || "⚽";
const formatMatchDate = (d) => new Date(d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const getWeekKey = () => { const d = new Date(); const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); return new Date(d.setDate(diff)).toISOString().split("T")[0]; };

// ============================================================
// UI ATOMS
// ============================================================
function MCBadge({ amount, size = "sm" }) {
  const s = size === "lg" ? { fontSize: 22, padding: "8px 16px", borderRadius: 12 } : { fontSize: 12, padding: "3px 9px", borderRadius: 7 };
  return <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)", color: "#fbbf24", fontWeight: 800, ...s }}>MC {fmt(amount)}</div>;
}

function SCBadge({ amount, size = "sm" }) {
  const s = size === "lg" ? { fontSize: 22, padding: "8px 16px", borderRadius: 12 } : { fontSize: 12, padding: "3px 9px", borderRadius: 7 };
  return <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981", fontWeight: 800, ...s }}>SC {fmt(amount)}</div>;
}

function BadgeTag({ level }) {
  const badge = getBadge(level || 1);
  return <span style={{ fontSize: 10, fontWeight: 800, color: badge.color, background: `${badge.color}18`, padding: "2px 7px", borderRadius: 20, border: `1px solid ${badge.color}30` }}>{badge.icon} {badge.label}</span>;
}

function XPBar({ xp }) {
  const level = getLevel(xp || 0);
  const progress = getXPProgress(xp || 0);
  const badge = getBadge(level);
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: badge.color, fontWeight: 700 }}>Niv. {level} — {badge.label}</span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{progress}/{XP_PER_LEVEL} XP</span>
      </div>
      <div style={{ height: 4, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ width: `${(progress / XP_PER_LEVEL) * 100}%`, height: "100%", background: `linear-gradient(90deg,${badge.color},${badge.color}88)`, borderRadius: 99, transition: "width 0.5s" }} />
      </div>
    </div>
  );
}

function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t); }, []);
  const bg = { error: "#ef4444", warning: "#f59e0b", success: "#10b981" }[type] || "#10b981";
  return <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", background: bg, color: "#fff", fontWeight: 700, padding: "12px 22px", borderRadius: 12, zIndex: 9999, fontSize: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", whiteSpace: "nowrap", animation: "slideUp 0.3s ease" }}>{msg}</div>;
}

function ProbBar({ qYes, qNo }) {
  const p = AMM.probYes(qYes, qNo), pct = Math.round(p * 100);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: "#10b981" }}>OUI {pct}%</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: "#ef4444" }}>NON {100 - pct}%</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: "rgba(239,68,68,0.2)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg,#10b981,#059669)", borderRadius: 99, transition: "width 0.5s" }} />
      </div>
    </div>
  );
}

// ============================================================
// AUTH PAGE
// ============================================================
function AuthPage({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError(""); setLoading(true);
    try {
      if (mode === "signup") {
        if (!username.trim()) { setError("Pseudo requis"); setLoading(false); return; }
        if (password.length < 6) { setError("Mot de passe trop court (6 min)"); setLoading(false); return; }
        const data = await authReq("signup", { email, password, data: { username } });
        if (data.user) {
          const loginData = await authReq("token?grant_type=password", { email, password });
          onAuth(loginData.access_token, loginData.user);
        }
      } else {
        const data = await authReq("token?grant_type=password", { email, password });
        onAuth(data.access_token, data.user);
      }
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080c12", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ width: 60, height: 60, background: "linear-gradient(135deg,#10b981,#3b82f6)", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 14px" }}>⚽</div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 36, letterSpacing: 3, color: "#fff" }}>MARKET<span style={{ color: "#10b981" }}>BALL</span></div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>Predictions football — 100% gratuit</div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 22, padding: "32px 28px" }}>
          <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 4, marginBottom: 26 }}>
            {["login", "signup"].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }} style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: "none", background: mode === m ? "rgba(16,185,129,0.15)" : "transparent", color: mode === m ? "#10b981" : "rgba(255,255,255,0.4)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                {m === "login" ? "Connexion" : "Inscription"}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {mode === "signup" && <div><label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>PSEUDO</label><input value={username} onChange={e => setUsername(e.target.value)} placeholder="MonPseudo" style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} /></div>}
            <div><label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>EMAIL</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} /></div>
            <div><label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>MOT DE PASSE</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && submit()} style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} /></div>
          </div>
          {error && <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 9, color: "#ef4444", fontSize: 13 }}>⚠️ {error}</div>}
          <button onClick={submit} disabled={loading} style={{ width: "100%", marginTop: 20, padding: "13px 0", borderRadius: 11, border: "none", background: loading ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg,#10b981,#059669)", color: loading ? "rgba(255,255,255,0.3)" : "#fff", fontWeight: 900, fontSize: 15, cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "..." : mode === "login" ? "SE CONNECTER" : "CREER MON COMPTE"}
          </button>
        </div>
        <div style={{ marginTop: 16, textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
          Vous demarrez avec <span style={{ color: "#fbbf24", fontWeight: 800 }}>500 MC</span> + <span style={{ color: "#10b981", fontWeight: 800 }}>0 SC</span> gratuits !
        </div>
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700;800;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0;} input::placeholder{color:rgba(255,255,255,0.2);} button{font-family:inherit;}`}</style>
    </div>
  );
}

// ============================================================
// MARKET CARD
// ============================================================
function MarketCard({ market, onBet }) {
  const [hover, setHover] = useState(false);
  const p = AMM.probYes(market.q_yes, market.q_no);
  const cc = catColor(market.category);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: hover ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: "20px 22px", transition: "all 0.2s", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${cc},transparent)` }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ flex: 1, paddingRight: 12 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: cc, background: `${cc}18`, padding: "2px 8px", borderRadius: 20, border: `1px solid ${cc}30` }}>{market.category}</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>⏱ {timeLeft(market.closes_at)}</span>
          </div>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#fff", lineHeight: 1.4, marginBottom: 3 }}>{market.title}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{market.source}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 34, lineHeight: 1, color: p > 0.5 ? "#10b981" : "#ef4444" }}>{Math.round(p * 100)}<span style={{ fontSize: 16 }}>%</span></div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>OUI</div>
        </div>
      </div>
      <ProbBar qYes={market.q_yes} qNo={market.q_no} />
      <div style={{ display: "flex", gap: 20, margin: "12px 0 14px" }}>
        <div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 2 }}>VOLUME</div><div style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24" }}>MC {fmt(market.total_volume)}</div></div>
        <div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 2 }}>PARTICIPANTS</div><div style={{ fontSize: 13, fontWeight: 700 }}>{fmt(market.participants)}</div></div>
      </div>
      <button onClick={() => onBet(market)} style={{ width: "100%", padding: "10px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: hover ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
        PREDIRE →
      </button>
    </div>
  );
}

// ============================================================
// MATCH CARD
// ============================================================
function MatchCard({ match, onBet }) {
  const [hover, setHover] = useState(false);
  const cc = compColor(match.competition);
  const isLive = match.status === "IN_PLAY" || match.status === "PAUSED";
  const isFinished = match.status === "FINISHED";
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: hover ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.018)", border: `1px solid ${isLive ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.06)"}`, borderRadius: 18, padding: "18px 20px", transition: "all 0.2s", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${cc},transparent)` }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: cc, background: `${cc}18`, padding: "2px 8px", borderRadius: 20, border: `1px solid ${cc}30` }}>{compFlag(match.competition)} {compLabel(match.competition)}</span>
        {isLive ? <span style={{ fontSize: 10, fontWeight: 800, color: "#ef4444" }}>EN DIRECT</span>
          : isFinished ? <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>Termine</span>
          : <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{formatMatchDate(match.match_date)}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ flex: 1, textAlign: "center" }}>
          {match.home_logo && <img src={match.home_logo} alt="" style={{ width: 36, height: 36, objectFit: "contain", display: "block", margin: "0 auto 6px" }} onError={e => e.target.style.display = "none"} />}
          <div style={{ fontWeight: 800, fontSize: 12, color: "#fff" }}>{match.home_team}</div>
        </div>
        <div style={{ textAlign: "center", padding: "0 12px" }}>
          {(isLive || isFinished) ? <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 30, color: "#fff" }}>{match.home_score ?? 0} - {match.away_score ?? 0}</div>
            : <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: "rgba(255,255,255,0.4)" }}>VS</div>}
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          {match.away_logo && <img src={match.away_logo} alt="" style={{ width: 36, height: 36, objectFit: "contain", display: "block", margin: "0 auto 6px" }} onError={e => e.target.style.display = "none"} />}
          <div style={{ fontWeight: 800, fontSize: 12, color: "#fff" }}>{match.away_team}</div>
        </div>
      </div>
      {!isFinished && (
        <button onClick={() => onBet(match)} style={{ width: "100%", padding: "10px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: hover ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          PARIER →
        </button>
      )}
    </div>
  );
}

// ============================================================
// BET MODAL (rumeurs)
// ============================================================
function BetModal({ market, onClose, onConfirm, coins }) {
  const [side, setSide] = useState("yes");
  const [amount, setAmount] = useState(50);
  const pYes = AMM.probYes(market.q_yes, market.q_no);
  const cost = AMM.costToBuy(market.q_yes, market.q_no, amount, side);
  const gain = side === "yes" ? Math.round(amount / pYes) : Math.round(amount / (1 - pYes));
  const canBet = cost >= 1 && cost <= coins;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(12px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#0f1623", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 22, padding: 28, width: 380, maxWidth: "95vw" }}>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: 1, marginBottom: 4 }}>PLACER UNE PREDICTION</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 20, lineHeight: 1.4 }}>{market.title}</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {["yes", "no"].map(s => (
            <button key={s} onClick={() => setSide(s)} style={{ flex: 1, padding: "12px 0", borderRadius: 11, border: `2px solid ${side === s ? (s === "yes" ? "#10b981" : "#ef4444") : "rgba(255,255,255,0.07)"}`, background: side === s ? (s === "yes" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)") : "transparent", color: side === s ? (s === "yes" ? "#10b981" : "#ef4444") : "rgba(255,255,255,0.3)", fontWeight: 900, fontSize: 14, cursor: "pointer" }}>
              {s === "yes" ? `OUI ${fmtPct(pYes)}` : `NON ${fmtPct(1 - pYes)}`}
            </button>
          ))}
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 7, fontWeight: 700 }}>PARTS A ACHETER</div>
          <input type="number" value={amount} min={1} max={1000} onChange={e => setAmount(Math.max(1, Math.min(1000, +e.target.value || 1)))} style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff", fontSize: 20, fontWeight: 800, outline: "none", boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {[10, 50, 100, 200].map(v => <button key={v} onClick={() => setAmount(v)} style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: amount === v ? "rgba(255,255,255,0.1)" : "transparent", color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{v}</button>)}
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 11, padding: "13px 15px", marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}><span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Cout</span><MCBadge amount={cost} /></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Gain potentiel</span><span style={{ fontWeight: 900, fontSize: 17, color: "#fbbf24" }}>MC +{fmt(gain)}</span></div>
        </div>
        <button onClick={() => canBet && onConfirm(side, amount, cost, gain)} disabled={!canBet} style={{ width: "100%", padding: "13px 0", borderRadius: 11, border: "none", background: canBet ? "linear-gradient(135deg,#10b981,#059669)" : "rgba(255,255,255,0.05)", color: canBet ? "#fff" : "rgba(255,255,255,0.2)", fontWeight: 900, fontSize: 15, cursor: canBet ? "pointer" : "not-allowed" }}>
          {!canBet && coins < cost ? "Pas assez de MC" : "CONFIRMER →"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// MATCH BET MODAL
// ============================================================
function MatchBetModal({ match, onClose, onConfirm, coins }) {
  const [betType, setBetType] = useState("winner");
  const [prediction, setPrediction] = useState("");
  const [amount, setAmount] = useState(100);
  const BET_TYPES = [
    { id: "winner", label: "Vainqueur", desc: "Qui va gagner ?", mult: 2 },
    { id: "exact_score", label: "Score exact", desc: "Quel sera le score ?", mult: 8 },
    { id: "first_scorer", label: "1er buteur", desc: "Qui marquera en premier ?", mult: 5 },
    { id: "over_under", label: "Plus/Moins", desc: "Plus ou moins de buts ?", mult: 1.8 },
  ];
  const currentType = BET_TYPES.find(t => t.id === betType);
  const gain = Math.round(amount * currentType.mult);
  const canBet = prediction && amount >= 10 && amount <= coins;

  const renderInputs = () => {
    if (betType === "winner") return (
      <div style={{ display: "flex", gap: 8 }}>
        {[match.home_team, "Nul", match.away_team].map(opt => (
          <button key={opt} onClick={() => setPrediction(opt)} style={{ flex: 1, padding: "10px 4px", borderRadius: 10, border: `2px solid ${prediction === opt ? "#10b981" : "rgba(255,255,255,0.08)"}`, background: prediction === opt ? "rgba(16,185,129,0.12)" : "transparent", color: prediction === opt ? "#10b981" : "rgba(255,255,255,0.5)", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>{opt}</button>
        ))}
      </div>
    );
    if (betType === "exact_score") return <input value={prediction} onChange={e => setPrediction(e.target.value)} placeholder="Ex: 2-1" style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff", fontSize: 18, fontWeight: 800, outline: "none", boxSizing: "border-box", textAlign: "center" }} />;
    if (betType === "first_scorer") return <input value={prediction} onChange={e => setPrediction(e.target.value)} placeholder="Nom du joueur (ex: Salah)" style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />;
    if (betType === "over_under") return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {["Plus de 1.5 buts", "Plus de 2.5 buts", "Moins de 2.5 buts", "Moins de 3.5 buts"].map(opt => (
          <button key={opt} onClick={() => setPrediction(opt)} style={{ flex: "1 1 45%", padding: "9px 8px", borderRadius: 10, border: `2px solid ${prediction === opt ? "#f59e0b" : "rgba(255,255,255,0.08)"}`, background: prediction === opt ? "rgba(245,158,11,0.12)" : "transparent", color: prediction === opt ? "#f59e0b" : "rgba(255,255,255,0.4)", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>{opt}</button>
        ))}
      </div>
    );
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(12px)", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#0f1623", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 22, padding: 24, width: 420, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "12px 16px" }}>
          <div style={{ textAlign: "center", flex: 1 }}>
            {match.home_logo && <img src={match.home_logo} alt="" style={{ width: 32, height: 32, objectFit: "contain", display: "block", margin: "0 auto 4px" }} onError={e => e.target.style.display = "none"} />}
            <div style={{ fontSize: 12, fontWeight: 800 }}>{match.home_team}</div>
          </div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: "rgba(255,255,255,0.4)", padding: "0 10px" }}>VS</div>
          <div style={{ textAlign: "center", flex: 1 }}>
            {match.away_logo && <img src={match.away_logo} alt="" style={{ width: 32, height: 32, objectFit: "contain", display: "block", margin: "0 auto 4px" }} onError={e => e.target.style.display = "none"} />}
            <div style={{ fontSize: 12, fontWeight: 800 }}>{match.away_team}</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 18 }}>
          {BET_TYPES.map(t => (
            <button key={t.id} onClick={() => { setBetType(t.id); setPrediction(""); }} style={{ padding: "10px 12px", borderRadius: 11, border: `2px solid ${betType === t.id ? "#10b981" : "rgba(255,255,255,0.07)"}`, background: betType === t.id ? "rgba(16,185,129,0.1)" : "transparent", color: betType === t.id ? "#10b981" : "rgba(255,255,255,0.4)", fontWeight: 700, fontSize: 12, cursor: "pointer", textAlign: "left" }}>
              <div>{t.label}</div>
              <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.7, marginTop: 2 }}>x{t.mult} · {t.desc}</div>
            </button>
          ))}
        </div>
        <div style={{ marginBottom: 18 }}>{renderInputs()}</div>
        <input type="number" value={amount} min={10} max={10000} onChange={e => setAmount(Math.max(10, +e.target.value || 10))} style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff", fontSize: 20, fontWeight: 800, outline: "none", boxSizing: "border-box", marginBottom: 8 }} />
        <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
          {[50, 100, 200, 500].map(v => <button key={v} onClick={() => setAmount(v)} style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: amount === v ? "rgba(255,255,255,0.1)" : "transparent", color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{v}</button>)}
        </div>
        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 11, padding: "13px 15px", marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}><span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Mise</span><MCBadge amount={amount} /></div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}><span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Multiplicateur</span><span style={{ fontWeight: 800, color: "#3b82f6" }}>x{currentType.mult}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Gain potentiel</span><span style={{ fontWeight: 900, fontSize: 17, color: "#fbbf24" }}>MC +{fmt(gain)}</span></div>
        </div>
        <button onClick={() => canBet && onConfirm(match, betType, prediction, amount, gain)} disabled={!canBet} style={{ width: "100%", padding: "13px 0", borderRadius: 11, border: "none", background: canBet ? "linear-gradient(135deg,#10b981,#059669)" : "rgba(255,255,255,0.05)", color: canBet ? "#fff" : "rgba(255,255,255,0.2)", fontWeight: 900, fontSize: 15, cursor: canBet ? "pointer" : "not-allowed" }}>
          {!prediction ? "Choisir une prediction" : !canBet && coins < amount ? "Pas assez de MC" : "CONFIRMER →"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// PAGES
// ============================================================
function HomePage({ markets, coins, sc, username, onBet, onNavigate, matches, onMatchBet, profile }) {
  const upcoming = matches.filter(m => m.status !== "FINISHED").slice(0, 3);
  const level = getLevel(profile?.xp || 0);
  const badge = getBadge(level);
  return (
    <div>
      <div style={{ background: "linear-gradient(135deg,rgba(16,185,129,0.07),rgba(59,130,246,0.04))", border: "1px solid rgba(16,185,129,0.1)", borderRadius: 22, padding: "28px", marginBottom: 24, position: "relative", overflow: "hidden" }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#10b981", letterSpacing: 3, marginBottom: 8 }}>BIENVENUE, {username?.toUpperCase()}</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <BadgeTag level={level} />
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Niv. {level} · {profile?.xp || 0} XP total</span>
        </div>
        <XPBar xp={profile?.xp || 0} />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
          <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.18)", borderRadius: 10, padding: "10px 16px" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 3 }}>MARKETCOINS</div>
            <MCBadge amount={coins} size="lg" />
          </div>
          <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.18)", borderRadius: 10, padding: "10px 16px" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 3 }}>STORECOINS</div>
            <SCBadge amount={sc} size="lg" />
          </div>
        </div>
      </div>
      {upcoming.length > 0 && (
        <>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: 1, marginBottom: 14 }}>MATCHS A VENIR</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 11, marginBottom: 14 }}>
            {upcoming.map(m => <MatchCard key={m.id} match={m} onBet={onMatchBet} />)}
          </div>
          <button onClick={() => onNavigate("matches")} style={{ width: "100%", marginBottom: 26, padding: "11px 0", borderRadius: 11, border: "1px solid rgba(255,255,255,0.07)", background: "transparent", color: "rgba(255,255,255,0.4)", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Voir tous les matchs →</button>
        </>
      )}
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: 1, marginBottom: 14 }}>MARCHES EN VEDETTE</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 11 }}>
        {markets.slice(0, 4).map(m => <MarketCard key={m.id} market={m} onBet={onBet} />)}
      </div>
      <button onClick={() => onNavigate("markets")} style={{ width: "100%", marginTop: 14, padding: "11px 0", borderRadius: 11, border: "1px solid rgba(255,255,255,0.07)", background: "transparent", color: "rgba(255,255,255,0.4)", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Voir tous les marches →</button>
    </div>
  );
}

function MatchesPage({ matches, onBet, loading }) {
  const [comp, setComp] = useState("Tous");
  const allComps = ["Tous", ...new Set(matches.map(m => m.competition))];
  const filtered = comp === "Tous" ? matches : matches.filter(m => m.competition === comp);
  const upcoming = filtered.filter(m => m.status !== "FINISHED");
  const finished = filtered.filter(m => m.status === "FINISHED");
  return (
    <div>
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, letterSpacing: 1, marginBottom: 5 }}>MATCHS</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 20 }}>Paris sur les vrais matchs en temps reel</div>
      <div style={{ display: "flex", gap: 7, marginBottom: 22, flexWrap: "wrap" }}>
        {allComps.map(c => <button key={c} onClick={() => setComp(c)} style={{ padding: "6px 13px", borderRadius: 20, border: `1px solid ${comp === c ? compColor(c) : "rgba(255,255,255,0.07)"}`, background: comp === c ? `${compColor(c)}18` : "transparent", color: comp === c ? compColor(c) : "rgba(255,255,255,0.4)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{c === "Tous" ? "Tous" : `${compFlag(c)} ${compLabel(c)}`}</button>)}
      </div>
      {loading && <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.3)" }}>Chargement...</div>}
      {!loading && upcoming.length === 0 && finished.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.3)" }}>Aucun match disponible</div>}
      {upcoming.length > 0 && <>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, letterSpacing: 1, marginBottom: 12, color: "#10b981" }}>A VENIR ET EN DIRECT</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 11, marginBottom: 24 }}>
          {upcoming.map(m => <MatchCard key={m.id} match={m} onBet={onBet} />)}
        </div>
      </>}
      {finished.length > 0 && <>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, letterSpacing: 1, marginBottom: 12, color: "rgba(255,255,255,0.4)" }}>TERMINES</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 11 }}>
          {finished.map(m => <MatchCard key={m.id} match={m} onBet={onBet} />)}
        </div>
      </>}
    </div>
  );
}

function MarketsPage({ markets, onBet }) {
  const [cat, setCat] = useState("Tous");
  const cats = ["Tous", ...new Set(markets.map(m => m.category))];
  const filtered = cat === "Tous" ? markets : markets.filter(m => m.category === cat);
  return (
    <div>
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, letterSpacing: 1, marginBottom: 5 }}>MARCHES DE PREDICTION</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 20 }}>{markets.length} marches · AMM en temps reel</div>
      <div style={{ display: "flex", gap: 7, marginBottom: 22, flexWrap: "wrap" }}>
        {cats.map(c => <button key={c} onClick={() => setCat(c)} style={{ padding: "6px 13px", borderRadius: 20, border: `1px solid ${cat === c ? catColor(c) : "rgba(255,255,255,0.07)"}`, background: cat === c ? `${catColor(c)}18` : "transparent", color: cat === c ? catColor(c) : "rgba(255,255,255,0.4)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{c}</button>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 11 }}>
        {filtered.map(m => <MarketCard key={m.id} market={m} onBet={onBet} />)}
      </div>
    </div>
  );
}

function WalletPage({ coins, sc, bets, matchBets, profile, onSpin, onWatchAd, onConvertSC }) {
  const [spinning, setSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState(null);
  const [convertAmount, setConvertAmount] = useState(10);
  const lastSpin = profile?.last_spin ? new Date(profile.last_spin).getTime() : 0;
  const canSpin = Date.now() - lastSpin > 86400000;
  const today = new Date().toISOString().split("T")[0];
  const adsToday = profile?.ads_reset_date === today ? (profile?.ads_watched_today || 0) : 0;
  const canAd = adsToday < 3;
  const weekKey = getWeekKey();
  const weeklyPurchased = profile?.weekly_reset_date === weekKey ? (profile?.weekly_mc_purchased || 0) : 0;
  const remainingLimit = WEEKLY_MC_LIMIT - weeklyPurchased;

  const doSpin = async () => {
    if (!canSpin || spinning) return;
    setSpinning(true);
    await new Promise(r => setTimeout(r, 1200));
    const reward = SPIN_REWARDS[Math.floor(Math.random() * SPIN_REWARDS.length)];
    setSpinResult(reward);
    onSpin(reward);
    setSpinning(false);
  };

  return (
    <div>
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, letterSpacing: 1, marginBottom: 20 }}>WALLET</div>

      {/* Soldes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11, marginBottom: 18 }}>
        <div style={{ background: "linear-gradient(135deg,rgba(251,191,36,0.07),rgba(251,191,36,0.02))", border: "1px solid rgba(251,191,36,0.14)", borderRadius: 16, padding: "20px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 700, letterSpacing: 2, marginBottom: 6 }}>MARKETCOINS</div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 36, color: "#fbbf24" }}>{fmt(coins)}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>Pour jouer et parier</div>
        </div>
        <div style={{ background: "linear-gradient(135deg,rgba(16,185,129,0.07),rgba(16,185,129,0.02))", border: "1px solid rgba(16,185,129,0.14)", borderRadius: 16, padding: "20px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 700, letterSpacing: 2, marginBottom: 6 }}>STORECOINS</div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 36, color: "#10b981" }}>{fmt(sc)}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>Pour les recompenses</div>
        </div>
      </div>

      {/* Conversion SC → MC */}
      <div style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.12)", borderRadius: 14, padding: "16px 18px", marginBottom: 18 }}>
        <div style={{ fontWeight: 800, color: "#3b82f6", marginBottom: 4 }}>Convertir SC en MC</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 12 }}>1 SC = 1 MC · Limite {remainingLimit} MC restants cette semaine</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="number" value={convertAmount} min={1} max={Math.min(sc, remainingLimit)} onChange={e => setConvertAmount(Math.max(1, Math.min(sc, remainingLimit, +e.target.value || 1)))}
            style={{ flex: 1, padding: "8px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, color: "#fff", fontSize: 15, fontWeight: 700, outline: "none" }} />
          <button onClick={() => sc >= convertAmount && remainingLimit >= convertAmount && onConvertSC(convertAmount)}
            disabled={sc < convertAmount || remainingLimit < convertAmount}
            style={{ padding: "8px 16px", borderRadius: 9, border: "none", background: sc >= convertAmount && remainingLimit >= convertAmount ? "linear-gradient(135deg,#3b82f6,#2563eb)" : "rgba(255,255,255,0.05)", color: sc >= convertAmount && remainingLimit >= convertAmount ? "#fff" : "rgba(255,255,255,0.2)", fontWeight: 800, cursor: "pointer", fontSize: 13, whiteSpace: "nowrap" }}>
            Convertir →
          </button>
        </div>
      </div>

      {/* Roue + Pub */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11, marginBottom: 24 }}>
        <div style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.12)", borderRadius: 15, padding: "20px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 7, display: "inline-block", transition: "transform 1.5s", transform: spinning ? "rotate(720deg)" : "none" }}>🎡</div>
          <div style={{ fontWeight: 800, marginBottom: 3 }}>Roue quotidienne</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 12 }}>Jusqu'a 200 MC</div>
          {spinResult && <div style={{ fontSize: 16, fontWeight: 900, color: "#f59e0b", marginBottom: 8 }}>+{spinResult} MC</div>}
          <button onClick={doSpin} disabled={!canSpin || spinning}
            style={{ width: "100%", padding: "8px 0", borderRadius: 9, border: "none", background: canSpin && !spinning ? "linear-gradient(135deg,#f59e0b,#d97706)" : "rgba(255,255,255,0.05)", color: canSpin && !spinning ? "#fff" : "rgba(255,255,255,0.25)", fontWeight: 800, cursor: canSpin && !spinning ? "pointer" : "not-allowed", fontSize: 13 }}>
            {spinning ? "..." : canSpin ? "TOURNER" : "Demain"}
          </button>
        </div>
        <div style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.12)", borderRadius: 15, padding: "20px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 7 }}>📺</div>
          <div style={{ fontWeight: 800, marginBottom: 3 }}>Pub recompensee</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>+20 MC · {adsToday}/3 aujourd'hui</div>
          <div style={{ height: 4, background: "rgba(59,130,246,0.15)", borderRadius: 99, marginBottom: 12, overflow: "hidden" }}>
            <div style={{ width: `${(adsToday / 3) * 100}%`, height: "100%", background: "#3b82f6", borderRadius: 99 }} />
          </div>
          <button onClick={() => canAd && onWatchAd()} disabled={!canAd}
            style={{ width: "100%", padding: "8px 0", borderRadius: 9, border: "none", background: canAd ? "linear-gradient(135deg,#3b82f6,#2563eb)" : "rgba(255,255,255,0.05)", color: canAd ? "#fff" : "rgba(255,255,255,0.25)", fontWeight: 800, cursor: canAd ? "pointer" : "not-allowed", fontSize: 13 }}>
            {canAd ? "REGARDER" : "Limite"}
          </button>
        </div>
      </div>

      {/* Historique paris */}
      {(bets.length > 0 || matchBets.length > 0) && (
        <>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: 1, marginBottom: 12 }}>MES PARIS</div>
          {[...matchBets.map(b => ({ ...b, isMatch: true })), ...bets].map((b, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: "13px 16px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{b.market_title || b.match_title || "Paris"}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}><span style={{ color: "#10b981", fontWeight: 700 }}>{b.side || b.prediction}</span>{" · "}{fmt(b.cost)} MC</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(251,191,36,0.12)", color: "#fbbf24", fontWeight: 700, marginBottom: 3 }}>EN COURS</div>
                <div style={{ fontWeight: 900, color: "#10b981", fontSize: 14 }}>+{fmt(b.potential_gain)} MC</div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function LeaderboardPage({ leaderboard, username }) {
  const topColors = ["#c0c0c0", "#ffd700", "#cd7f32"];
  return (
    <div>
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, letterSpacing: 1, marginBottom: 5 }}>CLASSEMENT</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 22 }}>Top oracles — classement par profit net hebdo</div>
      <div style={{ display: "flex", gap: 10, marginBottom: 22, alignItems: "flex-end" }}>
        {[leaderboard[1], leaderboard[0], leaderboard[2]].map((p, vi) => {
          if (!p) return null;
          const hs = [130, 160, 110];
          return (
            <div key={p.username} style={{ flex: 1, background: `${topColors[vi]}0d`, border: `1px solid ${topColors[vi]}22`, borderRadius: 14, padding: "14px 10px", textAlign: "center", height: hs[vi], display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <BadgeTag level={getLevel(p.xp || 0)} />
              <div style={{ fontWeight: 800, fontSize: 12, color: "#fff", marginBottom: 1, marginTop: 4 }}>{p.username}</div>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, color: topColors[vi] }}>MC {fmt(p.coins)}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{p.win_rate}% win</div>
            </div>
          );
        })}
      </div>
      {leaderboard.map((p, i) => (
        <div key={p.username} style={{ background: p.username === username ? "rgba(16,185,129,0.05)" : "rgba(255,255,255,0.018)", border: `1px solid ${p.username === username ? "rgba(16,185,129,0.14)" : "rgba(255,255,255,0.04)"}`, borderRadius: 11, padding: "12px 16px", marginBottom: 6, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: i < 3 ? `linear-gradient(135deg,${topColors[i]},${topColors[i]}88)` : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 12, flexShrink: 0, color: i < 3 ? "#000" : "rgba(255,255,255,0.4)" }}>{i + 1}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{ fontWeight: 700, color: p.username === username ? "#10b981" : "#fff", fontSize: 13 }}>{p.username}</span>
              <BadgeTag level={getLevel(p.xp || 0)} />
              {p.username === username && <span style={{ fontSize: 10, color: "#10b981" }}>(Vous)</span>}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{p.total_wins}/{p.total_bets} paris · Niv. {getLevel(p.xp || 0)}</div>
          </div>
          <MCBadge amount={p.coins} />
        </div>
      ))}
    </div>
  );
}

function StorePage({ coins, sc, profile, onRedeemSC, onBuyMC }) {
  const level = getLevel(profile?.xp || 0);
  const userBadge = getBadge(level);
  const badgeOrder = ["rookie", "scout", "analyst", "pro", "legend"];
  const userBadgeIndex = badgeOrder.indexOf(userBadge.id);

  const canAccess = (requiredBadge) => badgeOrder.indexOf(requiredBadge) <= userBadgeIndex;

  const rewardItems = STORE_ITEMS.filter(i => !i.isMCPack);
  const mcPacks = STORE_ITEMS.filter(i => i.isMCPack);

  return (
    <div>
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, letterSpacing: 1, marginBottom: 5 }}>REWARD STORE</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 5 }}>Echange tes StoreCoins ou achete des MarketCoins</div>
      <div style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap" }}>
        <MCBadge amount={coins} size="lg" />
        <SCBadge amount={sc} size="lg" />
        <BadgeTag level={level} />
      </div>

      {/* Packs MC */}
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, letterSpacing: 1, marginBottom: 12, color: "#fbbf24" }}>ACHETER DES MARKETCOINS</div>
      <div style={{ background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.1)", borderRadius: 12, padding: "12px 14px", marginBottom: 16, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
        1€ = 10 MC · Limite 200 MC/semaine
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 11, marginBottom: 28 }}>
        {mcPacks.map(r => (
          <div key={r.id} style={{ background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.1)", borderRadius: 17, padding: "18px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 28, color: "#fbbf24", fontWeight: 900 }}>MC</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 2 }}>{r.name}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{r.description}</div>
            </div>
            <div style={{ flex: 1 }} />
            <button onClick={() => onBuyMC(r)} style={{ width: "100%", padding: "8px 0", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
              Acheter {r.priceEur}€
            </button>
          </div>
        ))}
      </div>

      {/* Recompenses SC */}
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, letterSpacing: 1, marginBottom: 12, color: "#10b981" }}>RECOMPENSES (STORECOINS)</div>
      <div style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.1)", borderRadius: 12, padding: "12px 14px", marginBottom: 16, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
        L'acces aux recompenses depend de ton badge. Monte de niveau pour debloquer !
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 11 }}>
        {rewardItems.map(r => {
          const accessible = canAccess(r.requiredBadge);
          const affordable = sc >= r.cost;
          const reqBadge = BADGES.find(b => b.id === r.requiredBadge);
          return (
            <div key={r.id} style={{ background: accessible ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.01)", border: `1px solid ${accessible ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)"}`, borderRadius: 17, padding: "20px 18px", display: "flex", flexDirection: "column", gap: 10, opacity: accessible ? 1 : 0.6 }}>
              <div style={{ fontSize: 30, color: accessible ? reqBadge?.color : "rgba(255,255,255,0.2)", fontWeight: 900 }}>{r.icon}</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 2 }}>{r.name}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>{r.description}</div>
                <span style={{ fontSize: 10, fontWeight: 800, color: reqBadge?.color, background: `${reqBadge?.color}18`, padding: "2px 7px", borderRadius: 20, border: `1px solid ${reqBadge?.color}30` }}>
                  {reqBadge?.icon} {reqBadge?.label} requis
                </span>
              </div>
              <div style={{ flex: 1 }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <SCBadge amount={r.cost} />
                <button onClick={() => accessible && affordable && onRedeemSC(r)}
                  disabled={!accessible || !affordable}
                  style={{ padding: "8px 14px", borderRadius: 9, border: "none", background: accessible && affordable ? "linear-gradient(135deg,#10b981,#059669)" : "rgba(255,255,255,0.05)", color: accessible && affordable ? "#fff" : "rgba(255,255,255,0.2)", fontWeight: 700, fontSize: 12, cursor: accessible && affordable ? "pointer" : "not-allowed" }}>
                  {!accessible ? "Badge requis" : !affordable ? "Insuffisant" : "OBTENIR"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProfilePage({ profile, username, onLogout }) {
  const level = getLevel(profile?.xp || 0);
  const badge = getBadge(level);
  const wr = profile?.total_bets > 0 ? Math.round((profile.total_wins / profile.total_bets) * 100) : 0;
  return (
    <div>
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, letterSpacing: 1, marginBottom: 20 }}>MON PROFIL</div>
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: "24px", marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 18, alignItems: "center", marginBottom: 14 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: `linear-gradient(135deg,${badge.color},#3b82f6)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 900, flexShrink: 0, color: "#fff" }}>{badge.icon}</div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 20 }}>{username}</div>
            <BadgeTag level={level} />
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>Niveau {level} · {profile?.xp || 0} XP total</div>
          </div>
        </div>
        <XPBar xp={profile?.xp || 0} />
        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <MCBadge amount={profile?.coins || 0} />
          <SCBadge amount={profile?.store_coins || 0} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 18 }}>
        {[{ label: "PARIS", val: profile?.total_bets || 0, color: "#3b82f6" }, { label: "WINS", val: profile?.total_wins || 0, color: "#10b981" }, { label: "PRECISION", val: `${wr}%`, color: "#8b5cf6" }].map(s => (
          <div key={s.label} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: "16px 10px", textAlign: "center" }}>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontWeight: 800, letterSpacing: 1, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Infos badges */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, padding: "16px 18px", marginBottom: 18 }}>
        <div style={{ fontWeight: 800, marginBottom: 12, fontSize: 13 }}>Progression des badges</div>
        {BADGES.map(b => (
          <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: b.color, background: `${b.color}18`, padding: "2px 8px", borderRadius: 20, border: `1px solid ${b.color}30`, minWidth: 70, textAlign: "center" }}>{b.icon} {b.label}</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Niv. {b.minLevel}-{b.maxLevel === 999 ? "+" : b.maxLevel}</span>
            {level >= b.minLevel && <span style={{ fontSize: 10, color: b.color }}>✓ Debloque</span>}
          </div>
        ))}
      </div>

      <div style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.1)", borderRadius: 12, padding: "13px 16px", marginBottom: 20, fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
        Les MarketCoins n'ont <strong style={{ color: "rgba(255,255,255,0.7)" }}>aucune valeur monetaire</strong> et ne peuvent pas etre achetes ni convertis en argent.
      </div>
      <button onClick={onLogout} style={{ width: "100%", padding: "12px 0", borderRadius: 11, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.05)", color: "#ef4444", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
        Se deconnecter
      </button>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [page, setPage] = useState("home");
  const [markets, setMarkets] = useState(getSeedMarkets());
  const [matches, setMatches] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [bets, setBets] = useState([]);
  const [matchBets, setMatchBets] = useState([]);
  const [betModal, setBetModal] = useState(null);
  const [matchBetModal, setMatchBetModal] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => setToast({ msg, type });

  const loadLeaderboard = useCallback(async (token) => {
    try {
      const data = await req("profiles?select=id,username,coins,store_coins,xp,level,total_wins,total_bets&order=coins.desc&limit=10", { _token: token || SUPABASE_KEY });
      if (data?.length) setLeaderboard(data.map((p, i) => ({ ...p, rank: i + 1, win_rate: p.total_bets > 0 ? Math.round((p.total_wins / p.total_bets) * 100) : 0 })));
    } catch {}
  }, []);

  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => loadLeaderboard(session.token), 30000);
    return () => clearInterval(interval);
  }, [session, loadLeaderboard]);

  const loadMatches = useCallback(async () => {
    setMatchesLoading(true);
    try {
      const allMatches = [];
      for (const comp of COMPETITIONS) {
        try {
          const data = await footballReq(comp);
          if (data?.matches) {
            const now = new Date();
            const mapped = data.matches
              .filter(m => { const d = new Date(m.utcDate); return d >= new Date(now - 3 * 86400000) && d <= new Date(now.getTime() + 30 * 86400000); })
              .map(m => ({ id: m.id.toString(), home_team: m.homeTeam.shortName || m.homeTeam.name, away_team: m.awayTeam.shortName || m.awayTeam.name, home_logo: m.homeTeam.crest, away_logo: m.awayTeam.crest, competition: comp, match_date: m.utcDate, status: m.status, home_score: m.score?.fullTime?.home, away_score: m.score?.fullTime?.away }));
            allMatches.push(...mapped);
          }
        } catch {}
      }
      allMatches.sort((a, b) => new Date(a.match_date) - new Date(b.match_date));
      setMatches(allMatches);
    } catch {}
    setMatchesLoading(false);
  }, []);

  const loadMarkets = useCallback(async () => {
    try {
      const data = await req("rumors?select=*&status=eq.open&order=created_at.desc");
      if (data?.length) {
        const saved = loadSavedOdds();
        const seeds = BASE_MARKETS.map(m => ({ ...m, ...(saved[m.id] || {}), status: "open" }));
        const mapped = data.map(r => ({ id: r.rumor_id, title: r.event_question || `${r.player_name} → ${r.to_club} ?`, q_yes: 100, q_no: 100, total_volume: 500, participants: 10, closes_at: r.expires_at || new Date(Date.now() + 14 * 86400000).toISOString(), category: "Transferts", source: r.source_name || "Source", status: "open" }));
        setMarkets([...mapped, ...seeds]);
      }
    } catch {}
  }, []);

  const loadProfile = useCallback(async (token, userId) => {
    try {
      const data = await req(`profiles?id=eq.${userId}&select=*`, { _token: token });
      if (data?.[0]) {
        setProfile(data[0]);
      } else {
        const newProfile = { id: userId, coins: 500, store_coins: 0, xp: 0, level: 1, total_bets: 0, total_wins: 0, weekly_profit: 0, weekly_sc_earned: 0, total_profit: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        try { await req("profiles", { method: "POST", _token: token, body: JSON.stringify(newProfile) }); } catch {}
        setProfile(newProfile);
      }
    } catch {}
  }, []);

  const loadBets = useCallback(async (token, userId) => {
    try { const data = await req(`user_bets?user_id=eq.${userId}&select=*&order=created_at.desc&limit=20`, { _token: token }); if (data) setBets(data); } catch {}
  }, []);

  const loadMatchBets = useCallback(async (token, userId) => {
    try { const data = await req(`match_bets?user_id=eq.${userId}&select=*&order=created_at.desc&limit=20`, { _token: token }); if (data) setMatchBets(data); } catch {}
  }, []);

  useEffect(() => { loadMarkets(); loadMatches(); }, []);

  const handleAuth = async (token, user) => {
    setSession({ token, user });
    await loadProfile(token, user.id);
    await loadBets(token, user.id);
    await loadMatchBets(token, user.id);
    await loadLeaderboard(token);
  };

  const updateProfile = async (updates, token, userId) => {
    try {
      await req(`profiles?id=eq.${userId}`, { method: "PATCH", _token: token, body: JSON.stringify({ ...updates, updated_at: new Date().toISOString() }) });
    } catch {}
    setProfile(p => ({ ...p, ...updates }));
  };

  // Calcul XP après un pari
  const addXP = (currentXP, betCost) => {
    const xpFromBet = 5; // 5 XP par pari
    const newXP = (currentXP || 0) + xpFromBet;
    return { newXP, newLevel: getLevel(newXP) };
  };

  const handleBetConfirm = async (side, amount, cost, gain) => {
    if (!session) return;
    const newCoins = (profile?.coins || 0) - cost;
    if (newCoins < 0) { showToast("Pas assez de MC !", "error"); return; }
    const { newXP, newLevel } = addXP(profile?.xp, cost);
    try {
      await req("user_bets", { method: "POST", _token: session.token, body: JSON.stringify({ user_id: session.user.id, market_id: betModal.id, market_title: betModal.title, side, amount, cost, potential_gain: gain, status: "pending" }) });
      const updatedMarkets = markets.map(m => m.id === betModal.id ? { ...m, q_yes: side === "yes" ? m.q_yes + amount : m.q_yes, q_no: side === "no" ? m.q_no + amount : m.q_no, total_volume: m.total_volume + cost, participants: m.participants + 1 } : m);
      setMarkets(updatedMarkets);
      saveOdds(updatedMarkets);
      setBets(prev => [{ market_id: betModal.id, market_title: betModal.title, side, amount, cost, potential_gain: gain, status: "pending" }, ...prev]);
      await updateProfile({ coins: newCoins, xp: newXP, level: newLevel, total_bets: (profile?.total_bets || 0) + 1 }, session.token, session.user.id);
      setBetModal(null);
      showToast(`Prediction placee ! +5 XP | Gain potentiel : +${gain.toLocaleString()} MC`);
      await loadLeaderboard(session.token);
    } catch (e) { showToast(`Erreur : ${e.message}`, "error"); }
  };

  const handleMatchBetConfirm = async (match, betType, prediction, amount, gain) => {
    if (!session) return;
    const newCoins = (profile?.coins || 0) - amount;
    if (newCoins < 0) { showToast("Pas assez de MC !", "error"); return; }
    const { newXP, newLevel } = addXP(profile?.xp, amount);
    try {
      await req("match_bets", { method: "POST", _token: session.token, body: JSON.stringify({ user_id: session.user.id, match_id: null, match_title: `${match.home_team} vs ${match.away_team}`, bet_type: betType, prediction, cost: amount, potential_gain: gain, status: "pending" }) });
      setMatchBets(prev => [{ match_title: `${match.home_team} vs ${match.away_team}`, bet_type: betType, prediction, cost: amount, potential_gain: gain, status: "pending" }, ...prev]);
      await updateProfile({ coins: newCoins, xp: newXP, level: newLevel, total_bets: (profile?.total_bets || 0) + 1 }, session.token, session.user.id);
      setMatchBetModal(null);
      showToast(`Pari place ! +5 XP | Gain potentiel : +${gain.toLocaleString()} MC`);
      await loadLeaderboard(session.token);
    } catch (e) { showToast(`Erreur : ${e.message}`, "error"); }
  };

  const handleSpin = async (reward) => {
    if (!session) return;
    await updateProfile({ coins: (profile?.coins || 0) + reward, last_spin: new Date().toISOString() }, session.token, session.user.id);
    await loadLeaderboard(session.token);
    showToast(`+${reward} MC gagnes !`);
  };

  const handleWatchAd = async () => {
    if (!session) return;
    const today = new Date().toISOString().split("T")[0];
    const adsToday = profile?.ads_reset_date === today ? (profile?.ads_watched_today || 0) + 1 : 1;
    await updateProfile({ coins: (profile?.coins || 0) + 20, ads_watched_today: adsToday, ads_reset_date: today }, session.token, session.user.id);
    await loadLeaderboard(session.token);
    showToast("+20 MC gagnes !");
  };

  const handleRedeemSC = async (reward) => {
    if (!session) return;
    const newSC = (profile?.store_coins || 0) - reward.cost;
    if (newSC < 0) { showToast("Pas assez de SC !", "error"); return; }
    await updateProfile({ store_coins: newSC }, session.token, session.user.id);
    showToast(`${reward.name} obtenu ! On te contacte par email.`);
  };

  const handleBuyMC = async (pack) => {
    if (!session) return;
    const weekKey = getWeekKey();
    const weeklyPurchased = profile?.weekly_reset_date === weekKey ? (profile?.weekly_mc_purchased || 0) : 0;
    const mcAmount = pack.priceEur * 10;
    if (weeklyPurchased + mcAmount > WEEKLY_MC_LIMIT) {
      showToast(`Limite hebdo atteinte ! Max ${WEEKLY_MC_LIMIT} MC/semaine.`, "error");
      return;
    }
    // Simulation achat (pas de vrai paiement ici)
    await updateProfile({ coins: (profile?.coins || 0) + mcAmount, weekly_mc_purchased: weeklyPurchased + mcAmount, weekly_reset_date: weekKey }, session.token, session.user.id);
    showToast(`+${mcAmount} MC ajoutes ! (simulation)`);
  };

  const handleConvertSC = async (amount) => {
    if (!session) return;
    const weekKey = getWeekKey();
    const weeklyPurchased = profile?.weekly_reset_date === weekKey ? (profile?.weekly_mc_purchased || 0) : 0;
    if (weeklyPurchased + amount > WEEKLY_MC_LIMIT) { showToast("Limite hebdo atteinte !", "error"); return; }
    if ((profile?.store_coins || 0) < amount) { showToast("Pas assez de SC !", "error"); return; }
    await updateProfile({ coins: (profile?.coins || 0) + amount, store_coins: (profile?.store_coins || 0) - amount, weekly_mc_purchased: weeklyPurchased + amount, weekly_reset_date: weekKey }, session.token, session.user.id);
    showToast(`${amount} SC convertis en ${amount} MC !`);
  };

  const handleLogout = async () => {
    try { await authReq("logout", {}); } catch {}
    setSession(null); setProfile(null); setBets([]); setMatchBets([]);
  };

  const coins = profile?.coins ?? 500;
  const sc = profile?.store_coins ?? 0;
  const username = profile?.username || session?.user?.user_metadata?.username || session?.user?.email?.split("@")[0] || "Joueur";

  const NAV = [
    { id: "home", icon: "⚡", label: "Accueil" },
    { id: "matches", icon: "⚽", label: "Matchs" },
    { id: "markets", icon: "📊", label: "Marches" },
    { id: "wallet", icon: "MC", label: "Wallet" },
    { id: "leaderboard", icon: "🏆", label: "Top" },
    { id: "store", icon: "★", label: "Store" },
    { id: "profile", icon: "👤", label: "Profil" },
  ];

  if (!session) return <AuthPage onAuth={handleAuth} />;

  return (
    <div style={{ minHeight: "100vh", background: "#080c12", fontFamily: "'DM Sans',sans-serif", color: "#fff" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: -200, left: "25%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle,rgba(16,185,129,0.04),transparent 70%)" }} />
      </div>

      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 200, background: "rgba(8,12,18,0.92)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 54 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 30, height: 30, background: "linear-gradient(135deg,#10b981,#3b82f6)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⚽</div>
            <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, letterSpacing: 2 }}>MARKET<span style={{ color: "#10b981" }}>BALL</span></span>
          </div>
          <nav style={{ display: "flex", gap: 1 }}>
            {NAV.slice(0, 6).map(n => (
              <button key={n.id} onClick={() => setPage(n.id)} style={{ padding: "5px 9px", borderRadius: 7, border: "none", background: page === n.id ? "rgba(16,185,129,0.12)" : "transparent", color: page === n.id ? "#10b981" : "rgba(255,255,255,0.4)", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>
                {n.icon} {n.label}
              </button>
            ))}
          </nav>
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            <button onClick={() => setPage("profile")} style={{ padding: "4px 9px", borderRadius: 7, border: "none", background: "transparent", color: "rgba(255,255,255,0.35)", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>👤 {username}</button>
            <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.18)", borderRadius: 7, padding: "3px 8px" }}>
              <span style={{ fontWeight: 800, color: "#fbbf24", fontSize: 11 }}>MC {fmt(coins)}</span>
            </div>
            <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.18)", borderRadius: 7, padding: "3px 8px" }}>
              <span style={{ fontWeight: 800, color: "#10b981", fontSize: 11 }}>SC {fmt(sc)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 20px 90px", position: "relative", zIndex: 1 }}>
        {page === "home" && <HomePage markets={markets} coins={coins} sc={sc} username={username} onBet={setBetModal} onNavigate={setPage} matches={matches} onMatchBet={setMatchBetModal} profile={profile} />}
        {page === "matches" && <MatchesPage matches={matches} onBet={setMatchBetModal} loading={matchesLoading} />}
        {page === "markets" && <MarketsPage markets={markets} onBet={setBetModal} />}
        {page === "wallet" && <WalletPage coins={coins} sc={sc} bets={bets} matchBets={matchBets} profile={profile} onSpin={handleSpin} onWatchAd={handleWatchAd} onConvertSC={handleConvertSC} />}
        {page === "leaderboard" && <LeaderboardPage leaderboard={leaderboard.length ? leaderboard : [{ rank: 1, username, coins, xp: profile?.xp || 0, total_wins: profile?.total_wins || 0, total_bets: profile?.total_bets || 0, win_rate: 0 }]} username={username} />}
        {page === "store" && <StorePage coins={coins} sc={sc} profile={profile} onRedeemSC={handleRedeemSC} onBuyMC={handleBuyMC} />}
        {page === "profile" && <ProfilePage profile={profile} username={username} onLogout={handleLogout} />}
      </div>

      {/* Bottom nav */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(8,12,18,0.95)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", zIndex: 200 }}>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setPage(n.id)} style={{ flex: 1, padding: "8px 0", background: "transparent", border: "none", color: page === n.id ? "#10b981" : "rgba(255,255,255,0.3)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: 14 }}>{n.icon}</span>
            <span style={{ fontSize: 8, fontWeight: 700 }}>{n.label}</span>
          </button>
        ))}
      </div>

      {betModal && <BetModal market={betModal} coins={coins} onClose={() => setBetModal(null)} onConfirm={handleBetConfirm} />}
      {matchBetModal && <MatchBetModal match={matchBetModal} coins={coins} onClose={() => setMatchBetModal(null)} onConfirm={handleMatchBetConfirm} />}
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700;800;900&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        input::placeholder { color:rgba(255,255,255,0.2); }
        input:focus { border-color:rgba(16,185,129,0.4) !important; }
        button { font-family:inherit; }
        @keyframes slideUp { from{transform:translateX(-50%) translateY(16px);opacity:0} to{transform:translateX(-50%) translateY(0);opacity:1} }
        ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:99px; }
      `}</style>
    </div>
  );
}
