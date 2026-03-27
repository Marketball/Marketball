import { useState, useEffect, useCallback, useRef } from "react";

const SUPABASE_URL = "https://aiesvzdvlownkcjbkgjv.supabase.co";
const SUPABASE_KEY = "sb_publishable_Ipu5bJO_zD1ckygwQmpcuw_Tl5xWmyK";

const req = async (path, opts = {}) => {
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

const authReq = async (path, body) => {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, { method: "POST", headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || "Erreur auth");
  return data;
};

const squadReq = async (teamId) => { const res = await fetch(`/api/squad?teamId=${teamId}`); if (!res.ok) throw new Error("Erreur squad"); return res.json(); };

// ============================================================
// AMM
// ============================================================
const AMM = {
  probYes: (qY, qN) => { const eY = Math.exp(Math.min(qY,500) / 100), eN = Math.exp(Math.min(qN,500) / 100); return Math.max(0.02, Math.min(0.98, eY / (eY + eN))); },
  costToBuy: (qY, qN, shares, side) => {
    const b = 100;
    const qYc=Math.min(qY,500), qNc=Math.min(qN,500);
    const before = b * Math.log(Math.exp(qYc / b) + Math.exp(qNc / b));
    const after = side === "yes" ? b * Math.log(Math.exp((qYc + shares) / b) + Math.exp(qNc / b)) : b * Math.log(Math.exp(qYc / b) + Math.exp((qNc + shares) / b));
    return Math.max(1, Math.round(after - before));
  },
  // Cashout : valeur actuelle des parts selon les cotes du moment
  cashoutValue: (qY, qN, shares, side) => {
    const p = AMM.probYes(qY, qN);
    const currentProb = side === "yes" ? p : 1 - p;
    return Math.max(1, Math.round(shares * currentProb * 0.95)); // 5% frais cashout
  },
};

// ============================================================
// COTES DYNAMIQUES
// ============================================================
const calcMatchOdds = (match) => {
  const BIG = ["Real Madrid","Barcelona","Bayern","Man City","PSG","Liverpool","Arsenal","Chelsea","Inter","Juventus","Atletico","Dortmund","Man United","Tottenham","Newcastle"];
  const MED = ["Monaco","Lyon","Marseille","Sevilla","Villarreal","Napoli","Roma","Lazio","Leverkusen","RB Leipzig","Aston Villa","West Ham","Benfica","Porto","Ajax","Celtic","Feyenoord"];
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

const calcScorerOdds = (player, isFirst, position) => {
  // Utilise la position API si disponible, sinon fallback sur le nom
  const pos = position || "";
  const isFwd = pos.includes("Forward") || pos.includes("Centre-Forward") || pos.includes("Winger") || pos.includes("Striker");
  const isMid = pos.includes("Midfield") && !pos.includes("Defensive");
  const isDef = pos.includes("Back") || pos.includes("Defensive") || pos.includes("Goalkeeper") || pos.includes("Keeper");

  // Fallback noms connus si pas de position
  const TOP = ["Haaland","Kane","Mbappe","Salah","Vinicius","Lewandowski","Lautaro","Vlahovic","Osimhen","Guirassy","Watkins","Isak"];
  const isTopName = TOP.some(a => player?.includes(a));

  let pScore;
  if (isTopName) pScore = 0.52;
  else if (isFwd) pScore = 0.35;
  else if (isMid) pScore = 0.18;
  else if (isDef) pScore = 0.05;
  else pScore = 0.22; // inconnu = attaquant probable vu le filtrage

  const pFirst = isFirst ? pScore / 4.0 : pScore;
  return Math.min(isFirst ? 35 : 15, Math.max(isFirst ? 2.5 : 1.4, +((1.05 / Math.max(pFirst, 0.02))).toFixed(1)));
};

const calcOverUnderOdds = (line, isOver, odds) => {
  const eg = odds.pHome * 2.2 + odds.pAway * 1.8 + 0.8 * 1.1;
  const op = { 1.5: Math.min(0.85, Math.max(0.45, 0.5 + (eg - 2.5) * 0.15)), 2.5: Math.min(0.75, Math.max(0.30, 0.5 + (eg - 2.5) * 0.12)), 3.5: Math.min(0.60, Math.max(0.20, 0.5 + (eg - 2.5) * 0.10)) };
  const p = isOver ? (op[line] || 0.5) : 1 - (op[line] || 0.5);
  return Math.min(8, Math.max(1.2, +(1.05 / Math.max(p, 0.01)).toFixed(2)));
};

// ============================================================
// RESOLUTION DES PARIS MATCHS
// ============================================================
const resolveBet = (bet, matchResult) => {
  const { bet_type, prediction } = bet;
  const { homeScore, awayScore, homeTeam, awayTeam, scorers } = matchResult;
  // Ne pas resoudre si le match n'est pas termine ou scores invalides
  if (homeScore === null || homeScore === undefined || awayScore === null || awayScore === undefined) return false;
  if (bet_type === "winner") {
    const winner = homeScore > awayScore ? homeTeam : awayScore > homeScore ? awayTeam : "Nul";
    return prediction === winner;
  }
  if (bet_type === "exact_score") return prediction === `${homeScore}-${awayScore}`;
  if (bet_type === "first_scorer") {
    const first = scorers?.[0]?.name || scorers?.[0]?.scorer?.name || "";
    if (!first || !prediction) return false;
    return first.toLowerCase().includes(prediction.toLowerCase().split(" ").pop().toLowerCase());
  }
  if (bet_type === "scorer") {
    return (scorers || []).some(s => {
      const n = s.name || s.scorer?.name || "";
      return n && prediction && n.toLowerCase().includes(prediction.toLowerCase().split(" ").pop().toLowerCase());
    });
  }
  if (bet_type === "over_under") {
    const total = homeScore + awayScore;
    const line = prediction.includes("1.5") ? 1.5 : prediction.includes("3.5") ? 3.5 : 2.5;
    return prediction.startsWith("Plus") ? total > line : total < line;
  }
  return false;
};

// Filtre joueurs : uniquement attaquants et milieux offensifs
const filterScorers = (squad) => {
  if (!squad?.length) return [];
  const INCLUDE = ["Forward","Midfielder","Centre-Forward","Left Winger","Right Winger","Attacking Midfield","Central Midfield","Left Midfield","Right Midfield","Second Striker","Attacker"];
  const EXCLUDE = ["Goalkeeper","Centre-Back","Left-Back","Right-Back","Defensive Midfield","Sweeper","Keeper","Goalie"];
  return squad
    .filter(p => {
      const pos = p.position || "";
      if (EXCLUDE.some(e => pos.includes(e))) return false;
      return INCLUDE.some(i => pos.includes(i)) || pos === "Midfielder" || pos === "Forward" || pos === "Attacker";
    })
    .map(p => ({ name: p.name, position: p.position || "" }))
    .slice(0, 14);
};

// ============================================================
// BADGES / XP
// ============================================================
const BADGES = [
  { id: "rookie", label: "Rookie", minLevel: 1, maxLevel: 10, color: "#94a3b8", emoji: "🌱", glow: "rgba(148,163,184,0.25)" },
  { id: "scout", label: "Scout", minLevel: 11, maxLevel: 25, color: "#60a5fa", emoji: "🔍", glow: "rgba(96,165,250,0.25)" },
  { id: "analyst", label: "Analyst", minLevel: 26, maxLevel: 50, color: "#a78bfa", emoji: "📈", glow: "rgba(167,139,250,0.25)" },
  { id: "pro", label: "Pro", minLevel: 51, maxLevel: 80, color: "#fbbf24", emoji: "⚡", glow: "rgba(251,191,36,0.25)" },
  { id: "legend", label: "Legend", minLevel: 81, maxLevel: 999, color: "#34d399", emoji: "👑", glow: "rgba(52,211,153,0.3)" },
];
const XP_PER_LEVEL = 100;
const getSubPlan = (profile) => profile?.subscription || "starter";
const getSubColor = (sub) => ({ starter:"#94a3b8", pro:"#3b82f6", elite:"#f59e0b" })[sub] || "#94a3b8";
const getSubEmoji = (sub) => ({ starter:"🌱", pro:"⚡", elite:"👑" })[sub] || "🌱";
const getSubLabel = (sub) => ({ starter:"Starter", pro:"Pro", elite:"Elite" })[sub] || "Starter";
const getMCBoost = (sub) => ({ starter:100, pro:150, elite:250 })[sub] || 100;
const isElite = (profile) => profile?.subscription === "elite";
const isPro = (profile) => profile?.subscription === "pro" || profile?.subscription === "elite";
const getBadge = (level) => BADGES.find(b => level >= b.minLevel && level <= b.maxLevel) || BADGES[0];
const getLevel = (xp) => Math.floor((xp || 0) / XP_PER_LEVEL) + 1;
const getXPProgress = (xp) => (xp || 0) % XP_PER_LEVEL;

// ============================================================
// STORE — 1€ = 1 SC
// ============================================================
const STORE_ITEMS = [
  { id: "s1", name: "Carte cadeau Amazon", cost: 50, emoji: "🛒", plan: "starter", planLabel: "Starter", planColor: "#94a3b8", value: "5€", description: "Code envoyé par email sous 48h" },
  { id: "s2", name: "Carte cadeau JD Sport", cost: 80, emoji: "👟", plan: "starter", planLabel: "Starter", planColor: "#94a3b8", value: "10€", description: "Code envoyé par email sous 48h" },
  { id: "s3", name: "Points FIFA", cost: 100, emoji: "🎮", plan: "starter", planLabel: "Starter", planColor: "#94a3b8", value: "10€", description: "Code envoyé par email sous 48h" },
  { id: "s4", name: "Maillot de foot officiel", cost: 400, emoji: "👕", plan: "pro", planLabel: "Pro", planColor: "#3b82f6", value: "Replica officielle", description: "Taille au choix, livraison sous 7j" },
  { id: "s5", name: "Carte cadeau Unisport", cost: 350, emoji: "⚽", plan: "pro", planLabel: "Pro", planColor: "#3b82f6", value: "50€", description: "Code envoyé par email sous 48h" },
  { id: "s6", name: "Maillot dédicacé", cost: 1200, emoji: "✍️", plan: "elite", planLabel: "Elite", planColor: "#f59e0b", value: "Signature originale", description: "Maillot officiel signé par un joueur pro" },
  { id: "s7", name: "Place VIP match", cost: 2000, emoji: "🏟️", plan: "elite", planLabel: "Elite", planColor: "#f59e0b", value: "Expérience unique", description: "Tribune VIP + accès coulisses sur demande" },
];
const SUBSCRIPTION_PLANS = [
  {
    id: "starter",
    label: "Ligue Starter",
    price: 0,
    priceLabel: "Gratuit",
    color: "#94a3b8",
    emoji: "🌱",
    mcBoost: 100,
    features: ["100 MC chaque lundi","Roue quotidienne","Récompenses standard (cartes cadeaux 5-10€)","Pubs récompensées"],
    noFeatures: ["Cashout","Marchés exclusifs","Support prioritaire"],
  },
  {
    id: "pro",
    label: "Ligue Pro",
    price: 4.99,
    priceLabel: "4.99€/mois",
    color: "#3b82f6",
    emoji: "⚡",
    mcBoost: 150,
    priceId: "price_1TF03SEMwfOErJuWzQ59d54A", // Ligue Pro
    features: ["150 MC chaque lundi","Option Cashout","Récompenses Premium (maillots, tech)","Sans pub"],
    popular: true,
  },
  {
    id: "elite",
    label: "Ligue Elite",
    price: 14.99,
    priceLabel: "14.99€/mois",
    color: "#f59e0b",
    emoji: "👑",
    mcBoost: 250,
    priceId: "price_1TF03vEMwfOErJuWF6vlaoue", // Ligue Elite
    features: ["250 MC chaque lundi","Accès marchés exclusifs","Récompenses de luxe (VIP, dédicaces)","Sans pub","Support prioritaire"],
  },
];
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

const loadSavedOdds = () => { try { const s = localStorage.getItem("mb_odds"); return s ? JSON.parse(s) : {}; } catch { return {}; } };
const saveOdds = (ms) => { try { const o = {}; ms.forEach(m => { o[m.id] = { q_yes: m.q_yes, q_no: m.q_no, total_volume: m.total_volume, participants: m.participants }; }); localStorage.setItem("mb_odds", JSON.stringify(o)); } catch {} };

const COMPETITIONS = ["PL","FL1","CL","PD","BL1","SA","PPL","EL","BSA","MLS","ERE","TSL","NL","EURO","WC","FR","WCQ_UEFA","AFCON","COPA","U21UEFA"];
const COMP_INFO = {
  "PL":       { name: "Premier League",            emoji: "🏴", color: "#3b82f6" },
  "FL1":      { name: "Ligue 1",                   emoji: "🇫🇷", color: "#ef4444" },
  "CL":       { name: "Champions League",          emoji: "🏆", color: "#fbbf24" },
  "PD":       { name: "La Liga",                   emoji: "🇪🇸", color: "#f97316" },
  "BL1":      { name: "Bundesliga",                emoji: "🇩🇪", color: "#6b7280" },
  "SA":       { name: "Serie A",                   emoji: "🇮🇹", color: "#10b981" },
  "PPL":      { name: "Liga Portugal",             emoji: "🇵🇹", color: "#8b5cf6" },
  "EL":       { name: "Europa League",             emoji: "🔶", color: "#f59e0b" },
  "WC":       { name: "Coupe du Monde",            emoji: "🌍", color: "#fbbf24" },
  "EURO":     { name: "Euro",                      emoji: "🇪🇺", color: "#3b82f6" },
  "NL":       { name: "Ligue des Nations",         emoji: "🌐", color: "#10b981" },
  "FR":       { name: "Amicaux Internationaux",    emoji: "🤝", color: "#94a3b8" },
  "BSA":      { name: "Brasileirao",               emoji: "🇧🇷", color: "#10b981" },
  "MLS":      { name: "MLS",                       emoji: "🇺🇸", color: "#ef4444" },
  "ERE":      { name: "Eredivisie",                emoji: "🇳🇱", color: "#f97316" },
  "TSL":      { name: "Süper Lig",                 emoji: "🇹🇷", color: "#ef4444" },
  "WCQ_UEFA": { name: "Qualif. Mondial UEFA",      emoji: "🌍", color: "#94a3b8" },
  "WCQ_CONC": { name: "Qualif. Mondial CONCACAF",  emoji: "🌍", color: "#94a3b8" },
  "WCQ_CONM": { name: "Qualif. Mondial CONMEBOL",  emoji: "🌍", color: "#94a3b8" },
  "WCQ_AFC":  { name: "Qualif. Mondial AFC",       emoji: "🌍", color: "#94a3b8" },
  "AFCON":    { name: "CAN",                       emoji: "🌍", color: "#f59e0b" },
  "COPA":     { name: "Copa América",              emoji: "🌎", color: "#10b981" },
  "U21UEFA":  { name: "Euro U21 Qualif.",           emoji: "🇪🇺", color: "#60a5fa" },
};

const CLUB_COLORS = {
  "Arsenal": "#EF0107", "Chelsea": "#034694", "Liverpool": "#C8102E", "Man City": "#6CABDD",
  "Man United": "#DA291C", "Tottenham": "#132257", "Newcastle": "#000000", "Aston Villa": "#670E36",
  "PSG": "#004170", "Marseille": "#00A9E0", "Lyon": "#0032A0", "Monaco": "#E31837",
  "Real Madrid": "#00529F", "Barcelona": "#A50044", "Atletico": "#CB3524",
  "Bayern": "#DC052D", "Dortmund": "#FDE100", "Leverkusen": "#E32221",
  "Inter": "#010E80", "Juventus": "#000000", "Napoli": "#12A0C3", "Roma": "#8B0000",
  "Lorient": "#F36F21", "Le Havre": "#003399", "Brest": "#CC0000",
  "Reims": "#DC143C", "Metz": "#8B0000", "Strasbourg": "#003B8E",
  "Benfica": "#CC0000", "Porto": "#003B8E", "Sporting": "#00A859",
};
const getClubColor = (name) => { if (!name) return "#6b7280"; const k = Object.keys(CLUB_COLORS).find(k => name.toLowerCase().includes(k.toLowerCase())); return k ? CLUB_COLORS[k] : "#6b7280"; };

// ============================================================
// HELPERS
// ============================================================
const fmt = (n) => (n ?? 0).toLocaleString("fr-FR");
const fmtPct = (n) => `${Math.round(n * 100)}%`;
const timeLeft = (date) => { const diff = new Date(date) - Date.now(); if (diff < 0) return "Termine"; const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000); return d > 0 ? `${d}j ${h}h` : `${h}h`; };
const catColor = (c) => ({ "Transferts": "#3b82f6", "Contrats": "#8b5cf6", "Competitions": "#f59e0b", "Recompenses": "#ec4899", "Performances": "#10b981", "Rumeurs": "#f59e0b" })[c] || "#6b7280";
const compLabel = (c) => COMP_INFO[c]?.name || c;
const compColor = (c) => COMP_INFO[c]?.color || "#6b7280";
const compEmoji = (c) => COMP_INFO[c]?.emoji || "⚽";
const formatMatchDate = (d) => new Date(d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const getWeekKey = () => { const d = new Date(); const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); return new Date(new Date().setDate(diff)).toISOString().split("T")[0]; };

// ============================================================
// GLOBAL CSS
// ============================================================
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #030712; color: #f1f5f9; font-family: 'DM Sans', sans-serif; overflow-x: hidden; }
  body::before { content: ''; position: fixed; inset: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E"); pointer-events: none; z-index: 999; opacity: 0.35; }
  input::placeholder { color: rgba(241,245,249,0.2); }
  input:focus { border-color: rgba(16,185,129,0.5) !important; box-shadow: 0 0 0 3px rgba(16,185,129,0.1); }
  button { font-family: 'DM Sans', sans-serif; }
  @keyframes slideUp { from{transform:translateX(-50%) translateY(20px);opacity:0} to{transform:translateX(-50%) translateY(0);opacity:1} }
  @keyframes fadeInUp { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  @keyframes floatOrb { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-25px)} }
  @keyframes winPop { 0%{transform:scale(0.5);opacity:0} 60%{transform:scale(1.2)} 100%{transform:scale(1);opacity:1} }
  @keyframes slideInRight { from{transform:translateX(40px);opacity:0} to{transform:translateX(0);opacity:1} }
  @keyframes slideInLeft { from{transform:translateX(-40px);opacity:0} to{transform:translateX(0);opacity:1} }
  @keyframes ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
  @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  @keyframes confetti-fall { 0%{transform:translateY(-20px) rotate(0deg);opacity:1} 100%{transform:translateY(100vh) rotate(720deg);opacity:0} }
  @keyframes market-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,0.4)} 50%{box-shadow:0 0 0 8px rgba(16,185,129,0)} }
  @keyframes btn-press { 0%,100%{transform:scale(1)} 50%{transform:scale(0.96)} }
  .page-enter { animation: fadeInUp 0.3s ease forwards; }
  .page-slide-right { animation: slideInRight 0.3s ease forwards; }
  .page-slide-left { animation: slideInLeft 0.3s ease forwards; }
  .card-hover { transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; }
  .card-hover:hover { transform: translateY(-3px); box-shadow: 0 12px 30px rgba(0,0,0,0.3); }
  .btn-animated { transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease; }
  .btn-animated:hover:not(:disabled) { transform: translateY(-1px) scale(1.02); }
  .btn-animated:active:not(:disabled) { transform: scale(0.97); }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-thumb { background: rgba(16,185,129,0.2); border-radius: 99px; }
