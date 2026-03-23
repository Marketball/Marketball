import { useState, useEffect, useCallback, useRef } from "react";

const SUPABASE_URL = "https://aiesvzdvlownkcjbkgjv.supabase.co";
const SUPABASE_KEY = "sb_publishable_Ipu5bJO_zD1ckygwQmpcuw_Tl5xWmyK";

const req = async (path, opts = {}) => {
  const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${opts._token || SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation", ...opts.headers };
  delete opts._token;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message || data?.error_description || JSON.stringify(data));
  return data;
};

const authReq = async (path, body) => {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, { method: "POST", headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || "Erreur auth");
  return data;
};

const squadReq = async (teamId) => { const res = await fetch(`/api/squad?teamId=${teamId}`); if (!res.ok) throw new Error("Erreur squad"); return res.json(); };

const AMM = {
  probYes: (qY, qN) => { const eY = Math.exp(qY / 100), eN = Math.exp(qN / 100); return eY / (eY + eN); },
  costToBuy: (qY, qN, shares, side) => {
    const b = 100, before = b * Math.log(Math.exp(qY / b) + Math.exp(qN / b));
    const after = side === "yes" ? b * Math.log(Math.exp((qY + shares) / b) + Math.exp(qN / b)) : b * Math.log(Math.exp(qY / b) + Math.exp((qN + shares) / b));
    return Math.max(1, Math.round(after - before));
  },
};

const calcMatchOdds = (match) => {
  const BIG = ["Real Madrid", "Barcelona", "Bayern", "Man City", "PSG", "Liverpool", "Arsenal", "Chelsea", "Inter", "Juventus", "Atletico", "Dortmund", "Man United", "Tottenham", "Newcastle"];
  const MED = ["Monaco", "Lyon", "Marseille", "Sevilla", "Villarreal", "Napoli", "Roma", "Lazio", "Bayer Leverkusen", "RB Leipzig", "Aston Villa", "West Ham"];
  const hS = BIG.some(c => match.home_team?.includes(c)) ? 3 : MED.some(c => match.home_team?.includes(c)) ? 2 : 1;
  const aS = BIG.some(c => match.away_team?.includes(c)) ? 3 : MED.some(c => match.away_team?.includes(c)) ? 2 : 1;
  const total = hS + aS + 1.5;
  const pHome = Math.min(0.75, Math.max(0.15, hS / total + 0.1));
  const pAway = Math.min(0.65, Math.max(0.10, aS / total));
  const pDraw = Math.max(0.10, 1 - pHome - pAway);
  const m = 1.05;
  return { pHome, pAway, pDraw, oddsHome: +(m / pHome).toFixed(2), oddsDraw: +(m / pDraw).toFixed(2), oddsAway: +(m / pAway).toFixed(2) };
};

const calcExactScoreOdds = (hG, aG, odds) => {
  const lH = odds.pHome * 2.2 + odds.pDraw * 1.1, lA = odds.pAway * 2.2 + odds.pDraw * 1.1;
  const poi = (l, k) => { let r = Math.exp(-l); for (let i = 0; i < k; i++) r *= l / (i + 1); return r; };
  return Math.min(200, Math.max(3, +((1 / Math.max(poi(lH, hG) * poi(lA, aG), 0.001)) * 1.1).toFixed(1)));
};

const calcScorerOdds = (player, isFirst) => {
  const ATT = ["Haaland","Kane","Mbappe","Salah","Vinicius","Lewandowski","Watkins","Isak","Nunez","Vlahovic","Lautaro","Dembele","Osimhen","Guirassy","Lacazette"];
  const MID = ["Bellingham","De Bruyne","Odegaard","Saka","Palmer","Musiala","Pedri","Foden","Son","Rashford","Grealish","Yamal"];
  const isA = ATT.some(a => player?.includes(a)), isM = MID.some(m => player?.includes(m));
  const p = isA ? (isFirst ? 0.22 : 0.55) : isM ? (isFirst ? 0.12 : 0.35) : (isFirst ? 0.06 : 0.18);
  return Math.min(50, Math.max(1.5, +((1 / Math.max(p, 0.01)) * 1.1).toFixed(1)));
};

const calcOverUnderOdds = (line, isOver, odds) => {
  const eg = odds.pHome * 2.2 + odds.pAway * 1.8 + 0.8 * 1.1;
  const op = { 1.5: Math.min(0.85, Math.max(0.45, 0.5 + (eg - 2.5) * 0.15)), 2.5: Math.min(0.75, Math.max(0.30, 0.5 + (eg - 2.5) * 0.12)), 3.5: Math.min(0.60, Math.max(0.20, 0.5 + (eg - 2.5) * 0.10)) };
  const p = isOver ? (op[line] || 0.5) : 1 - (op[line] || 0.5);
  return Math.min(8, Math.max(1.2, +(1.05 / Math.max(p, 0.01)).toFixed(2)));
};

const BADGES = [
  { id: "rookie", label: "Rookie", minLevel: 1, maxLevel: 10, color: "#94a3b8", emoji: "🌱", glow: "rgba(148,163,184,0.3)" },
  { id: "scout", label: "Scout", minLevel: 11, maxLevel: 25, color: "#60a5fa", emoji: "🔍", glow: "rgba(96,165,250,0.3)" },
  { id: "analyst", label: "Analyst", minLevel: 26, maxLevel: 50, color: "#a78bfa", emoji: "📈", glow: "rgba(167,139,250,0.3)" },
  { id: "pro", label: "Pro", minLevel: 51, maxLevel: 80, color: "#fbbf24", emoji: "⚡", glow: "rgba(251,191,36,0.3)" },
  { id: "legend", label: "Legend", minLevel: 81, maxLevel: 999, color: "#34d399", emoji: "👑", glow: "rgba(52,211,153,0.4)" },
];
const XP_PER_LEVEL = 100;
const getBadge = (level) => BADGES.find(b => level >= b.minLevel && level <= b.maxLevel) || BADGES[0];
const getLevel = (xp) => Math.floor((xp || 0) / XP_PER_LEVEL) + 1;
const getXPProgress = (xp) => (xp || 0) % XP_PER_LEVEL;

const STORE_ITEMS = [
  { id: "s2", name: "Carte cadeau Amazon 5€", cost: 50, emoji: "🛒", requiredBadge: "scout", description: "Code envoyé par email sous 48h" },
  { id: "s3", name: "Carte cadeau Foot Locker 20€", cost: 200, emoji: "👟", requiredBadge: "analyst", description: "Code envoyé par email sous 48h" },
  { id: "s4", name: "Maillot de foot officiel", cost: 900, emoji: "👕", requiredBadge: "pro", description: "Replica officielle, taille au choix" },
  { id: "s5", name: "Place VIP + rencontre joueur", cost: 2000, emoji: "🏟️", requiredBadge: "legend", description: "Experience unique sur demande" },
];
const SC_PACKS = [{ id: "sc1", sc: 10, priceEur: 1 }, { id: "sc2", sc: 50, priceEur: 5 }, { id: "sc3", sc: 100, priceEur: 10 }];
const MC_PACKS = [{ id: "mc1", mc: 50, priceEur: 5 }, { id: "mc2", mc: 100, priceEur: 10 }];
const WEEKLY_MC_LIMIT = 200;

const SPIN_SEGMENTS = [
  { label: "10 MC", value: 10, type: "mc", color: "#3b82f6" },
  { label: "20 MC", value: 20, type: "mc", color: "#8b5cf6" },
  { label: "1 SC", value: 1, type: "sc", color: "#10b981" },
  { label: "50 MC", value: 50, type: "mc", color: "#f59e0b" },
  { label: "10 MC", value: 10, type: "mc", color: "#3b82f6" },
  { label: "100 MC", value: 100, type: "mc", color: "#ef4444" },
  { label: "20 MC", value: 20, type: "mc", color: "#8b5cf6" },
  { label: "200 MC", value: 200, type: "mc", color: "#fbbf24" },
];

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
const COMPETITIONS = ["PL", "FL1", "CL", "PD", "BL1"];

const fmt = (n) => (n ?? 0).toLocaleString("fr-FR");
const fmtPct = (n) => `${Math.round(n * 100)}%`;
const timeLeft = (date) => { const diff = new Date(date) - Date.now(); if (diff < 0) return "Termine"; const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000); return d > 0 ? `${d}j ${h}h` : `${h}h`; };
const catColor = (c) => ({ "Transferts": "#60a5fa", "Contrats": "#a78bfa", "Competitions": "#fbbf24", "Recompenses": "#f472b6", "Performances": "#34d399" })[c] || "#6b7280";
const compLabel = (c) => ({ "PL": "Premier League", "FL1": "Ligue 1", "CL": "Champions League", "PD": "La Liga", "BL1": "Bundesliga" })[c] || c;
const compColor = (c) => ({ "PL": "#60a5fa", "FL1": "#ef4444", "CL": "#fbbf24", "PD": "#f97316", "BL1": "#6b7280" })[c] || "#6b7280";
const compEmoji = (c) => ({ "PL": "🏴", "FL1": "🇫🇷", "CL": "🏆", "PD": "🇪🇸", "BL1": "🇩🇪" })[c] || "⚽";
const formatMatchDate = (d) => new Date(d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const getWeekKey = () => { const d = new Date(); const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); return new Date(new Date().setDate(diff)).toISOString().split("T")[0]; };

