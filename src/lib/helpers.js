import { BADGES, XP_PER_LEVEL, CLUB_COLORS, COMP_INFO } from "./constants.js";

export const getSubPlan = (profile) => profile?.subscription || "starter";
export const getSubColor = (sub) => ({ starter:"#94a3b8", pro:"#3b82f6", elite:"#f59e0b" })[sub] || "#94a3b8";
export const getSubEmoji = (sub) => ({ starter:"🌱", pro:"⚡", elite:"👑" })[sub] || "🌱";
export const getSubLabel = (sub) => ({ starter:"Starter", pro:"Pro", elite:"Elite" })[sub] || "Starter";
export const getMCBoost = (sub) => ({ starter:100, pro:150, elite:250 })[sub] || 100;
export const isElite = (profile) => profile?.subscription === "elite";
export const isPro = (profile) => profile?.subscription === "pro" || profile?.subscription === "elite";
export const getBadge = (level) => BADGES.find(b => level >= b.minLevel && level <= b.maxLevel) || BADGES[0];
export const getLevel = (xp) => Math.floor((xp || 0) / XP_PER_LEVEL) + 1;
export const getXPProgress = (xp) => (xp || 0) % XP_PER_LEVEL;
export const getClubColor = (name) => { if (!name) return "#6b7280"; const k = Object.keys(CLUB_COLORS).find(k => name.toLowerCase().includes(k.toLowerCase())); return k ? CLUB_COLORS[k] : "#6b7280"; };

export const fmt = (n) => (n ?? 0).toLocaleString("fr-FR");
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