`;

// ============================================================
// UI ATOMS
// ============================================================
function MCBadge({ amount, size = "sm" }) {
  const lg = size === "lg";
  return <div style={{ display:"inline-flex", alignItems:"center", gap:5, background:"rgba(251,191,36,0.1)", border:"1px solid rgba(251,191,36,0.2)", borderRadius:lg?12:8, padding:lg?"8px 14px":"3px 9px" }}>
    <span style={{ fontSize:lg?18:12 }}>🪙</span>
    <span style={{ fontFamily:"'Bebas Neue',sans-serif", color:"#fbbf24", fontSize:lg?20:13, letterSpacing:1 }}>{fmt(amount)} MC</span>
  </div>;
}
function SCBadge({ amount, size = "sm" }) {
  const lg = size === "lg";
  return <div style={{ display:"inline-flex", alignItems:"center", gap:5, background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.2)", borderRadius:lg?12:8, padding:lg?"8px 14px":"3px 9px" }}>
    <span style={{ fontSize:lg?18:12 }}>💎</span>
    <span style={{ fontFamily:"'Bebas Neue',sans-serif", color:"#10b981", fontSize:lg?20:13, letterSpacing:1 }}>{fmt(amount)} SC</span>
  </div>;
}
function SubBadge({ profile, size = "sm" }) {
  const sub = getSubPlan(profile);
  if (sub === "starter") return null;
  const color = getSubColor(sub);
  const lg = size === "lg";
  return <div style={{ display:"inline-flex", alignItems:"center", gap:4, background:`${color}15`, border:`1px solid ${color}30`, borderRadius:lg?12:8, padding:lg?"6px 12px":"2px 8px", boxShadow:`0 0 8px ${color}30` }}>
    <span style={{ fontSize:lg?16:11 }}>{getSubEmoji(sub)}</span>
    <span style={{ fontFamily:"'Bebas Neue',sans-serif", color, fontSize:lg?16:11, letterSpacing:1 }}>{getSubLabel(sub)}</span>
  </div>;
}
function BadgeTag({ level }) {
  const b = getBadge(level||1);
  return <span style={{ fontSize:11, fontWeight:700, color:b.color, background:`${b.color}15`, padding:"3px 9px", borderRadius:20, border:`1px solid ${b.color}30`, boxShadow:`0 0 10px ${b.glow}` }}>{b.emoji} {b.label}</span>;
}
function XPBar({ xp }) {
  const level=getLevel(xp||0), progress=getXPProgress(xp||0), b=getBadge(level);
  return <div style={{ marginTop:8 }}>
    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
      <span style={{ fontSize:11, color:b.color, fontWeight:700 }}>{b.emoji} Niv. {level} — {b.label}</span>
      <span style={{ fontSize:11, color:"rgba(241,245,249,0.3)", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:1 }}>{progress}/{XP_PER_LEVEL} XP</span>
    </div>
    <div style={{ height:4, borderRadius:99, background:"rgba(255,255,255,0.06)", overflow:"hidden" }}>
      <div style={{ width:`${(progress/XP_PER_LEVEL)*100}%`, height:"100%", background:`linear-gradient(90deg,${b.color}88,${b.color})`, borderRadius:99, transition:"width 0.8s ease", boxShadow:`0 0 6px ${b.color}` }} />
    </div>
  </div>;
}

// ============================================================
// CONFETTI
// ============================================================
function Confetti({ onDone }) {
  const pieces = Array.from({length: 32}, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.8,
    duration: 1.8 + Math.random() * 1.2,
    color: ["#10b981","#3b82f6","#fbbf24","#f59e0b","#a78bfa","#ec4899","#34d399"][Math.floor(Math.random()*7)],
    size: 6 + Math.random() * 8,
    shape: Math.random() > 0.5 ? "50%" : "2px",
  }));
  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t); }, []);
  return <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:9998, overflow:"hidden" }}>
    {pieces.map(p => (
      <div key={p.id} style={{
        position:"absolute", left:`${p.x}%`, top:"-20px",
        width:p.size, height:p.size,
        borderRadius:p.shape,
        background:p.color,
        animation:`confetti-fall ${p.duration}s ${p.delay}s ease-in forwards`,
        boxShadow:`0 0 4px ${p.color}88`,
      }} />
    ))}
  </div>;
}

function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 4500); return () => clearTimeout(t); }, []);
  const bg = { error:"#ef4444", warning:"#f59e0b", win:"linear-gradient(135deg,#fbbf24,#f59e0b)", success:"linear-gradient(135deg,#10b981,#059669)" }[type]||"linear-gradient(135deg,#10b981,#059669)";
  return <div style={{ position:"fixed", bottom:90, left:"50%", transform:"translateX(-50%)", background:bg, color:"#fff", fontWeight:700, padding:"13px 22px", borderRadius:14, zIndex:9999, fontSize:14, boxShadow:"0 20px 60px rgba(0,0,0,0.5)", whiteSpace:"nowrap", animation:type==="win"?"winPop 0.5s ease":"slideUp 0.4s ease" }}>{msg}</div>;
}
function ProbBar({ qYes, qNo }) {
  const p=AMM.probYes(qYes,qNo), pct=Math.round(p*100);
  return <div>
    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
      <span style={{ fontSize:11, fontWeight:800, color:"#10b981" }}>OUI {pct}%</span>
      <span style={{ fontSize:11, fontWeight:800, color:"#ef4444" }}>NON {100-pct}%</span>
    </div>
    <div style={{ height:4, borderRadius:99, background:"rgba(239,68,68,0.15)", overflow:"hidden" }}>
      <div style={{ width:`${pct}%`, height:"100%", background:"linear-gradient(90deg,#10b981,#34d399)", borderRadius:99, transition:"width 0.5s ease", boxShadow:"0 0 6px rgba(16,185,129,0.5)" }} />
    </div>
  </div>;
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
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, cx = W/2, r = W/2-6;
    const segAngle = (2*Math.PI)/SPIN_SEGMENTS.length;
    ctx.clearRect(0,0,W,W);
    SPIN_SEGMENTS.forEach((seg,i) => {
      const s=rot+i*segAngle, e=s+segAngle;
      ctx.beginPath(); ctx.moveTo(cx,cx); ctx.arc(cx,cx,r,s,e); ctx.closePath();
      const grad=ctx.createRadialGradient(cx,cx,0,cx,cx,r);
      grad.addColorStop(0,seg.color+"99"); grad.addColorStop(1,seg.color);
      ctx.fillStyle=grad; ctx.fill();
      ctx.strokeStyle="rgba(3,7,18,0.5)"; ctx.lineWidth=2; ctx.stroke();
      ctx.save(); ctx.translate(cx,cx); ctx.rotate(s+segAngle/2);
      ctx.textAlign="right"; ctx.fillStyle="#fff"; ctx.font="bold 10px 'DM Sans',sans-serif";
      ctx.shadowColor="rgba(0,0,0,0.5)"; ctx.shadowBlur=3;
      ctx.fillText(seg.label,r-10,4); ctx.restore();
    });
    const cg=ctx.createRadialGradient(cx,cx,0,cx,cx,18);
    cg.addColorStop(0,"#1e293b"); cg.addColorStop(1,"#0f172a");
    ctx.beginPath(); ctx.arc(cx,cx,18,0,2*Math.PI);
    ctx.fillStyle=cg; ctx.shadowColor="rgba(16,185,129,0.3)"; ctx.shadowBlur=8; ctx.fill();
    ctx.strokeStyle="rgba(16,185,129,0.25)"; ctx.lineWidth=2; ctx.stroke();
    ctx.shadowBlur=0;
    ctx.beginPath(); ctx.moveTo(W-5,cx-9); ctx.lineTo(W+12,cx); ctx.lineTo(W-5,cx+9);
    ctx.closePath(); ctx.fillStyle="#f1f5f9"; ctx.fill();
  }, []);

  useEffect(() => { drawWheel(rotRef.current); }, [drawWheel]);

  const doSpin = () => {
    if (!canSpin||spinning) return;
    setSpinning(true); setResult(null);
    const segIdx=Math.floor(Math.random()*SPIN_SEGMENTS.length);
    const segAngle=(2*Math.PI)/SPIN_SEGMENTS.length;
    const targetAngle=2*Math.PI*8+(2*Math.PI-segIdx*segAngle-segAngle/2);
    const startRot=rotRef.current, startTime=performance.now(), duration=4500;
    const animate=(now)=>{
      const progress=Math.min((now-startTime)/duration,1);
      const ease=1-Math.pow(1-progress,4);
      rotRef.current=startRot+targetAngle*ease;
      drawWheel(rotRef.current);
      if (progress<1){animRef.current=requestAnimationFrame(animate);}
      else{setSpinning(false);setResult(SPIN_SEGMENTS[segIdx]);onSpin(SPIN_SEGMENTS[segIdx]);}
    };
    animRef.current=requestAnimationFrame(animate);
  };
  useEffect(()=>()=>{if(animRef.current)cancelAnimationFrame(animRef.current);},[]);

  return <div style={{ textAlign:"center" }}>
    <div style={{ position:"relative", display:"inline-block", marginBottom:14 }}>
      <canvas ref={canvasRef} width={210} height={210} style={{ display:"block", filter:canSpin?"drop-shadow(0 0 15px rgba(16,185,129,0.2))":"grayscale(0.7) opacity(0.5)" }} />
    </div>
    {result && <div style={{ marginBottom:12, padding:"9px 18px", background:result.type==="sc"?"rgba(16,185,129,0.12)":"rgba(251,191,36,0.12)", border:`1px solid ${result.type==="sc"?"rgba(16,185,129,0.25)":"rgba(251,191,36,0.25)"}`, borderRadius:10, display:"inline-block", animation:"winPop 0.4s ease" }}>
      <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:1, color:result.type==="sc"?"#10b981":"#fbbf24" }}>+{result.value} {result.type==="sc"?"💎 SC":"🪙 MC"}</span>
    </div>}
    <button onClick={doSpin} disabled={!canSpin||spinning}
      style={{ display:"block", width:"100%", padding:"11px 0", borderRadius:11, border:"none", background:canSpin&&!spinning?"linear-gradient(135deg,#f59e0b,#d97706)":"rgba(255,255,255,0.04)", color:canSpin&&!spinning?"#fff":"rgba(241,245,249,0.2)", fontWeight:800, cursor:canSpin&&!spinning?"pointer":"not-allowed", fontSize:14, transition:"all 0.2s", boxShadow:canSpin&&!spinning?"0 4px 20px rgba(245,158,11,0.3)":"none" }}>
      {spinning?"...":canSpin?"TOURNER LA ROUE":"Reviens demain"}
    </button>
  </div>;
}

// ============================================================
// AUTH PAGE
// ============================================================
function AuthPage({ onAuth }) {
  const [mode,setMode]=useState("login"),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[username,setUsername]=useState(""),[loading,setLoading]=useState(false),[error,setError]=useState("");
  const submit=async()=>{
    setError("");setLoading(true);
    try{
      if(mode==="signup"){
        if(!username.trim()){setError("Pseudo requis");setLoading(false);return;}
        if(password.length<6){setError("Mot de passe trop court");setLoading(false);return;}
        const d=await authReq("signup",{email,password,data:{username}});
        if(d.user){const ld=await authReq("token?grant_type=password",{email,password});onAuth(ld.access_token,ld.user);}
      }else{const d=await authReq("token?grant_type=password",{email,password});onAuth(d.access_token,d.user);}
    }catch(e){setError(e.message);}
    setLoading(false);
  };
  return <div style={{ minHeight:"100vh", background:"#030712", display:"flex", alignItems:"center", justifyContent:"center", padding:20, position:"relative", overflow:"hidden" }}>
    <style>{GLOBAL_CSS}</style>
    <div style={{ position:"fixed", top:"15%", left:"20%", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle,rgba(16,185,129,0.05),transparent 70%)", animation:"floatOrb 8s ease-in-out infinite", pointerEvents:"none" }} />
    <div style={{ position:"fixed", bottom:"10%", right:"15%", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(59,130,246,0.04),transparent 70%)", animation:"floatOrb 11s ease-in-out infinite reverse", pointerEvents:"none" }} />
    <div style={{ width:"100%", maxWidth:430, position:"relative", zIndex:1, animation:"fadeInUp 0.4s ease" }}>
      <div style={{ textAlign:"center", marginBottom:38 }}>
        <div style={{ width:68, height:68, background:"linear-gradient(135deg,#10b981,#3b82f6)", borderRadius:20, display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, margin:"0 auto 16px", boxShadow:"0 20px 50px rgba(16,185,129,0.25)" }}>⚽</div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:44, letterSpacing:4, color:"#f1f5f9" }}>MARKET<span style={{ color:"#10b981" }}>BALL</span></div>
        <div style={{ fontSize:13, color:"rgba(241,245,249,0.35)", marginTop:6 }}>Predictions football — 100% gratuit</div>
      </div>
      <div style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.07)", borderRadius:22, padding:"30px 26px", backdropFilter:"blur(20px)", boxShadow:"0 40px 80px rgba(0,0,0,0.4)" }}>
        <div style={{ display:"flex", background:"rgba(241,245,249,0.03)", borderRadius:13, padding:4, marginBottom:26 }}>
          {["login","signup"].map(m=><button key={m} onClick={()=>{setMode(m);setError("");}} style={{ flex:1, padding:"10px 0", borderRadius:10, border:"none", background:mode===m?"rgba(16,185,129,0.15)":"transparent", color:mode===m?"#10b981":"rgba(241,245,249,0.35)", fontWeight:700, fontSize:13, cursor:"pointer", transition:"all 0.2s" }}>{m==="login"?"Connexion":"Inscription"}</button>)}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {mode==="signup"&&<div><label style={{ fontSize:11, fontWeight:700, color:"rgba(241,245,249,0.4)", display:"block", marginBottom:7 }}>PSEUDO</label><input value={username} onChange={e=>setUsername(e.target.value)} placeholder="MonPseudo" style={{ width:"100%", padding:"12px 14px", background:"rgba(241,245,249,0.04)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:11, color:"#f1f5f9", fontSize:14, outline:"none", boxSizing:"border-box" }} /></div>}
          <div><label style={{ fontSize:11, fontWeight:700, color:"rgba(241,245,249,0.4)", display:"block", marginBottom:7 }}>EMAIL</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com" style={{ width:"100%", padding:"12px 14px", background:"rgba(241,245,249,0.04)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:11, color:"#f1f5f9", fontSize:14, outline:"none", boxSizing:"border-box" }} /></div>
          <div><label style={{ fontSize:11, fontWeight:700, color:"rgba(241,245,249,0.4)", display:"block", marginBottom:7 }}>MOT DE PASSE</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&submit()} style={{ width:"100%", padding:"12px 14px", background:"rgba(241,245,249,0.04)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:11, color:"#f1f5f9", fontSize:14, outline:"none", boxSizing:"border-box" }} /></div>
        </div>
        {error&&<div style={{ marginTop:14, padding:"11px 14px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.15)", borderRadius:10, color:"#f87171", fontSize:13 }}>⚠️ {error}</div>}
        <button onClick={submit} disabled={loading} style={{ width:"100%", marginTop:20, padding:"13px 0", borderRadius:12, border:"none", background:loading?"rgba(241,245,249,0.04)":"linear-gradient(135deg,#10b981,#059669)", color:loading?"rgba(241,245,249,0.2)":"#fff", fontWeight:800, fontSize:15, cursor:loading?"not-allowed":"pointer", transition:"all 0.2s", boxShadow:loading?"none":"0 8px 25px rgba(16,185,129,0.3)" }}>
          {loading?"...":mode==="login"?"SE CONNECTER":"CREER MON COMPTE"}
        </button>
      </div>
      <div style={{ marginTop:16, textAlign:"center", fontSize:13, color:"rgba(241,245,249,0.3)" }}>Demarrez avec <span style={{ color:"#fbbf24", fontWeight:700 }}>500 🪙 MC</span> gratuits !</div>
    </div>
  </div>;
}

// ============================================================
// MARKET CARD
// ============================================================
function MarketCard({ market, onBet }) {
  const [hover,setHover]=useState(false);
  const p=AMM.probYes(market.q_yes,market.q_no), cc=catColor(market.category);
  return <div className="card-hover" onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onClick={()=>onBet(market)}
    style={{ background:hover?"rgba(241,245,249,0.04)":"rgba(241,245,249,0.02)", border:`1px solid ${hover?"rgba(16,185,129,0.15)":"rgba(241,245,249,0.06)"}`, borderRadius:18, padding:"20px 22px", position:"relative", overflow:"hidden", boxShadow:hover?"0 16px 40px rgba(0,0,0,0.3)":"0 4px 15px rgba(0,0,0,0.15)", cursor:"pointer" }}>
    <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${cc},transparent)` }} />
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
      <div style={{ flex:1, paddingRight:12 }}>
        <div style={{ display:"flex", gap:6, marginBottom:8, flexWrap:"wrap" }}>
          <span style={{ fontSize:10, fontWeight:700, color:cc, background:`${cc}12`, padding:"2px 8px", borderRadius:20, border:`1px solid ${cc}20` }}>{market.category}</span>
          <span style={{ fontSize:10, color:"rgba(241,245,249,0.3)" }}>⏱ {timeLeft(market.closes_at)}</span>
        </div>
        <div style={{ fontWeight:800, fontSize:15, color:"#f1f5f9", lineHeight:1.4, marginBottom:3 }}>{market.title}</div>
        <div style={{ fontSize:12, color:"rgba(241,245,249,0.3)" }}>{market.source}</div>
      </div>
      <div style={{ textAlign:"right", flexShrink:0 }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:36, lineHeight:1, color:p>0.5?"#10b981":"#ef4444", letterSpacing:1 }}>{Math.round(p*100)}<span style={{ fontSize:18 }}>%</span></div>
        <div style={{ fontSize:9, color:"rgba(241,245,249,0.25)", letterSpacing:1 }}>OUI</div>
      </div>
    </div>
    <ProbBar qYes={market.q_yes} qNo={market.q_no} />
    <div style={{ display:"flex", gap:16, margin:"12px 0 14px" }}>
      <div><div style={{ fontSize:9, color:"rgba(241,245,249,0.25)", marginBottom:2, letterSpacing:1 }}>VOLUME</div><div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, color:"#fbbf24", letterSpacing:1 }}>🪙 {fmt(market.total_volume)}</div></div>
      <div><div style={{ fontSize:9, color:"rgba(241,245,249,0.25)", marginBottom:2, letterSpacing:1 }}>JOUEURS</div><div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, letterSpacing:1 }}>{fmt(market.participants)}</div></div>
    </div>
    <button className="btn-animated" onClick={()=>onBet(market)} style={{ width:"100%", padding:"10px 0", borderRadius:11, border:`1px solid ${hover?"rgba(16,185,129,0.3)":"rgba(241,245,249,0.08)"}`, background:hover?"rgba(16,185,129,0.08)":"transparent", color:hover?"#10b981":"rgba(241,245,249,0.45)", fontWeight:700, fontSize:13, cursor:"pointer", transition:"all 0.2s" }}>PREDIRE →</button>
  </div>;
}