// ============================================================
// GLOBAL CSS — Design spectaculaire
// ============================================================
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=Bebas+Neue&display=swap');
  
  * { box-sizing: border-box; margin: 0; padding: 0; }
  
  body {
    background: #030712;
    color: #f1f5f9;
    font-family: 'Space Grotesk', sans-serif;
    overflow-x: hidden;
  }

  /* Grain texture overlay */
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
    pointer-events: none;
    z-index: 999;
    opacity: 0.4;
  }

  input::placeholder { color: rgba(241,245,249,0.2); }
  input:focus { border-color: rgba(52,211,153,0.5) !important; box-shadow: 0 0 0 3px rgba(52,211,153,0.1); }
  button { font-family: 'Space Grotesk', sans-serif; }

  /* Animations */
  @keyframes slideUp { from { transform: translateX(-50%) translateY(20px); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }
  @keyframes fadeInUp { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  @keyframes floatOrb { 0%, 100% { transform: translateY(0px) scale(1); } 50% { transform: translateY(-30px) scale(1.05); } }
  @keyframes coinPop { 0% { transform: scale(0) translateY(0); opacity: 1; } 100% { transform: scale(1.5) translateY(-60px); opacity: 0; } }
  @keyframes glowPulse { 0%, 100% { box-shadow: 0 0 20px rgba(52,211,153,0.2); } 50% { box-shadow: 0 0 40px rgba(52,211,153,0.5); } }

  .page-enter { animation: fadeInUp 0.4s ease forwards; }
  .card-hover { transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
  .card-hover:hover { transform: translateY(-3px); }

  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(52,211,153,0.2); border-radius: 99px; }
`;

// ============================================================
// UI ATOMS — Version premium
// ============================================================
function MCBadge({ amount, size = "sm" }) {
  const lg = size === "lg";
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "linear-gradient(135deg,rgba(251,191,36,0.12),rgba(251,191,36,0.06))", border: "1px solid rgba(251,191,36,0.25)", borderRadius: lg ? 14 : 8, padding: lg ? "9px 16px" : "3px 10px", backdropFilter: "blur(10px)" }}>
      <span style={{ fontSize: lg ? 18 : 12 }}>🪙</span>
      <span style={{ fontWeight: 700, color: "#fbbf24", fontSize: lg ? 18 : 12, letterSpacing: -0.3 }}>{fmt(amount)} MC</span>
    </div>
  );
}

function SCBadge({ amount, size = "sm" }) {
  const lg = size === "lg";
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "linear-gradient(135deg,rgba(52,211,153,0.12),rgba(52,211,153,0.06))", border: "1px solid rgba(52,211,153,0.25)", borderRadius: lg ? 14 : 8, padding: lg ? "9px 16px" : "3px 10px", backdropFilter: "blur(10px)" }}>
      <span style={{ fontSize: lg ? 18 : 12 }}>💎</span>
      <span style={{ fontWeight: 700, color: "#34d399", fontSize: lg ? 18 : 12, letterSpacing: -0.3 }}>{fmt(amount)} SC</span>
    </div>
  );
}

function BadgeTag({ level }) {
  const badge = getBadge(level || 1);
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: badge.color, background: `${badge.color}15`, padding: "3px 10px", borderRadius: 20, border: `1px solid ${badge.color}30`, letterSpacing: 0.3, boxShadow: `0 0 12px ${badge.glow}` }}>
      {badge.emoji} {badge.label}
    </span>
  );
}

function XPBar({ xp }) {
  const level = getLevel(xp || 0), progress = getXPProgress(xp || 0), badge = getBadge(level);
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: badge.color, fontWeight: 600, letterSpacing: 0.3 }}>{badge.emoji} Niveau {level} · {badge.label}</span>
        <span style={{ fontSize: 11, color: "rgba(241,245,249,0.3)", fontFamily: "'Syne',sans-serif" }}>{progress}/{XP_PER_LEVEL} XP</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: "rgba(255,255,255,0.05)", overflow: "hidden", position: "relative" }}>
        <div style={{ width: `${(progress / XP_PER_LEVEL) * 100}%`, height: "100%", background: `linear-gradient(90deg,${badge.color}88,${badge.color})`, borderRadius: 99, transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)", boxShadow: `0 0 8px ${badge.color}` }} />
      </div>
    </div>
  );
}

function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t); }, []);
  const configs = { error: { bg: "#ef4444", icon: "✕" }, warning: { bg: "#f59e0b", icon: "!" }, success: { bg: "linear-gradient(135deg,#10b981,#059669)", icon: "✓" } };
  const c = configs[type] || configs.success;
  return (
    <div style={{ position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)", background: c.bg, color: "#fff", fontWeight: 700, padding: "14px 24px", borderRadius: 16, zIndex: 9999, fontSize: 14, boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)", whiteSpace: "nowrap", animation: "slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1)", letterSpacing: 0.2, display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>{c.icon}</span>
      {msg}
    </div>
  );
}

function ProbBar({ qYes, qNo }) {
  const p = AMM.probYes(qYes, qNo), pct = Math.round(p * 100);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#34d399", letterSpacing: 0.5 }}>OUI · {pct}%</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#f87171", letterSpacing: 0.5 }}>NON · {100 - pct}%</span>
      </div>
      <div style={{ height: 4, borderRadius: 99, background: "rgba(248,113,113,0.15)", overflow: "hidden", position: "relative" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg,#10b981,#34d399)", borderRadius: 99, transition: "width 0.6s ease", boxShadow: "0 0 8px rgba(52,211,153,0.6)" }} />
      </div>
    </div>
  );
}

// ============================================================
// SPIN WHEEL
// ============================================================
function SpinWheel({ onSpin, canSpin }) {
  const canvasRef = useRef(null);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const rotRef = useRef(0);
  const animRef = useRef(null);

  const drawWheel = useCallback((rot) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, cx = W / 2, r = W / 2 - 6;
    const segAngle = (2 * Math.PI) / SPIN_SEGMENTS.length;
    ctx.clearRect(0, 0, W, W);

    // Ombre externe
    ctx.shadowColor = "rgba(52,211,153,0.3)";
    ctx.shadowBlur = 20;

    SPIN_SEGMENTS.forEach((seg, i) => {
      const s = rot + i * segAngle, e = s + segAngle;
      ctx.beginPath(); ctx.moveTo(cx, cx); ctx.arc(cx, cx, r, s, e); ctx.closePath();
      const grad = ctx.createRadialGradient(cx, cx, 0, cx, cx, r);
      grad.addColorStop(0, seg.color + "99");
      grad.addColorStop(1, seg.color);
      ctx.fillStyle = grad; ctx.fill();
      ctx.strokeStyle = "rgba(3,7,18,0.6)"; ctx.lineWidth = 2; ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.save(); ctx.translate(cx, cx); ctx.rotate(s + segAngle / 2);
      ctx.textAlign = "right"; ctx.fillStyle = "#fff"; ctx.font = "bold 10px 'Space Grotesk',sans-serif";
      ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 4;
      ctx.fillText(seg.label, r - 10, 4); ctx.restore();
    });

    // Centre
    const centerGrad = ctx.createRadialGradient(cx, cx, 0, cx, cx, 20);
    centerGrad.addColorStop(0, "#1e293b");
    centerGrad.addColorStop(1, "#0f172a");
    ctx.beginPath(); ctx.arc(cx, cx, 20, 0, 2 * Math.PI);
    ctx.fillStyle = centerGrad; ctx.shadowColor = "rgba(52,211,153,0.4)"; ctx.shadowBlur = 10; ctx.fill();
    ctx.strokeStyle = "rgba(52,211,153,0.3)"; ctx.lineWidth = 2; ctx.stroke();

    // Fleche
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.moveTo(W - 6, cx - 10); ctx.lineTo(W + 14, cx); ctx.lineTo(W - 6, cx + 10);
    ctx.closePath(); ctx.fillStyle = "#f1f5f9"; ctx.fill();
  }, []);

  useEffect(() => { drawWheel(rotRef.current); }, [drawWheel]);

  const doSpin = () => {
    if (!canSpin || spinning) return;
    setSpinning(true); setResult(null);
    const segIdx = Math.floor(Math.random() * SPIN_SEGMENTS.length);
    const segAngle = (2 * Math.PI) / SPIN_SEGMENTS.length;
    const targetAngle = 2 * Math.PI * 8 + (2 * Math.PI - segIdx * segAngle - segAngle / 2);
    const startRot = rotRef.current, startTime = performance.now(), duration = 4500;
    const animate = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      rotRef.current = startRot + targetAngle * ease;
      drawWheel(rotRef.current);
      if (progress < 1) { animRef.current = requestAnimationFrame(animate); }
      else { setSpinning(false); setResult(SPIN_SEGMENTS[segIdx]); onSpin(SPIN_SEGMENTS[segIdx]); }
    };
    animRef.current = requestAnimationFrame(animate);
  };
  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current); }, []);

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ position: "relative", display: "inline-block", marginBottom: 16 }}>
        <canvas ref={canvasRef} width={220} height={220} style={{ display: "block", filter: canSpin ? "drop-shadow(0 0 20px rgba(52,211,153,0.2))" : "grayscale(0.8) opacity(0.5)" }} />
      </div>
      {result && (
        <div style={{ marginBottom: 14, padding: "10px 20px", background: result.type === "sc" ? "linear-gradient(135deg,rgba(52,211,153,0.15),rgba(52,211,153,0.05))" : "linear-gradient(135deg,rgba(251,191,36,0.15),rgba(251,191,36,0.05))", border: `1px solid ${result.type === "sc" ? "rgba(52,211,153,0.3)" : "rgba(251,191,36,0.3)"}`, borderRadius: 12, display: "inline-block", animation: "fadeIn 0.4s ease" }}>
          <span style={{ fontWeight: 800, fontSize: 18, color: result.type === "sc" ? "#34d399" : "#fbbf24", fontFamily: "'Syne',sans-serif" }}>+{result.value} {result.type === "sc" ? "💎 SC" : "🪙 MC"}</span>
        </div>
      )}
      <button onClick={doSpin} disabled={!canSpin || spinning}
        style={{ display: "block", width: "100%", padding: "12px 0", borderRadius: 12, border: "none", background: canSpin && !spinning ? "linear-gradient(135deg,#f59e0b,#d97706)" : "rgba(255,255,255,0.04)", color: canSpin && !spinning ? "#fff" : "rgba(241,245,249,0.2)", fontWeight: 700, cursor: canSpin && !spinning ? "pointer" : "not-allowed", fontSize: 14, letterSpacing: 0.5, transition: "all 0.2s", boxShadow: canSpin && !spinning ? "0 4px 20px rgba(245,158,11,0.3)" : "none" }}>
        {spinning ? "En cours..." : canSpin ? "TOURNER LA ROUE" : "Reviens demain"}
      </button>
    </div>
  );
}

// ============================================================
// AUTH PAGE — Design premium
// ============================================================
function AuthPage({ onAuth }) {
  const [mode, setMode] = useState("login"), [email, setEmail] = useState(""), [password, setPassword] = useState(""), [username, setUsername] = useState(""), [loading, setLoading] = useState(false), [error, setError] = useState("");

  const submit = async () => {
    setError(""); setLoading(true);
    try {
      if (mode === "signup") {
        if (!username.trim()) { setError("Pseudo requis"); setLoading(false); return; }
        if (password.length < 6) { setError("Mot de passe trop court"); setLoading(false); return; }
        const data = await authReq("signup", { email, password, data: { username } });
        if (data.user) { const ld = await authReq("token?grant_type=password", { email, password }); onAuth(ld.access_token, ld.user); }
      } else { const data = await authReq("token?grant_type=password", { email, password }); onAuth(data.access_token, data.user); }
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const inp = { width: "100%", padding: "13px 16px", background: "rgba(241,245,249,0.04)", border: "1px solid rgba(241,245,249,0.08)", borderRadius: 12, color: "#f1f5f9", fontSize: 15, outline: "none", boxSizing: "border-box", fontFamily: "'Space Grotesk',sans-serif", transition: "all 0.2s" };

  return (
    <div style={{ minHeight: "100vh", background: "#030712", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, position: "relative", overflow: "hidden" }}>
      {/* Orbs de fond */}
      <div style={{ position: "fixed", top: "10%", left: "20%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(52,211,153,0.06),transparent 70%)", animation: "floatOrb 8s ease-in-out infinite", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "5%", right: "15%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle,rgba(96,165,250,0.05),transparent 70%)", animation: "floatOrb 10s ease-in-out infinite reverse", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 1, animation: "fadeInUp 0.5s ease" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 72, height: 72, background: "linear-gradient(135deg,#10b981,#3b82f6)", borderRadius: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 18px", boxShadow: "0 20px 60px rgba(16,185,129,0.3), 0 0 0 1px rgba(52,211,153,0.2)" }}>⚽</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 42, fontWeight: 800, letterSpacing: -1, color: "#f1f5f9" }}>MARKET<span style={{ color: "#34d399" }}>BALL</span></div>
          <div style={{ fontSize: 13, color: "rgba(241,245,249,0.35)", marginTop: 6, letterSpacing: 0.5 }}>Predictions football · 100% gratuit</div>
        </div>

        {/* Card */}
        <div style={{ background: "rgba(241,245,249,0.02)", border: "1px solid rgba(241,245,249,0.06)", borderRadius: 24, padding: "32px 28px", backdropFilter: "blur(20px)", boxShadow: "0 40px 80px rgba(0,0,0,0.4)" }}>
          {/* Tabs */}
          <div style={{ display: "flex", background: "rgba(241,245,249,0.03)", borderRadius: 14, padding: 4, marginBottom: 28 }}>
            {["login", "signup"].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                style={{ flex: 1, padding: "10px 0", borderRadius: 11, border: "none", background: mode === m ? "rgba(52,211,153,0.12)" : "transparent", color: mode === m ? "#34d399" : "rgba(241,245,249,0.35)", fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all 0.2s", letterSpacing: 0.3 }}>
                {m === "login" ? "Connexion" : "Inscription"}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mode === "signup" && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(241,245,249,0.4)", display: "block", marginBottom: 8, letterSpacing: 1, textTransform: "uppercase" }}>Pseudo</label>
                <input value={username} onChange={e => setUsername(e.target.value)} placeholder="MonPseudo" style={inp} />
              </div>
            )}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(241,245,249,0.4)", display: "block", marginBottom: 8, letterSpacing: 1, textTransform: "uppercase" }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(241,245,249,0.4)", display: "block", marginBottom: 8, letterSpacing: 1, textTransform: "uppercase" }}>Mot de passe</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && submit()} style={inp} />
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 14, padding: "12px 16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 12, color: "#f87171", fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
              <span>⚠</span> {error}
            </div>
          )}

          <button onClick={submit} disabled={loading}
            style={{ width: "100%", marginTop: 22, padding: "14px 0", borderRadius: 13, border: "none", background: loading ? "rgba(241,245,249,0.04)" : "linear-gradient(135deg,#10b981,#059669)", color: loading ? "rgba(241,245,249,0.2)" : "#fff", fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", letterSpacing: 0.5, transition: "all 0.2s", boxShadow: loading ? "none" : "0 8px 30px rgba(16,185,129,0.3)" }}>
            {loading ? "Chargement..." : mode === "login" ? "SE CONNECTER" : "CREER MON COMPTE"}
          </button>
        </div>

        <div style={{ marginTop: 18, textAlign: "center", fontSize: 13, color: "rgba(241,245,249,0.3)" }}>
          Demarrez avec <span style={{ color: "#fbbf24", fontWeight: 700 }}>500 🪙 MC</span> gratuits !
        </div>
      </div>
      <style>{GLOBAL_CSS}</style>
    </div>
  );
}

// ============================================================
// MARKET CARD — Premium
// ============================================================
function MarketCard({ market, onBet }) {
  const [hover, setHover] = useState(false);
  const p = AMM.probYes(market.q_yes, market.q_no), cc = catColor(market.category);
  const pct = Math.round(p * 100);

  return (
    <div className="card-hover" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: hover ? "rgba(241,245,249,0.04)" : "rgba(241,245,249,0.02)", border: `1px solid ${hover ? "rgba(52,211,153,0.15)" : "rgba(241,245,249,0.06)"}`, borderRadius: 20, padding: "22px", position: "relative", overflow: "hidden", boxShadow: hover ? "0 20px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(52,211,153,0.05)" : "0 4px 20px rgba(0,0,0,0.2)", cursor: "default" }}>
      {/* Bande colorée en haut */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${cc},transparent)` }} />
      {/* Lueur de fond au hover */}
      {hover && <div style={{ position: "absolute", top: -50, right: -50, width: 150, height: 150, borderRadius: "50%", background: `radial-gradient(circle,${cc}08,transparent 70%)`, pointerEvents: "none" }} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ flex: 1, paddingRight: 12 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: cc, background: `${cc}12`, padding: "3px 10px", borderRadius: 20, border: `1px solid ${cc}20`, letterSpacing: 0.5 }}>{market.category}</span>
            <span style={{ fontSize: 10, color: "rgba(241,245,249,0.3)", padding: "3px 0", display: "flex", alignItems: "center", gap: 3 }}>⏱ {timeLeft(market.closes_at)}</span>
          </div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, color: "#f1f5f9", lineHeight: 1.45, marginBottom: 4 }}>{market.title}</div>
          <div style={{ fontSize: 11, color: "rgba(241,245,249,0.3)", letterSpacing: 0.3 }}>{market.source}</div>
        </div>
        {/* Probabilité circulaire */}
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 38, fontWeight: 800, lineHeight: 1, color: pct > 50 ? "#34d399" : "#f87171", letterSpacing: -2 }}>{pct}<span style={{ fontSize: 18 }}>%</span></div>
          <div style={{ fontSize: 9, color: "rgba(241,245,249,0.25)", letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>OUI</div>
        </div>
      </div>

      <ProbBar qYes={market.q_yes} qNo={market.q_no} />

      <div style={{ display: "flex", gap: 16, margin: "14px 0 16px" }}>
        <div>
          <div style={{ fontSize: 9, color: "rgba(241,245,249,0.25)", marginBottom: 3, letterSpacing: 1, textTransform: "uppercase" }}>Volume</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24" }}>🪙 {fmt(market.total_volume)}</div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: "rgba(241,245,249,0.25)", marginBottom: 3, letterSpacing: 1, textTransform: "uppercase" }}>Joueurs</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>{fmt(market.participants)}</div>
        </div>
      </div>

      <button onClick={() => onBet(market)}
        style={{ width: "100%", padding: "11px 0", borderRadius: 12, border: `1px solid ${hover ? "rgba(52,211,153,0.3)" : "rgba(241,245,249,0.08)"}`, background: hover ? "rgba(52,211,153,0.08)" : "transparent", color: hover ? "#34d399" : "rgba(241,245,249,0.5)", fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.2s", letterSpacing: 0.3 }}>
        PREDIRE →
      </button>
    </div>
  );
}

// ============================================================
// MATCH CARD — Premium avec cotes
// ============================================================
function MatchCard({ match, onBet }) {
  const [hover, setHover] = useState(false);
  const [imgErr, setImgErr] = useState({});
  const cc = compColor(match.competition);
  const isLive = match.status === "IN_PLAY" || match.status === "PAUSED";
  const isFinished = match.status === "FINISHED";
  const odds = calcMatchOdds(match);

  const Logo = ({ logo, name, side }) => {
    if (logo && !imgErr[side]) return <img src={logo} alt={name} style={{ width: 40, height: 40, objectFit: "contain", display: "block", margin: "0 auto 8px", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.4))" }} onError={() => setImgErr(e => ({ ...e, [side]: true }))} />;
    const init = name ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?";
    return <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${cc}20`, border: `2px solid ${cc}40`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px", fontWeight: 800, fontSize: 12, color: cc, fontFamily: "'Syne',sans-serif" }}>{init}</div>;
  };

  return (
    <div className="card-hover" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: hover ? "rgba(241,245,249,0.04)" : "rgba(241,245,249,0.02)", border: `1px solid ${isLive ? "rgba(239,68,68,0.25)" : hover ? "rgba(52,211,153,0.12)" : "rgba(241,245,249,0.06)"}`, borderRadius: 20, padding: "20px", position: "relative", overflow: "hidden", boxShadow: hover ? "0 20px 40px rgba(0,0,0,0.3)" : "0 4px 20px rgba(0,0,0,0.15)" }}>

      {isLive && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,#ef4444,#f87171,transparent)", animation: "pulse 2s ease-in-out infinite" }} />}
      {!isLive && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${cc},transparent)` }} />}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: cc, background: `${cc}12`, padding: "3px 10px", borderRadius: 20, border: `1px solid ${cc}20`, letterSpacing: 0.3 }}>{compEmoji(match.competition)} {compLabel(match.competition)}</span>
        {isLive ? <span style={{ fontSize: 10, fontWeight: 800, color: "#ef4444", display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", display: "inline-block", animation: "pulse 1s infinite" }} />EN DIRECT</span>
          : isFinished ? <span style={{ fontSize: 10, color: "rgba(241,245,249,0.25)" }}>Termine</span>
          : <span style={{ fontSize: 10, color: "rgba(241,245,249,0.3)" }}>{formatMatchDate(match.match_date)}</span>}
      </div>

      {/* Teams */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ flex: 1, textAlign: "center" }}>
          <Logo logo={match.home_logo} name={match.home_team} side="home" />
          <div style={{ fontWeight: 700, fontSize: 12, color: "#f1f5f9", fontFamily: "'Syne',sans-serif" }}>{match.home_team}</div>
        </div>
        <div style={{ textAlign: "center", padding: "0 10px" }}>
          {(isLive || isFinished)
            ? <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 32, fontWeight: 800, color: "#f1f5f9", letterSpacing: -2 }}>{match.home_score ?? 0}<span style={{ color: "rgba(241,245,249,0.2)", margin: "0 4px" }}>-</span>{match.away_score ?? 0}</div>
            : <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: "rgba(241,245,249,0.2)", letterSpacing: 2 }}>VS</div>}
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <Logo logo={match.away_logo} name={match.away_team} side="away" />
          <div style={{ fontWeight: 700, fontSize: 12, color: "#f1f5f9", fontFamily: "'Syne',sans-serif" }}>{match.away_team}</div>
        </div>
      </div>

      {/* Cotes */}
      {!isFinished && (
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {[
            { l: "1", o: odds.oddsHome, c: "#34d399" },
            { l: "X", o: odds.oddsDraw, c: "#94a3b8" },
            { l: "2", o: odds.oddsAway, c: "#f87171" },
          ].map(item => (
            <div key={item.l} style={{ flex: 1, textAlign: "center", background: "rgba(241,245,249,0.03)", border: "1px solid rgba(241,245,249,0.06)", borderRadius: 10, padding: "7px 0" }}>
              <div style={{ fontSize: 9, color: "rgba(241,245,249,0.3)", marginBottom: 2, letterSpacing: 1 }}>{item.l}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: item.c, fontFamily: "'Syne',sans-serif" }}>{item.o}</div>
            </div>
          ))}
        </div>
      )}

      {!isFinished && (
        <button onClick={() => onBet(match)}
          style={{ width: "100%", padding: "11px 0", borderRadius: 12, border: `1px solid ${hover ? "rgba(52,211,153,0.3)" : "rgba(241,245,249,0.08)"}`, background: hover ? "rgba(52,211,153,0.08)" : "transparent", color: hover ? "#34d399" : "rgba(241,245,249,0.5)", fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.2s", letterSpacing: 0.3 }}>
          PARIER →
        </button>
      )}
    </div>
  );
}

