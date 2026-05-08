import { BADGES, DIVISIONS, XP_PER_LEVEL, CLUB_COLORS, COMP_INFO } from "./constants.js";

export const getDivision = (coins) => {
  const c = Math.floor(coins || 0);
  for (let i = DIVISIONS.length - 1; i >= 0; i--) {
    if (c >= DIVISIONS[i].min) return DIVISIONS[i];
  }
  return DIVISIONS[0];
};
export const getDivisionProgress = (coins) => {
  const div = getDivision(coins);
  if (!isFinite(div.max)) return 100;
  const range = div.max - div.min;
  if (range <= 0) return 100;
  return Math.min(100, Math.round((Math.max(0, (coins || 0) - div.min) / range) * 100));
};
export const getDivisionNext = (coins) => {
  const div = getDivision(coins);
  const idx = DIVISIONS.findIndex(d => d.id === div.id);
  return idx < DIVISIONS.length - 1 ? DIVISIONS[idx + 1] : null;
};

export const getSubPlan = (profile) => profile?.subscription || "starter";
export const getSubColor = (sub) => ({ starter:"#94a3b8", elite:"#f59e0b" })[sub] || "#94a3b8";
export const getSubEmoji = (sub) => ({ starter:"🌱", elite:"👑" })[sub] || "🌱";
export const getSubLabel = (sub) => ({ starter:"Free", elite:"Premium" })[sub] || "Free";
export const getMCBoost = (sub) => ({ starter:1000, elite:8000 })[sub] || 1000;
export const isElite = (profile) => profile?.subscription === "elite";
export const isPro = (profile) => profile?.subscription === "elite";
export const getBadge = (level) => BADGES.find(b => level >= b.minLevel && level <= b.maxLevel) || BADGES[0];

// XP cumulé nécessaire pour atteindre le niveau N
// Niveau 1→2 : 100 XP, puis +50 par niveau (150, 200, ...)
export const xpForLevel = (n) => n <= 1 ? 0 : 25 * (n - 1) * (n + 2);

// Niveau actuel depuis XP total
export const getLevel = (xp) => {
  let n = 1;
  while (xpForLevel(n + 1) <= (xp || 0)) n++;
  return n;
};

// XP accumulé dans le niveau actuel (pour la barre de progression)
export const getXPProgress = (xp) => {
  const lvl = getLevel(xp);
  return (xp || 0) - xpForLevel(lvl);
};

// XP total nécessaire pour finir le niveau actuel
export const xpToNextLevel = (xp) => {
  const lvl = getLevel(xp);
  return xpForLevel(lvl + 1) - xpForLevel(lvl);
};

// Calcule les SC bonus lors d'un gain d'XP (passage de niveau / badge)
// Retourne { scBonus, messages[] }
export const calcLevelUpRewards = (oldXP, newXP) => {
  const oldLevel = getLevel(oldXP);
  const newLevel = getLevel(newXP);
  const oldBadge = getBadge(oldLevel);
  const newBadge = getBadge(newLevel);
  const levelsGained = newLevel - oldLevel;
  let scBonus = levelsGained; // +1 SC par niveau
  const messages = [];
  if (levelsGained > 0) {
    messages.push(`⬆️ Niveau ${newLevel} ! +${levelsGained} SC`);
  }
  if (oldBadge.id !== newBadge.id) {
    scBonus += 5;
    messages.push(`${newBadge.emoji} Badge ${newBadge.label} débloqué ! +5 SC`);
  }
  return { scBonus, messages };
};
export const getClubColor = (name) => { if (!name) return "#6b7280"; const k = Object.keys(CLUB_COLORS).find(k => name.toLowerCase().includes(k.toLowerCase())); return k ? CLUB_COLORS[k] : "#6b7280"; };

export const fmt = (n) => (n ?? 0).toLocaleString("fr-FR");

// Retourne le titre du marché dans la bonne langue
export const mTitle = (market, lang) => (lang === "en" && market?.title_en) ? market.title_en : (market?.title || "");
export const fmtPct = (n) => `${Math.round(n * 100)}%`;
export const timeLeft = (date) => { const diff = new Date(date) - Date.now(); if (diff < 0) return "Termine"; const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000); return d > 0 ? `${d}j ${h}h` : `${h}h`; };
export const catColor = (c) => ({ "Transferts": "#3b82f6", "Contrats": "#8b5cf6", "Competitions": "#f59e0b", "Recompenses": "#ec4899", "Performances": "#10b981", "Rumeurs": "#f59e0b" })[c] || "#6b7280";
export const compLabel = (c) => COMP_INFO[c]?.name || c;
export const compColor = (c) => COMP_INFO[c]?.color || "#6b7280";
export const compEmoji = (c) => COMP_INFO[c]?.emoji || "⚽";
export const formatMatchDate = (d) => new Date(d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
export const getWeekKey = () => { const d = new Date(); const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); return new Date(new Date().setDate(diff)).toISOString().split("T")[0]; };
export const loadSavedOdds = () => { try { const s = localStorage.getItem("mb_odds"); return s ? JSON.parse(s) : {}; } catch { return {}; } };
export const saveOdds = (ms) => { try { const o = {}; ms.forEach(m => { o[m.id] = { q_yes: m.q_yes, q_no: m.q_no, total_volume: m.total_volume, participants: m.participants }; }); localStorage.setItem("mb_odds", JSON.stringify(o)); } catch {} };