// ============================================================
// MATCH CARD
// ============================================================
function MatchCard({ match, onBet }) {
  const [hover,setHover]=useState(false);
  const [imgErr,setImgErr]=useState({});
  const cc=compColor(match.competition);
  const isLive=match.status==="IN_PLAY"||match.status==="PAUSED";
  const isFinished=match.status==="FINISHED";
  const odds=calcMatchOdds(match);
  const Logo=({logo,name,side})=>{
    const clubColor=getClubColor(name);
    if(logo&&!imgErr[side]) return <img src={logo} alt={name} style={{ width:38,height:38,objectFit:"contain",display:"block",margin:"0 auto 7px",filter:"drop-shadow(0 2px 6px rgba(0,0,0,0.4))" }} onError={()=>setImgErr(e=>({...e,[side]:true}))} />;
    const init=name?name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase():"?";
    return <div style={{ width:38,height:38,borderRadius:"50%",background:`${clubColor}25`,border:`2px solid ${clubColor}50`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 7px",fontFamily:"'Bebas Neue',sans-serif",fontSize:13,color:clubColor,letterSpacing:1 }}>{init}</div>;
  };
  return <div className="card-hover" onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onClick={()=>!isFinished&&onBet(match)}
    style={{ background:hover?"rgba(241,245,249,0.04)":"rgba(241,245,249,0.02)", border:`1px solid ${isLive?"rgba(239,68,68,0.25)":hover?"rgba(16,185,129,0.12)":"rgba(241,245,249,0.06)"}`, borderRadius:18, padding:"18px 20px", position:"relative", overflow:"hidden", boxShadow:hover?"0 16px 40px rgba(0,0,0,0.3)":"0 4px 15px rgba(0,0,0,0.15)", cursor:isFinished?"default":"pointer" }}>
    <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${isLive?"#ef4444":cc},transparent)` }} />
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
      <span style={{ fontSize:10, fontWeight:700, color:cc, background:`${cc}12`, padding:"2px 8px", borderRadius:20, border:`1px solid ${cc}20` }}>{compEmoji(match.competition)} {compLabel(match.competition)}</span>
      {isLive?<span style={{ fontSize:10, fontWeight:800, color:"#ef4444", display:"flex", alignItems:"center", gap:4 }}><span style={{ width:6,height:6,borderRadius:"50%",background:"#ef4444",display:"inline-block",animation:"pulse 1s infinite" }} />EN DIRECT</span>
        :isFinished?<span style={{ fontSize:10, color:"rgba(241,245,249,0.25)" }}>Termine</span>
        :<span style={{ fontSize:10, color:"rgba(241,245,249,0.3)" }}>{formatMatchDate(match.match_date)}</span>}
    </div>
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
      <div style={{ flex:1, textAlign:"center" }}><Logo logo={match.home_logo} name={match.home_team} side="home" /><div style={{ fontWeight:800, fontSize:12, color:"#f1f5f9" }}>{match.home_team}</div></div>
      <div style={{ textAlign:"center", padding:"0 10px" }}>
        {(isLive||isFinished)?<div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:32, color:"#f1f5f9", letterSpacing:2 }}>{match.home_score??0} - {match.away_score??0}</div>
          :<div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:"rgba(241,245,249,0.25)", letterSpacing:3 }}>VS</div>}
      </div>
      <div style={{ flex:1, textAlign:"center" }}><Logo logo={match.away_logo} name={match.away_team} side="away" /><div style={{ fontWeight:800, fontSize:12, color:"#f1f5f9" }}>{match.away_team}</div></div>
    </div>
    {!isFinished&&<div style={{ display:"flex", gap:6, marginBottom:12 }}>
      {[{l:"1",o:odds.oddsHome,c:"#10b981"},{l:"X",o:odds.oddsDraw,c:"#94a3b8"},{l:"2",o:odds.oddsAway,c:"#ef4444"}].map(item=>(
        <div key={item.l} style={{ flex:1, textAlign:"center", background:"rgba(241,245,249,0.03)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:9, padding:"6px 0" }}>
          <div style={{ fontSize:9, color:"rgba(241,245,249,0.3)", marginBottom:1, letterSpacing:1 }}>{item.l}</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, color:item.c, letterSpacing:1 }}>{item.o}</div>
        </div>
      ))}
    </div>}
    {!isFinished&&<button className="btn-animated" onClick={()=>onBet(match)} style={{ width:"100%", padding:"10px 0", borderRadius:11, border:`1px solid ${hover?"rgba(16,185,129,0.3)":"rgba(241,245,249,0.08)"}`, background:hover?"rgba(16,185,129,0.08)":"transparent", color:hover?"#10b981":"rgba(241,245,249,0.45)", fontWeight:700, fontSize:13, cursor:"pointer", transition:"all 0.2s" }}>PARIER →</button>}
  </div>;
}

// ============================================================
// BET MODAL
// ============================================================
function BetModal({ market, onClose, onConfirm, coins }) {
  const [side,setSide]=useState("yes"),[amount,setAmount]=useState("");
  const pYes=AMM.probYes(market.q_yes,market.q_no);
  const amtNum=parseInt(amount)||0;
  const cost=amtNum>0?AMM.costToBuy(market.q_yes,market.q_no,amtNum,side):0;
  const rawGain=amtNum>0?(side==="yes"?Math.round(amtNum/Math.max(pYes,0.02)):Math.round(amtNum/Math.max(1-pYes,0.02))):0;
  const gain=Math.max(amtNum+1, Math.min(amtNum*50, rawGain||0));
  const canBet=amtNum>=1&&cost>=1&&cost<=coins;
  return <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(3,7,18,0.88)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(16px)", animation:"fadeIn 0.2s ease" }}>
    <div onClick={e=>e.stopPropagation()} style={{ background:"rgba(241,245,249,0.03)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:22, padding:28, width:380, maxWidth:"95vw", boxShadow:"0 50px 100px rgba(0,0,0,0.6)", backdropFilter:"blur(20px)", animation:"fadeInUp 0.3s ease" }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:2, marginBottom:4 }}>PLACER UNE PREDICTION</div>
      <div style={{ fontSize:13, color:"rgba(241,245,249,0.4)", marginBottom:20, lineHeight:1.5 }}>{market.title}</div>
      <div style={{ display:"flex", gap:8, marginBottom:18 }}>
        {["yes","no"].map(s=><button key={s} onClick={()=>setSide(s)} style={{ flex:1, padding:"12px 0", borderRadius:12, border:`2px solid ${side===s?(s==="yes"?"#10b981":"#ef4444"):"rgba(241,245,249,0.07)"}`, background:side===s?(s==="yes"?"rgba(16,185,129,0.1)":"rgba(239,68,68,0.1)"):"transparent", color:side===s?(s==="yes"?"#10b981":"#ef4444"):"rgba(241,245,249,0.3)", fontWeight:800, fontSize:14, cursor:"pointer", transition:"all 0.2s" }}>{s==="yes"?`OUI ${fmtPct(pYes)}`:`NON ${fmtPct(1-pYes)}`}</button>)}
      </div>
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"rgba(241,245,249,0.35)", marginBottom:7 }}>PARTS A ACHETER</div>
        <input type="number" value={amount} min={1} max={coins} onChange={e=>setAmount(Math.max(1,Math.min(coins,+e.target.value||"")))} style={{ width:"100%", padding:"11px 14px", background:"rgba(241,245,249,0.04)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:11, color:"#f1f5f9", fontSize:22, fontWeight:800, outline:"none", boxSizing:"border-box", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:1 }} />
        <div style={{ display:"flex", gap:6, marginTop:8 }}>{[10,50,100,200].map(v=><button key={v} onClick={()=>setAmount(v)} style={{ flex:1, padding:"7px 0", borderRadius:9, border:"1px solid rgba(241,245,249,0.07)", background:amount===v?"rgba(16,185,129,0.1)":"transparent", color:amount===v?"#10b981":"rgba(241,245,249,0.4)", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'Bebas Neue',sans-serif" }}>{v}</button>)}</div>
      </div>
      <div style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:12, padding:"13px 15px", marginBottom:18 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:7 }}><span style={{ fontSize:13, color:"rgba(241,245,249,0.35)" }}>Cout</span><MCBadge amount={cost} /></div>
        <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ fontSize:13, color:"rgba(241,245,249,0.35)" }}>Gain potentiel</span><span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:"#fbbf24", letterSpacing:1 }}>🪙 +{fmt(gain)}</span></div>
      </div>
      <button onClick={()=>canBet&&onConfirm(side,amtNum,cost,gain)} disabled={!canBet} style={{ width:"100%", padding:"13px 0", borderRadius:12, border:"none", background:canBet?"linear-gradient(135deg,#10b981,#059669)":"rgba(241,245,249,0.04)", color:canBet?"#fff":"rgba(241,245,249,0.2)", fontWeight:800, fontSize:15, cursor:canBet?"pointer":"not-allowed", transition:"all 0.2s", boxShadow:canBet?"0 8px 25px rgba(16,185,129,0.3)":"none" }}>
        {!canBet&&coins<cost?"Pas assez de MC":"CONFIRMER →"}
      </button>
    </div>
  </div>;
}

// ============================================================
// MATCH BET MODAL
// ============================================================
function MatchBetModal({ match, onClose, onConfirm, coins }) {
  const [betType,setBetType]=useState("winner"),[prediction,setPrediction]=useState(""),[amount,setAmount]=useState("");
  const [scorerTeam,setScorerTeam]=useState("home"),[homePlayers,setHomePlayers]=useState([]),[awayPlayers,setAwayPlayers]=useState([]),[loadingPlayers,setLoadingPlayers]=useState(false);
  const [homeGoals,setHomeGoals]=useState(1),[awayGoals,setAwayGoals]=useState(1);
  const odds=calcMatchOdds(match);

  useEffect(()=>{
    if(!match.home_team_id&&!match.away_team_id) return;
    setLoadingPlayers(true);
    Promise.all([match.home_team_id?squadReq(match.home_team_id):Promise.resolve(null),match.away_team_id?squadReq(match.away_team_id):Promise.resolve(null)])
      .then(([hD,aD])=>{
        if(hD?.squad) setHomePlayers(filterScorers(hD.squad));
        if(aD?.squad) setAwayPlayers(filterScorers(aD.squad));
      }).catch(()=>{}).finally(()=>setLoadingPlayers(false));
  },[match.home_team_id,match.away_team_id]);

  const currentPlayers=scorerTeam==="home"?homePlayers:awayPlayers;
  const getOdds=()=>{
    if(betType==="winner"){if(prediction===match.home_team)return odds.oddsHome;if(prediction==="Nul")return odds.oddsDraw;if(prediction===match.away_team)return odds.oddsAway;return 2;}
    if(betType==="exact_score") return calcExactScoreOdds(homeGoals,awayGoals,odds);
    if(betType==="first_scorer") return prediction?calcScorerOdds(prediction,true):5;
    if(betType==="scorer") return prediction?calcScorerOdds(prediction,false):3;
    if(betType==="over_under"){const line=prediction.includes("1.5")?1.5:prediction.includes("3.5")?3.5:2.5;return calcOverUnderOdds(line,prediction.startsWith("Plus"),odds);}
    return 2;
  };
  const currentOdds=getOdds();
  const amtNum=parseInt(amount)||0;
  const gain=Math.round(amtNum*currentOdds);
  const finalPred=betType==="exact_score"?`${homeGoals}-${awayGoals}`:prediction;
  const canBet=finalPred&&amtNum>=1&&amtNum<=coins;

  const BET_TYPES=[
    {id:"winner",label:"🏆 Vainqueur",desc:"1X2"},
    {id:"exact_score",label:"🎯 Score exact",desc:"Cotes Poisson"},
    {id:"first_scorer",label:"⚽ 1er buteur",desc:"x2.5 min"},
    {id:"scorer",label:"🥅 Buteur",desc:"x1.5 min"},
    {id:"over_under",label:"📊 +/- buts",desc:"Over/Under"},
  ];

  const renderInputs=()=>{
    if(betType==="winner") return <div style={{ display:"flex", gap:8 }}>
      {[{l:match.home_team,o:odds.oddsHome,c:"#10b981"},{l:"Nul",o:odds.oddsDraw,c:"#94a3b8"},{l:match.away_team,o:odds.oddsAway,c:"#ef4444"}].map(opt=>(
        <button key={opt.l} onClick={()=>setPrediction(opt.l)} style={{ flex:1, padding:"11px 4px", borderRadius:11, border:`2px solid ${prediction===opt.l?opt.c:"rgba(241,245,249,0.07)"}`, background:prediction===opt.l?`${opt.c}10`:"transparent", color:prediction===opt.l?opt.c:"rgba(241,245,249,0.4)", fontWeight:700, fontSize:10, cursor:"pointer", transition:"all 0.2s" }}>
          <div>{opt.l}</div><div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, marginTop:2, letterSpacing:1 }}>x{opt.o}</div>
        </button>
      ))}
    </div>;
    if(betType==="exact_score") return <div>
      <div style={{ display:"flex", alignItems:"center", gap:16, justifyContent:"center", marginBottom:12 }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:10, color:"rgba(241,245,249,0.3)", marginBottom:6 }}>{match.home_team}</div>
          <input type="number" min={0} max={15} value={homeGoals} onChange={e=>setHomeGoals(Math.max(0,Math.min(15,+e.target.value)))} style={{ width:62, padding:"10px", background:"rgba(241,245,249,0.04)", border:"1px solid rgba(241,245,249,0.1)", borderRadius:11, color:"#f1f5f9", fontSize:24, fontWeight:800, outline:"none", textAlign:"center", fontFamily:"'Bebas Neue',sans-serif" }} />
        </div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:"rgba(241,245,249,0.2)", marginTop:18 }}>—</div>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:10, color:"rgba(241,245,249,0.3)", marginBottom:6 }}>{match.away_team}</div>
          <input type="number" min={0} max={15} value={awayGoals} onChange={e=>setAwayGoals(Math.max(0,Math.min(15,+e.target.value)))} style={{ width:62, padding:"10px", background:"rgba(241,245,249,0.04)", border:"1px solid rgba(241,245,249,0.1)", borderRadius:11, color:"#f1f5f9", fontSize:24, fontWeight:800, outline:"none", textAlign:"center", fontFamily:"'Bebas Neue',sans-serif" }} />
        </div>
      </div>
      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
        {[[1,0],[2,0],[2,1],[1,1],[0,1],[0,2],[3,1],[3,0]].map(([h,a])=>{
          const o=calcExactScoreOdds(h,a,odds),sel=homeGoals===h&&awayGoals===a;
          return <button key={`${h}-${a}`} onClick={()=>{setHomeGoals(h);setAwayGoals(a);}} style={{ padding:"5px 10px", borderRadius:8, border:`1px solid ${sel?"#10b981":"rgba(241,245,249,0.07)"}`, background:sel?"rgba(16,185,129,0.1)":"transparent", color:sel?"#10b981":"rgba(241,245,249,0.4)", fontSize:11, fontWeight:700, cursor:"pointer" }}>{h}-{a} <span style={{ color:"#fbbf24", fontFamily:"'Bebas Neue',sans-serif" }}>x{o}</span></button>;
        })}
      </div>
    </div>;
    if(betType==="first_scorer"||betType==="scorer") return <div>
      <div style={{ display:"flex", gap:8, marginBottom:10 }}>
        {["home","away"].map(t=><button key={t} onClick={()=>{setScorerTeam(t);setPrediction("");}} style={{ flex:1, padding:"8px", borderRadius:10, border:`1px solid ${scorerTeam===t?"#10b981":"rgba(241,245,249,0.07)"}`, background:scorerTeam===t?"rgba(16,185,129,0.08)":"transparent", color:scorerTeam===t?"#10b981":"rgba(241,245,249,0.35)", fontWeight:700, fontSize:11, cursor:"pointer" }}>{t==="home"?match.home_team:match.away_team}</button>)}
      </div>
      {loadingPlayers?<div style={{ textAlign:"center", padding:20, color:"rgba(241,245,249,0.3)", fontSize:13 }}>Chargement joueurs...</div>
        :currentPlayers.length>0?(
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, maxHeight:200, overflowY:"auto" }}>
            {currentPlayers.map(p=>{
              const name = typeof p === "object" ? p.name : p;
              const pos = typeof p === "object" ? p.position : "";
              const o=calcScorerOdds(name,betType==="first_scorer",pos);
              return <button key={name} onClick={()=>setPrediction(name)} style={{ padding:"8px 10px", borderRadius:10, border:`1px solid ${prediction===name?"#10b981":"rgba(241,245,249,0.06)"}`, background:prediction===name?"rgba(16,185,129,0.1)":"rgba(241,245,249,0.02)", color:prediction===name?"#10b981":"rgba(241,245,249,0.55)", fontWeight:700, fontSize:11, cursor:"pointer", display:"flex", justifyContent:"space-between", transition:"all 0.15s" }}><span>{name}</span><span style={{ fontFamily:"'Bebas Neue',sans-serif", color:"#fbbf24", fontSize:12 }}>x{o}</span></button>;
            })}
          </div>
        ):<div style={{ fontSize:12, color:"rgba(241,245,249,0.25)", textAlign:"center", padding:16 }}>Joueurs non disponibles</div>}
    </div>;
    if(betType==="over_under") return <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
      {[{l:"Plus de 1.5",ln:1.5,ov:true},{l:"Moins de 1.5",ln:1.5,ov:false},{l:"Plus de 2.5",ln:2.5,ov:true},{l:"Moins de 2.5",ln:2.5,ov:false},{l:"Plus de 3.5",ln:3.5,ov:true},{l:"Moins de 3.5",ln:3.5,ov:false}].map(opt=>{
        const o=calcOverUnderOdds(opt.ln,opt.ov,odds),sel=prediction===opt.l;
        return <button key={opt.l} onClick={()=>setPrediction(opt.l)} style={{ flex:"1 1 45%", padding:"10px 10px", borderRadius:11, border:`2px solid ${sel?"#f59e0b":"rgba(241,245,249,0.07)"}`, background:sel?"rgba(245,158,11,0.1)":"transparent", color:sel?"#f59e0b":"rgba(241,245,249,0.4)", fontWeight:700, fontSize:11, cursor:"pointer", display:"flex", justifyContent:"space-between", transition:"all 0.2s" }}><span>{opt.l} buts</span><span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14 }}>x{o}</span></button>;
      })}
    </div>;
  };

  return <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(3,7,18,0.88)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(16px)", padding:16, animation:"fadeIn 0.2s ease" }}>
    <div onClick={e=>e.stopPropagation()} style={{ background:"rgba(241,245,249,0.03)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:22, padding:24, width:430, maxWidth:"100%", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 50px 100px rgba(0,0,0,0.6)", backdropFilter:"blur(20px)", animation:"fadeInUp 0.3s ease" }}>
      <div style={{ display:"flex", alignItems:"center", marginBottom:16, background:"rgba(241,245,249,0.03)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:12, padding:"12px 16px" }}>
        <div style={{ textAlign:"center", flex:1 }}><div style={{ fontWeight:800, fontSize:13 }}>{match.home_team}</div><div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14, color:"#10b981", letterSpacing:1, marginTop:2 }}>x{odds.oddsHome}</div></div>
        <div style={{ padding:"0 12px", textAlign:"center" }}><div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:"rgba(241,245,249,0.2)", letterSpacing:2 }}>VS</div><div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:12, color:"#94a3b8", letterSpacing:1 }}>x{odds.oddsDraw}</div></div>
        <div style={{ textAlign:"center", flex:1 }}><div style={{ fontWeight:800, fontSize:13 }}>{match.away_team}</div><div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14, color:"#ef4444", letterSpacing:1, marginTop:2 }}>x{odds.oddsAway}</div></div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:16 }}>
        {BET_TYPES.map(t=><button key={t.id} onClick={()=>{setBetType(t.id);setPrediction("");setScorerTeam("home");}} style={{ padding:"10px 12px", borderRadius:10, border:`2px solid ${betType===t.id?"#10b981":"rgba(241,245,249,0.06)"}`, background:betType===t.id?"rgba(16,185,129,0.08)":"transparent", color:betType===t.id?"#10b981":"rgba(241,245,249,0.35)", fontWeight:700, fontSize:11, cursor:"pointer", textAlign:"left", transition:"all 0.2s" }}><div>{t.label}</div><div style={{ fontSize:9, fontWeight:400, opacity:0.6, marginTop:1 }}>{t.desc}</div></button>)}
      </div>
      <div style={{ marginBottom:16 }}>{renderInputs()}</div>
      <input type="number" value={amount} min={1} max={coins} onChange={e=>setAmount(Math.max(1,Math.min(coins,+e.target.value||"")))} style={{ width:"100%", padding:"11px 14px", background:"rgba(241,245,249,0.04)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:11, color:"#f1f5f9", fontSize:22, fontWeight:800, outline:"none", boxSizing:"border-box", marginBottom:8, fontFamily:"'Bebas Neue',sans-serif", letterSpacing:1 }} />
      <div style={{ display:"flex", gap:6, marginBottom:14 }}>{[50,100,200,500].map(v=><button key={v} onClick={()=>setAmount(Math.min(v,coins))} style={{ flex:1, padding:"7px 0", borderRadius:9, border:"1px solid rgba(241,245,249,0.07)", background:amount===v?"rgba(16,185,129,0.1)":"transparent", color:amount===v?"#10b981":"rgba(241,245,249,0.4)", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'Bebas Neue',sans-serif" }}>{v}</button>)}</div>
      <div style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:12, padding:"12px 14px", marginBottom:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}><span style={{ fontSize:13, color:"rgba(241,245,249,0.35)" }}>Prediction</span><span style={{ fontWeight:700, fontSize:13 }}>{finalPred||"—"}</span></div>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}><span style={{ fontSize:13, color:"rgba(241,245,249,0.35)" }}>Cote</span><span style={{ fontFamily:"'Bebas Neue',sans-serif", color:"#fbbf24", fontSize:18, letterSpacing:1 }}>x{currentOdds}</span></div>
        <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ fontSize:13, color:"rgba(241,245,249,0.35)" }}>Gain potentiel</span><span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:"#10b981", letterSpacing:1 }}>+{fmt(gain)} 🪙</span></div>
      </div>
      <button onClick={()=>canBet&&onConfirm(match,betType,finalPred,amtNum,gain,currentOdds)} disabled={!canBet} style={{ width:"100%", padding:"13px 0", borderRadius:12, border:"none", background:canBet?"linear-gradient(135deg,#10b981,#059669)":"rgba(241,245,249,0.04)", color:canBet?"#fff":"rgba(241,245,249,0.2)", fontWeight:800, fontSize:15, cursor:canBet?"pointer":"not-allowed", transition:"all 0.2s", boxShadow:canBet?"0 8px 25px rgba(16,185,129,0.3)":"none" }}>
        {!finalPred?"Choisir une prediction":coins<amount?"Pas assez de MC":"CONFIRMER →"}
      </button>
    </div>
  </div>;
}

// ============================================================
// PAGE COMMENT CA MARCHE
// ============================================================

// ============================================================
// BET SIMULATOR (pour le guide)
// ============================================================
function BetSimulator() {
  const [step,setStep]=useState(0);
  const [choice,setChoice]=useState(null);
  const [amount,setAmount]=useState(100);
  const [done,setDone]=useState(false);
  const DEMO_MARKET={title:"PSG remporte la Champions League ?",q_yes:260,q_no:140};
  const pYes=Math.round(AMM.probYes(DEMO_MARKET.q_yes,DEMO_MARKET.q_no)*100);
  const gain=choice==="yes"?Math.round(amount/AMM.probYes(DEMO_MARKET.q_yes,DEMO_MARKET.q_no)):Math.round(amount/(1-AMM.probYes(DEMO_MARKET.q_yes,DEMO_MARKET.q_no)));

  const reset=()=>{setStep(0);setChoice(null);setAmount(100);setDone(false);};

  return <div style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(16,185,129,0.15)", borderRadius:18, overflow:"hidden", marginBottom:20 }}>
    {/* Header */}
    <div style={{ background:"linear-gradient(135deg,rgba(16,185,129,0.12),rgba(59,130,246,0.08))", padding:"14px 18px", borderBottom:"1px solid rgba(241,245,249,0.06)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:2, color:"#10b981" }}>SIMULATION INTERACTIVE</div>
      <div style={{ display:"flex", gap:6 }}>
        {[0,1,2,3].map(i=><div key={i} style={{ width:i<=step?22:7, height:7, borderRadius:99, background:i<=step?"#10b981":"rgba(241,245,249,0.1)", transition:"all 0.3s" }} />)}
      </div>
    </div>
    <div style={{ padding:"18px" }}>
      {/* STEP 0 - Choisir un marché */}
      {step===0&&<div style={{ animation:"fadeInUp 0.3s ease" }}>
        <div style={{ fontSize:12, color:"rgba(241,245,249,0.5)", marginBottom:10, fontWeight:700, letterSpacing:1 }}>ÉTAPE 1 — CHOISIS UN MARCHÉ</div>
        <div onClick={()=>setStep(1)} className="card-hover" style={{ background:"rgba(241,245,249,0.03)", border:"1px solid rgba(16,185,129,0.2)", borderRadius:14, padding:"16px", cursor:"pointer", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"linear-gradient(90deg,#10b981,#3b82f6)" }} />
          <div style={{ display:"flex", gap:6, marginBottom:8 }}>
            <span style={{ fontSize:10, fontWeight:700, color:"#f59e0b", background:"rgba(245,158,11,0.12)", padding:"2px 8px", borderRadius:20, border:"1px solid rgba(245,158,11,0.2)" }}>Compétitions</span>
          </div>
          <div style={{ fontWeight:800, fontSize:14, marginBottom:10 }}>{DEMO_MARKET.title}</div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
            <span style={{ fontSize:11, fontWeight:800, color:"#10b981" }}>OUI {pYes}%</span>
            <span style={{ fontSize:11, fontWeight:800, color:"#ef4444" }}>NON {100-pYes}%</span>
          </div>
          <div style={{ height:4, borderRadius:99, background:"rgba(239,68,68,0.15)", overflow:"hidden" }}>
            <div style={{ width:`${pYes}%`, height:"100%", background:"linear-gradient(90deg,#10b981,#34d399)", borderRadius:99 }} />
          </div>
          <div style={{ marginTop:12, textAlign:"center", fontSize:12, color:"#10b981", fontWeight:700 }}>👆 Clique pour parier →</div>
        </div>
      </div>}

      {/* STEP 1 - Choisir OUI/NON */}
      {step===1&&<div style={{ animation:"fadeInUp 0.3s ease" }}>
        <div style={{ fontSize:12, color:"rgba(241,245,249,0.5)", marginBottom:10, fontWeight:700, letterSpacing:1 }}>ÉTAPE 2 — OUI OU NON ?</div>
        <div style={{ fontSize:13, color:"rgba(241,245,249,0.6)", marginBottom:14, fontStyle:"italic" }}>"{DEMO_MARKET.title}"</div>
        <div style={{ display:"flex", gap:10 }}>
          {["yes","no"].map(s=>(
            <button key={s} className="btn-animated" onClick={()=>{setChoice(s);setStep(2);}}
              style={{ flex:1, padding:"16px 0", borderRadius:14, border:`2px solid ${choice===s?(s==="yes"?"#10b981":"#ef4444"):"rgba(241,245,249,0.08)"}`, background:choice===s?(s==="yes"?"rgba(16,185,129,0.12)":"rgba(239,68,68,0.12)"):"rgba(241,245,249,0.03)", color:s==="yes"?"#10b981":"#ef4444", fontWeight:800, fontSize:15, cursor:"pointer", transition:"all 0.2s" }}>
              {s==="yes"?`✅ OUI — ${pYes}%`:`❌ NON — ${100-pYes}%`}
            </button>
          ))}
        </div>
      </div>}

      {/* STEP 2 - Montant */}
      {step===2&&<div style={{ animation:"fadeInUp 0.3s ease" }}>
        <div style={{ fontSize:12, color:"rgba(241,245,249,0.5)", marginBottom:10, fontWeight:700, letterSpacing:1 }}>ÉTAPE 3 — COMBIEN DE MC ?</div>
        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          {[50,100,200,500].map(v=>(
            <button key={v} className="btn-animated" onClick={()=>setAmount(v)} style={{ flex:1, padding:"10px 0", borderRadius:10, border:`1px solid ${amount===v?"#10b981":"rgba(241,245,249,0.07)"}`, background:amount===v?"rgba(16,185,129,0.1)":"transparent", color:amount===v?"#10b981":"rgba(241,245,249,0.4)", fontWeight:700, fontSize:13, cursor:"pointer" }}>{v}</button>
          ))}
        </div>
        <div style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:12, padding:"12px 14px", marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}><span style={{ fontSize:13, color:"rgba(241,245,249,0.4)" }}>Mise</span><span style={{ fontFamily:"'Bebas Neue',sans-serif", color:"#fbbf24", fontSize:16 }}>{amount} MC</span></div>
          <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ fontSize:13, color:"rgba(241,245,249,0.4)" }}>Gain potentiel</span><span style={{ fontFamily:"'Bebas Neue',sans-serif", color:"#10b981", fontSize:20 }}>+{gain} MC 🏆</span></div>
        </div>
        <button className="btn-animated" onClick={()=>setStep(3)} style={{ width:"100%", padding:"13px 0", borderRadius:12, border:"none", background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", fontWeight:800, fontSize:15, cursor:"pointer", boxShadow:"0 8px 25px rgba(16,185,129,0.3)" }}>CONFIRMER MA PRÉDICTION →</button>
      </div>}

      {/* STEP 3 - Résultat */}
      {step===3&&<div style={{ animation:"winPop 0.5s ease", textAlign:"center", padding:"10px 0" }}>
        <div style={{ fontSize:48, marginBottom:10 }}>🎉</div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:"#10b981", letterSpacing:2, marginBottom:6 }}>PRÉDICTION PLACÉE !</div>
        <div style={{ fontSize:13, color:"rgba(241,245,249,0.5)", marginBottom:6 }}>Tu as misé <strong style={{color:"#fbbf24"}}>{amount} MC</strong> sur <strong style={{color:choice==="yes"?"#10b981":"#ef4444"}}>{choice==="yes"?"OUI":"NON"}</strong></div>
        <div style={{ fontSize:13, color:"rgba(241,245,249,0.5)", marginBottom:16 }}>Gain potentiel : <strong style={{color:"#10b981"}}>+{gain} MC</strong></div>
        <div style={{ background:"rgba(16,185,129,0.06)", border:"1px solid rgba(16,185,129,0.15)", borderRadius:12, padding:"10px 14px", marginBottom:16, fontSize:12, color:"rgba(241,245,249,0.45)", lineHeight:1.6 }}>
          Dans la vraie app, les gains sont crédités automatiquement quand le résultat est connu. Tu gagnes aussi +5 XP par pari !
        </div>
        <button className="btn-animated" onClick={reset} style={{ padding:"10px 24px", borderRadius:10, border:"1px solid rgba(16,185,129,0.2)", background:"rgba(16,185,129,0.06)", color:"#10b981", fontWeight:700, fontSize:13, cursor:"pointer" }}>🔄 Rejouer la démo</button>
      </div>}
    </div>
  </div>;
}

function HowItWorksPage({ onNavigate }) {
  const [activeStep,setActiveStep]=useState(-1);
  const [videoFrame,setVideoFrame]=useState(0);
  const VIDEO_FRAMES=[
    {bg:"#10b981",icon:"⚽",text:"MARCHE DE PREDICTION",sub:"Parie sur les transferts et matchs"},
    {bg:"#3b82f6",icon:"📈",text:"COTES DYNAMIQUES",sub:"Comme une vraie bourse football"},
    {bg:"#f59e0b",icon:"🏆",text:"GAGNE DES RECOMPENSES",sub:"Maillots, places VIP, cartes cadeaux"},
    {bg:"#a78bfa",icon:"👑",text:"MONTE DE NIVEAU",sub:"Rookie → Scout → Analyst → Pro → Legend"},
    {bg:"#f59e0b",icon:"👑",text:"3 LIGUES DISPONIBLES",sub:"Starter gratuit · Pro 4.99€ · Elite 14.99€"},
    {bg:"#5865f2",icon:"🌐",text:"COMMUNAUTE DISCORD",sub:"News, analyses et marches proposes par les joueurs"},
  ];
  useEffect(()=>{const t=setInterval(()=>setVideoFrame(f=>(f+1)%VIDEO_FRAMES.length),2500);return()=>clearInterval(t);},[]);
  const STEPS=[
    {icon:"🎁",title:"Inscris-toi gratuitement",color:"#10b981",desc:"500 MC gratuits a l'inscription. Aucune carte bancaire requise.",detail:"Les MarketCoins (MC) n'ont aucune valeur monetaire mais te permettent de participer a tous les marches et paris."},
    {icon:"📊",title:"Choisis un marche",color:"#3b82f6",desc:"Transferts, matchs, performances. Chaque marche pose une question sur le football.",detail:"Les cotes bougent selon les paris des autres joueurs, comme une vraie bourse. Plus les gens parient d'un cote, plus la cote baisse."},
    {icon:"⚽",title:"Parie sur les matchs",color:"#f59e0b",desc:"Vainqueur, score exact, 1er buteur, buteur ou +/- buts.",detail:"Quand le match se termine, tes gains sont credites automatiquement si tu as gagne. Chaque pari rapporte +5 XP."},
    {icon:"👑",title:"Choisis ta Ligue",color:"#f59e0b",desc:"Starter gratuit, Pro a 4.99€/mois, Elite a 14.99€/mois.",detail:"Plus ta ligue est elevee, plus tu recois de MC chaque lundi (100 → 150 → 250), plus tes recompenses sont prestigieuses. La ligue Elite donne acces aux marches exclusifs et aux recompenses VIP."},
    {icon:"🏆",title:"Monte de niveau",color:"#a78bfa",desc:"Chaque pari donne 5 XP. Chaque gain donne du XP bonus. La progression est permanente.",detail:"Les badges (Rookie → Scout → Analyst → Pro → Legend) sont ta reputation sur MarketBall. Un joueur niveau 40 a construit un avantage competitif qu'il ne veut pas perdre."},
    {icon:"💎",title:"Gagne des StoreCoins",color:"#34d399",desc:"Via la roue quotidienne (jusqu'a 1 SC/jour) ou le classement hebdomadaire.",detail:"Echange tes SC dans le Store contre des cadeaux reels. Starter : cartes cadeaux. Pro : maillots. Elite : maillots dedicaces et places VIP."},
    {icon:"🎡",title:"Bonus quotidiens",color:"#ec4899",desc:"Roue : jusqu'a 200 MC ou 1 SC par jour. Streak : bonus MC chaque jour consecutif.",detail:"Streak 3 jours = +30 MC, streak 7 jours = +100 MC. Reviens chaque jour pour maximiser tes gains et gravir le classement !"},
    {icon:"🌐",title:"Communaute Discord",color:"#5865f2",desc:"Rejoins le serveur Discord MarketBall pour les news et les analyses.",detail:"News en temps reel, salons exclusifs Pro/Elite, et les meilleurs joueurs (niveau 60+) peuvent proposer leurs propres marches de prediction !"},
  ];
  return <div className="page-enter">
    <div style={{ textAlign:"center", marginBottom:32 }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:36, letterSpacing:3, marginBottom:8 }}>COMMENT CA <span style={{ color:"#10b981" }}>MARCHE ?</span></div>
      <div style={{ fontSize:14, color:"rgba(241,245,249,0.4)", maxWidth:480, margin:"0 auto" }}>La premiere plateforme de predictions football en mode bourse. Gratuit, legal, addictif.</div>
    </div>
    <div style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.07)", borderRadius:18, overflow:"hidden", marginBottom:32 }}>
      <div style={{ background:`linear-gradient(135deg,${VIDEO_FRAMES[videoFrame].bg}22,rgba(3,7,18,0.9))`, padding:"44px 30px", textAlign:"center", transition:"background 0.8s ease", minHeight:190, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", position:"relative" }}>
        <div style={{ position:"absolute", inset:0, background:`radial-gradient(circle at 50% 50%,${VIDEO_FRAMES[videoFrame].bg}15,transparent 70%)`, transition:"all 0.8s ease" }} />
        <div style={{ fontSize:50, marginBottom:12, position:"relative", zIndex:1 }}>{VIDEO_FRAMES[videoFrame].icon}</div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, letterSpacing:3, color:"#f1f5f9", marginBottom:6, position:"relative", zIndex:1 }}>{VIDEO_FRAMES[videoFrame].text}</div>
        <div style={{ fontSize:13, color:"rgba(241,245,249,0.45)", position:"relative", zIndex:1 }}>{VIDEO_FRAMES[videoFrame].sub}</div>
      </div>
      <div style={{ display:"flex", justifyContent:"center", gap:8, padding:"12px 0", background:"rgba(241,245,249,0.02)" }}>
        {VIDEO_FRAMES.map((_,i)=><button key={i} onClick={()=>setVideoFrame(i)} style={{ width:i===videoFrame?22:7, height:7, borderRadius:99, background:i===videoFrame?"#10b981":"rgba(241,245,249,0.15)", border:"none", cursor:"pointer", transition:"all 0.3s ease", padding:0 }} />)}
      </div>
    </div>
    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:2, marginBottom:14 }}>ESSAIE TOI-MÊME</div>
    <BetSimulator />
    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:2, marginBottom:14 }}>LES ÉTAPES</div>
    <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:32 }}>
      {STEPS.map((step,i)=>(
        <div key={i} onClick={()=>setActiveStep(activeStep===i?-1:i)} style={{ background:activeStep===i?"rgba(241,245,249,0.04)":"rgba(241,245,249,0.02)", border:`1px solid ${activeStep===i?step.color+"30":"rgba(241,245,249,0.06)"}`, borderRadius:14, overflow:"hidden", cursor:"pointer", transition:"all 0.2s" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px" }}>
            <div style={{ width:40,height:40,borderRadius:11,background:`${step.color}15`,border:`1px solid ${step.color}25`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0 }}>{step.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:1 }}>{step.title}</div>
              <div style={{ fontSize:12, color:"rgba(241,245,249,0.4)", marginTop:2 }}>{step.desc}</div>
            </div>
            <div style={{ fontSize:14, color:"rgba(241,245,249,0.3)", transition:"transform 0.2s", transform:activeStep===i?"rotate(180deg)":"none" }}>▾</div>
          </div>
          {activeStep===i&&<div style={{ padding:"0 16px 14px 70px", animation:"fadeIn 0.2s ease" }}>
            <div style={{ fontSize:13, color:"rgba(241,245,249,0.45)", lineHeight:1.6, background:`${step.color}08`, border:`1px solid ${step.color}15`, borderRadius:9, padding:"11px 13px" }}>{step.detail}</div>
          </div>}
        </div>
      ))}
    </div>
    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:2, marginBottom:14 }}>FAQ</div>
    <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:32 }}>
      {[
        {q:"C'est gratuit ?",a:"L'inscription est 100% gratuite avec 500 MC offerts. Des abonnements optionnels existent : Pro (4.99€/mois) et Elite (14.99€/mois) pour plus de MC et des récompenses exclusives. Plafond de dépenses à 14.99€/mois."},
        {q:"C'est legal en France ?",a:"Oui, totalement legal. Les MC n'ont aucune valeur monetaire. Ce n'est pas du jeu d'argent."},
        {q:"Comment les paris sont resolus ?",a:"Quand un match se termine, nos systemes resolvent tes paris automatiquement. Si tu as gagne, les coins sont credites et ton XP augmente."},
        {q:"1 SC = combien de MC ?",a:"1 SC = 10 MC lors de la conversion dans le Wallet. Les SC s'achetent a 1€=1SC ou se gagnent avec la roue."},
        {q:"C'est quoi les cotes dynamiques ?",a:"Les cotes bougent selon les paris des joueurs, comme une bourse. Plus les gens parient sur PSG, plus la cote de PSG baisse."},
      ].map((item,i)=>{
        const [open,setOpen]=useState(false);
        return <div key={i} onClick={()=>setOpen(!open)} style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:11, overflow:"hidden", cursor:"pointer" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 16px" }}>
            <div style={{ fontWeight:700, fontSize:13 }}>{item.q}</div>
            <div style={{ fontSize:14, color:"rgba(241,245,249,0.3)", transition:"transform 0.2s", transform:open?"rotate(180deg)":"none" }}>▾</div>
          </div>
          {open&&<div style={{ padding:"0 16px 12px", fontSize:13, color:"rgba(241,245,249,0.4)", lineHeight:1.6, animation:"fadeIn 0.2s ease" }}>{item.a}</div>}
        </div>;
      })}
    </div>
    <div style={{ background:"linear-gradient(135deg,rgba(16,185,129,0.08),rgba(59,130,246,0.05))", border:"1px solid rgba(16,185,129,0.12)", borderRadius:18, padding:"26px", textAlign:"center" }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:2, marginBottom:8 }}>PRET A JOUER ?</div>
      <div style={{ fontSize:13, color:"rgba(241,245,249,0.4)", marginBottom:18 }}>Rejoins des milliers de joueurs et prouve que tu es le meilleur oracle du football</div>
      <button onClick={()=>onNavigate("home")} style={{ padding:"13px 32px", borderRadius:12, border:"none", background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", fontWeight:800, fontSize:14, cursor:"pointer", boxShadow:"0 8px 25px rgba(16,185,129,0.3)" }}>COMMENCER →</button>
    </div>
  </div>;
}

// ============================================================
// PAGES
// ============================================================
function HomePage({ markets, coins, sc, username, onBet, onNavigate, matches, onMatchBet, profile, leaderboard }) {
  const live=matches.filter(m=>m.status==="IN_PLAY"||m.status==="PAUSED").slice(0,3);
  const upcoming=matches.filter(m=>m.status==="SCHEDULED").slice(0,3);
  const level=getLevel(profile?.xp||0);
  const badge=getBadge(level);
  const topMarket=markets.length>0?markets.reduce((a,b)=>(b.total_volume||0)>(a.total_volume||0)?b:a,markets[0]):null;
  const myRank=leaderboard?.findIndex(p=>p.id===profile?.id);
  const rankDisplay=myRank>=0?myRank+1:null;
  const [pulse,setPulse]=useState(false);
  useEffect(()=>{const t=setInterval(()=>setPulse(p=>!p),2000);return()=>clearInterval(t);},[]);

  return <div className="page-enter">
    {/* HERO WELCOME */}
    <div style={{ background:`linear-gradient(135deg,${badge.glow},rgba(59,130,246,0.04))`, border:`1px solid ${badge.color}20`, borderRadius:22, padding:"22px 24px", marginBottom:18, position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:-60, right:-60, width:200, height:200, borderRadius:"50%", background:`radial-gradient(circle,${badge.glow},transparent 70%)`, pointerEvents:"none" }} />
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#10b981", letterSpacing:3 }}>BIENVENUE, {username?.toUpperCase()}</div>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          {rankDisplay&&<div style={{ display:"flex", alignItems:"center", gap:4, background:"rgba(251,191,36,0.1)", border:"1px solid rgba(251,191,36,0.2)", borderRadius:20, padding:"3px 10px" }}>
            <span style={{ fontSize:11 }}>🏆</span>
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:13, color:"#fbbf24", letterSpacing:1 }}>#{rankDisplay} CETTE SEMAINE</span>
          </div>}
          {(profile?.streak||0)>0&&<div style={{ display:"flex", alignItems:"center", gap:4, background:"rgba(245,158,11,0.12)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:20, padding:"3px 10px" }}>
            <span style={{ fontSize:12 }}>🔥</span>
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:13, color:"#f59e0b", letterSpacing:1 }}>{profile.streak}J</span>
          </div>}
        </div>
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:10, flexWrap:"wrap", alignItems:"center" }}><BadgeTag level={level} /><span style={{ fontSize:11, color:"rgba(241,245,249,0.35)" }}>Niv. {level} · {profile?.xp||0} XP</span></div>
      <XPBar xp={profile?.xp||0} />
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginTop:14 }}><MCBadge amount={coins} size="lg" /><SCBadge amount={sc} size="lg" /></div>
    </div>

    {/* MARCHE DU MOMENT */}
    {topMarket&&<div onClick={()=>onBet(topMarket)} style={{ position:"relative", background:"linear-gradient(135deg,rgba(16,185,129,0.1),rgba(59,130,246,0.06))", border:"1px solid rgba(16,185,129,0.2)", borderRadius:20, padding:"18px 20px", marginBottom:20, cursor:"pointer", overflow:"hidden", animation:pulse?"market-pulse 2s ease":"none", transition:"all 0.3s" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"linear-gradient(90deg,#10b981,#3b82f6,#10b981)", backgroundSize:"200% 100%", animation:"shimmer 2s linear infinite" }} />
      <div style={{ position:"absolute", top:-30, right:-30, width:120, height:120, borderRadius:"50%", background:"radial-gradient(circle,rgba(16,185,129,0.1),transparent 70%)", pointerEvents:"none" }} />
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
        <div style={{ width:8, height:8, borderRadius:"50%", background:"#10b981", boxShadow:"0 0 8px #10b981", animation:"pulse 1s infinite" }} />
        <span style={{ fontSize:10, fontWeight:800, color:"#10b981", letterSpacing:2 }}>MARCHÉ DU MOMENT</span>
        <span style={{ marginLeft:"auto", fontSize:10, color:"rgba(241,245,249,0.4)" }}>🔥 {fmt(topMarket.total_volume)} MC misés</span>
      </div>
      <div style={{ fontWeight:800, fontSize:15, color:"#f1f5f9", marginBottom:12, lineHeight:1.4 }}>{topMarket.title}</div>
      <div style={{ display:"flex", gap:8 }}>
        {["OUI","NON"].map((s,i)=>{
          const pct=i===0?Math.round(AMM.probYes(topMarket.q_yes,topMarket.q_no)*100):100-Math.round(AMM.probYes(topMarket.q_yes,topMarket.q_no)*100);
          const c=i===0?"#10b981":"#ef4444";
          return <div key={s} style={{ flex:1, background:`${c}10`, border:`1px solid ${c}25`, borderRadius:10, padding:"8px 10px", textAlign:"center" }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:c, letterSpacing:1 }}>{pct}%</div>
            <div style={{ fontSize:10, color:"rgba(241,245,249,0.4)", fontWeight:700 }}>{s}</div>
          </div>;
        })}
        <div style={{ flex:1, background:"rgba(241,245,249,0.03)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:10, padding:"8px 10px", textAlign:"center" }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:"#f1f5f9", letterSpacing:1 }}>{topMarket.participants||0}</div>
          <div style={{ fontSize:10, color:"rgba(241,245,249,0.4)", fontWeight:700 }}>JOUEURS</div>
        </div>
      </div>
    </div>}

    {/* MATCHS A VENIR */}
    {live.length>0&&<>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:2, marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ width:8, height:8, borderRadius:"50%", background:"#ef4444", animation:"pulse 1s infinite", boxShadow:"0 0 8px #ef4444" }} />
        <span style={{ color:"#ef4444" }}>EN DIRECT</span>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:11, marginBottom:14 }}>{live.map(m=><MatchCard key={m.id} match={m} onBet={onMatchBet} />)}</div>
    </>}
    {upcoming.length>0&&<>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:2, marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ width:3, height:18, background:"#10b981", borderRadius:99, display:"inline-block" }} />MATCHS À VENIR
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:11, marginBottom:14 }}>{upcoming.map(m=><MatchCard key={m.id} match={m} onBet={onMatchBet} />)}</div>
      <button className="btn-animated" onClick={()=>onNavigate("matches")} style={{ width:"100%", marginBottom:26, padding:"11px 0", borderRadius:12, border:"1px solid rgba(241,245,249,0.07)", background:"transparent", color:"rgba(241,245,249,0.35)", fontWeight:700, cursor:"pointer", fontSize:13 }}>Voir tous les matchs →</button>
    </>}

    {/* MARCHES EN VEDETTE */}
    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:2, marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>
      <span style={{ width:3, height:18, background:"#3b82f6", borderRadius:99, display:"inline-block" }} />MARCHES EN VEDETTE
    </div>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))", gap:11 }}>{markets.slice(0,4).map(m=><MarketCard key={m.id} market={m} onBet={onBet} />)}</div>
    <button className="btn-animated" onClick={()=>onNavigate("markets")} style={{ width:"100%", marginTop:14, padding:"11px 0", borderRadius:12, border:"1px solid rgba(241,245,249,0.07)", background:"transparent", color:"rgba(241,245,249,0.35)", fontWeight:700, cursor:"pointer", fontSize:13 }}>Voir tous les marches →</button>

    {/* GUIDE CTA */}
    <div onClick={()=>onNavigate("howto")} className="card-hover" style={{ marginTop:26, background:"rgba(16,185,129,0.04)", border:"1px solid rgba(16,185,129,0.1)", borderRadius:16, padding:"18px 20px", display:"flex", alignItems:"center", gap:14, cursor:"pointer", transition:"all 0.2s" }}>
      <div style={{ width:44, height:44, borderRadius:12, background:"rgba(16,185,129,0.12)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>❓</div>
      <div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:1, marginBottom:2 }}>COMMENT CA MARCHE ?</div>
        <div style={{ fontSize:12, color:"rgba(241,245,249,0.4)" }}>Concept, regles, et comment gagner des recompenses reelles</div>
      </div>
      <div style={{ fontSize:18, color:"rgba(241,245,249,0.3)", marginLeft:"auto" }}>→</div>
    </div>
  </div>;
}

const INTL_SLUGS = ["WC","EURO","NL","FR","WCQ_UEFA","AFCON","COPA","U21UEFA"];
const CLUB_SLUGS = ["PL","FL1","CL","PD","BL1","SA","PPL","EL","BSA","MLS","ERE","TSL"];

function MatchesPage({ matches, onBet, loading }) {
  const [tab,setTab]=useState("clubs"); // "clubs" | "intl"
  const [subComp,setSubComp]=useState("Tous");

  const clubMatches=matches.filter(m=>CLUB_SLUGS.includes(m.competition));
  const intlMatches=matches.filter(m=>INTL_SLUGS.includes(m.competition));
  const activeMatches=tab==="clubs"?clubMatches:intlMatches;

  const subComps=tab==="intl"
    ? ["Tous",...new Set(intlMatches.map(m=>m.competition))]
    : ["Tous",...new Set(clubMatches.map(m=>m.competition))];

  const filtered=subComp==="Tous"?activeMatches:activeMatches.filter(m=>m.competition===subComp);
  const live=filtered.filter(m=>m.status==="IN_PLAY"||m.status==="PAUSED");
  const upcoming=filtered.filter(m=>m.status==="SCHEDULED");

  return <div className="page-enter">
    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, letterSpacing:2, marginBottom:16 }}>MATCHS</div>

    {/* Tabs principaux */}
    <div style={{ display:"flex", gap:8, marginBottom:18 }}>
      {[{id:"clubs",label:"🏟️ Clubs",count:clubMatches.length},{id:"intl",label:"🌍 Internationaux",count:intlMatches.length}].map(t=>(
        <button key={t.id} onClick={()=>{setTab(t.id);setSubComp("Tous");}} className="btn-animated"
          style={{ flex:1, padding:"12px 0", borderRadius:14, border:`2px solid ${tab===t.id?"#10b981":"rgba(241,245,249,0.07)"}`, background:tab===t.id?"rgba(16,185,129,0.08)":"transparent", color:tab===t.id?"#10b981":"rgba(241,245,249,0.35)", fontWeight:700, fontSize:13, cursor:"pointer", transition:"all 0.2s" }}>
          {t.label} <span style={{ fontSize:11, opacity:0.6 }}>({t.count})</span>
        </button>
      ))}
    </div>

    {/* Sous-catégories */}
    <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>
      {subComps.map(c=>(
        <button key={c} onClick={()=>setSubComp(c)} style={{ padding:"5px 12px", borderRadius:20, border:`1px solid ${subComp===c?compColor(c):"rgba(241,245,249,0.07)"}`, background:subComp===c?`${compColor(c)}12`:"transparent", color:subComp===c?compColor(c):"rgba(241,245,249,0.35)", fontWeight:700, fontSize:11, cursor:"pointer", transition:"all 0.2s" }}>
          {c==="Tous"?"🔵 Tous":`${compEmoji(c)} ${compLabel(c)}`}
        </button>
      ))}
    </div>

    {loading&&<div style={{ textAlign:"center", padding:60, color:"rgba(241,245,249,0.25)", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:2, fontSize:16 }}>CHARGEMENT...</div>}

    {!loading&&live.length===0&&upcoming.length===0&&(
      <div style={{ textAlign:"center", padding:60 }}>
        <div style={{ fontSize:40, marginBottom:12 }}>📅</div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:"rgba(241,245,249,0.25)", letterSpacing:2 }}>AUCUN MATCH À VENIR</div>
        <div style={{ fontSize:12, color:"rgba(241,245,249,0.15)", marginTop:6 }}>Reviens bientôt !</div>
      </div>
    )}

    {live.length>0&&<>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
        <div style={{ width:8, height:8, borderRadius:"50%", background:"#ef4444", animation:"pulse 1s infinite", boxShadow:"0 0 8px #ef4444" }} />
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, letterSpacing:2, color:"#ef4444" }}>EN DIRECT</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:11, marginBottom:24 }}>
        {live.map(m=><MatchCard key={m.id} match={m} onBet={onBet} />)}
      </div>
    </>}

    {upcoming.length>0&&<>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, letterSpacing:2, marginBottom:12, color:"#10b981" }}>À VENIR</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:11 }}>
        {upcoming.map(m=><MatchCard key={m.id} match={m} onBet={onBet} />)}
      </div>
    </>}
  </div>;
}

function ProposeMarketModal({ profile, onClose, onSubmit }) {
  const [title,setTitle]=useState("");
  const [category,setCategory]=useState("Transferts");
  const [loading,setLoading]=useState(false);
  const cats=["Transferts","Contrats","Competitions","Performances","Rumeurs"];
  const canSubmit=title.trim().length>=10;
  const submit=async()=>{
    if(!canSubmit) return;
    setLoading(true);
    await onSubmit({title:title.trim(),category,proposed_by:profile?.username||"Elite"});
    setLoading(false);
    onClose();
  };
  return <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(3,7,18,0.88)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(16px)",padding:16,animation:"fadeIn 0.2s ease" }}>
    <div onClick={e=>e.stopPropagation()} style={{ background:"rgba(241,245,249,0.03)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:22,padding:28,width:420,maxWidth:"95vw",boxShadow:"0 50px 100px rgba(0,0,0,0.6)",backdropFilter:"blur(20px)",animation:"fadeInUp 0.3s ease" }}>
      <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:6 }}>
        <div style={{ width:36,height:36,borderRadius:10,background:"rgba(245,158,11,0.15)",border:"1px solid rgba(245,158,11,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>👑</div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:2 }}>PROPOSER UN MARCHÉ</div>
      </div>
      <div style={{ fontSize:12,color:"rgba(241,245,249,0.35)",marginBottom:20 }}>Tu proposes, l'admin valide. Si accepté, tu gagnes +50 XP et 2 SC !</div>
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:11,fontWeight:700,color:"rgba(241,245,249,0.4)",marginBottom:8,letterSpacing:1 }}>QUESTION DE PRÉDICTION</div>
        <textarea value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ex: Mbappé signera à Arsenal avant le 31 août ?" rows={3}
          style={{ width:"100%",padding:"12px 14px",background:"rgba(241,245,249,0.04)",border:`1px solid ${canSubmit?"rgba(245,158,11,0.3)":"rgba(241,245,249,0.08)"}`,borderRadius:11,color:"#f1f5f9",fontSize:13,outline:"none",resize:"none",boxSizing:"border-box",fontFamily:"'DM Sans',sans-serif",lineHeight:1.5 }} />
        <div style={{ fontSize:11,color:"rgba(241,245,249,0.25)",marginTop:4 }}>{title.length}/200 · minimum 10 caractères</div>
      </div>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11,fontWeight:700,color:"rgba(241,245,249,0.4)",marginBottom:8,letterSpacing:1 }}>CATÉGORIE</div>
        <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
          {cats.map(c=><button key={c} onClick={()=>setCategory(c)} style={{ padding:"6px 12px",borderRadius:20,border:`1px solid ${category===c?catColor(c):"rgba(241,245,249,0.07)"}`,background:category===c?`${catColor(c)}12`:"transparent",color:category===c?catColor(c):"rgba(241,245,249,0.35)",fontWeight:700,fontSize:11,cursor:"pointer" }}>{c}</button>)}
        </div>
      </div>
      <button className="btn-animated" onClick={submit} disabled={!canSubmit||loading}
        style={{ width:"100%",padding:"13px 0",borderRadius:12,border:"none",background:canSubmit?"linear-gradient(135deg,#f59e0b,#d97706)":"rgba(241,245,249,0.04)",color:canSubmit?"#fff":"rgba(241,245,249,0.2)",fontWeight:800,fontSize:14,cursor:canSubmit?"pointer":"not-allowed",boxShadow:canSubmit?"0 8px 25px rgba(245,158,11,0.3)":"none" }}>
        {loading?"...":"SOUMETTRE MA PROPOSITION →"}
      </button>
    </div>
  </div>;
}

function MarketsPage({ markets, onBet, profile, session, showToast }) {
  const [cat,setCat]=useState("Tous");
  const [showPropose,setShowPropose]=useState(false);
  const userIsElite=isElite(profile);
  const openMarkets=markets.filter(m=>m.status==="open"&&(!m.elite_only||userIsElite));
  const cats=["Tous",...new Set(openMarkets.map(m=>m.category).filter(Boolean))];
  const filtered=cat==="Tous"?openMarkets:openMarkets.filter(m=>m.category===cat);

  const handlePropose=async({title,category,proposed_by})=>{
    try{
      await req("proposed_markets",{method:"POST",_token:session?.token,body:JSON.stringify({
        title,category,proposed_by,
        proposer_id:session?.user?.id,
        status:"pending",
        created_at:new Date().toISOString()
      })});
      showToast("✅ Proposition envoyée ! L'admin va l'examiner. +50 XP si accepté 👑");
    }catch(e){showToast("Erreur : "+e.message,"error");}
  };

  return <div className="page-enter">
    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20 }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:30,letterSpacing:2 }}>MARCHÉS</div>
    </div>

    {/* Section proposer un marché */}
    {userIsElite?(
      <div onClick={()=>setShowPropose(true)} className="card-hover" style={{ background:"linear-gradient(135deg,rgba(245,158,11,0.08),rgba(245,158,11,0.03))",border:"1px solid rgba(245,158,11,0.2)",borderRadius:16,padding:"16px 20px",marginBottom:20,cursor:"pointer",display:"flex",alignItems:"center",gap:14,position:"relative",overflow:"hidden" }}>
        <div style={{ position:"absolute",top:-20,right:-20,width:100,height:100,borderRadius:"50%",background:"radial-gradient(circle,rgba(245,158,11,0.1),transparent 70%)" }} />
        <div style={{ width:44,height:44,borderRadius:12,background:"rgba(245,158,11,0.15)",border:"1px solid rgba(245,158,11,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>👑</div>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:1,color:"#f59e0b",marginBottom:2 }}>PROPOSER UN MARCHÉ</div>
          <div style={{ fontSize:12,color:"rgba(241,245,249,0.4)" }}>Avantage Elite — propose ta propre question de prédiction</div>
        </div>
        <div style={{ marginLeft:"auto",fontSize:18,color:"rgba(245,158,11,0.5)" }}>→</div>
      </div>
    ):(
      <div style={{ background:"rgba(241,245,249,0.02)",border:"1px solid rgba(241,245,249,0.06)",borderRadius:16,padding:"16px 20px",marginBottom:20,display:"flex",alignItems:"center",gap:14,position:"relative",overflow:"hidden" }}>
        <div style={{ position:"absolute",inset:0,backdropFilter:"blur(1px)",background:"rgba(3,7,18,0.4)",borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center",zIndex:2 }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:24,marginBottom:4 }}>🔒</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:13,color:"#f59e0b",letterSpacing:1 }}>LIGUE ELITE</div>
            <div style={{ fontSize:11,color:"rgba(241,245,249,0.4)",marginTop:2 }}>Requis pour proposer un marché</div>
          </div>
        </div>
        <div style={{ width:44,height:44,borderRadius:12,background:"rgba(241,245,249,0.05)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>👑</div>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:1,color:"rgba(241,245,249,0.3)",marginBottom:2 }}>PROPOSER UN MARCHÉ</div>
          <div style={{ fontSize:12,color:"rgba(241,245,249,0.25)" }}>Avantage Elite — propose ta propre question</div>
        </div>
      </div>
    )}

    <div style={{ display:"flex",gap:7,marginBottom:22,flexWrap:"wrap" }}>{cats.map(c=><button key={c} onClick={()=>setCat(c)} style={{ padding:"6px 13px",borderRadius:20,border:`1px solid ${cat===c?catColor(c):"rgba(241,245,249,0.07)"}`,background:cat===c?`${catColor(c)}12`:"transparent",color:cat===c?catColor(c):"rgba(241,245,249,0.35)",fontWeight:700,fontSize:12,cursor:"pointer",transition:"all 0.2s" }}>{c}</button>)}</div>
    {filtered.length===0&&<div style={{ textAlign:"center",padding:60,color:"rgba(241,245,249,0.25)" }}>Aucun marché ouvert</div>}
    <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:11 }}>{filtered.map(m=><MarketCard key={m.id} market={m} onBet={onBet} />)}</div>
    {showPropose&&<ProposeMarketModal profile={profile} onClose={()=>setShowPropose(false)} onSubmit={handlePropose} />}
  </div>;
}

function WalletPage({ coins, sc, bets, matchBets, profile, onSpin, onWatchAd, onConvertSC, onCashout, markets }) {
  const [convertAmount,setConvertAmount]=useState(1);
  const lastSpin=profile?.last_spin?new Date(profile.last_spin).getTime():0;
  const canSpin=Date.now()-lastSpin>86400000;
  const today=new Date().toISOString().split("T")[0];
  const adsToday=profile?.ads_reset_date===today?(profile?.ads_watched_today||0):0;
  const canAd=adsToday<3;
  const weekKey=getWeekKey();
  const weeklyConverted=profile?.weekly_reset_date===weekKey?(profile?.weekly_mc_purchased||0):0;
  const remainingLimit=WEEKLY_MC_LIMIT-weeklyConverted;
  const mcFromConvert=convertAmount*10; // 1 SC = 10 MC
  const allBets=[...(matchBets||[]).map(b=>({...b,isMatch:true})),...(bets||[]).map(b=>({...b,isMatch:false}))];

  return <div className="page-enter">
    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, letterSpacing:2, marginBottom:20 }}>WALLET</div>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
      {[{l:"MARKETCOINS",v:coins,c:"#fbbf24",d:"Pour jouer"},{l:"STORECOINS",v:sc,c:"#10b981",d:"Pour les recompenses"}].map(item=>(
        <div key={item.l} style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:16, padding:"18px", textAlign:"center", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:-20, right:-20, width:80, height:80, borderRadius:"50%", background:`radial-gradient(circle,${item.c}12,transparent 70%)` }} />
          <div style={{ fontSize:10, color:"rgba(241,245,249,0.3)", fontWeight:700, letterSpacing:1.5, marginBottom:6 }}>{item.l}</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:36, color:item.c, letterSpacing:2 }}>{fmt(item.v)}</div>
          <div style={{ fontSize:11, color:"rgba(241,245,249,0.2)", marginTop:3 }}>{item.d}</div>
        </div>
      ))}
    </div>
    <div style={{ background:"rgba(59,130,246,0.04)", border:"1px solid rgba(59,130,246,0.1)", borderRadius:14, padding:"16px 18px", marginBottom:14 }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:1, color:"#60a5fa", marginBottom:4 }}>CONVERTIR SC EN MC</div>
      <div style={{ fontSize:12, color:"rgba(241,245,249,0.3)", marginBottom:10 }}>1 SC = 10 MC · {remainingLimit} MC disponibles cette semaine</div>
      <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
        <div style={{ flex:1 }}>
          <input type="number" value={convertAmount} min={1} max={Math.min(sc,Math.floor(remainingLimit/10))} onChange={e=>setConvertAmount(Math.max(1,Math.min(sc,Math.floor(remainingLimit/10),+e.target.value||1)))}
            style={{ width:"100%", padding:"9px 12px", background:"rgba(241,245,249,0.04)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:10, color:"#f1f5f9", fontSize:16, fontWeight:700, outline:"none", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:1 }} />
          <div style={{ fontSize:11, color:"#10b981", marginTop:4 }}>= {mcFromConvert} MC</div>
        </div>
        <button onClick={()=>sc>=convertAmount&&remainingLimit>=mcFromConvert&&onConvertSC(convertAmount)}
          disabled={sc<convertAmount||remainingLimit<mcFromConvert}
          style={{ padding:"9px 16px", borderRadius:10, border:"none", background:sc>=convertAmount&&remainingLimit>=mcFromConvert?"linear-gradient(135deg,#3b82f6,#2563eb)":"rgba(241,245,249,0.04)", color:sc>=convertAmount&&remainingLimit>=mcFromConvert?"#fff":"rgba(241,245,249,0.2)", fontWeight:800, cursor:"pointer", fontSize:13, whiteSpace:"nowrap", marginTop:2 }}>
          Convertir →
        </button>
      </div>
    </div>
    <div style={{ background:"rgba(245,158,11,0.04)", border:"1px solid rgba(245,158,11,0.1)", borderRadius:16, padding:"20px", marginBottom:12 }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:1, marginBottom:4 }}>ROUE QUOTIDIENNE</div>
      <div style={{ fontSize:12, color:"rgba(241,245,249,0.3)", marginBottom:16 }}>Jusqu'a 200 MC ou 1 SC par jour !</div>
      <SpinWheel onSpin={onSpin} canSpin={canSpin} />
    </div>
    <div style={{ background:"rgba(59,130,246,0.04)", border:"1px solid rgba(59,130,246,0.1)", borderRadius:14, padding:"16px 20px", marginBottom:22 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <div><div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:1, marginBottom:2 }}>PUB RECOMPENSEE</div><div style={{ fontSize:12, color:"rgba(241,245,249,0.3)" }}>+20 MC · {adsToday}/3 aujourd'hui</div></div>
        <button onClick={()=>canAd&&onWatchAd()} disabled={!canAd} style={{ padding:"9px 16px", borderRadius:10, border:"none", background:canAd?"linear-gradient(135deg,#3b82f6,#2563eb)":"rgba(241,245,249,0.04)", color:canAd?"#fff":"rgba(241,245,249,0.2)", fontWeight:800, cursor:canAd?"pointer":"not-allowed", fontSize:13 }}>{canAd?"REGARDER":"Limite"}</button>
      </div>
      <div style={{ height:3, background:"rgba(59,130,246,0.1)", borderRadius:99, overflow:"hidden" }}><div style={{ width:`${(adsToday/3)*100}%`, height:"100%", background:"linear-gradient(90deg,#3b82f6,#60a5fa)", borderRadius:99, transition:"width 0.5s" }} /></div>
    </div>
    {allBets.length>0&&<>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:2, marginBottom:12 }}>MES PARIS</div>
      {allBets.slice(0,15).map((b,i)=>{
        // Cashout marché AMM
        const isMarketBet=!b.isMatch&&!!b.market_id;
        const isMatchBet=!!b.isMatch;
        const canCashoutMarket=isPro(profile)&&b.status==="pending"&&isMarketBet&&b.side&&b.amount&&b.id;
        const canCashoutMatch=isPro(profile)&&b.status==="pending"&&isMatchBet&&b.id;
        const market=markets?.find(m=>m.id===b.market_id);
        const cashoutMarketVal=canCashoutMarket&&market?AMM.cashoutValue(market.q_yes,market.q_no,b.amount,b.side):0;
        const cashoutMatchVal=canCashoutMatch?Math.round((b.cost||0)*0.75):0; // 75% remboursé
        const canCashout=canCashoutMarket||canCashoutMatch;
        const cashoutVal=isMarketBet?cashoutMarketVal:cashoutMatchVal;
        const statusLabel=b.status==="cashed_out"?"CASHOUT":b.status;
        return <div key={i} style={{ background:b.status==="won"?"rgba(16,185,129,0.06)":b.status==="lost"?"rgba(239,68,68,0.06)":b.status==="cashed_out"?"rgba(59,130,246,0.06)":"rgba(241,245,249,0.02)", border:`1px solid ${b.status==="won"?"rgba(16,185,129,0.2)":b.status==="lost"?"rgba(239,68,68,0.15)":b.status==="cashed_out"?"rgba(59,130,246,0.2)":"rgba(241,245,249,0.05)"}`, borderRadius:12, padding:"13px 16px", marginBottom:8 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:13, marginBottom:3 }}>{b.market_title||b.match_title||"Paris"}</div>
              <div style={{ fontSize:12, color:"rgba(241,245,249,0.3)" }}>
                <span style={{ color:b.status==="won"?"#10b981":b.status==="lost"?"#ef4444":"#60a5fa", fontWeight:700 }}>{b.side||b.prediction}</span>
                {" · "}{fmt(b.cost)} MC
                {isMatchBet&&<span style={{ marginLeft:6, fontSize:10, color:"rgba(241,245,249,0.25)" }}>⚽ Match</span>}
                {isMarketBet&&<span style={{ marginLeft:6, fontSize:10, color:"rgba(241,245,249,0.25)" }}>📊 Marché</span>}
              </div>
            </div>
            <div style={{ textAlign:"right", flexShrink:0 }}>
              {b.status==="won"?<div style={{ fontFamily:"'Bebas Neue',sans-serif", color:"#10b981", fontSize:16, letterSpacing:1 }}>+{fmt(b.potential_gain)} 🏆</div>
                :b.status==="lost"?<div style={{ fontFamily:"'Bebas Neue',sans-serif", color:"#ef4444", fontSize:14, letterSpacing:1 }}>PERDU</div>
                :b.status==="cashed_out"?<div style={{ fontFamily:"'Bebas Neue',sans-serif", color:"#3b82f6", fontSize:14, letterSpacing:1 }}>CASHÉ 💰</div>
                :<><div style={{ fontSize:10, padding:"2px 8px", borderRadius:20, background:"rgba(251,191,36,0.1)", color:"#fbbf24", fontWeight:700, marginBottom:3, display:"inline-block" }}>En cours</div><div style={{ fontFamily:"'Bebas Neue',sans-serif", color:"#10b981", fontSize:15, letterSpacing:1 }}>+{fmt(b.potential_gain)}</div></>}
            </div>
          </div>
          {canCashout&&cashoutVal>0&&<div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid rgba(241,245,249,0.05)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:11, color:"rgba(241,245,249,0.35)" }}>
              {isMarketBet?"Cashout selon cotes actuelles":"Cashout anticipé · 75% remboursé"}
              <span style={{ color:"#3b82f6", fontWeight:700, marginLeft:6 }}>⚡ Pro</span>
            </div>
            <button className="btn-animated" onClick={()=>onCashout(b,cashoutVal,b.isMatch)}
              style={{ padding:"5px 12px", borderRadius:8, border:"none", background:"linear-gradient(135deg,#3b82f6,#2563eb)", color:"#fff", fontWeight:800, fontSize:11, cursor:"pointer", boxShadow:"0 4px 12px rgba(59,130,246,0.3)" }}>
              +{fmt(cashoutVal)} MC
            </button>
          </div>}
        </div>;
      })}
    </>}
  </div>;
}

function useCountdown() {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const nextMonday = new Date(now);
      const day = now.getDay();
      const daysUntilMonday = day === 0 ? 1 : 8 - day;
      nextMonday.setDate(now.getDate() + daysUntilMonday);
      nextMonday.setHours(0, 0, 0, 0);
      const diff = nextMonday - now;
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${d}j ${String(h).padStart(2,"0")}h ${String(m).padStart(2,"0")}m ${String(s).padStart(2,"0")}s`);
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, []);
  return timeLeft;
}