// ============================================================
// BET MODAL — Premium
// ============================================================
function BetModal({ market, onClose, onConfirm, coins }) {
  const [side, setSide] = useState("yes"), [amount, setAmount] = useState(50);
  const pYes = AMM.probYes(market.q_yes, market.q_no);
  const cost = AMM.costToBuy(market.q_yes, market.q_no, amount, side);
  const gain = side === "yes" ? Math.round(amount / pYes) : Math.round(amount / (1 - pYes));
  const canBet = cost >= 1 && cost <= coins;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(3,7,18,0.9)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(20px)", animation: "fadeIn 0.2s ease" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "linear-gradient(135deg,rgba(241,245,249,0.05),rgba(241,245,249,0.02))", border: "1px solid rgba(241,245,249,0.08)", borderRadius: 24, padding: 30, width: 390, maxWidth: "95vw", boxShadow: "0 60px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(52,211,153,0.05)", backdropFilter: "blur(30px)", animation: "fadeInUp 0.3s ease" }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, letterSpacing: -0.5, marginBottom: 6 }}>Placer une prediction</div>
        <div style={{ fontSize: 13, color: "rgba(241,245,249,0.4)", marginBottom: 22, lineHeight: 1.5 }}>{market.title}</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {["yes", "no"].map(s => (
            <button key={s} onClick={() => setSide(s)}
              style={{ flex: 1, padding: "13px 0", borderRadius: 13, border: `2px solid ${side === s ? (s === "yes" ? "#34d399" : "#f87171") : "rgba(241,245,249,0.07)"}`, background: side === s ? (s === "yes" ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)") : "transparent", color: side === s ? (s === "yes" ? "#34d399" : "#f87171") : "rgba(241,245,249,0.3)", fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all 0.2s", letterSpacing: 0.3 }}>
              {s === "yes" ? `OUI · ${fmtPct(pYes)}` : `NON · ${fmtPct(1 - pYes)}`}
            </button>
          ))}
        </div>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(241,245,249,0.35)", marginBottom: 8, letterSpacing: 1, textTransform: "uppercase" }}>Parts a acheter</div>
          <input type="number" value={amount} min={1} max={1000} onChange={e => setAmount(Math.max(1, Math.min(1000, +e.target.value || 1)))}
            style={{ width: "100%", padding: "12px 16px", background: "rgba(241,245,249,0.04)", border: "1px solid rgba(241,245,249,0.08)", borderRadius: 12, color: "#f1f5f9", fontSize: 22, fontWeight: 800, outline: "none", boxSizing: "border-box", fontFamily: "'Syne',sans-serif" }} />
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {[10, 50, 100, 200].map(v => <button key={v} onClick={() => setAmount(v)} style={{ flex: 1, padding: "7px 0", borderRadius: 9, border: "1px solid rgba(241,245,249,0.07)", background: amount === v ? "rgba(52,211,153,0.1)" : "transparent", color: amount === v ? "#34d399" : "rgba(241,245,249,0.4)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>{v}</button>)}
          </div>
        </div>
        <div style={{ background: "rgba(241,245,249,0.02)", border: "1px solid rgba(241,245,249,0.06)", borderRadius: 13, padding: "14px 16px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span style={{ fontSize: 13, color: "rgba(241,245,249,0.35)" }}>Cout</span><MCBadge amount={cost} /></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 13, color: "rgba(241,245,249,0.35)" }}>Gain potentiel</span><span style={{ fontWeight: 800, fontSize: 18, color: "#fbbf24", fontFamily: "'Syne',sans-serif" }}>🪙 +{fmt(gain)}</span></div>
        </div>
        <button onClick={() => canBet && onConfirm(side, amount, cost, gain)} disabled={!canBet}
          style={{ width: "100%", padding: "14px 0", borderRadius: 13, border: "none", background: canBet ? "linear-gradient(135deg,#10b981,#059669)" : "rgba(241,245,249,0.04)", color: canBet ? "#fff" : "rgba(241,245,249,0.2)", fontWeight: 700, fontSize: 15, cursor: canBet ? "pointer" : "not-allowed", letterSpacing: 0.3, transition: "all 0.2s", boxShadow: canBet ? "0 8px 30px rgba(16,185,129,0.3)" : "none" }}>
          {!canBet && coins < cost ? "Pas assez de MC" : "CONFIRMER →"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// MATCH BET MODAL — Premium avec vrais joueurs
// ============================================================
function MatchBetModal({ match, onClose, onConfirm, coins }) {
  const [betType, setBetType] = useState("winner"), [prediction, setPrediction] = useState(""), [amount, setAmount] = useState(100);
  const [scorerTeam, setScorerTeam] = useState("home"), [homePlayers, setHomePlayers] = useState([]), [awayPlayers, setAwayPlayers] = useState([]), [loadingPlayers, setLoadingPlayers] = useState(false);
  const [homeGoals, setHomeGoals] = useState(1), [awayGoals, setAwayGoals] = useState(1);
  const odds = calcMatchOdds(match);

  useEffect(() => {
    if (!match.home_team_id && !match.away_team_id) return;
    setLoadingPlayers(true);
    Promise.all([match.home_team_id ? squadReq(match.home_team_id) : Promise.resolve(null), match.away_team_id ? squadReq(match.away_team_id) : Promise.resolve(null)])
      .then(([hD, aD]) => {
        if (hD?.squad) setHomePlayers(hD.squad.filter(p => ["Forward", "Midfielder"].includes(p.position)).map(p => p.name).slice(0, 12) || hD.squad.map(p => p.name).slice(0, 10));
        if (aD?.squad) setAwayPlayers(aD.squad.filter(p => ["Forward", "Midfielder"].includes(p.position)).map(p => p.name).slice(0, 12) || aD.squad.map(p => p.name).slice(0, 10));
      }).catch(() => {}).finally(() => setLoadingPlayers(false));
  }, [match.home_team_id, match.away_team_id]);

  const currentPlayers = scorerTeam === "home" ? homePlayers : awayPlayers;
  const getOdds = () => {
    if (betType === "winner") { if (prediction === match.home_team) return odds.oddsHome; if (prediction === "Nul") return odds.oddsDraw; if (prediction === match.away_team) return odds.oddsAway; return 2; }
    if (betType === "exact_score") return calcExactScoreOdds(homeGoals, awayGoals, odds);
    if (betType === "first_scorer") return prediction ? calcScorerOdds(prediction, true) : 5;
    if (betType === "scorer") return prediction ? calcScorerOdds(prediction, false) : 3;
    if (betType === "over_under") { const line = prediction.includes("1.5") ? 1.5 : prediction.includes("3.5") ? 3.5 : 2.5; return calcOverUnderOdds(line, prediction.startsWith("Plus"), odds); }
    return 2;
  };
  const currentOdds = getOdds();
  const gain = Math.round(amount * currentOdds);
  const finalPred = betType === "exact_score" ? `${homeGoals}-${awayGoals}` : prediction;
  const canBet = finalPred && amount >= 10 && amount <= coins;

  const BET_TYPES = [
    { id: "winner", label: "🏆 Vainqueur", desc: "1X2" },
    { id: "exact_score", label: "🎯 Score exact", desc: "Poisson" },
    { id: "first_scorer", label: "⚽ 1er buteur", desc: "x5 max" },
    { id: "scorer", label: "🥅 Buteur", desc: "x3 max" },
    { id: "over_under", label: "📊 +/- buts", desc: "Over/Under" },
  ];

  const renderInputs = () => {
    if (betType === "winner") return (
      <div style={{ display: "flex", gap: 8 }}>
        {[{ l: match.home_team, o: odds.oddsHome, c: "#34d399" }, { l: "Nul", o: odds.oddsDraw, c: "#94a3b8" }, { l: match.away_team, o: odds.oddsAway, c: "#f87171" }].map(opt => (
          <button key={opt.l} onClick={() => setPrediction(opt.l)}
            style={{ flex: 1, padding: "11px 4px", borderRadius: 12, border: `2px solid ${prediction === opt.l ? opt.c : "rgba(241,245,249,0.07)"}`, background: prediction === opt.l ? `${opt.c}10` : "transparent", color: prediction === opt.l ? opt.c : "rgba(241,245,249,0.4)", fontWeight: 700, fontSize: 10, cursor: "pointer", transition: "all 0.2s" }}>
            <div>{opt.l}</div>
            <div style={{ fontSize: 15, fontWeight: 800, marginTop: 2, fontFamily: "'Syne',sans-serif" }}>x{opt.o}</div>
          </button>
        ))}
      </div>
    );
    if (betType === "exact_score") return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "center", marginBottom: 12 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "rgba(241,245,249,0.3)", marginBottom: 6, letterSpacing: 0.5 }}>{match.home_team}</div>
            <input type="number" min={0} max={15} value={homeGoals} onChange={e => setHomeGoals(Math.max(0, Math.min(15, +e.target.value)))}
              style={{ width: 64, padding: "10px", background: "rgba(241,245,249,0.04)", border: "1px solid rgba(241,245,249,0.1)", borderRadius: 12, color: "#f1f5f9", fontSize: 24, fontWeight: 800, outline: "none", textAlign: "center", fontFamily: "'Syne',sans-serif" }} />
          </div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 28, color: "rgba(241,245,249,0.2)", marginTop: 16 }}>—</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "rgba(241,245,249,0.3)", marginBottom: 6, letterSpacing: 0.5 }}>{match.away_team}</div>
            <input type="number" min={0} max={15} value={awayGoals} onChange={e => setAwayGoals(Math.max(0, Math.min(15, +e.target.value)))}
              style={{ width: 64, padding: "10px", background: "rgba(241,245,249,0.04)", border: "1px solid rgba(241,245,249,0.1)", borderRadius: 12, color: "#f1f5f9", fontSize: 24, fontWeight: 800, outline: "none", textAlign: "center", fontFamily: "'Syne',sans-serif" }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[[1,0],[2,0],[2,1],[1,1],[0,1],[0,2],[3,1],[3,0]].map(([h,a]) => {
            const o = calcExactScoreOdds(h, a, odds), sel = homeGoals === h && awayGoals === a;
            return <button key={`${h}-${a}`} onClick={() => { setHomeGoals(h); setAwayGoals(a); }} style={{ padding: "5px 10px", borderRadius: 8, border: `1px solid ${sel ? "#34d399" : "rgba(241,245,249,0.07)"}`, background: sel ? "rgba(52,211,153,0.1)" : "transparent", color: sel ? "#34d399" : "rgba(241,245,249,0.4)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{h}-{a} <span style={{ color: "#fbbf24" }}>x{o}</span></button>;
          })}
        </div>
      </div>
    );
    if (betType === "first_scorer" || betType === "scorer") return (
      <div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          {["home", "away"].map(t => <button key={t} onClick={() => { setScorerTeam(t); setPrediction(""); }} style={{ flex: 1, padding: "8px", borderRadius: 10, border: `1px solid ${scorerTeam === t ? "#34d399" : "rgba(241,245,249,0.07)"}`, background: scorerTeam === t ? "rgba(52,211,153,0.08)" : "transparent", color: scorerTeam === t ? "#34d399" : "rgba(241,245,249,0.35)", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>{t === "home" ? match.home_team : match.away_team}</button>)}
        </div>
        {loadingPlayers ? <div style={{ textAlign: "center", padding: 20, color: "rgba(241,245,249,0.3)", fontSize: 13 }}>Chargement des joueurs...</div>
          : currentPlayers.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, maxHeight: 200, overflowY: "auto" }}>
              {currentPlayers.map(p => { const o = calcScorerOdds(p, betType === "first_scorer"); return <button key={p} onClick={() => setPrediction(p)} style={{ padding: "8px 10px", borderRadius: 10, border: `1px solid ${prediction === p ? "#34d399" : "rgba(241,245,249,0.06)"}`, background: prediction === p ? "rgba(52,211,153,0.1)" : "rgba(241,245,249,0.02)", color: prediction === p ? "#34d399" : "rgba(241,245,249,0.55)", fontWeight: 600, fontSize: 11, cursor: "pointer", display: "flex", justifyContent: "space-between", transition: "all 0.15s" }}><span>{p}</span><span style={{ color: "#fbbf24", fontSize: 10 }}>x{o}</span></button>; })}
            </div>
          ) : <div style={{ fontSize: 12, color: "rgba(241,245,249,0.25)", textAlign: "center", padding: 16 }}>Joueurs non disponibles</div>}
      </div>
    );
    if (betType === "over_under") return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {[{ l: "Plus de 1.5", ln: 1.5, ov: true }, { l: "Moins de 1.5", ln: 1.5, ov: false }, { l: "Plus de 2.5", ln: 2.5, ov: true }, { l: "Moins de 2.5", ln: 2.5, ov: false }, { l: "Plus de 3.5", ln: 3.5, ov: true }, { l: "Moins de 3.5", ln: 3.5, ov: false }].map(opt => {
          const o = calcOverUnderOdds(opt.ln, opt.ov, odds), sel = prediction === opt.l;
          return <button key={opt.l} onClick={() => setPrediction(opt.l)} style={{ flex: "1 1 45%", padding: "10px 10px", borderRadius: 11, border: `2px solid ${sel ? "#fbbf24" : "rgba(241,245,249,0.07)"}`, background: sel ? "rgba(251,191,36,0.1)" : "transparent", color: sel ? "#fbbf24" : "rgba(241,245,249,0.4)", fontWeight: 700, fontSize: 11, cursor: "pointer", display: "flex", justifyContent: "space-between", transition: "all 0.2s" }}><span>{opt.l} buts</span><span style={{ fontWeight: 800, fontSize: 13, fontFamily: "'Syne',sans-serif" }}>x{o}</span></button>;
        })}
      </div>
    );
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(3,7,18,0.9)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(20px)", padding: 16, animation: "fadeIn 0.2s ease" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "linear-gradient(135deg,rgba(241,245,249,0.05),rgba(241,245,249,0.02))", border: "1px solid rgba(241,245,249,0.08)", borderRadius: 24, padding: 24, width: 440, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 60px 120px rgba(0,0,0,0.6)", backdropFilter: "blur(30px)", animation: "fadeInUp 0.3s ease" }}>
        {/* Header équipes */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 18, background: "rgba(241,245,249,0.03)", border: "1px solid rgba(241,245,249,0.06)", borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ textAlign: "center", flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Syne',sans-serif" }}>{match.home_team}</div><div style={{ fontSize: 12, color: "#34d399", fontWeight: 700, marginTop: 2 }}>x{odds.oddsHome}</div></div>
          <div style={{ padding: "0 14px", textAlign: "center" }}><div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, color: "rgba(241,245,249,0.2)", fontWeight: 800 }}>VS</div><div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>x{odds.oddsDraw}</div></div>
          <div style={{ textAlign: "center", flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Syne',sans-serif" }}>{match.away_team}</div><div style={{ fontSize: 12, color: "#f87171", fontWeight: 700, marginTop: 2 }}>x{odds.oddsAway}</div></div>
        </div>

        {/* Types */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 16 }}>
          {BET_TYPES.map(t => <button key={t.id} onClick={() => { setBetType(t.id); setPrediction(""); setScorerTeam("home"); }} style={{ padding: "10px 12px", borderRadius: 11, border: `2px solid ${betType === t.id ? "#34d399" : "rgba(241,245,249,0.06)"}`, background: betType === t.id ? "rgba(52,211,153,0.08)" : "transparent", color: betType === t.id ? "#34d399" : "rgba(241,245,249,0.35)", fontWeight: 700, fontSize: 11, cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}><div>{t.label}</div><div style={{ fontSize: 9, fontWeight: 400, opacity: 0.6, marginTop: 1 }}>{t.desc}</div></button>)}
        </div>

        <div style={{ marginBottom: 16 }}>{renderInputs()}</div>

        <input type="number" value={amount} min={10} max={coins} onChange={e => setAmount(Math.max(10, Math.min(coins, +e.target.value || 10)))}
          style={{ width: "100%", padding: "12px 14px", background: "rgba(241,245,249,0.04)", border: "1px solid rgba(241,245,249,0.08)", borderRadius: 12, color: "#f1f5f9", fontSize: 20, fontWeight: 800, outline: "none", boxSizing: "border-box", marginBottom: 8, fontFamily: "'Syne',sans-serif" }} />
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {[50, 100, 200, 500].map(v => <button key={v} onClick={() => setAmount(Math.min(v, coins))} style={{ flex: 1, padding: "7px 0", borderRadius: 9, border: "1px solid rgba(241,245,249,0.07)", background: amount === v ? "rgba(52,211,153,0.1)" : "transparent", color: amount === v ? "#34d399" : "rgba(241,245,249,0.4)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>{v}</button>)}
        </div>

        <div style={{ background: "rgba(241,245,249,0.02)", border: "1px solid rgba(241,245,249,0.06)", borderRadius: 13, padding: "12px 14px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: 13, color: "rgba(241,245,249,0.35)" }}>Prediction</span><span style={{ fontWeight: 700, fontSize: 13 }}>{finalPred || "—"}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: 13, color: "rgba(241,245,249,0.35)" }}>Cote</span><span style={{ fontWeight: 800, color: "#fbbf24", fontSize: 16, fontFamily: "'Syne',sans-serif" }}>x{currentOdds}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 13, color: "rgba(241,245,249,0.35)" }}>Gain potentiel</span><span style={{ fontWeight: 800, fontSize: 18, color: "#34d399", fontFamily: "'Syne',sans-serif" }}>+{fmt(gain)} 🪙</span></div>
        </div>

        <button onClick={() => canBet && onConfirm(match, betType, finalPred, amount, gain, currentOdds)} disabled={!canBet}
          style={{ width: "100%", padding: "14px 0", borderRadius: 13, border: "none", background: canBet ? "linear-gradient(135deg,#10b981,#059669)" : "rgba(241,245,249,0.04)", color: canBet ? "#fff" : "rgba(241,245,249,0.2)", fontWeight: 700, fontSize: 15, cursor: canBet ? "pointer" : "not-allowed", letterSpacing: 0.3, transition: "all 0.2s", boxShadow: canBet ? "0 8px 30px rgba(16,185,129,0.3)" : "none" }}>
          {!finalPred ? "Choisir une prediction" : coins < amount ? "Pas assez de MC" : "CONFIRMER →"}
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
  const level = getLevel(profile?.xp || 0), badge = getBadge(level);

  return (
    <div className="page-enter">
      {/* Hero card */}
      <div style={{ background: "linear-gradient(135deg,rgba(16,185,129,0.08),rgba(59,130,246,0.05),rgba(139,92,246,0.04))", border: "1px solid rgba(52,211,153,0.12)", borderRadius: 24, padding: "28px", marginBottom: 24, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle,${badge.glow},transparent 70%)`, pointerEvents: "none" }} />
        <div style={{ fontSize: 11, fontWeight: 700, color: "#34d399", letterSpacing: 3, marginBottom: 10, textTransform: "uppercase" }}>Bienvenue, {username?.toUpperCase()}</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}><BadgeTag level={level} /><span style={{ fontSize: 11, color: "rgba(241,245,249,0.35)" }}>Niv. {level} · {profile?.xp || 0} XP</span></div>
        <XPBar xp={profile?.xp || 0} />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
          <MCBadge amount={coins} size="lg" />
          <SCBadge amount={sc} size="lg" />
        </div>
      </div>

      {upcoming.length > 0 && (<>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, letterSpacing: -0.5, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 3, height: 18, background: "#34d399", borderRadius: 99, display: "inline-block" }} />
          Matchs a venir
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 11, marginBottom: 14 }}>{upcoming.map(m => <MatchCard key={m.id} match={m} onBet={onMatchBet} />)}</div>
        <button onClick={() => onNavigate("matches")} style={{ width: "100%", marginBottom: 28, padding: "12px 0", borderRadius: 12, border: "1px solid rgba(241,245,249,0.07)", background: "transparent", color: "rgba(241,245,249,0.35)", fontWeight: 600, cursor: "pointer", fontSize: 13, letterSpacing: 0.3, transition: "all 0.2s" }}>Voir tous les matchs →</button>
      </>)}

      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, letterSpacing: -0.5, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 3, height: 18, background: "#60a5fa", borderRadius: 99, display: "inline-block" }} />
        Marches en vedette
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 11 }}>{markets.slice(0, 4).map(m => <MarketCard key={m.id} market={m} onBet={onBet} />)}</div>
      <button onClick={() => onNavigate("markets")} style={{ width: "100%", marginTop: 14, padding: "12px 0", borderRadius: 12, border: "1px solid rgba(241,245,249,0.07)", background: "transparent", color: "rgba(241,245,249,0.35)", fontWeight: 600, cursor: "pointer", fontSize: 13, letterSpacing: 0.3 }}>Voir tous les marches →</button>
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
    <div className="page-enter">
      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: -1, marginBottom: 6 }}>Matchs</div>
      <div style={{ fontSize: 13, color: "rgba(241,245,249,0.35)", marginBottom: 20 }}>Cotes dynamiques · 5 types de paris</div>
      <div style={{ display: "flex", gap: 7, marginBottom: 22, flexWrap: "wrap" }}>
        {allComps.map(c => <button key={c} onClick={() => setComp(c)} style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${comp === c ? compColor(c) : "rgba(241,245,249,0.07)"}`, background: comp === c ? `${compColor(c)}12` : "transparent", color: comp === c ? compColor(c) : "rgba(241,245,249,0.35)", fontWeight: 600, fontSize: 12, cursor: "pointer", transition: "all 0.2s", letterSpacing: 0.3 }}>{c === "Tous" ? "Tous" : `${compEmoji(c)} ${compLabel(c)}`}</button>)}
      </div>
      {loading && <div style={{ textAlign: "center", padding: 60, color: "rgba(241,245,249,0.25)" }}>Chargement...</div>}
      {!loading && upcoming.length === 0 && finished.length === 0 && <div style={{ textAlign: "center", padding: 60, color: "rgba(241,245,249,0.25)" }}>Aucun match disponible</div>}
      {upcoming.length > 0 && <><div style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#34d399", letterSpacing: 0.5 }}>A VENIR ET EN DIRECT</div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 11, marginBottom: 28 }}>{upcoming.map(m => <MatchCard key={m.id} match={m} onBet={onBet} />)}</div></>}
      {finished.length > 0 && <><div style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, marginBottom: 12, color: "rgba(241,245,249,0.3)", letterSpacing: 0.5 }}>TERMINES</div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 11 }}>{finished.map(m => <MatchCard key={m.id} match={m} onBet={onBet} />)}</div></>}
    </div>
  );
}

function MarketsPage({ markets, onBet }) {
  const [cat, setCat] = useState("Tous");
  const cats = ["Tous", ...new Set(markets.map(m => m.category))];
  const filtered = cat === "Tous" ? markets : markets.filter(m => m.category === cat);
  return (
    <div className="page-enter">
      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: -1, marginBottom: 6 }}>Marches de prediction</div>
      <div style={{ fontSize: 13, color: "rgba(241,245,249,0.35)", marginBottom: 20 }}>{markets.length} marches actifs</div>
      <div style={{ display: "flex", gap: 7, marginBottom: 22, flexWrap: "wrap" }}>
        {cats.map(c => <button key={c} onClick={() => setCat(c)} style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${cat === c ? catColor(c) : "rgba(241,245,249,0.07)"}`, background: cat === c ? `${catColor(c)}12` : "transparent", color: cat === c ? catColor(c) : "rgba(241,245,249,0.35)", fontWeight: 600, fontSize: 12, cursor: "pointer", transition: "all 0.2s", letterSpacing: 0.3 }}>{c}</button>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 11 }}>{filtered.map(m => <MarketCard key={m.id} market={m} onBet={onBet} />)}</div>
    </div>
  );
}

function WalletPage({ coins, sc, bets, matchBets, profile, onSpin, onWatchAd, onConvertSC }) {
  const [convertAmount, setConvertAmount] = useState(10);
  const lastSpin = profile?.last_spin ? new Date(profile.last_spin).getTime() : 0;
  const canSpin = Date.now() - lastSpin > 86400000;
  const today = new Date().toISOString().split("T")[0];
  const adsToday = profile?.ads_reset_date === today ? (profile?.ads_watched_today || 0) : 0;
  const canAd = adsToday < 3;
  const weekKey = getWeekKey();
  const weeklyPurchased = profile?.weekly_reset_date === weekKey ? (profile?.weekly_mc_purchased || 0) : 0;
  const remainingLimit = WEEKLY_MC_LIMIT - weeklyPurchased;

  return (
    <div className="page-enter">
      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: -1, marginBottom: 20 }}>Wallet</div>

      {/* Soldes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
        {[
          { label: "MARKETCOINS", value: coins, color: "#fbbf24", icon: "🪙", desc: "Pour jouer" },
          { label: "STORECOINS", value: sc, color: "#34d399", icon: "💎", desc: "Pour les recompenses" },
        ].map(item => (
          <div key={item.label} style={{ background: `linear-gradient(135deg,rgba(241,245,249,0.04),rgba(241,245,249,0.01))`, border: "1px solid rgba(241,245,249,0.07)", borderRadius: 18, padding: "20px", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: `radial-gradient(circle,${item.color}15,transparent 70%)` }} />
            <div style={{ fontSize: 10, color: "rgba(241,245,249,0.3)", fontWeight: 600, letterSpacing: 1.5, marginBottom: 8, textTransform: "uppercase" }}>{item.label}</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 34, fontWeight: 800, color: item.color, letterSpacing: -1 }}>{fmt(item.value)}</div>
            <div style={{ fontSize: 11, color: "rgba(241,245,249,0.2)", marginTop: 4 }}>{item.desc}</div>
          </div>
        ))}
      </div>

      {/* Conversion */}
      <div style={{ background: "rgba(96,165,250,0.04)", border: "1px solid rgba(96,165,250,0.1)", borderRadius: 16, padding: "18px 20px", marginBottom: 16 }}>
        <div style={{ fontWeight: 700, color: "#60a5fa", marginBottom: 4, fontSize: 14 }}>💱 Convertir SC → MC</div>
        <div style={{ fontSize: 12, color: "rgba(241,245,249,0.3)", marginBottom: 12 }}>1 SC = 1 MC · {remainingLimit} MC disponibles cette semaine</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="number" value={convertAmount} min={1} max={Math.min(sc, remainingLimit)} onChange={e => setConvertAmount(Math.max(1, Math.min(sc, remainingLimit, +e.target.value || 1)))}
            style={{ flex: 1, padding: "9px 12px", background: "rgba(241,245,249,0.04)", border: "1px solid rgba(241,245,249,0.08)", borderRadius: 10, color: "#f1f5f9", fontSize: 15, fontWeight: 700, outline: "none", fontFamily: "'Space Grotesk',sans-serif" }} />
          <button onClick={() => sc >= convertAmount && remainingLimit >= convertAmount && onConvertSC(convertAmount)} disabled={sc < convertAmount || remainingLimit <= 0}
            style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: sc >= convertAmount && remainingLimit > 0 ? "linear-gradient(135deg,#3b82f6,#2563eb)" : "rgba(241,245,249,0.04)", color: sc >= convertAmount && remainingLimit > 0 ? "#fff" : "rgba(241,245,249,0.2)", fontWeight: 700, cursor: "pointer", fontSize: 13, whiteSpace: "nowrap", boxShadow: sc >= convertAmount && remainingLimit > 0 ? "0 4px 15px rgba(59,130,246,0.3)" : "none" }}>
            Convertir →
          </button>
        </div>
      </div>

      {/* Roue */}
      <div style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.1)", borderRadius: 18, padding: "22px", marginBottom: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 15 }}>🎡 Roue quotidienne</div>
        <div style={{ fontSize: 12, color: "rgba(241,245,249,0.3)", marginBottom: 18 }}>200 MC ou 1 SC par jour !</div>
        <SpinWheel onSpin={onSpin} canSpin={canSpin} />
      </div>

      {/* Pub */}
      <div style={{ background: "rgba(96,165,250,0.04)", border: "1px solid rgba(96,165,250,0.1)", borderRadius: 16, padding: "18px 20px", marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div><div style={{ fontWeight: 700, marginBottom: 2, fontSize: 14 }}>📺 Pub recompensee</div><div style={{ fontSize: 12, color: "rgba(241,245,249,0.3)" }}>+20 MC · {adsToday}/3 aujourd'hui</div></div>
          <button onClick={() => canAd && onWatchAd()} disabled={!canAd} style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: canAd ? "linear-gradient(135deg,#3b82f6,#2563eb)" : "rgba(241,245,249,0.04)", color: canAd ? "#fff" : "rgba(241,245,249,0.2)", fontWeight: 700, cursor: canAd ? "pointer" : "not-allowed", fontSize: 13, boxShadow: canAd ? "0 4px 15px rgba(59,130,246,0.3)" : "none" }}>{canAd ? "REGARDER" : "Limite"}</button>
        </div>
        <div style={{ height: 3, background: "rgba(96,165,250,0.1)", borderRadius: 99, overflow: "hidden" }}><div style={{ width: `${(adsToday / 3) * 100}%`, height: "100%", background: "linear-gradient(90deg,#3b82f6,#60a5fa)", borderRadius: 99, transition: "width 0.5s" }} /></div>
      </div>

      {/* Paris */}
      {(bets.length > 0 || matchBets.length > 0) && (<>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, letterSpacing: -0.5, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 3, height: 18, background: "#fbbf24", borderRadius: 99, display: "inline-block" }} />
          Mes paris
        </div>
        {[...matchBets.map(b => ({ ...b, isMatch: true })), ...bets].slice(0, 10).map((b, i) => (
          <div key={i} style={{ background: "rgba(241,245,249,0.02)", border: "1px solid rgba(241,245,249,0.05)", borderRadius: 14, padding: "14px 18px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3, fontFamily: "'Syne',sans-serif" }}>{b.market_title || b.match_title || "Paris"}</div>
              <div style={{ fontSize: 12, color: "rgba(241,245,249,0.3)" }}><span style={{ color: "#34d399", fontWeight: 700 }}>{b.side || b.prediction}</span>{" · "}{fmt(b.cost)} MC</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, padding: "3px 9px", borderRadius: 20, background: "rgba(251,191,36,0.1)", color: "#fbbf24", fontWeight: 700, marginBottom: 4, display: "inline-block" }}>En cours</div>
              <div style={{ fontWeight: 800, color: "#34d399", fontSize: 14, fontFamily: "'Syne',sans-serif" }}>+{fmt(b.potential_gain)}</div>
            </div>
          </div>
        ))}
      </>)}
    </div>
  );
}

function LeaderboardPage({ leaderboard, username }) {
  const medals = ["🥈", "🥇", "🥉"];
  const topColors = ["#94a3b8", "#fbbf24", "#cd7f32"];

  return (
    <div className="page-enter">
      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: -1, marginBottom: 6 }}>Classement</div>
      <div style={{ fontSize: 13, color: "rgba(241,245,249,0.35)", marginBottom: 8 }}>Gains MC issus des paris uniquement</div>
      <div style={{ background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.1)", borderRadius: 12, padding: "10px 14px", marginBottom: 22, fontSize: 12, color: "rgba(241,245,249,0.35)" }}>
        Roue et pubs ne comptent pas — seuls tes paris font la difference !
      </div>

      {/* Podium */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24, alignItems: "flex-end" }}>
        {[leaderboard[1], leaderboard[0], leaderboard[2]].map((p, vi) => {
          if (!p) return <div key={vi} style={{ flex: 1 }} />;
          const hs = [120, 155, 100], badge = getBadge(getLevel(p.xp || 0));
          return (
            <div key={p.username} style={{ flex: 1, background: `linear-gradient(135deg,${topColors[vi]}0d,transparent)`, border: `1px solid ${topColors[vi]}20`, borderRadius: 16, padding: "14px 10px", textAlign: "center", height: hs[vi], display: "flex", flexDirection: "column", justifyContent: "flex-end", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", fontSize: 18 }}>{medals[vi]}</div>
              <BadgeTag level={getLevel(p.xp || 0)} />
              <div style={{ fontWeight: 700, fontSize: 12, color: "#f1f5f9", marginBottom: 2, marginTop: 6, fontFamily: "'Syne',sans-serif" }}>{p.username}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: topColors[vi], fontFamily: "'Syne',sans-serif" }}>+{fmt(p.total_profit || 0)}</div>
            </div>
          );
        })}
      </div>

      {leaderboard.map((p, i) => (
        <div key={p.username} style={{ background: p.username === username ? "rgba(52,211,153,0.04)" : "rgba(241,245,249,0.02)", border: `1px solid ${p.username === username ? "rgba(52,211,153,0.12)" : "rgba(241,245,249,0.04)"}`, borderRadius: 14, padding: "13px 18px", marginBottom: 6, display: "flex", alignItems: "center", gap: 12, transition: "all 0.2s" }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: i < 3 ? `linear-gradient(135deg,${topColors[i]},${topColors[i]}88)` : "rgba(241,245,249,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, flexShrink: 0, color: i < 3 ? "#000" : "rgba(241,245,249,0.4)", fontFamily: "'Syne',sans-serif" }}>{i + 1}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
              <span style={{ fontWeight: 700, color: p.username === username ? "#34d399" : "#f1f5f9", fontSize: 13, fontFamily: "'Syne',sans-serif" }}>{p.username}</span>
              <BadgeTag level={getLevel(p.xp || 0)} />
              {p.username === username && <span style={{ fontSize: 10, color: "#34d399" }}>(Vous)</span>}
            </div>
            <div style={{ fontSize: 11, color: "rgba(241,245,249,0.25)" }}>{p.total_wins}/{p.total_bets} paris · Niv. {getLevel(p.xp || 0)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#34d399", fontFamily: "'Syne',sans-serif" }}>+{fmt(p.total_profit || 0)}</div>
            <div style={{ fontSize: 10, color: "rgba(241,245,249,0.25)" }}>gain total</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StorePage({ coins, sc, profile, onRedeemSC, onBuySC, onBuyMC }) {
  const level = getLevel(profile?.xp || 0), userBadge = getBadge(level);
  const badgeOrder = ["rookie", "scout", "analyst", "pro", "legend"];
  const canAccess = (req) => badgeOrder.indexOf(req) <= badgeOrder.indexOf(userBadge.id);
  return (
    <div className="page-enter">
      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: -1, marginBottom: 6 }}>Store</div>
      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}><MCBadge amount={coins} size="lg" /><SCBadge amount={sc} size="lg" /><BadgeTag level={level} /></div>

      {/* SC Packs */}
      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, letterSpacing: -0.5, marginBottom: 12, color: "#34d399", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 3, height: 16, background: "#34d399", borderRadius: 99, display: "inline-block" }} />
        Acheter des StoreCoins
      </div>
      <div style={{ fontSize: 12, color: "rgba(241,245,249,0.3)", marginBottom: 14 }}>1€ = 1 StoreCoin · Utilisables pour les recompenses</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 10, marginBottom: 28 }}>
        {SC_PACKS.map(p => (
          <div key={p.id} className="card-hover" style={{ background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.1)", borderRadius: 16, padding: "18px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>💎</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#34d399", marginBottom: 2, fontFamily: "'Syne',sans-serif" }}>{p.sc} SC</div>
            <div style={{ fontSize: 12, color: "rgba(241,245,249,0.3)", marginBottom: 14 }}>{p.priceEur}€</div>
            <button onClick={() => onBuySC(p)} style={{ width: "100%", padding: "8px 0", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", boxShadow: "0 4px 15px rgba(16,185,129,0.25)" }}>Acheter</button>
          </div>
        ))}
      </div>

      {/* MC Packs */}
      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, letterSpacing: -0.5, marginBottom: 12, color: "#fbbf24", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 3, height: 16, background: "#fbbf24", borderRadius: 99, display: "inline-block" }} />
        Acheter des MarketCoins
      </div>
      <div style={{ fontSize: 12, color: "rgba(241,245,249,0.3)", marginBottom: 14 }}>1€ = 10 MC · Limite 200 MC/semaine</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 10, marginBottom: 28 }}>
        {MC_PACKS.map(p => (
          <div key={p.id} className="card-hover" style={{ background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.1)", borderRadius: 16, padding: "18px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🪙</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#fbbf24", marginBottom: 2, fontFamily: "'Syne',sans-serif" }}>{p.mc} MC</div>
            <div style={{ fontSize: 12, color: "rgba(241,245,249,0.3)", marginBottom: 14 }}>{p.priceEur}€</div>
            <button onClick={() => onBuyMC(p)} style={{ width: "100%", padding: "8px 0", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", boxShadow: "0 4px 15px rgba(245,158,11,0.25)" }}>Acheter</button>
          </div>
        ))}
      </div>

      {/* Recompenses */}
      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, letterSpacing: -0.5, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 3, height: 16, background: "#a78bfa", borderRadius: 99, display: "inline-block" }} />
        Recompenses
      </div>
      <div style={{ fontSize: 12, color: "rgba(241,245,249,0.3)", marginBottom: 16 }}>Badge requis pour acceder aux recompenses</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 11 }}>
        {STORE_ITEMS.map(r => {
          const accessible = canAccess(r.requiredBadge), affordable = sc >= r.cost, reqBadge = BADGES.find(b => b.id === r.requiredBadge);
          return (
            <div key={r.id} className="card-hover" style={{ background: accessible ? "rgba(241,245,249,0.02)" : "rgba(241,245,249,0.01)", border: `1px solid ${accessible ? "rgba(241,245,249,0.06)" : "rgba(241,245,249,0.03)"}`, borderRadius: 18, padding: "20px 18px", display: "flex", flexDirection: "column", gap: 10, opacity: accessible ? 1 : 0.5 }}>
              <div style={{ fontSize: 34 }}>{r.emoji}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, fontFamily: "'Syne',sans-serif" }}>{r.name}</div>
                <div style={{ fontSize: 12, color: "rgba(241,245,249,0.3)", marginBottom: 8 }}>{r.description}</div>
                <span style={{ fontSize: 10, fontWeight: 700, color: reqBadge?.color, background: `${reqBadge?.color}15`, padding: "3px 9px", borderRadius: 20, border: `1px solid ${reqBadge?.color}25`, boxShadow: `0 0 8px ${reqBadge?.glow}` }}>{reqBadge?.emoji} {reqBadge?.label} requis</span>
              </div>
              <div style={{ flex: 1 }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <SCBadge amount={r.cost} />
                <button onClick={() => accessible && affordable && onRedeemSC(r)} disabled={!accessible || !affordable}
                  style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: accessible && affordable ? "linear-gradient(135deg,#10b981,#059669)" : "rgba(241,245,249,0.04)", color: accessible && affordable ? "#fff" : "rgba(241,245,249,0.2)", fontWeight: 700, fontSize: 12, cursor: accessible && affordable ? "pointer" : "not-allowed", boxShadow: accessible && affordable ? "0 4px 15px rgba(16,185,129,0.25)" : "none" }}>
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
  const level = getLevel(profile?.xp || 0), badge = getBadge(level);
  const wr = profile?.total_bets > 0 ? Math.round((profile.total_wins / profile.total_bets) * 100) : 0;
  return (
    <div className="page-enter">
      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: -1, marginBottom: 20 }}>Mon profil</div>

      {/* Card profil */}
      <div style={{ background: `linear-gradient(135deg,${badge.glow},rgba(241,245,249,0.02))`, border: `1px solid ${badge.color}20`, borderRadius: 22, padding: "24px", marginBottom: 18, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: `radial-gradient(circle,${badge.glow},transparent 70%)` }} />
        <div style={{ display: "flex", gap: 18, alignItems: "center", marginBottom: 16 }}>
          <div style={{ width: 68, height: 68, borderRadius: 20, background: `linear-gradient(135deg,${badge.color},${badge.color}66)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, flexShrink: 0, boxShadow: `0 8px 30px ${badge.glow}` }}>{badge.emoji}</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 20, fontFamily: "'Syne',sans-serif", letterSpacing: -0.5 }}>{username}</div>
            <div style={{ marginTop: 4 }}><BadgeTag level={level} /></div>
            <div style={{ fontSize: 12, color: "rgba(241,245,249,0.35)", marginTop: 6 }}>Niveau {level} · {profile?.xp || 0} XP total</div>
          </div>
        </div>
        <XPBar xp={profile?.xp || 0} />
        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}><MCBadge amount={profile?.coins || 0} /><SCBadge amount={profile?.store_coins || 0} /></div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 18 }}>
        {[{ label: "Paris", val: profile?.total_bets || 0, color: "#60a5fa" }, { label: "Wins", val: profile?.total_wins || 0, color: "#34d399" }, { label: "Precision", val: `${wr}%`, color: "#a78bfa" }].map(s => (
          <div key={s.label} style={{ background: "rgba(241,245,249,0.02)", border: "1px solid rgba(241,245,249,0.05)", borderRadius: 14, padding: "18px 10px", textAlign: "center" }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 28, fontWeight: 800, color: s.color, letterSpacing: -1 }}>{s.val}</div>
            <div style={{ fontSize: 10, color: "rgba(241,245,249,0.25)", fontWeight: 600, letterSpacing: 1, marginTop: 3, textTransform: "uppercase" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Badges */}
      <div style={{ background: "rgba(241,245,249,0.02)", border: "1px solid rgba(241,245,249,0.05)", borderRadius: 16, padding: "18px 20px", marginBottom: 18 }}>
        <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 14, fontFamily: "'Syne',sans-serif" }}>Progression des badges</div>
        {BADGES.map(b => (
          <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: b.color, background: `${b.color}12`, padding: "3px 10px", borderRadius: 20, border: `1px solid ${b.color}25`, minWidth: 90, textAlign: "center", boxShadow: level >= b.minLevel ? `0 0 10px ${b.glow}` : "none" }}>{b.emoji} {b.label}</span>
            <span style={{ fontSize: 11, color: "rgba(241,245,249,0.35)" }}>Niv. {b.minLevel}{b.maxLevel === 999 ? "+" : `–${b.maxLevel}`}</span>
            {level >= b.minLevel && <span style={{ fontSize: 12, color: b.color }}>✓</span>}
          </div>
        ))}
      </div>

      <div style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.08)", borderRadius: 12, padding: "13px 16px", marginBottom: 20, fontSize: 12, color: "rgba(241,245,249,0.35)", lineHeight: 1.6 }}>
        Les MarketCoins n'ont <strong style={{ color: "rgba(241,245,249,0.6)" }}>aucune valeur monetaire</strong>.
      </div>
      <button onClick={onLogout} style={{ width: "100%", padding: "13px 0", borderRadius: 13, border: "1px solid rgba(239,68,68,0.15)", background: "rgba(239,68,68,0.04)", color: "#f87171", fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all 0.2s", letterSpacing: 0.3 }}>
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
      const data = await req("profiles?select=id,username,coins,store_coins,xp,level,total_wins,total_bets,total_profit&order=total_profit.desc&limit=10", { _token: token || SUPABASE_KEY });
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
          const data = await fetch(`/api/matches?competition=${comp}`).then(r => r.json());
          if (data?.matches) {
            const now = new Date();
            const mapped = data.matches
              .filter(m => { const d = new Date(m.utcDate); return d >= new Date(now - 3 * 86400000) && d <= new Date(now.getTime() + 30 * 86400000); })
              .map(m => ({ id: m.id.toString(), home_team: m.homeTeam.shortName || m.homeTeam.name, away_team: m.awayTeam.shortName || m.awayTeam.name, home_logo: m.homeTeam.crest, away_logo: m.awayTeam.crest, home_team_id: m.homeTeam.id, away_team_id: m.awayTeam.id, competition: comp, match_date: m.utcDate, status: m.status, home_score: m.score?.fullTime?.home, away_score: m.score?.fullTime?.away }));
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
        const saved = loadSavedOdds(), seeds = BASE_MARKETS.map(m => ({ ...m, ...(saved[m.id] || {}), status: "open" }));
        setMarkets([...data.map(r => ({ id: r.rumor_id, title: r.event_question || `${r.player_name} → ${r.to_club} ?`, q_yes: 100, q_no: 100, total_volume: 500, participants: 10, closes_at: r.expires_at || new Date(Date.now() + 14 * 86400000).toISOString(), category: "Transferts", source: r.source_name || "Source", status: "open" })), ...seeds]);
      }
    } catch {}
  }, []);

  const loadProfile = useCallback(async (token, userId) => {
    try {
      const data = await req(`profiles?id=eq.${userId}&select=*`, { _token: token });
      if (data?.[0]) { setProfile(data[0]); }
      else {
        const np = { id: userId, coins: 500, store_coins: 0, xp: 0, level: 1, total_bets: 0, total_wins: 0, total_profit: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        try { await req("profiles", { method: "POST", _token: token, body: JSON.stringify(np) }); } catch {}
        setProfile(np);
      }
    } catch {}
  }, []);

  const loadBets = useCallback(async (t, u) => { try { const d = await req(`user_bets?user_id=eq.${u}&select=*&order=created_at.desc&limit=20`, { _token: t }); if (d) setBets(d); } catch {} }, []);
  const loadMatchBets = useCallback(async (t, u) => { try { const d = await req(`match_bets?user_id=eq.${u}&select=*&order=created_at.desc&limit=20`, { _token: t }); if (d) setMatchBets(d); } catch {} }, []);

  useEffect(() => { loadMarkets(); loadMatches(); }, []);

  const handleAuth = async (token, user) => {
    setSession({ token, user });
    await loadProfile(token, user.id);
    await loadBets(token, user.id);
    await loadMatchBets(token, user.id);
    await loadLeaderboard(token);
  };

  const updateProfile = async (updates, token, userId) => {
    try { await req(`profiles?id=eq.${userId}`, { method: "PATCH", _token: token, body: JSON.stringify({ ...updates, updated_at: new Date().toISOString() }) }); } catch {}
    setProfile(p => ({ ...p, ...updates }));
  };

  const handleBetConfirm = async (side, amount, cost, gain) => {
    if (!session) return;
    const newCoins = (profile?.coins || 0) - cost;
    if (newCoins < 0) { showToast("Pas assez de MC !", "error"); return; }
    const newXP = (profile?.xp || 0) + 5, newLevel = getLevel(newXP);
    try {
      await req("user_bets", { method: "POST", _token: session.token, body: JSON.stringify({ user_id: session.user.id, market_id: betModal.id, market_title: betModal.title, side, amount, cost, potential_gain: gain, status: "pending" }) });
      const upd = markets.map(m => m.id === betModal.id ? { ...m, q_yes: side === "yes" ? m.q_yes + amount : m.q_yes, q_no: side === "no" ? m.q_no + amount : m.q_no, total_volume: m.total_volume + cost, participants: m.participants + 1 } : m);
      setMarkets(upd); saveOdds(upd);
      setBets(prev => [{ market_id: betModal.id, market_title: betModal.title, side, amount, cost, potential_gain: gain, status: "pending" }, ...prev]);
      await updateProfile({ coins: newCoins, xp: newXP, level: newLevel, total_bets: (profile?.total_bets || 0) + 1 }, session.token, session.user.id);
      setBetModal(null);
      showToast(`Prediction placee ! +5 XP 🌱`);
      await loadLeaderboard(session.token);
    } catch (e) { showToast(`Erreur : ${e.message}`, "error"); }
  };

  const handleMatchBetConfirm = async (match, betType, prediction, amount, gain) => {
    if (!session) return;
    const newCoins = (profile?.coins || 0) - amount;
    if (newCoins < 0) { showToast("Pas assez de MC !", "error"); return; }
    const newXP = (profile?.xp || 0) + 5, newLevel = getLevel(newXP);
    try {
      await req("match_bets", { method: "POST", _token: session.token, body: JSON.stringify({ user_id: session.user.id, match_id: null, match_title: `${match.home_team} vs ${match.away_team}`, bet_type: betType, prediction, cost: amount, potential_gain: gain, status: "pending" }) });
      setMatchBets(prev => [{ match_title: `${match.home_team} vs ${match.away_team}`, bet_type: betType, prediction, cost: amount, potential_gain: gain, status: "pending" }, ...prev]);
      await updateProfile({ coins: newCoins, xp: newXP, level: newLevel, total_bets: (profile?.total_bets || 0) + 1 }, session.token, session.user.id);
      setMatchBetModal(null);
      showToast(`Pari place ! +5 XP ⚡`);
      await loadLeaderboard(session.token);
    } catch (e) { showToast(`Erreur : ${e.message}`, "error"); }
  };

  const handleSpin = async (segment) => {
    if (!session) return;
    const updates = { last_spin: new Date().toISOString() };
    if (segment.type === "mc") updates.coins = (profile?.coins || 0) + segment.value;
    else updates.store_coins = (profile?.store_coins || 0) + segment.value;
    await updateProfile(updates, session.token, session.user.id);
    showToast(`+${segment.value} ${segment.type === "sc" ? "💎 SC" : "🪙 MC"} gagnes !`);
  };

  const handleWatchAd = async () => {
    if (!session) return;
    const today = new Date().toISOString().split("T")[0];
    const adsToday = profile?.ads_reset_date === today ? (profile?.ads_watched_today || 0) + 1 : 1;
    await updateProfile({ coins: (profile?.coins || 0) + 20, ads_watched_today: adsToday, ads_reset_date: today }, session.token, session.user.id);
    showToast("+20 MC gagnes !");
  };

  const handleRedeemSC = async (reward) => {
    if (!session || (profile?.store_coins || 0) < reward.cost) { showToast("Pas assez de SC !", "error"); return; }
    await updateProfile({ store_coins: (profile?.store_coins || 0) - reward.cost }, session.token, session.user.id);
    showToast(`${reward.emoji} ${reward.name} obtenu !`);
  };

  const handleBuySC = async (pack) => {
    if (!session) return;
    await updateProfile({ store_coins: (profile?.store_coins || 0) + pack.sc }, session.token, session.user.id);
    showToast(`💎 +${pack.sc} SC ! (simulation)`);
  };

  const handleBuyMC = async (pack) => {
    if (!session) return;
    const wk = getWeekKey(), wp = profile?.weekly_reset_date === wk ? (profile?.weekly_mc_purchased || 0) : 0;
    if (wp + pack.mc > WEEKLY_MC_LIMIT) { showToast("Limite hebdo !", "error"); return; }
    await updateProfile({ coins: (profile?.coins || 0) + pack.mc, weekly_mc_purchased: wp + pack.mc, weekly_reset_date: wk }, session.token, session.user.id);
    showToast(`🪙 +${pack.mc} MC ! (simulation)`);
  };

  const handleConvertSC = async (amount) => {
    if (!session) return;
    const wk = getWeekKey(), wp = profile?.weekly_reset_date === wk ? (profile?.weekly_mc_purchased || 0) : 0;
    if (wp + amount > WEEKLY_MC_LIMIT) { showToast("Limite hebdo !", "error"); return; }
    if ((profile?.store_coins || 0) < amount) { showToast("Pas assez de SC !", "error"); return; }
    await updateProfile({ coins: (profile?.coins || 0) + amount, store_coins: (profile?.store_coins || 0) - amount, weekly_mc_purchased: wp + amount, weekly_reset_date: wk }, session.token, session.user.id);
    showToast(`${amount} SC → ${amount} MC !`);
  };

  const handleLogout = async () => {
    try { await authReq("logout", {}); } catch {}
    setSession(null); setProfile(null); setBets([]); setMatchBets([]);
  };

  const coins = profile?.coins ?? 500, sc = profile?.store_coins ?? 0;
  const username = profile?.username || session?.user?.user_metadata?.username || session?.user?.email?.split("@")[0] || "Joueur";

  const NAV = [
    { id: "home", icon: "⚡", label: "Accueil" },
    { id: "matches", icon: "⚽", label: "Matchs" },
    { id: "markets", icon: "📊", label: "Marches" },
    { id: "wallet", icon: "💰", label: "Wallet" },
    { id: "leaderboard", icon: "🏆", label: "Top" },
    { id: "store", icon: "🎁", label: "Store" },
    { id: "profile", icon: "👤", label: "Profil" },
  ];

  if (!session) return <AuthPage onAuth={handleAuth} />;

  return (
    <div style={{ minHeight: "100vh", background: "#030712", fontFamily: "'Space Grotesk',sans-serif", color: "#f1f5f9" }}>
      <style>{GLOBAL_CSS}</style>

      {/* Orbs de fond animés */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "5%", left: "15%", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle,rgba(16,185,129,0.035),transparent 65%)", animation: "floatOrb 12s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "10%", right: "10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(59,130,246,0.025),transparent 65%)", animation: "floatOrb 15s ease-in-out infinite reverse" }} />
        <div style={{ position: "absolute", top: "50%", right: "30%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,0.02),transparent 65%)", animation: "floatOrb 10s ease-in-out infinite 2s" }} />
      </div>

      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 200, background: "rgba(3,7,18,0.85)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(241,245,249,0.05)" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#10b981,#3b82f6)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, boxShadow: "0 4px 15px rgba(16,185,129,0.3)" }}>⚽</div>
            <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 19, fontWeight: 800, letterSpacing: -0.5 }}>MARKET<span style={{ color: "#34d399" }}>BALL</span></span>
          </div>

          {/* Nav */}
          <nav style={{ display: "flex", gap: 1 }}>
            {NAV.slice(0, 6).map(n => (
              <button key={n.id} onClick={() => setPage(n.id)}
                style={{ padding: "6px 10px", borderRadius: 8, border: "none", background: page === n.id ? "rgba(52,211,153,0.1)" : "transparent", color: page === n.id ? "#34d399" : "rgba(241,245,249,0.35)", fontWeight: 600, fontSize: 11, cursor: "pointer", transition: "all 0.2s", letterSpacing: 0.2, borderBottom: page === n.id ? "2px solid #34d399" : "2px solid transparent" }}>
                {n.icon} {n.label}
              </button>
            ))}
          </nav>

          {/* Soldes + profil */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button onClick={() => setPage("profile")} style={{ padding: "5px 10px", borderRadius: 8, border: "none", background: "transparent", color: "rgba(241,245,249,0.3)", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>👤 {username}</button>
            <div style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.15)", borderRadius: 8, padding: "4px 10px" }}>
              <span style={{ fontWeight: 700, color: "#fbbf24", fontSize: 11 }}>🪙 {fmt(coins)}</span>
            </div>
            <div style={{ background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.15)", borderRadius: 8, padding: "4px 10px" }}>
              <span style={{ fontWeight: 700, color: "#34d399", fontSize: 11 }}>💎 {fmt(sc)}</span>
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
        {page === "leaderboard" && <LeaderboardPage leaderboard={leaderboard.length ? leaderboard : [{ rank: 1, username, coins, xp: profile?.xp || 0, total_wins: profile?.total_wins || 0, total_bets: profile?.total_bets || 0, win_rate: 0, total_profit: 0 }]} username={username} />}
        {page === "store" && <StorePage coins={coins} sc={sc} profile={profile} onRedeemSC={handleRedeemSC} onBuySC={handleBuySC} onBuyMC={handleBuyMC} />}
        {page === "profile" && <ProfilePage profile={profile} username={username} onLogout={handleLogout} />}
      </div>

      {/* Bottom nav */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(3,7,18,0.92)", backdropFilter: "blur(24px)", borderTop: "1px solid rgba(241,245,249,0.05)", display: "flex", zIndex: 200 }}>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setPage(n.id)}
            style={{ flex: 1, padding: "10px 0", background: "transparent", border: "none", color: page === n.id ? "#34d399" : "rgba(241,245,249,0.25)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, transition: "all 0.2s", borderTop: page === n.id ? "2px solid #34d399" : "2px solid transparent" }}>
            <span style={{ fontSize: 17 }}>{n.icon}</span>
            <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>{n.label}</span>
          </button>
        ))}
      </div>

      {betModal && <BetModal market={betModal} coins={coins} onClose={() => setBetModal(null)} onConfirm={handleBetConfirm} />}
      {matchBetModal && <MatchBetModal match={matchBetModal} coins={coins} onClose={() => setMatchBetModal(null)} onConfirm={handleMatchBetConfirm} />}
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