const WEEKLY_REWARDS = [
  { rank: 1, sc: 25, emoji: "🥇", color: "#fbbf24" },
  { rank: 2, sc: 20, emoji: "🥈", color: "#94a3b8" },
  { rank: 3, sc: 15, emoji: "🥉", color: "#cd7f32" },
  { rank: 4, sc: 5, emoji: "4️⃣", color: "#6b7280" },
  { rank: 5, sc: 5, emoji: "5️⃣", color: "#6b7280" },
];

function LeaderboardPage({ leaderboard, username }) {
  const topColors=["#94a3b8","#fbbf24","#cd7f32"];
  const medals=["🥈","🥇","🥉"];
  const countdown = useCountdown();
  return <div className="page-enter">
    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, letterSpacing:2, marginBottom:6 }}>CLASSEMENT</div>
    <div style={{ fontSize:13, color:"rgba(241,245,249,0.35)", marginBottom:16 }}>Classe par gains MC des paris uniquement</div>

    {/* Compte a rebours */}
    <div style={{ background:"linear-gradient(135deg,rgba(251,191,36,0.08),rgba(251,191,36,0.03))", border:"1px solid rgba(251,191,36,0.15)", borderRadius:16, padding:"16px 18px", marginBottom:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:1, color:"#fbbf24", marginBottom:2 }}>⏰ REINITIALISATION DANS</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, letterSpacing:2, color:"#f1f5f9" }}>{countdown}</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:10, color:"rgba(241,245,249,0.35)", marginBottom:4 }}>Chaque lundi à 00h00</div>
          <div style={{ fontSize:11, color:"#10b981", fontWeight:700 }}>Classement remis à zéro</div>
        </div>
      </div>
      {/* Récompenses */}
      <div style={{ borderTop:"1px solid rgba(251,191,36,0.1)", paddingTop:12 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"rgba(241,245,249,0.4)", letterSpacing:1, marginBottom:8 }}>RECOMPENSES DE FIN DE SEMAINE</div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {WEEKLY_REWARDS.map(r=>(
            <div key={r.rank} style={{ flex:"1 1 80px", background:`${r.color}10`, border:`1px solid ${r.color}25`, borderRadius:10, padding:"8px 6px", textAlign:"center" }}>
              <div style={{ fontSize:16, marginBottom:3 }}>{r.emoji}</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14, color:r.color, letterSpacing:1 }}>{r.sc} SC</div>
            </div>
          ))}
        </div>
      </div>
    </div>

    <div style={{ background:"rgba(16,185,129,0.04)", border:"1px solid rgba(16,185,129,0.1)", borderRadius:10, padding:"10px 14px", marginBottom:22, fontSize:12, color:"rgba(241,245,249,0.35)" }}>
      Roue et pubs ne comptent pas — seuls tes paris font la difference !
    </div>
    <div style={{ display:"flex", gap:10, marginBottom:24, alignItems:"flex-end" }}>
      {[leaderboard[1],leaderboard[0],leaderboard[2]].map((p,vi)=>{
        if(!p) return <div key={vi} style={{ flex:1 }} />;
        const hs=[130,155,130];
        return <div key={p.username} style={{ flex:1, background:`${topColors[vi]}0d`, border:`1px solid ${topColors[vi]}20`, borderRadius:16, padding:"14px 10px", textAlign:"center", height:hs[vi], display:"flex", flexDirection:"column", justifyContent:"flex-end", position:"relative" }}>
          <div style={{ position:"absolute", top:8, left:"50%", transform:"translateX(-50%)", fontSize:20 }}>{medals[vi]}</div>
          <BadgeTag level={getLevel(p.xp||0)} />
          <div style={{ fontWeight:700, fontSize:12, color:"#f1f5f9", marginBottom:2, marginTop:6 }}>{p.username}</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:topColors[vi], letterSpacing:1 }}>+{fmt(p.total_profit||0)}</div>
        </div>;
      })}
    </div>
    {leaderboard.map((p,i)=>(
      <div key={p.username} style={{ background:p.username===username?"rgba(16,185,129,0.04)":"rgba(241,245,249,0.02)", border:`1px solid ${p.username===username?"rgba(16,185,129,0.12)":"rgba(241,245,249,0.04)"}`, borderRadius:12, padding:"12px 16px", marginBottom:6, display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:28, height:28, borderRadius:"50%", background:i<3?`linear-gradient(135deg,${topColors[i]},${topColors[i]}88)`:"rgba(241,245,249,0.06)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:13, flexShrink:0, color:i<3?"#000":"rgba(241,245,249,0.4)" }}>{i+1}</div>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
            <span style={{ fontWeight:700, color:p.username===username?"#10b981":"#f1f5f9", fontSize:13 }}>{p.username}</span>
            <BadgeTag level={getLevel(p.xp||0)} />
            {p.subscription&&p.subscription!=="starter"&&<SubBadge profile={p} />}
            {p.username===username&&<span style={{ fontSize:10, color:"#10b981" }}>(Vous)</span>}
          </div>
          <div style={{ fontSize:11, color:"rgba(241,245,249,0.25)" }}>{p.total_wins}/{p.total_bets} paris · Niv. {getLevel(p.xp||0)}</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, color:"#10b981", letterSpacing:1 }}>+{fmt(p.total_profit||0)}</div>
          <div style={{ fontSize:10, color:"rgba(241,245,249,0.25)" }}>gain total</div>
          {i<5&&<div style={{ fontSize:10, color:WEEKLY_REWARDS[i]?.color||"#6b7280", fontWeight:700 }}>+{WEEKLY_REWARDS[i]?.sc} SC lundi</div>}
        </div>
      </div>
    ))}
  </div>;
}

// ============================================================
// PAGE ABONNEMENTS
// ============================================================
function SubscriptionPage({ profile, onSubscribe }) {
  const currentSub=getSubPlan(profile);
  return <div className="page-enter">
    {/* HERO */}
    <div style={{ position:"relative", textAlign:"center", padding:"32px 20px 28px", marginBottom:32, background:"linear-gradient(180deg,rgba(16,185,129,0.06),transparent)", borderRadius:24, border:"1px solid rgba(16,185,129,0.08)", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:-60, left:"50%", transform:"translateX(-50%)", width:300, height:300, borderRadius:"50%", background:"radial-gradient(circle,rgba(16,185,129,0.07),transparent 65%)", pointerEvents:"none" }} />
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:11, letterSpacing:4, color:"#10b981", marginBottom:10 }}>CHOISIR TA LIGUE</div>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:38, letterSpacing:3, marginBottom:8 }}>TES <span style={{ color:"#10b981" }}>AVANTAGES</span></div>
      <div style={{ fontSize:13, color:"rgba(241,245,249,0.4)", maxWidth:380, margin:"0 auto", lineHeight:1.6 }}>Plus ta ligue est élevée, plus tu reçois de MC chaque lundi et plus tes récompenses sont exclusives.</div>
      {/* Barre progression */}
      <div style={{ marginTop:20, position:"relative" }}>
        <div style={{ height:4, borderRadius:99, background:"rgba(241,245,249,0.06)", overflow:"hidden", margin:"0 20px" }}>
          <div style={{ width:currentSub==="starter"?"16%":currentSub==="pro"?"50%":"100%", height:"100%", background:`linear-gradient(90deg,#94a3b8,${getSubColor(currentSub)})`, borderRadius:99, transition:"width 1.2s ease", boxShadow:`0 0 10px ${getSubColor(currentSub)}` }} />
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:8, padding:"0 16px" }}>
          {SUBSCRIPTION_PLANS.map(p=>(
            <div key={p.id} style={{ textAlign:"center", opacity:p.id===currentSub?1:0.4 }}>
              <div style={{ fontSize:16, marginBottom:2 }}>{p.emoji}</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:10, color:p.color, letterSpacing:1 }}>{p.label}</div>
              {p.id===currentSub&&<div style={{ width:6, height:6, borderRadius:"50%", background:p.color, margin:"4px auto 0", boxShadow:`0 0 6px ${p.color}` }} />}
            </div>
          ))}
        </div>
      </div>
    </div>
    {/* Hero plan actuel */}
    <div style={{ position:"relative", background:`linear-gradient(135deg,${getSubColor(currentSub)}18,rgba(3,7,18,0.95))`, border:`1px solid ${getSubColor(currentSub)}35`, borderRadius:22, padding:"24px 22px", marginBottom:32, overflow:"hidden" }}>
      <div style={{ position:"absolute", top:-40, right:-40, width:180, height:180, borderRadius:"50%", background:`radial-gradient(circle,${getSubColor(currentSub)}20,transparent 70%)`, pointerEvents:"none" }} />
      <div style={{ fontSize:10, color:"rgba(241,245,249,0.35)", fontWeight:700, letterSpacing:2, marginBottom:10 }}>TON ABONNEMENT ACTUEL</div>
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:14 }}>
        <div style={{ width:56, height:56, borderRadius:16, background:`${getSubColor(currentSub)}20`, border:`2px solid ${getSubColor(currentSub)}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, boxShadow:`0 0 20px ${getSubColor(currentSub)}25` }}>{getSubEmoji(currentSub)}</div>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:getSubColor(currentSub), letterSpacing:2 }}>{getSubLabel(currentSub)}</div>
          <div style={{ fontSize:12, color:"rgba(241,245,249,0.45)", marginTop:2 }}>{getMCBoost(currentSub)} MarketCoins offerts chaque lundi</div>
        </div>
      </div>
      <div style={{ height:3, borderRadius:99, background:"rgba(241,245,249,0.06)", overflow:"hidden" }}>
        <div style={{ width:currentSub==="starter"?"33%":currentSub==="pro"?"66%":"100%", height:"100%", background:`linear-gradient(90deg,${getSubColor(currentSub)}88,${getSubColor(currentSub)})`, borderRadius:99, transition:"width 1s ease", boxShadow:`0 0 8px ${getSubColor(currentSub)}` }} />
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
        {["Starter","Pro","Elite"].map((l,i)=><span key={l} style={{ fontSize:9, fontWeight:700, color:["#94a3b8","#3b82f6","#f59e0b"][i], opacity:["starter","pro","elite"][i]===currentSub?1:0.35 }}>{l}</span>)}
      </div>
    </div>
    {/* Comparatif */}
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {SUBSCRIPTION_PLANS.map((plan,idx)=>{
        const isCurrent=currentSub===plan.id;
        const color=plan.color;
        return <div key={plan.id} style={{ position:"relative", borderRadius:22, overflow:"hidden", border:`1px solid ${isCurrent?color+"50":plan.popular?"rgba(59,130,246,0.2)":"rgba(241,245,249,0.06)"}`, boxShadow:isCurrent?`0 8px 40px ${color}20`:plan.popular?"0 8px 30px rgba(59,130,246,0.1)":"none" }}>
          {/* Gradient top band */}
          <div style={{ height:4, background:isCurrent?`linear-gradient(90deg,${color},${color}88)`:plan.popular?"linear-gradient(90deg,#3b82f6,#2563eb)":"rgba(241,245,249,0.06)" }} />
          <div style={{ background:isCurrent?`linear-gradient(145deg,${color}10,rgba(3,7,18,0.98))`:"rgba(241,245,249,0.02)", padding:"20px 22px 22px" }}>
            {/* Badge */}
            {plan.popular&&!isCurrent&&<div style={{ display:"inline-flex", alignItems:"center", gap:5, background:"rgba(59,130,246,0.12)", border:"1px solid rgba(59,130,246,0.25)", borderRadius:20, padding:"3px 10px", marginBottom:14, fontSize:10, fontWeight:800, color:"#60a5fa", letterSpacing:1 }}>⚡ POPULAIRE</div>}
            {isCurrent&&<div style={{ display:"inline-flex", alignItems:"center", gap:5, background:`${color}15`, border:`1px solid ${color}30`, borderRadius:20, padding:"3px 10px", marginBottom:14, fontSize:10, fontWeight:800, color, letterSpacing:1 }}>✓ TON PLAN</div>}
            {plan.id==="elite"&&!isCurrent&&<div style={{ display:"inline-flex", alignItems:"center", gap:5, background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.2)", borderRadius:20, padding:"3px 10px", marginBottom:14, fontSize:10, fontWeight:800, color:"#f59e0b", letterSpacing:1 }}>👑 PREMIUM</div>}
            {plan.id==="starter"&&!isCurrent&&<div style={{ marginBottom:14 }} />}
            {/* Header */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:52, height:52, borderRadius:15, background:`${color}18`, border:`1px solid ${color}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, boxShadow:isCurrent?`0 0 20px ${color}30`:"none" }}>{plan.emoji}</div>
                <div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, letterSpacing:2, color:isCurrent?color:"#f1f5f9" }}>{plan.label.toUpperCase()}</div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:plan.id==="starter"?"rgba(241,245,249,0.3)":"#fbbf24", letterSpacing:1 }}>{plan.priceLabel}</div>
                </div>
              </div>
              <div style={{ textAlign:"center", background:"rgba(251,191,36,0.06)", border:"1px solid rgba(251,191,36,0.15)", borderRadius:12, padding:"8px 14px" }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:"#fbbf24", letterSpacing:1, lineHeight:1 }}>{plan.mcBoost}</div>
                <div style={{ fontSize:9, color:"rgba(241,245,249,0.3)", fontWeight:700, letterSpacing:1, marginTop:2 }}>MC/LUNDI</div>
              </div>
            </div>
            {/* Features */}
            <div style={{ display:"flex", flexDirection:"column", gap:7, marginBottom:20, background:"rgba(241,245,249,0.02)", borderRadius:12, padding:"14px" }}>
              {(plan.features||[]).map(f=><div key={f} style={{ display:"flex", alignItems:"center", gap:9, fontSize:12, color:"rgba(241,245,249,0.7)" }}>
                <div style={{ width:18, height:18, borderRadius:5, background:`${color}20`, border:`1px solid ${color}35`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <span style={{ color, fontSize:10, fontWeight:800 }}>✓</span>
                </div>
                {f}
              </div>)}
              {(plan.noFeatures||[]).map(f=><div key={f} style={{ display:"flex", alignItems:"center", gap:9, fontSize:12, color:"rgba(241,245,249,0.18)" }}>
                <div style={{ width:18, height:18, borderRadius:5, background:"rgba(241,245,249,0.03)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <span style={{ fontSize:10 }}>✗</span>
                </div>
                {f}
              </div>)}
            </div>
            {isCurrent?(
              <div style={{ display:"flex", gap:8 }}>
                <div style={{ flex:1, padding:"12px 0", borderRadius:12, background:`${color}12`, border:`1px solid ${color}25`, color, fontWeight:800, fontSize:13, textAlign:"center" }}>✓ Plan actuel</div>
                {plan.id!=="starter"&&<button onClick={()=>onSubscribe("starter")} style={{ padding:"12px 16px", borderRadius:12, border:"1px solid rgba(239,68,68,0.15)", background:"rgba(239,68,68,0.05)", color:"#f87171", fontWeight:700, fontSize:12, cursor:"pointer" }}>Résilier</button>}
                {plan.id==="pro"&&<button onClick={()=>onSubscribe("elite")} style={{ flex:1, padding:"12px 0", borderRadius:12, border:"none", background:"linear-gradient(135deg,#f59e0b,#d97706)", color:"#fff", fontWeight:800, fontSize:13, cursor:"pointer", boxShadow:"0 6px 20px rgba(245,158,11,0.3)" }}>Passer Elite 👑</button>}
              </div>
            ):(
              <button onClick={()=>onSubscribe(plan.id)} style={{ width:"100%", padding:"14px 0", borderRadius:13, border:"none", background:plan.id==="starter"?"rgba(241,245,249,0.04)":`linear-gradient(135deg,${color},${color}aa)`, color:plan.id==="starter"?"rgba(241,245,249,0.25)":"#fff", fontWeight:800, fontSize:14, cursor:plan.id==="starter"?"default":"pointer", boxShadow:plan.id!=="starter"?`0 10px 30px ${color}30`:"none", letterSpacing:plan.id!=="starter"?0.5:0, transition:"all 0.2s" }}>
                {plan.id==="starter"?"Plan gratuit par défaut":`S'abonner — ${plan.priceLabel} →`}
              </button>
            )}
          </div>
        </div>;
      })}
    </div>
    {/* Note légale */}
    <div style={{ marginTop:24, padding:"12px 16px", background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.05)", borderRadius:12, fontSize:11, color:"rgba(241,245,249,0.25)", lineHeight:1.7 }}>
      Plafond de dépenses : 14,99€/mois. Les MarketCoins n'ont aucune valeur monétaire. Résiliation possible à tout moment. Conforme à la loi JONUM française.
    </div>
  </div>;
}

function StorePage({ coins, sc, profile, onRedeemSC, onSubscribe, onNavigate }) {
  const currentSub=getSubPlan(profile);
  const subColor=getSubColor(currentSub);

  return <div className="page-enter">
    {/* HERO HEADER */}
    <div style={{ position:"relative", background:`linear-gradient(135deg,${subColor}20,rgba(3,7,18,0.98))`, border:`1px solid ${subColor}30`, borderRadius:24, padding:"24px 22px", marginBottom:28, overflow:"hidden" }}>
      <div style={{ position:"absolute", top:-50, right:-50, width:200, height:200, borderRadius:"50%", background:`radial-gradient(circle,${subColor}25,transparent 70%)`, pointerEvents:"none" }} />
      <div style={{ position:"absolute", bottom:-30, left:-30, width:140, height:140, borderRadius:"50%", background:`radial-gradient(circle,${subColor}12,transparent 70%)`, pointerEvents:"none" }} />
      <div style={{ fontSize:10, fontWeight:700, color:"rgba(241,245,249,0.35)", letterSpacing:2, marginBottom:12 }}>MON STORE</div>
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <MCBadge amount={coins} size="lg" />
        <SCBadge amount={sc} size="lg" />
      </div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:40, height:40, borderRadius:11, background:`${subColor}20`, border:`1px solid ${subColor}35`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{getSubEmoji(currentSub)}</div>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:subColor, letterSpacing:1 }}>LIGUE {getSubLabel(currentSub).toUpperCase()}</div>
            <div style={{ fontSize:11, color:"rgba(241,245,249,0.35)" }}>{getMCBoost(currentSub)} MC chaque lundi</div>
          </div>
        </div>
        <button onClick={()=>onNavigate("subscription")} style={{ padding:"7px 14px", borderRadius:10, border:`1px solid ${subColor}35`, background:`${subColor}12`, color:subColor, fontWeight:700, fontSize:11, cursor:"pointer" }}>Changer →</button>
      </div>
    </div>
    {/* TITRE */}
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
      <div style={{ width:3, height:22, background:"linear-gradient(180deg,#10b981,#3b82f6)", borderRadius:99 }} />
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, letterSpacing:2 }}>RÉCOMPENSES</div>
    </div>
    <div style={{ fontSize:12, color:"rgba(241,245,249,0.35)", marginBottom:24 }}>Échange tes 💎 SC contre des cadeaux réels. Les ligues supérieures débloquent de meilleures récompenses.</div>

    {/* RECOMPENSES PAR LIGUE */}
    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:2, marginBottom:6 }}>RÉCOMPENSES</div>
    <div style={{ fontSize:12, color:"rgba(241,245,249,0.35)", marginBottom:20 }}>Échange tes SC contre des récompenses exclusives selon ta ligue.</div>
    {["starter","pro","elite"].map(planId=>{
      const planInfo=SUBSCRIPTION_PLANS.find(p=>p.id===planId);
      const items=STORE_ITEMS.filter(r=>r.plan===planId);
      const planOrder=["starter","pro","elite"];
      const userOrder=planOrder.indexOf(currentSub);
      const planOrderIdx=planOrder.indexOf(planId);
      const accessible=userOrder>=planOrderIdx;
      return <div key={planId} style={{ marginBottom:28 }}>
        {/* Section header */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, paddingBottom:10, borderBottom:`1px solid ${planInfo.color}20` }}>
          <div style={{ width:32, height:32, borderRadius:9, background:`${planInfo.color}15`, border:`1px solid ${planInfo.color}25`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{planInfo.emoji}</div>
          <div>
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:17, letterSpacing:1, color:planInfo.color }}>{planInfo.label}</span>
            {!accessible&&<span style={{ marginLeft:8, fontSize:10, color:planInfo.color, background:`${planInfo.color}12`, border:`1px solid ${planInfo.color}25`, borderRadius:20, padding:"2px 9px", fontWeight:700 }}>🔒 Débloquer</span>}
            {accessible&&<span style={{ marginLeft:8, fontSize:10, color:"#10b981", fontWeight:700 }}>✓ Débloqué</span>}
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(185px,1fr))", gap:10 }}>
          {items.map(r=>{
            const affordable=sc>=r.cost;
            return <div key={r.id} className="card-hover" style={{ background:accessible?`${planInfo.color}05`:"rgba(241,245,249,0.015)", border:`1px solid ${accessible?planInfo.color+"25":"rgba(241,245,249,0.06)"}`, borderRadius:16, overflow:"hidden", position:"relative", transition:"all 0.2s" }}>
              {/* Contenu visible même si locked */}
              <div style={{ padding:"16px 16px 12px", filter:accessible?"none":"blur(0px)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                  <div style={{ fontSize:34 }}>{r.emoji}</div>
                  <div style={{ background:`${planInfo.color}15`, border:`1px solid ${planInfo.color}25`, borderRadius:8, padding:"3px 8px", textAlign:"right" }}>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:13, color:planInfo.color }}>{r.value}</div>
                  </div>
                </div>
                <div style={{ fontWeight:800, fontSize:13, color:accessible?"#f1f5f9":"rgba(241,245,249,0.5)", marginBottom:3 }}>{r.name}</div>
                <div style={{ fontSize:11, color:"rgba(241,245,249,0.3)", marginBottom:10, lineHeight:1.4 }}>{r.description}</div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:13, color:"#10b981" }}>💎 {r.cost} SC</div>
                  {accessible?(
                    <button onClick={()=>affordable&&onRedeemSC(r)} disabled={!affordable}
                      style={{ padding:"6px 12px", borderRadius:8, border:"none", background:affordable?`linear-gradient(135deg,${planInfo.color},${planInfo.color}cc)`:"rgba(241,245,249,0.06)", color:affordable?"#fff":"rgba(241,245,249,0.25)", fontWeight:800, fontSize:11, cursor:affordable?"pointer":"not-allowed", transition:"all 0.2s" }}>
                      {affordable?"OBTENIR":"Insuf."}
                    </button>
                  ):(
                    <div style={{ fontSize:11, color:planInfo.color, fontWeight:700 }}>🔒</div>
                  )}
                </div>
              </div>
              {/* Overlay lock - semi transparent pour voir le contenu */}
              {!accessible&&<div style={{ position:"absolute", inset:0, background:`linear-gradient(135deg,rgba(3,7,18,0.55),rgba(3,7,18,0.65))`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", backdropFilter:"blur(1.5px)", cursor:"pointer" }} onClick={()=>onNavigate("subscription")}>
                <div style={{ width:38, height:38, borderRadius:"50%", background:`${planInfo.color}20`, border:`2px solid ${planInfo.color}50`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:6, boxShadow:`0 0 16px ${planInfo.color}40` }}>
                  <span style={{ fontSize:18 }}>🔒</span>
                </div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:12, color:planInfo.color, letterSpacing:1, textAlign:"center" }}>LIGUE {planInfo.label.toUpperCase()}</div>
                <div style={{ fontSize:10, color:"rgba(241,245,249,0.5)", marginTop:2 }}>Tap pour s'abonner</div>
              </div>}
            </div>;
          })}
        </div>
      </div>;
    })}
  </div>;
}

function ProfilePage({ profile, username, onLogout }) {
  const level=getLevel(profile?.xp||0), badge=getBadge(level);
  const wr=profile?.total_bets>0?Math.round((profile.total_wins/profile.total_bets)*100):0;
  const sub=getSubPlan(profile);
  return <div className="page-enter">
    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, letterSpacing:2, marginBottom:20 }}>MON PROFIL</div>
    <div style={{ background:`linear-gradient(135deg,${badge.glow},rgba(241,245,249,0.02))`, border:`1px solid ${badge.color}20`, borderRadius:20, padding:"22px", marginBottom:18, position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:-60, right:-60, width:200, height:200, borderRadius:"50%", background:`radial-gradient(circle,${badge.glow},transparent 70%)` }} />
      <div style={{ display:"flex", gap:16, alignItems:"center", marginBottom:14 }}>
        <div style={{ width:64, height:64, borderRadius:18, background:`linear-gradient(135deg,${badge.color},${badge.color}66)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, flexShrink:0, boxShadow:`0 8px 25px ${badge.glow}` }}>{badge.emoji}</div>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, letterSpacing:1 }}>{username}</div>
          <div style={{ display:"flex", gap:6, marginTop:4, flexWrap:"wrap", alignItems:"center" }}>
            <BadgeTag level={level} />
            {sub!=="starter"&&<SubBadge profile={profile} />}
          </div>
          <div style={{ fontSize:12, color:"rgba(241,245,249,0.35)", marginTop:5 }}>Niveau {level} · {profile?.xp||0} XP total</div>
        </div>
      </div>
      <XPBar xp={profile?.xp||0} />
      <div style={{ display:"flex", gap:10, marginTop:14, flexWrap:"wrap" }}><MCBadge amount={profile?.coins||0} /><SCBadge amount={profile?.store_coins||0} /></div>
    </div>
    {/* Info abonnement */}
    <div style={{ background:`${getSubColor(sub)}0a`, border:`1px solid ${getSubColor(sub)}20`, borderRadius:14, padding:"14px 18px", marginBottom:18, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <div>
        <div style={{ fontSize:10, fontWeight:700, color:"rgba(241,245,249,0.35)", letterSpacing:1.5, marginBottom:4 }}>ABONNEMENT ACTUEL</div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:getSubColor(sub), letterSpacing:1 }}>{getSubEmoji(sub)} {getSubLabel(sub)}</span>
        </div>
        <div style={{ fontSize:11, color:"rgba(241,245,249,0.3)", marginTop:3 }}>{getMCBoost(sub)} MC chaque lundi</div>
      </div>
      {sub==="starter"&&<div style={{ fontSize:11, color:"#3b82f6", fontWeight:700, cursor:"pointer" }} onClick={()=>{}}>Passer Pro →</div>}
    </div>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:18 }}>
      {[{label:"PARIS",val:profile?.total_bets||0,color:"#3b82f6"},{label:"WINS",val:profile?.total_wins||0,color:"#10b981"},{label:"PRECISION",val:`${wr}%`,color:"#a78bfa"}].map(s=>(
        <div key={s.label} style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.05)", borderRadius:12, padding:"16px 10px", textAlign:"center" }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:s.color, letterSpacing:1 }}>{s.val}</div>
          <div style={{ fontSize:9, color:"rgba(241,245,249,0.25)", fontWeight:700, letterSpacing:1.5, marginTop:3 }}>{s.label}</div>
        </div>
      ))}
    </div>
    <div style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.05)", borderRadius:14, padding:"16px 18px", marginBottom:16 }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:1, marginBottom:12 }}>PROGRESSION DES BADGES</div>
      {BADGES.map(b=>(
        <div key={b.id} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:9 }}>
          <span style={{ fontSize:11, fontWeight:700, color:b.color, background:`${b.color}12`, padding:"3px 9px", borderRadius:20, border:`1px solid ${b.color}25`, minWidth:90, textAlign:"center", boxShadow:level>=b.minLevel?`0 0 8px ${b.glow}`:"none" }}>{b.emoji} {b.label}</span>
          <span style={{ fontSize:11, color:"rgba(241,245,249,0.35)" }}>Niv. {b.minLevel}{b.maxLevel===999?"+":"–"+b.maxLevel}</span>
          {level>=b.minLevel&&<span style={{ fontSize:12, color:b.color }}>✓</span>}
        </div>
      ))}
    </div>
    <div style={{ background:"rgba(239,68,68,0.04)", border:"1px solid rgba(239,68,68,0.08)", borderRadius:12, padding:"12px 16px", marginBottom:18, fontSize:12, color:"rgba(241,245,249,0.35)", lineHeight:1.6 }}>
      Les MarketCoins n'ont <strong style={{ color:"rgba(241,245,249,0.6)" }}>aucune valeur monetaire</strong>.
    </div>
    <button onClick={onLogout} style={{ width:"100%", padding:"13px 0", borderRadius:12, border:"1px solid rgba(239,68,68,0.15)", background:"rgba(239,68,68,0.04)", color:"#f87171", fontWeight:800, fontSize:14, cursor:"pointer" }}>Se deconnecter</button>
  </div>;
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [session,setSession]=useState(null);
  const [profile,setProfile]=useState(null);
  const [page,setPage]=useState("home");
  const [prevPage,setPrevPage]=useState("home");
  const navigateTo=(p)=>{setPrevPage(page);setPage(p);};
  const [markets,setMarkets]=useState([]);
  const [matches,setMatches]=useState([]);
  const [matchesLoading,setMatchesLoading]=useState(false);
  const [leaderboard,setLeaderboard]=useState([]);
  const [bets,setBets]=useState([]);
  const [matchBets,setMatchBets]=useState([]);
  const [betModal,setBetModal]=useState(null);
  const [matchBetModal,setMatchBetModal]=useState(null);
  const [toast,setToast]=useState(null);
  const [showConfetti,setShowConfetti]=useState(false);
  const profileRef=useRef(null);

  const showToast=(msg,type="success")=>{setToast({msg,type});if(type==="win")setShowConfetti(true);};

  const loadLeaderboard=useCallback(async(token)=>{
    try{
      const data=await req("profiles?select=id,username,coins,store_coins,xp,level,total_wins,total_bets,total_profit,subscription&order=total_profit.desc&limit=10",{_token:token||SUPABASE_KEY});
      if(data?.length) setLeaderboard(data.map((p,i)=>({...p,rank:i+1})));
    }catch{}
  },[]);

  useEffect(()=>{
    if(!session) return;
    const interval=setInterval(()=>loadLeaderboard(session.token),30000);
    return()=>clearInterval(interval);
  },[session,loadLeaderboard]);

  // Clôture automatique des paris matchs terminés
  const checkAndResolveBets=useCallback(async(token,userId,currentMatches,pendingBets)=>{
    if(!token||!pendingBets?.length||!currentMatches?.length) return;
    const pending=pendingBets.filter(b=>b.status==="pending"&&b.id);
    if(!pending.length) return;
    let profileUpdated=false;
    let newCoins=profileRef.current?.coins||0;
    let newXP=profileRef.current?.xp||0;
    let newProfit=profileRef.current?.total_profit||0;
    let newWins=profileRef.current?.total_wins||0;

    for(const bet of pending){
      try{
        const match=currentMatches.find(m=>
          m.status==="FINISHED"&&bet.match_title&&
          bet.match_title.includes(m.home_team)&&bet.match_title.includes(m.away_team)
        );
        if(!match) continue;
        const matchResult={homeScore:match.home_score,awayScore:match.away_score,homeTeam:match.home_team,awayTeam:match.away_team,scorers:match.scorers||[]};
        const won=resolveBet(bet,matchResult);
        const newStatus=won?"won":"lost";
        try{await req(`match_bets?id=eq.${bet.id}`,{method:"PATCH",_token:token,body:JSON.stringify({status:newStatus})});}catch{}
        setMatchBets(prev=>prev.map(b=>b.id===bet.id?{...b,status:newStatus}:b));
        if(won){
          const gain=bet.potential_gain||0;
          newCoins+=gain;
          newXP+=Math.floor(gain/10)+10;
          newProfit+=gain-(bet.cost||0);
          newWins+=1;
          profileUpdated=true;
          showToast(`🏆 PARI GAGNE ! +${fmt(gain)} MC — ${bet.match_title||""}`, "win");
        }
      }catch{}
    }

    if(profileUpdated){
      const newLevel=getLevel(newXP);
      try{
        await req(`profiles?id=eq.${userId}`,{method:"PATCH",_token:token,body:JSON.stringify({coins:newCoins,xp:newXP,level:newLevel,total_profit:newProfit,total_wins:newWins,updated_at:new Date().toISOString()})});
      }catch{}
      setProfile(p=>({...p,coins:newCoins,xp:newXP,level:newLevel,total_profit:newProfit,total_wins:newWins}));
      profileRef.current={...profileRef.current,coins:newCoins,xp:newXP,level:newLevel,total_profit:newProfit,total_wins:newWins};
      await loadLeaderboard(token);
    }
  },[loadLeaderboard]);

  const loadMatches=useCallback(async()=>{
    setMatchesLoading(true);
    const allMatches=[];
    try{
      const fetchComp=async(comp)=>{
        try{
          const controller=new AbortController();
          const timeout=setTimeout(()=>controller.abort(),10000);
          const data=await fetch(`/api/matches?competition=${comp}`,{signal:controller.signal}).then(r=>r.json());
          clearTimeout(timeout);
          if(!data?.matches) return [];
          return data.matches;
        }catch{return [];}
      };
      // Charger par groupes de 4 pour eviter de surcharger l'API
      const groups=[];
      for(let i=0;i<COMPETITIONS.length;i+=4) groups.push(COMPETITIONS.slice(i,i+4));
      for(const group of groups){
        const results=await Promise.allSettled(group.map(comp=>fetchComp(comp)));
        results.forEach(r=>{if(r.status==="fulfilled") allMatches.push(...r.value);});
      }
      allMatches.sort((a,b)=>new Date(a.match_date)-new Date(b.match_date));
      setMatches(allMatches);
    }catch(e){console.error("loadMatches error",e);}
    setMatchesLoading(false);
    return allMatches;
  },[]);

  const loadMarkets=useCallback(async()=>{
    try{
      const [rumors,customs]=await Promise.all([
        req("rumors?select=*&status=eq.open&order=created_at.desc").catch(()=>[]),
        req("custom_markets?status=eq.open&order=created_at.desc").catch(()=>[]),
      ]);
      const rumorMarkets=(rumors||[]).map(r=>({id:r.rumor_id,title:r.event_question||`${r.player_name} → ${r.to_club} ?`,q_yes:100,q_no:100,total_volume:500,participants:10,closes_at:r.expires_at||new Date(Date.now()+14*86400000).toISOString(),category:"Transferts",source:r.source_name||"Source",status:"open"}));
      const savedOdds=loadSavedOdds();
      const customMarkets=(customs||[]).map(c=>({id:c.id,title:c.title,q_yes:savedOdds[c.id]?.q_yes||c.q_yes||100,q_no:savedOdds[c.id]?.q_no||c.q_no||100,total_volume:savedOdds[c.id]?.total_volume||c.total_volume||0,participants:savedOdds[c.id]?.participants||c.participants||0,closes_at:c.closes_at||null,category:c.category||"Rumeurs",source:c.source||"MarketBall",status:"open"}));
      setMarkets([...customMarkets,...rumorMarkets]);
    }catch{}
  },[]);

  const loadProfile=useCallback(async(token,userId)=>{
    try{
      const data=await req(`profiles?id=eq.${userId}&select=*`,{_token:token});
      if(data?.[0]){setProfile(data[0]);profileRef.current=data[0];}
      else{
        const np={id:userId,coins:500,store_coins:0,xp:0,level:1,total_bets:0,total_wins:0,total_profit:0,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
        try{await req("profiles",{method:"POST",_token:token,body:JSON.stringify(np)});}catch{}
        setProfile(np);profileRef.current=np;
      }
    }catch{}
  },[]);

  const loadBets=useCallback(async(t,u)=>{try{const d=await req(`user_bets?user_id=eq.${u}&select=*&order=created_at.desc&limit=50`,{_token:t});if(d)setBets(d);}catch{}},[]);
  const loadMatchBets=useCallback(async(t,u)=>{
    try{
      // Charger tous les paris pour affichage
      const d=await req(`match_bets?user_id=eq.${u}&select=*&order=created_at.desc&limit=30`,{_token:t});
      if(d) setMatchBets(d);
      // Retourner uniquement les pending pour la resolution
      return (d||[]).filter(b=>b.status==="pending");
    }catch{return[];}
  },[]);

  useEffect(()=>{loadMarkets();loadMatches();},[]);

  const handleDailyStreak=async(token,userId)=>{
    try{
      const today=new Date().toISOString().split("T")[0];
      const p=profileRef.current;
      if(!p) return;
      if(p.last_login===today) return; // Deja connecte aujourd'hui
      const yesterday=new Date(Date.now()-86400000).toISOString().split("T")[0];
      const newStreak=p.last_login===yesterday?(p.streak||0)+1:1;
      let bonusCoins=getMCBoost(p.subscription||"starter"); // MC boost selon abonnement
      let bonusMsg=`🔥 Streak ${newStreak} jour${newStreak>1?"s":""} ! +${bonusCoins} MC`;
      if(newStreak===3){bonusCoins=30;bonusMsg="🔥 Streak 3 jours ! +30 MC bonus !";}
      if(newStreak===7){bonusCoins=100;bonusMsg="🔥🔥 STREAK 7 JOURS ! +100 MC !";}
      if(newStreak>7&&newStreak%7===0){bonusCoins=100;bonusMsg=`🔥🔥 STREAK ${newStreak} JOURS ! +100 MC !`;}
      const newCoins=(p.coins||0)+bonusCoins;
      const newXP=(p.xp||0)+5;
      await req(`profiles?id=eq.${userId}`,{method:"PATCH",_token:token,body:JSON.stringify({last_login:today,streak:newStreak,coins:newCoins,xp:newXP,level:getLevel(newXP),updated_at:new Date().toISOString()})});
      setProfile(pr=>({...pr,last_login:today,streak:newStreak,coins:newCoins,xp:newXP}));
      profileRef.current={...profileRef.current,last_login:today,streak:newStreak,coins:newCoins,xp:newXP};
      showToast(bonusMsg);
    }catch{}
  };

  // Gerer retour apres paiement Stripe
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const payment=params.get("payment");
    const sc=parseInt(params.get("sc")||"0");
    if(payment==="success"&&sc>0&&session&&profile){
      updateProfile({store_coins:(profile?.store_coins||0)+sc},session.token,session.user.id);
      showToast(`💎 +${sc} SC credites ! Merci !`);
      window.history.replaceState({},"","/");
    }
    if(payment==="cancel"){
      showToast("Paiement annule","warning");
      window.history.replaceState({},"","/");
    }
  },[session,profile]);

  const handleAuth=async(token,user)=>{
    setSession({token,user});
    await loadProfile(token,user.id);
    await loadBets(token,user.id);
    const mb=await loadMatchBets(token,user.id);
    await loadLeaderboard(token);
    const loadedMatches=await loadMatches();
    if(mb?.length) await checkAndResolveBets(token,user.id,loadedMatches,mb);
    // Streak de connexion
    await handleDailyStreak(token,user.id);
    // Vérifier toutes les 5 minutes
    const interval=setInterval(async()=>{
      const lm=await loadMatches();
      const pendingMB=await loadMatchBets(token,user.id);
      await checkAndResolveBets(token,user.id,lm,pendingMB);
    },5*60*1000);
    // Refresh rapide 60s uniquement si matchs en direct
    const liveInterval=setInterval(async()=>{
      const hasLive=matches.some(m=>m.status==="IN_PLAY"||m.status==="PAUSED");
      if(hasLive) await loadMatches();
    },60*1000);
    return()=>{clearInterval(interval);clearInterval(liveInterval);};
  };

  const updateProfile=async(updates,token,userId)=>{
    try{await req(`profiles?id=eq.${userId}`,{method:"PATCH",_token:token,body:JSON.stringify({...updates,updated_at:new Date().toISOString()})});}catch{}
    setProfile(p=>({...p,...updates}));
    profileRef.current={...profileRef.current,...updates};
  };

  const handleBetConfirm=async(side,amount,cost,gain)=>{
    if(!session) return;
    const newCoins=(profile?.coins||0)-cost;
    if(newCoins<0){showToast("Pas assez de MC !","error");return;}
    const newXP=(profile?.xp||0)+5,newLevel=getLevel(newXP);
    try{
      const safeGain=Math.max(cost+1, gain||cost+1);
      await req("user_bets",{method:"POST",_token:session.token,body:JSON.stringify({user_id:session.user.id,market_id:betModal.id,market_title:betModal.title,side,amount,cost,potential_gain:safeGain,status:"pending"})});
      const updMarket=markets.find(m=>m.id===betModal.id);
      const upd=markets.map(m=>m.id===betModal.id?{...m,q_yes:side==="yes"?m.q_yes+amount:m.q_yes,q_no:side==="no"?m.q_no+amount:m.q_no,total_volume:m.total_volume+cost,participants:m.participants+1}:m);
      setMarkets(upd);saveOdds(upd);
      // Sync cotes vers Supabase pour les custom_markets
      if(updMarket){
        const newQYes=side==="yes"?updMarket.q_yes+amount:updMarket.q_yes;
        const newQNo=side==="no"?updMarket.q_no+amount:updMarket.q_no;
        try{await req(`custom_markets?id=eq.${betModal.id}`,{method:"PATCH",body:JSON.stringify({q_yes:newQYes,q_no:newQNo,total_volume:updMarket.total_volume+cost,participants:updMarket.participants+1})});}catch{}
      }
      await updateProfile({coins:newCoins,xp:newXP,level:newLevel,total_bets:(profile?.total_bets||0)+1},session.token,session.user.id);
      setBetModal(null);
      showToast("Prediction placee ! +5 XP");
      setTimeout(()=>loadBets(session.token,session.user.id),500); // Délai pour laisser Supabase écrire
      await loadLeaderboard(session.token);
    }catch(e){showToast(`Erreur : ${e.message}`,"error");}
  };

  const handleMatchBetConfirm=async(match,betType,prediction,amount,gain)=>{
    if(!session) return;
    const newCoins=(profile?.coins||0)-amount;
    if(newCoins<0){showToast("Pas assez de MC !","error");return;}
    const newXP=(profile?.xp||0)+5,newLevel=getLevel(newXP);
    try{
      const res=await req("match_bets",{method:"POST",_token:session.token,body:JSON.stringify({user_id:session.user.id,match_id:null,match_title:`${match.home_team} vs ${match.away_team}`,bet_type:betType,prediction,cost:amount,potential_gain:gain,status:"pending"})});
      const newBet=res?.[0]||{id:null,match_title:`${match.home_team} vs ${match.away_team}`,bet_type:betType,prediction,cost:amount,potential_gain:gain,status:"pending"};
      setMatchBets(prev=>[newBet,...prev]);
      await updateProfile({coins:newCoins,xp:newXP,level:newLevel,total_bets:(profile?.total_bets||0)+1},session.token,session.user.id);
      setMatchBetModal(null);
      showToast("Pari place ! +5 XP");
      await loadLeaderboard(session.token);
    }catch(e){showToast(`Erreur : ${e.message}`,"error");}
  };

  const handleSpin=async(segment)=>{
    if(!session) return;
    const updates={last_spin:new Date().toISOString()};
    if(segment.type==="mc") updates.coins=(profile?.coins||0)+segment.value;
    else updates.store_coins=(profile?.store_coins||0)+segment.value;
    await updateProfile(updates,session.token,session.user.id);
    showToast(`+${segment.value} ${segment.type==="sc"?"💎 SC":"🪙 MC"} gagnes !`);
  };

  const handleWatchAd=async()=>{
    if(!session) return;
    const today=new Date().toISOString().split("T")[0];
    const adsToday=profile?.ads_reset_date===today?(profile?.ads_watched_today||0)+1:1;
    await updateProfile({coins:(profile?.coins||0)+20,ads_watched_today:adsToday,ads_reset_date:today},session.token,session.user.id);
    showToast("+20 MC gagnes !");
  };

  const handleRedeemSC=async(reward)=>{
    if(!session||(profile?.store_coins||0)<reward.cost){showToast("Pas assez de SC !","error");return;}
    await updateProfile({store_coins:(profile?.store_coins||0)-reward.cost},session.token,session.user.id);
    showToast(`${reward.emoji} ${reward.name} obtenu !`);
  };

  const handleBuySC=async(pack)=>{
    if(!session) return;
    try{
      showToast("Redirection vers le paiement...");
      const packIds={10:"sc10",50:"sc50",100:"sc100"};
      const res=await fetch("/api/create-checkout",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({pack:packIds[pack.sc]||"sc10",userId:session.user.id})
      });
      const data=await res.json();
      if(data.url) window.location.href=data.url;
      else showToast("Erreur paiement","error");
    }catch(e){showToast("Erreur : "+e.message,"error");}
  };

  const handleConvertSC=async(amount)=>{
    if(!session) return;
    const mcAmount=amount*10; // 1 SC = 10 MC
    const wk=getWeekKey(),wp=profile?.weekly_reset_date===wk?(profile?.weekly_mc_purchased||0):0;
    if(wp+mcAmount>WEEKLY_MC_LIMIT){showToast("Limite hebdo atteinte !","error");return;}
    if((profile?.store_coins||0)<amount){showToast("Pas assez de SC !","error");return;}
    await updateProfile({coins:(profile?.coins||0)+mcAmount,store_coins:(profile?.store_coins||0)-amount,weekly_mc_purchased:wp+mcAmount,weekly_reset_date:wk},session.token,session.user.id);
    showToast(`${amount} SC → ${mcAmount} MC !`);
  };

  const handleSubscribe=async(planId)=>{
    if(!session) return;
    const plan=SUBSCRIPTION_PLANS.find(p=>p.id===planId);
    if(!plan) return;
    // Starter = résiliation directe sans Stripe
    if(planId==="starter"){
      try{
        await req(`profiles?id=eq.${session.user.id}`,{method:"PATCH",_token:session.token,body:JSON.stringify({subscription:"starter",stripe_subscription_id:null,updated_at:new Date().toISOString()})});
        setProfile(p=>({...p,subscription:"starter"}));
        showToast("Abonnement résilié — plan Starter actif");
      }catch(e){showToast("Erreur : "+e.message,"error");}
      return;
    }
    // Pro / Elite → Stripe (Price ID à brancher)
    if(!plan.priceId){
      showToast("Abonnements bientôt disponibles — Price ID Stripe en attente","warning");
      return;
    }
    try{
      showToast("Redirection vers le paiement...");
      const res=await fetch("/api/create-subscription",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({priceId:plan.priceId,userId:session.user.id,plan:planId})
      });
      const data=await res.json();
      if(data.url) window.location.href=data.url;
      else showToast("Erreur paiement","error");
    }catch(e){showToast("Erreur : "+e.message,"error");}
  };

  const handleCashout=async(bet,cashoutValue,isMatchBet=false)=>{
    if(!session||!isPro(profile)) return;
    try{
      const table=isMatchBet?"match_bets":"user_bets";
      await req(`${table}?id=eq.${bet.id}`,{method:"PATCH",_token:session.token,body:JSON.stringify({status:"cashed_out"})});
      const newCoins=(profile?.coins||0)+cashoutValue;
      await req(`profiles?id=eq.${session.user.id}`,{method:"PATCH",_token:session.token,body:JSON.stringify({coins:newCoins,updated_at:new Date().toISOString()})});
      setProfile(p=>({...p,coins:newCoins}));
      profileRef.current={...profileRef.current,coins:newCoins};
      if(isMatchBet) setMatchBets(prev=>prev.map(b=>b.id===bet.id?{...b,status:"cashed_out"}:b));
      else setBets(prev=>prev.map(b=>b.id===bet.id?{...b,status:"cashed_out"}:b));
      showToast(`💰 Cashout ! +${fmt(cashoutValue)} MC récupérés`,"win");
    }catch(e){showToast("Erreur cashout : "+e.message,"error");}
  };

  const handleLogout=async()=>{
    try{await authReq("logout",{});}catch{}
    setSession(null);setProfile(null);setBets([]);setMatchBets([]);profileRef.current=null;
  };

  const coins=profile?.coins??500,sc=profile?.store_coins??0;
  const username=profile?.username||session?.user?.user_metadata?.username||session?.user?.email?.split("@")[0]||"Joueur";

  // Navigation avec Guide en haut et en bas
  const NAV=[
    {id:"home",icon:"⚡",label:"Accueil"},
    {id:"matches",icon:"⚽",label:"Matchs"},
    {id:"markets",icon:"📊",label:"Marches"},
    {id:"wallet",icon:"💰",label:"Wallet"},
    {id:"leaderboard",icon:"🏆",label:"Top"},
    {id:"store",icon:"🎁",label:"Store"},
    {id:"subscription",icon:"👑",label:"Ligues"},
    {id:"howto",icon:"❓",label:"Guide"},
  ];

  if(!session) return <AuthPage onAuth={handleAuth} />;

  return <div style={{ minHeight:"100vh", background:"#030712", fontFamily:"'DM Sans',sans-serif", color:"#f1f5f9" }}>
    <style>{GLOBAL_CSS}</style>
    <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, overflow:"hidden" }}>
      <div style={{ position:"absolute", top:"5%", left:"15%", width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle,rgba(16,185,129,0.03),transparent 65%)", animation:"floatOrb 12s ease-in-out infinite" }} />
      <div style={{ position:"absolute", bottom:"10%", right:"10%", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle,rgba(59,130,246,0.025),transparent 65%)", animation:"floatOrb 15s ease-in-out infinite reverse" }} />
    </div>

    {/* Header avec Guide */}
    <div style={{ position:"sticky", top:0, zIndex:200, background:"rgba(3,7,18,0.88)", backdropFilter:"blur(24px)", borderBottom:"1px solid rgba(241,245,249,0.05)" }}>
      <div style={{ maxWidth:980, margin:"0 auto", padding:"0 16px", display:"flex", alignItems:"center", justifyContent:"space-between", height:54 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, background:"linear-gradient(135deg,#10b981,#3b82f6)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, boxShadow:"0 4px 12px rgba(16,185,129,0.3)" }}>⚽</div>
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:3 }}>MARKET<span style={{ color:"#10b981" }}>BALL</span></span>
        </div>
        <nav style={{ display:"flex", gap:1 }}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>navigateTo(n.id)}
              style={{ padding:"5px 9px", borderRadius:8, border:"none", background:page===n.id?"rgba(16,185,129,0.1)":"transparent", color:page===n.id?"#10b981":"rgba(241,245,249,0.35)", fontWeight:600, fontSize:11, cursor:"pointer", transition:"all 0.2s", borderBottom:page===n.id?"2px solid #10b981":"2px solid transparent" }}>
              {n.icon} {n.label}
            </button>
          ))}
        </nav>
        <div style={{ display:"flex", gap:5, alignItems:"center" }}>
          <button onClick={()=>navigateTo("profile")} style={{ padding:"4px 9px", borderRadius:7, border:"none", background:"transparent", color:"rgba(241,245,249,0.3)", fontWeight:600, fontSize:11, cursor:"pointer" }}>👤 {username}</button>
          {profile?.subscription && profile.subscription !== "starter" && <SubBadge profile={profile} />}
          <div style={{ background:"rgba(251,191,36,0.07)", border:"1px solid rgba(251,191,36,0.15)", borderRadius:7, padding:"3px 9px" }}>
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", color:"#fbbf24", fontSize:13, letterSpacing:1 }}>🪙 {fmt(coins)}</span>
          </div>
          <div style={{ background:"rgba(16,185,129,0.07)", border:"1px solid rgba(16,185,129,0.15)", borderRadius:7, padding:"3px 9px" }}>
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", color:"#10b981", fontSize:13, letterSpacing:1 }}>💎 {fmt(sc)}</span>
          </div>
        </div>
      </div>
    </div>

    {/* Content */}
    <div key={page} className="page-slide-right" style={{ maxWidth:980, margin:"0 auto", padding:"24px 20px 90px", position:"relative", zIndex:1 }}>
      {page==="home"&&<HomePage markets={markets} coins={coins} sc={sc} username={username} onBet={setBetModal} onNavigate={navigateTo} matches={matches} onMatchBet={setMatchBetModal} profile={profile} leaderboard={leaderboard} />}
      {page==="matches"&&<MatchesPage matches={matches} onBet={setMatchBetModal} loading={matchesLoading} />}
      {page==="markets"&&<MarketsPage markets={markets} onBet={setBetModal} profile={profile} session={session} showToast={showToast} />}
      {page==="wallet"&&<WalletPage coins={coins} sc={sc} bets={bets} matchBets={matchBets} profile={profile} onSpin={handleSpin} onWatchAd={handleWatchAd} onConvertSC={handleConvertSC} onCashout={handleCashout} markets={markets} />}
      {page==="leaderboard"&&<LeaderboardPage leaderboard={leaderboard.length?leaderboard:[{rank:1,username,coins,xp:profile?.xp||0,total_wins:profile?.total_wins||0,total_bets:profile?.total_bets||0,total_profit:0}]} username={username} />}
      {page==="store"&&<StorePage coins={coins} sc={sc} profile={profile} onRedeemSC={handleRedeemSC} onSubscribe={handleSubscribe} onNavigate={navigateTo} />}
      {page==="subscription"&&<SubscriptionPage profile={profile} onSubscribe={handleSubscribe} />}
      {page==="profile"&&<ProfilePage profile={profile} username={username} onLogout={handleLogout} />}
      {page==="howto"&&<HowItWorksPage onNavigate={navigateTo} />}
    </div>

    {/* Bottom nav */}
    <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"rgba(3,7,18,0.92)", backdropFilter:"blur(24px)", borderTop:"1px solid rgba(241,245,249,0.05)", display:"flex", zIndex:200 }}>
      {NAV.map(n=>(
        <button key={n.id} onClick={()=>navigateTo(n.id)}
          style={{ flex:1, padding:"9px 0", background:"transparent", border:"none", color:page===n.id?"#10b981":"rgba(241,245,249,0.25)", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3, transition:"all 0.2s", borderTop:page===n.id?"2px solid #10b981":"2px solid transparent" }}>
          <span style={{ fontSize:14 }}>{n.icon}</span>
          <span style={{ fontSize:7, fontWeight:700, letterSpacing:0.5, textTransform:"uppercase" }}>{n.label}</span>
        </button>
      ))}
    </div>

    {betModal&&<BetModal market={betModal} coins={coins} onClose={()=>setBetModal(null)} onConfirm={handleBetConfirm} />}
    {matchBetModal&&<MatchBetModal match={matchBetModal} coins={coins} onClose={()=>setMatchBetModal(null)} onConfirm={handleMatchBetConfirm} />}
    {toast&&<Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)} />}
    {showConfetti&&<Confetti onDone={()=>setShowConfetti(false)} />}
  </div>;
}
