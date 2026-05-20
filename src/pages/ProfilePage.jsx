import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { Canvas, useFrame } from "@react-three/fiber";
import { DIVISIONS, BADGES } from "../lib/constants.js";
import { getSubPlan, getSubColor, getSubEmoji, getSubLabel, getMCBoost, getDivision, getDivisionProgress, getDivisionNext, fmt } from "../lib/helpers.js";
import Avatar from "../components/ui/Avatar.jsx";
import BadgeTag from "../components/ui/BadgeTag.jsx";
import SubBadge from "../components/ui/SubBadge.jsx";
import XPBar from "../components/ui/XPBar.jsx";
import { req } from "../lib/supabase.js";
import { useLang } from "../lib/i18n.jsx";

/* ─── Util ───────────────────────────────────────────────────────────────── */
function makeRefCode(id, name) {
  const base = (name||id||"USER").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6).padEnd(3,"X");
  const suffix = (id||"XXXX").replace(/-/g,"").slice(0,4).toUpperCase();
  return `${base}-${suffix}`;
}

const AVATAR_COLORS = [
  ["#6366f1","#4f46e5"],["#10b981","#059669"],["#f59e0b","#d97706"],
  ["#ef4444","#dc2626"],["#8b5cf6","#7c3aed"],["#3b82f6","#2563eb"],
  ["#ec4899","#db2777"],["#f97316","#ea580c"],["#14b8a6","#0d9488"],["#a855f7","#9333ea"],
];
function avatarColor(name) {
  if (!name) return AVATAR_COLORS[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

/* ─── Inject styles ──────────────────────────────────────────────────────── */
function injectProfileStyles() {
  if (document.getElementById("profile-styles")) return;
  const s = document.createElement("style");
  s.id = "profile-styles";
  s.textContent = `
    @keyframes holo-shift {
      0%   { background-position: 0% 50%; }
      50%  { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes holo-shine {
      0%   { opacity:0.25; transform:translateX(-120%) skewX(-20deg); }
      40%  { opacity:0.6; }
      100% { opacity:0; transform:translateX(220%) skewX(-20deg); }
    }
    @keyframes card-glow {
      0%,100% { box-shadow: var(--card-shadow-base); }
      50%      { box-shadow: var(--card-shadow-peak); }
    }
    @keyframes aura-pulse {
      0%,100% { transform:scale(1); opacity:0.6; }
      50%     { transform:scale(1.06); opacity:1; }
    }
    @keyframes badge-pop {
      0%   { transform:scale(0.7) rotate(-8deg); opacity:0; }
      70%  { transform:scale(1.08) rotate(2deg); }
      100% { transform:scale(1) rotate(0deg); opacity:1; }
    }
    @keyframes shimmer-line {
      0%   { background-position:-200% 0; }
      100% { background-position:200% 0; }
    }
    @keyframes float-coin {
      0%   { transform:translateY(0) rotate(0deg) scale(1); opacity:1; }
      100% { transform:translateY(-80px) rotate(360deg) scale(0); opacity:0; }
    }
    @keyframes count-blink { 0%,100%{opacity:1} 50%{opacity:0.5} }
    @keyframes liquid-wave {
      0%   { background-position: 0% 50%; }
      100% { background-position: 200% 50%; }
    }
    @keyframes liquid-bubble {
      0%,100% { transform: translateY(0) scale(1); opacity:0.5; }
      50%      { transform: translateY(-8px) scale(0.6); opacity:0.9; }
    }
    @keyframes matrix-flicker {
      0%,94%,100% { opacity:1; }
      96%          { opacity:0.4; }
    }
    @keyframes holo-scan {
      0%   { top:-20%; }
      100% { top:120%; }
    }
    @keyframes activity-pulse {
      0%,100% { box-shadow: none; }
      50%      { box-shadow: 0 0 12px rgba(16,185,129,0.25); }
    }

    .wallet-holo-scan {
      position:absolute; left:0; right:0; height:50px;
      background:linear-gradient(180deg,transparent,rgba(16,185,129,0.07),transparent);
      animation:holo-scan 3s ease-in-out infinite;
      pointer-events:none; z-index:2;
    }
    .matrix-char { display:inline-block; animation:matrix-flicker 5s linear infinite; }

    .prof-card-wrap { transition: transform 0.08s linear; }
    .prof-card-wrap:active { transform: scale(0.98); }
    .prof-section-badge { animation: badge-pop 0.5s cubic-bezier(0.175,0.885,0.32,1.275) both; }
    .prof-stat-bar-fill { transform-origin: left; }
    .prof-shimmer {
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
      background-size: 200%;
      animation: shimmer-line 2s linear infinite;
    }
    .prof-holo {
      background: linear-gradient(
        135deg,
        rgba(255,0,128,0.07)   0%,
        rgba(0,255,128,0.09)  20%,
        rgba(0,128,255,0.07)  40%,
        rgba(255,128,0,0.07)  60%,
        rgba(180,0,255,0.07)  80%,
        rgba(255,0,128,0.05) 100%
      );
      background-size: 400% 400%;
      animation: holo-shift 4s ease infinite;
      mix-blend-mode: screen;
    }
    .prof-shine {
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent);
      animation: holo-shine 3.5s ease-in-out infinite;
    }
  `;
  document.head.appendChild(s);
}

/* ─── Player Card 3D ─────────────────────────────────────────────────────── */
function PlayerCard({ profile, username, div, wr }) {
  const [flipped, setFlipped]   = useState(false);
  const [tilt, setTilt]         = useState({ x: 0, y: 0 });
  const [holoPos, setHoloPos]   = useState({ x: 50, y: 50 });
  const cardRef  = useRef(null);
  const isTouchDevice = useRef(typeof window !== "undefined" && "ontouchstart" in window);
  const [avatarFrom, avatarTo]  = avatarColor(username);

  const isDiamond = div.tier === "diamond";
  const isGold    = div.tier === "gold";

  const onMouseMove = useCallback((e) => {
    if (isTouchDevice.current) return;
    const el = cardRef.current; if (!el) return;
    const r  = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top)  / r.height;
    setHoloPos({ x: nx * 100, y: ny * 100 });
    if (!flipped) setTilt({ x: -(ny - 0.5) * 16, y: (nx - 0.5) * 16 });
  }, [flipped]);

  const onMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
    setHoloPos({ x: 50, y: 50 });
  }, []);

  const transform = flipped
    ? "perspective(900px) rotateY(180deg)"
    : `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`;

  const cardW = Math.min(300, typeof window !== "undefined" ? window.innerWidth - 48 : 300);
  const cardH = Math.round(cardW * 1.42);

  const shadowBase = `0 20px 60px ${div.color}22, 0 8px 24px rgba(0,0,0,0.6)`;
  const shadowPeak = `0 24px 80px ${div.color}55, 0 8px 32px rgba(0,0,0,0.7), 0 0 60px ${div.color}30`;

  /* Radial spot that follows cursor */
  const spotStyle = {
    position:"absolute", inset:0, borderRadius:"inherit", pointerEvents:"none", zIndex:4,
    background:`radial-gradient(circle at ${holoPos.x}% ${holoPos.y}%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 35%, transparent 65%)`,
    transition:"background 0.05s",
  };

  const initials = (() => {
    const parts = (username||"?").trim().split(/[\s_\-\.]+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (username||"??").slice(0,2).toUpperCase();
  })();

  const divIndex = DIVISIONS.findIndex(d => d.id === div.id);
  const pct = getDivisionProgress(profile?.coins || 0);

  return (
    <div ref={cardRef}
      style={{ width:cardW, margin:"0 auto", cursor:"pointer", position:"relative", zIndex:1 }}
      onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}
      onClick={() => setFlipped(f => !f)}
    >
      <div style={{
        width:cardW, height:cardH, position:"relative",
        transform, transformStyle:"preserve-3d",
        transition: flipped ? "transform 0.65s cubic-bezier(0.4,0,0.2,1)" : "transform 0.12s ease",
        "--card-shadow-base": shadowBase,
        "--card-shadow-peak": shadowPeak,
      }}>

        {/* ── FRONT ──────────────────────────────────────────────── */}
        <div style={{
          position:"absolute", inset:0, borderRadius:22, overflow:"hidden", backfaceVisibility:"hidden",
          background:`linear-gradient(160deg, ${div.color}40 0%, #0a1628 35%, #030712 70%, ${div.color}18 100%)`,
          border:`1px solid ${div.color}40`,
          boxShadow: shadowBase,
          animation:"card-glow 3s ease infinite",
        }}>

          {/* Holographic iridescent layer */}
          <div className="prof-holo" style={{ position:"absolute", inset:0, borderRadius:"inherit", zIndex:1 }} />
          {/* Shine sweep */}
          <div className="prof-shine" style={{ position:"absolute", top:0, bottom:0, width:"50%", left:0, zIndex:2 }} />
          {/* Cursor spot */}
          <div style={spotStyle} />

          {/* Grid texture */}
          <div style={{
            position:"absolute", inset:0, zIndex:0,
            backgroundImage:"linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)",
            backgroundSize:"16px 16px",
          }} />

          {/* Top strip accent */}
          <div style={{ position:"absolute", top:0, left:0, right:0, height:3, zIndex:5,
            background:`linear-gradient(90deg,transparent,${div.color},rgba(255,255,255,0.8),${div.color},transparent)`,
            animation:"shimmer-line 2s linear infinite", backgroundSize:"200%",
          }} />

          {/* Content — above holo layers */}
          <div style={{ position:"relative", zIndex:6, height:"100%", display:"flex", flexDirection:"column", padding:"14px 16px" }}>

            {/* Header row */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, fontWeight:700, letterSpacing:3, color:`${div.color}cc` }}>MARKETBALL</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:8, fontWeight:700, letterSpacing:2, color:"rgba(241,245,249,0.3)" }}>PLAYER CARD</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:11, letterSpacing:2, color:div.color }}>{div.tier?.toUpperCase()}</div>
                <div style={{ fontSize:18, lineHeight:1 }}>{div.icon}</div>
              </div>
            </div>

            {/* Avatar section */}
            <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10 }}>
              {/* Aura ring */}
              <div style={{ position:"relative", display:"flex", alignItems:"center", justifyContent:"center" }}>
                {/* Outer aura */}
                <div style={{
                  position:"absolute", width:90, height:90, borderRadius:"50%",
                  background:`radial-gradient(circle, ${div.color}35 0%, transparent 70%)`,
                  animation:"aura-pulse 2.5s ease-in-out infinite",
                }} />
                {/* Ring */}
                <div style={{
                  position:"absolute", width:78, height:78, borderRadius:"50%",
                  border:`2px solid ${div.color}80`,
                  boxShadow:`0 0 15px ${div.color}50, inset 0 0 15px ${div.color}20`,
                }} />
                {/* Avatar */}
                <div style={{
                  width:64, height:64, borderRadius:18, flexShrink:0,
                  background:`linear-gradient(135deg,${avatarFrom},${avatarTo})`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:1, color:"#fff",
                  boxShadow:`0 8px 24px ${avatarFrom}60`,
                  border:`2px solid rgba(255,255,255,0.2)`,
                }}>
                  {initials}
                </div>
              </div>

              {/* Name */}
              <div style={{ textAlign:"center" }}>
                <div style={{
                  fontFamily:"'Bebas Neue',sans-serif", fontSize:28, letterSpacing:3, lineHeight:1,
                  color:"#f1f5f9", textShadow:`0 0 20px ${div.color}60`,
                }}>
                  {username}
                </div>
                <div style={{ display:"flex", justifyContent:"center", gap:5, marginTop:4 }}>
                  <BadgeTag coins={profile?.coins||0} />
                </div>
              </div>
            </div>

            {/* Stats bar at bottom */}
            <div style={{ borderTop:`1px solid ${div.color}25`, paddingTop:10, marginTop:4 }}>
              <div style={{ display:"flex", justifyContent:"space-around", marginBottom:10 }}>
                {[
                  { label:"PARIS",   val:profile?.total_bets||0,  color:"#3b82f6" },
                  { label:"WINS",    val:profile?.total_wins||0,  color:"#10b981" },
                  { label:"PRÉCISION", val:`${wr}%`,               color:"#a78bfa" },
                ].map(s => (
                  <div key={s.label} style={{ textAlign:"center" }}>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:s.color, letterSpacing:1, lineHeight:1 }}>{s.val}</div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:8, fontWeight:700, letterSpacing:1.5, color:"rgba(241,245,249,0.3)", marginTop:2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Division progress bar */}
              <div style={{ height:3, borderRadius:99, background:"rgba(255,255,255,0.06)", overflow:"hidden" }}>
                <div style={{ width:`${pct}%`, height:"100%", borderRadius:99, background:`linear-gradient(90deg,${div.color}70,${div.color})`, boxShadow:`0 0 8px ${div.color}80` }} />
              </div>

              {/* MC */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, fontWeight:700, letterSpacing:2, color:"rgba(241,245,249,0.3)" }}>
                  MARKETCOINS
                </div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, color:"#fbbf24", letterSpacing:1 }}>
                  {fmt(profile?.coins||0)} MC
                </div>
              </div>
            </div>
          </div>

          {/* Hint */}
          <div style={{ position:"absolute", bottom:8, left:0, right:0, textAlign:"center", fontFamily:"'Barlow Condensed',sans-serif", fontSize:8, color:`${div.color}50`, letterSpacing:2, zIndex:7 }}>
            TOUCHER POUR RETOURNER
          </div>
        </div>

        {/* ── BACK ───────────────────────────────────────────────── */}
        <div style={{
          position:"absolute", inset:0, borderRadius:22, overflow:"hidden",
          backfaceVisibility:"hidden", transform:"rotateY(180deg)",
          background:"linear-gradient(160deg,#0d1f35 0%,#030712 60%,#080f1c 100%)",
          border:`1px solid ${div.color}30`,
          boxShadow:`0 20px 60px rgba(0,0,0,0.7)`,
        }}>
          {/* Top accent */}
          <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${div.color},transparent)` }} />

          <div style={{ padding:"20px 18px", height:"100%", display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:3, color:div.color }}>STATS DÉTAILLÉES</div>

            {/* Stats rows */}
            <div style={{ flex:1, display:"flex", flexDirection:"column", gap:9 }}>
              {[
                { label:"Total paris",    val:profile?.total_bets||0,               color:"#3b82f6", fmt:true  },
                { label:"Total victoires",val:profile?.total_wins||0,               color:"#10b981", fmt:true  },
                { label:"Précision",      val:`${wr}%`,                             color:"#a78bfa", fmt:false },
                { label:"Profit total",   val:`+${fmt(profile?.total_profit||0)} MC`,color:"#10b981",fmt:false },
                { label:"StoreCoins",     val:`${profile?.store_coins||0} SC`,       color:"#fbbf24", fmt:false },
                { label:"Profit hebdo",   val:`+${fmt(profile?.weekly_profit||0)} MC`,color:"#34d399",fmt:false},
              ].map(row => (
                <div key={row.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid rgba(241,245,249,0.04)", paddingBottom:7 }}>
                  <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, letterSpacing:1, color:"rgba(241,245,249,0.35)" }}>{row.label}</span>
                  <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14, color:row.color, letterSpacing:1 }}>{row.val}</span>
                </div>
              ))}

              {profile?.favorite_club && (
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid rgba(241,245,249,0.04)", paddingBottom:7 }}>
                  <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, letterSpacing:1, color:"rgba(241,245,249,0.35)" }}>Club favori</span>
                  <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14, color:"#10b981", letterSpacing:1 }}>{profile.favorite_club}</span>
                </div>
              )}
            </div>

            {/* XP Bar */}
            <div style={{ background:"rgba(241,245,249,0.02)", borderRadius:10, padding:"10px 12px", border:"1px solid rgba(241,245,249,0.05)" }}>
              <XPBar coins={profile?.coins||0} />
            </div>

            {/* Division badge */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:13, color:div.color, letterSpacing:2 }}>{div.icon} {div.name}</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, fontWeight:700, letterSpacing:1.5, color:"rgba(241,245,249,0.2)" }}>TOUCHER POUR RETOURNER</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Animated stat card ─────────────────────────────────────────────────── */
function AnimStatCard({ label, value, color, delay, isPercent, suffix="" }) {
  const ref    = useRef(null);
  const numRef = useRef(null);
  const done   = useRef(false);

  useEffect(() => {
    const el = numRef.current;
    if (!el || done.current) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      obs.disconnect(); done.current = true;
      const target = typeof value === "number" ? value : parseInt(value) || 0;
      const obj = { val: 0 };
      gsap.to(obj, {
        val: target, duration: 1.4, ease: "power2.out", delay: delay * 0.1,
        onUpdate() { el.textContent = isPercent ? `${Math.round(obj.val)}%` : `${Math.round(obj.val)}${suffix}`; }
      });
    }, { threshold: 0.6 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [value]);

  const displayVal = typeof value === "number" ? 0 : value;

  return (
    <motion.div ref={ref}
      initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
      transition={{ delay: delay * 0.08, duration:0.45, ease:[0.4,0,0.2,1] }}
      style={{
        background:"rgba(241,245,249,0.015)", border:`1px solid ${color}20`,
        borderRadius:14, padding:"16px 10px", textAlign:"center", position:"relative", overflow:"hidden",
      }}
    >
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${color},transparent)` }} />
      <div ref={numRef} style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:34, color, letterSpacing:0, lineHeight:1 }}>
        {displayVal}
      </div>
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, fontWeight:700, letterSpacing:2, color:"rgba(241,245,249,0.28)", marginTop:5 }}>{label}</div>
    </motion.div>
  );
}

/* ─── Badge timeline item ────────────────────────────────────────────────── */
function BadgeTimelineItem({ badge, unlocked, isCurrent, index }) {
  return (
    <motion.div
      initial={{ opacity:0, x:-24 }}
      animate={{ opacity:1, x:0 }}
      transition={{ delay: index * 0.08, duration:0.4, ease:"easeOut" }}
      style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", position:"relative" }}
    >
      {/* Timeline line */}
      {index > 0 && (
        <div style={{ position:"absolute", left:17, top:-1, bottom:"calc(100% - 10px)", width:2, background:unlocked?`${badge.color}40`:"rgba(241,245,249,0.05)", transform:"translateX(-50%)" }} />
      )}

      {/* Badge icon */}
      <div style={{
        width:36, height:36, borderRadius:10, flexShrink:0, position:"relative",
        background: unlocked ? `${badge.color}18` : "rgba(241,245,249,0.03)",
        border:`2px solid ${unlocked ? badge.color+"50" : "rgba(241,245,249,0.06)"}`,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:18,
        filter: unlocked ? "none" : "blur(0.5px) grayscale(0.8)",
        boxShadow: isCurrent ? `0 0 20px ${badge.color}60, 0 0 40px ${badge.color}25` : "none",
        animation: isCurrent ? "aura-pulse 2s ease-in-out infinite" : "none",
      }}>
        {unlocked ? badge.emoji : "🔒"}
        {isCurrent && (
          <div style={{ position:"absolute", inset:-3, borderRadius:12, border:`1px solid ${badge.color}`, pointerEvents:"none" }} />
        )}
      </div>

      <div style={{ flex:1 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{
            fontFamily:"'Bebas Neue',sans-serif", fontSize:15, letterSpacing:1.5,
            color: unlocked ? (isCurrent ? badge.color : "rgba(241,245,249,0.8)") : "rgba(241,245,249,0.2)",
          }}>
            {badge.label}
          </span>
          {isCurrent && (
            <span className="prof-section-badge" style={{
              fontFamily:"'Barlow Condensed',sans-serif", fontSize:8, fontWeight:800, letterSpacing:2,
              color:"#030712", background:badge.color, padding:"2px 7px", borderRadius:4,
            }}>
              TU ES ICI
            </span>
          )}
        </div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:700, letterSpacing:1, color:"rgba(241,245,249,0.2)", marginTop:1 }}>
          Niv. {badge.minLevel}–{badge.maxLevel}
        </div>
      </div>

      {unlocked && (
        <div style={{
          width:8, height:8, borderRadius:"50%", flexShrink:0,
          background: isCurrent ? badge.color : `${badge.color}60`,
          boxShadow: isCurrent ? `0 0 8px ${badge.color}` : "none",
        }} />
      )}
    </motion.div>
  );
}

/* ─── Section wrapper ────────────────────────────────────────────────────── */
function Section({ children, delay = 0, style }) {
  return (
    <motion.div
      initial={{ opacity:0, y:22 }}
      animate={{ opacity:1, y:0 }}
      transition={{ delay: delay * 0.1, duration:0.5, ease:[0.4,0,0.2,1] }}
      style={style}
    >
      {children}
    </motion.div>
  );
}

function SectionTitle({ children, accent }) {
  return (
    <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:14 }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:2, color:"rgba(241,245,249,0.55)" }}>{children}</div>
      {accent && <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:2, color:"#10b981" }}>{accent}</div>}
      <div style={{ flex:1, height:1, background:"rgba(241,245,249,0.05)", marginLeft:4 }} />
    </div>
  );
}

/* ─── Matrix Counter ─────────────────────────────────────────────────────── */
function MatrixCounter({ value, color }) {
  const ref  = useRef(null);
  const done = useRef(false);
  const CHARS = "0123456789";
  useEffect(() => {
    const el = ref.current; if (!el || done.current) return;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect(); done.current = true;
      const target = Math.round(value);
      const len    = target.toLocaleString().length;
      let frame = 0, total = 38, scramble = 20;
      const tick = () => {
        frame++;
        if (frame <= scramble) {
          el.textContent = Array.from({ length: len }, () => CHARS[Math.floor(Math.random()*10)]).join("");
        } else {
          el.textContent = Math.round(((frame - scramble) / (total - scramble)) * target).toLocaleString();
        }
        if (frame < total) requestAnimationFrame(tick);
        else el.textContent = target.toLocaleString();
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [value]);
  return (
    <span ref={ref} className="matrix-char" style={{
      fontFamily:"'Courier New',monospace", color,
      textShadow:`0 0 8px ${color}80, 0 0 20px ${color}30`,
    }}>
      {Math.round(value).toLocaleString()}
    </span>
  );
}

/* ─── Wallet Holographic ─────────────────────────────────────────────────── */
function WalletHolo({ mc, sc }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
      {[
        { label:"MARKETCOINS", val:mc, color:"#fbbf24", icon:"🪙", tag:"MC" },
        { label:"STORECOINS",  val:sc, color:"#10b981", icon:"💎", tag:"SC" },
      ].map((w, i) => (
        <motion.div key={w.label}
          initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
          transition={{ delay: 0.15 + i * 0.12, duration:0.5, ease:[0.4,0,0.2,1] }}
          style={{
            position:"relative", borderRadius:16, overflow:"hidden", padding:"18px 14px",
            background:`linear-gradient(145deg, rgba(255,255,255,0.025) 0%, rgba(3,7,18,0.95) 100%)`,
            border:`1px solid ${w.color}25`,
          }}
        >
          <div className="wallet-holo-scan" />
          <div style={{
            position:"absolute", inset:0, zIndex:0, pointerEvents:"none",
            backgroundImage:`linear-gradient(${w.color}07 1px,transparent 1px),linear-gradient(90deg,${w.color}07 1px,transparent 1px)`,
            backgroundSize:"18px 18px",
          }} />
          <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,transparent,${w.color}70,transparent)`, zIndex:3 }} />
          <div style={{ position:"absolute", top:0, left:0, width:16, height:16, borderTop:`2px solid ${w.color}60`, borderLeft:`2px solid ${w.color}60`, borderRadius:"16px 0 0 0", zIndex:3 }} />
          <div style={{ position:"absolute", bottom:0, right:0, width:16, height:16, borderBottom:`2px solid ${w.color}40`, borderRight:`2px solid ${w.color}40`, borderRadius:"0 0 16px 0", zIndex:3 }} />
          <div style={{ position:"relative", zIndex:4 }}>
            <div style={{ fontSize:18, marginBottom:8 }}>{w.icon}</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, lineHeight:1 }}>
              <MatrixCounter value={w.val} color={w.color} />
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:700, color:`${w.color}70`, marginLeft:4 }}>{w.tag}</span>
            </div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:8, fontWeight:700, letterSpacing:3, color:`${w.color}60`, marginTop:6 }}>
              {w.label}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ─── 3D Stat Orb (R3F) ──────────────────────────────────────────────────── */
function StatOrb({ color, position, speed }) {
  const mesh = useRef();
  useFrame((state) => {
    if (!mesh.current) return;
    mesh.current.rotation.x += 0.008 * speed;
    mesh.current.rotation.y += 0.015 * speed;
    mesh.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * speed * 0.8) * 0.07;
  });
  return (
    <mesh ref={mesh} position={position}>
      <sphereGeometry args={[0.52, 32, 32]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.38} roughness={0.14} metalness={0.85} />
    </mesh>
  );
}

function OrbitDot({ color, center, radius, speed, offset }) {
  const mesh = useRef();
  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.elapsedTime * speed + offset;
    mesh.current.position.x = center[0] + Math.cos(t) * radius;
    mesh.current.position.y = center[1] + Math.sin(t * 0.7) * radius * 0.5;
    mesh.current.position.z = Math.sin(t) * radius * 0.4;
  });
  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[0.045, 8, 8]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} />
    </mesh>
  );
}

/* ─── Stats 3D section ───────────────────────────────────────────────────── */
function Stats3D({ profile, wr }) {
  const stats = [
    { label:"PARIS",    val:profile?.total_bets||0,  color:"#3b82f6", isPercent:false },
    { label:"VICTOIRES",val:profile?.total_wins||0,  color:"#10b981", isPercent:false },
    { label:"PRÉCISION",val:wr,                       color:"#a78bfa", isPercent:true  },
  ];
  const SPHERES = [
    { color:"#3b82f6", pos:[-1.6,0,0], speed:0.7, dots:["#60a5fa","#93c5fd"] },
    { color:"#10b981", pos:[0,0,0],    speed:1.0, dots:["#34d399","#6ee7b7"] },
    { color:"#a78bfa", pos:[1.6,0,0],  speed:0.55,dots:["#c4b5fd","#ddd6fe"] },
  ];
  return (
    <div>
      <div style={{ height:145, borderRadius:16, overflow:"hidden", border:"1px solid rgba(241,245,249,0.04)",
        background:"linear-gradient(180deg,rgba(3,7,18,0.92) 0%,rgba(3,7,18,0.5) 100%)" }}>
        <Canvas camera={{ position:[0,0,4.2], fov:50 }} gl={{ alpha:true, antialias:true }}>
          <ambientLight intensity={0.2} />
          <pointLight position={[3,3,3]}  intensity={2}   color="#3b82f6" />
          <pointLight position={[-3,2,2]} intensity={1.5} color="#10b981" />
          <pointLight position={[0,-2,3]} intensity={1}   color="#a78bfa" />
          {SPHERES.map((s, si) => (
            <group key={si}>
              <StatOrb color={s.color} position={s.pos} speed={s.speed} />
              {s.dots.map((dc, di) => (
                <OrbitDot key={di} color={dc} center={s.pos} radius={0.72} speed={1.8 + di*0.4} offset={di * Math.PI} />
              ))}
            </group>
          ))}
        </Canvas>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:10 }}>
        {stats.map((s, i) => (
          <AnimStatCard key={s.label} label={s.label} value={s.val} color={s.color} delay={i+1} isPercent={s.isPercent} />
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:8 }}>
        <AnimStatCard label="PROFIT TOTAL"  value={profile?.total_profit||0}  color="#34d399" delay={4} suffix=" MC" />
        <AnimStatCard label="PROFIT HEBDO"  value={profile?.weekly_profit||0} color="#10b981" delay={5} suffix=" MC" />
      </div>
    </div>
  );
}

/* ─── Liquid XP Bar ──────────────────────────────────────────────────────── */
function LiquidXPBar({ coins, div }) {
  const pct     = getDivisionProgress(coins);
  const nextDiv = getDivisionNext(coins);
  return (
    <div style={{ background:"rgba(241,245,249,0.015)", border:`1px solid ${div.color}20`, borderRadius:16, padding:"18px 16px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:8, fontWeight:700, letterSpacing:3, color:`${div.color}70`, marginBottom:2 }}>PROGRESSION DIVISION</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, color:div.color, letterSpacing:1 }}>{div.icon} {div.name}</div>
        </div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, color:div.color, lineHeight:1 }}>
          {pct}<span style={{ fontSize:14, opacity:0.5 }}>%</span>
        </div>
      </div>
      <div style={{ position:"relative", height:20, borderRadius:99, background:"rgba(255,255,255,0.03)", overflow:"hidden", border:`1px solid ${div.color}15` }}>
        <motion.div
          initial={{ width:0 }}
          animate={{ width:`${pct}%` }}
          transition={{ duration:1.5, ease:[0.4,0,0.2,1], delay:0.4 }}
          style={{ position:"absolute", left:0, top:0, bottom:0, borderRadius:99, overflow:"hidden",
            background:`linear-gradient(90deg, ${div.color}70, ${div.color}dd, ${div.color})` }}
        >
          <div style={{
            position:"absolute", inset:0,
            background:`linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.22) 50%,transparent 100%)`,
            backgroundSize:"50px 100%", animation:"liquid-wave 1.5s linear infinite",
          }} />
          {[15,42,70].map((left, j) => (
            <div key={j} style={{
              position:"absolute", left:`${left}%`, bottom:3, width:3, height:3, borderRadius:"50%",
              background:"rgba(255,255,255,0.55)",
              animation:`liquid-bubble ${1.2+j*0.45}s ease-in-out infinite ${j*0.35}s`,
            }} />
          ))}
        </motion.div>
        {pct > 3 && (
          <div style={{
            position:"absolute", left:`calc(${pct}% - 5px)`, top:"50%", transform:"translateY(-50%)",
            width:10, height:10, borderRadius:"50%", background:"rgba(255,255,255,0.95)",
            boxShadow:`0 0 8px ${div.color}, 0 0 20px ${div.color}80`,
            transition:"left 1.5s cubic-bezier(0.4,0,0.2,1) 0.4s",
          }} />
        )}
      </div>
      {nextDiv && div.max !== Infinity && (
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:8, fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, color:"rgba(241,245,249,0.2)", letterSpacing:1 }}>
          <span>{div.name} {div.icon}</span>
          <span>→ {nextDiv.name} {nextDiv.icon}</span>
        </div>
      )}
    </div>
  );
}

/* ─── Badge Constellation ────────────────────────────────────────────────── */
function BadgeConstellation({ level, currentBadge }) {
  const handleHover = useCallback((badge, unlocked) => {
    if (!unlocked || badge.id !== currentBadge.id) return;
    import("canvas-confetti").then(({ default: confetti }) => {
      confetti({ particleCount:14, spread:55, colors:[badge.color,"#f1f5f9","#10b981"],
        origin:{ x:0.5, y:0.7 }, startVelocity:11, gravity:1.6, ticks:48, scalar:0.55 });
    }).catch(()=>{});
  }, [currentBadge]);

  return (
    <div style={{ background:"rgba(241,245,249,0.01)", border:"1px solid rgba(241,245,249,0.04)", borderRadius:16, padding:"16px", position:"relative", overflow:"hidden" }}>
      {[...Array(6)].map((_,i) => (
        <div key={i} style={{
          position:"absolute", top:`${12+i*15}%`, left:`${82+Math.cos(i)*8}%`,
          width:i%2===0?2:1, height:i%2===0?2:1, borderRadius:"50%",
          background:"rgba(241,245,249,0.25)",
          animation:`aura-pulse ${2.2+i*0.35}s ease-in-out infinite ${i*0.5}s`,
        }} />
      ))}
      {BADGES.map((badge, i) => (
        <div key={badge.id} onMouseEnter={() => handleHover(badge, level >= badge.minLevel)}>
          <BadgeTimelineItem badge={badge} unlocked={level >= badge.minLevel} isCurrent={badge.id === currentBadge.id} index={i} />
        </div>
      ))}
    </div>
  );
}

/* ─── Activity Timeline ──────────────────────────────────────────────────── */
function ActivityTimeline({ userId }) {
  const [items, setItems] = useState(null);
  useEffect(() => {
    if (!userId) return;
    Promise.all([
      req(`match_bets?user_id=eq.${userId}&order=created_at.desc&limit=4`).catch(() => []),
      req(`user_bets?user_id=eq.${userId}&order=created_at.desc&limit=4`).catch(()  => []),
    ]).then(([mb, ub]) => {
      const all = [
        ...(mb||[]).map(b => ({ ...b, _type:"match" })),
        ...(ub||[]).map(b => ({ ...b, _type:"market" })),
      ].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0,6);
      setItems(all);
    });
  }, [userId]);

  const STATUS_COLOR = { won:"#10b981", lost:"#ef4444", pending:"#fbbf24", cashed_out:"#a78bfa" };
  const STATUS_LABEL = { won:"GAGNÉ", lost:"PERDU", pending:"EN COURS", cashed_out:"CASHOUT" };

  if (!items) return (
    <div style={{ padding:"14px", textAlign:"center", fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, letterSpacing:2, color:"rgba(241,245,249,0.2)" }}>
      CHARGEMENT...
    </div>
  );
  if (items.length === 0) return (
    <div style={{ padding:"14px", textAlign:"center", fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, letterSpacing:2, color:"rgba(241,245,249,0.15)" }}>
      AUCUNE ACTIVITÉ RÉCENTE
    </div>
  );
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      {items.map((a, i) => {
        const color = STATUS_COLOR[a.status] || "#94a3b8";
        const label = STATUS_LABEL[a.status] || (a.status||"—").toUpperCase();
        const title = a.match_title || a.market_title || "Paris";
        const gain  = a.status==="won" ? `+${fmt(a.potential_gain||0)} MC` : a.status==="lost" ? `-${fmt(a.cost||0)} MC` : `${fmt(a.cost||0)} MC`;
        const date  = new Date(a.created_at).toLocaleDateString("fr-FR",{day:"2-digit",month:"short"});
        return (
          <motion.div key={a.id||i}
            initial={{ opacity:0, x:28 }} animate={{ opacity:1, x:0 }}
            transition={{ delay:i*0.07, duration:0.4, ease:"easeOut" }}
            style={{
              display:"flex", alignItems:"center", gap:10, padding:"10px 12px",
              background:`${color}06`, border:`1px solid ${color}18`, borderRadius:11,
              position:"relative", overflow:"hidden",
              animation:a.status==="pending"?"activity-pulse 3s ease-in-out infinite":"none",
            }}
          >
            <div style={{ position:"absolute", left:0, top:0, bottom:0, width:3, background:color, borderRadius:"0 99px 99px 0" }} />
            <div style={{ fontSize:14, flexShrink:0 }}>{a._type==="match"?"⚽":"📈"}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, color:"rgba(241,245,249,0.7)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{title}</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, letterSpacing:1, color:"rgba(241,245,249,0.22)", marginTop:1 }}>{date}</div>
            </div>
            <div style={{ textAlign:"right", flexShrink:0 }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:13, color, letterSpacing:0.5 }}>{gain}</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:8, fontWeight:700, letterSpacing:1, color:`${color}80` }}>{label}</div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ─── Scatter Logout ─────────────────────────────────────────────────────── */
function ScatterLogout({ onLogout }) {
  const [confirm, setConfirm] = useState(false);
  const [busy,    setBusy]    = useState(false);
  const charsRef = useRef([]);
  const LABEL    = "DÉCONNEXION";

  const handleEnter = useCallback(() => {
    if (busy) return;
    setBusy(true);
    charsRef.current.forEach((el, i) => {
      if (!el) return;
      gsap.to(el, {
        x:(Math.random()-0.5)*100, y:(Math.random()-0.5)*50,
        rotation:(Math.random()-0.5)*200, opacity:0,
        duration:0.32, delay:i*0.022, ease:"power2.in",
      });
    });
    setTimeout(() => {
      charsRef.current.forEach(el => { if (el) gsap.set(el,{x:0,y:0,rotation:0,opacity:1}); });
      setBusy(false);
    }, 580);
  }, [busy]);

  return (
    <>
      <button onMouseEnter={handleEnter} onClick={() => setConfirm(true)} style={{
        width:"100%", padding:"16px 0", borderRadius:12,
        border:"1px solid rgba(239,68,68,0.2)", background:"rgba(239,68,68,0.04)",
        color:"#f87171", fontFamily:"'Bebas Neue',sans-serif", fontSize:18,
        letterSpacing:3, cursor:"pointer", overflow:"hidden",
        display:"flex", alignItems:"center", justifyContent:"center",
      }}>
        {LABEL.split("").map((ch, i) => (
          <span key={i} ref={el => { charsRef.current[i] = el; }} style={{ display:"inline-block" }}>
            {ch === " " ? " " : ch}
          </span>
        ))}
      </button>

      <AnimatePresence>
        {confirm && (
          <motion.div
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ position:"fixed", inset:0, background:"rgba(3,7,18,0.88)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, backdropFilter:"blur(8px)" }}
          >
            <motion.div
              initial={{ scale:0.82, y:24 }} animate={{ scale:1, y:0 }} exit={{ scale:0.82, y:24 }}
              style={{ background:"linear-gradient(135deg,#0d1f35,#030712)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:20, padding:"32px 28px", maxWidth:300, width:"90%", textAlign:"center" }}
            >
              <div style={{ fontSize:36, marginBottom:12 }}>👋</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:2, marginBottom:8 }}>À BIENTÔT ?</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, color:"rgba(241,245,249,0.4)", marginBottom:24, lineHeight:1.5 }}>
                Tu seras déconnecté de ton compte MarketBall.
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <button onClick={() => setConfirm(false)} style={{
                  padding:"12px", borderRadius:10, border:"1px solid rgba(241,245,249,0.1)",
                  background:"transparent", color:"rgba(241,245,249,0.55)",
                  fontFamily:"'Bebas Neue',sans-serif", fontSize:14, letterSpacing:1, cursor:"pointer",
                }}>ANNULER</button>
                <button onClick={onLogout} style={{
                  padding:"12px", borderRadius:10, border:"1px solid rgba(239,68,68,0.35)",
                  background:"rgba(239,68,68,0.12)", color:"#f87171",
                  fontFamily:"'Bebas Neue',sans-serif", fontSize:14, letterSpacing:1, cursor:"pointer",
                }}>CONFIRMER</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function ProfilePage({ profile, username, onLogout, onNavigate, session }) {
  const [friendCount,   setFriendCount]   = useState(null);
  const [pendingCount,  setPendingCount]  = useState(0);
  const [referralCount, setReferralCount] = useState(null);
  const [codeCopied,    setCodeCopied]    = useState(false);
  const refCode = profile?.referral_code || makeRefCode(profile?.id, username);
  const { t } = useLang();

  const div  = getDivision(profile?.coins || 0);
  const wr   = profile?.total_bets > 0 ? Math.round((profile.total_wins / profile.total_bets) * 100) : 0;
  const sub  = getSubPlan(profile);
  const level = profile?.level || 1;

  /* Current badge */
  const currentBadge = BADGES.slice().reverse().find(b => level >= b.minLevel) || BADGES[0];

  useEffect(() => { injectProfileStyles(); }, []);

  /* Data loading */
  useEffect(() => {
    if (!profile?.id) return;
    req(`friendships?or=(requester_id.eq.${profile.id},recipient_id.eq.${profile.id})&status=eq.accepted&select=id`)
      .then(d => setFriendCount((d||[]).length)).catch(()=>{});
    req(`friendships?recipient_id=eq.${profile.id}&status=eq.pending&select=id`, { _token:session?.token })
      .then(d => setPendingCount((d||[]).length)).catch(()=>{});
    if (!profile?.referral_code && session?.token) {
      req(`profiles?id=eq.${profile.id}`, { method:"PATCH", _token:session.token, body:JSON.stringify({ referral_code:refCode, updated_at:new Date().toISOString() }) }).catch(()=>{});
    }
    req(`profiles?referred_by=eq.${refCode}&select=id`).then(r => setReferralCount((r||[]).length)).catch(()=>{});
  }, [profile?.id]);

  /* Confetti on mount */
  useEffect(() => {
    import("canvas-confetti").then(({ default: confetti }) => {
      confetti({
        particleCount:25, spread:50, angle:90,
        colors:["#fbbf24","#10b981","#f1f5f9","#a78bfa"],
        origin:{ x:0.5, y:0.35 }, startVelocity:18,
        gravity:1.2, ticks:70, scalar:0.75,
      });
    }).catch(()=>{});
  }, []);

  const [avatarFrom] = avatarColor(username);

  return (
    <div style={{
      paddingBottom:60, position:"relative",
      backgroundImage:"radial-gradient(rgba(16,185,129,0.04) 1px,transparent 1px)",
      backgroundSize:"20px 20px",
    }}>

      {/* ── HERO HEADER ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity:0, y:-20 }}
        animate={{ opacity:1, y:0 }}
        transition={{ duration:0.5 }}
        style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}
      >
        <div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, fontWeight:700, letterSpacing:4, color:"rgba(16,185,129,0.5)", marginBottom:4 }}>
            MARKETBALL · PROFIL
          </div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:38, letterSpacing:2, lineHeight:0.9, color:"#f1f5f9" }}>
            MON<br/><span style={{ color:"#10b981" }}>PROFIL</span>
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:28, marginBottom:2, animation:"aura-pulse 2.5s ease-in-out infinite", display:"inline-block" }}>{currentBadge.emoji}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, fontWeight:700, letterSpacing:2, color:currentBadge.color }}>
            {currentBadge.label.toUpperCase()}
          </div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:8, color:"rgba(241,245,249,0.25)", letterSpacing:1 }}>
            NIV. {level}
          </div>
        </div>
      </motion.div>

      {/* ── PLAYER CARD ─────────────────────────────────────────── */}
      <Section delay={1} style={{ marginBottom:28 }}>
        <PlayerCard profile={profile} username={username} div={div} wr={wr} />
        <div style={{ textAlign:"center", marginTop:10, fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, fontWeight:700, letterSpacing:2, color:"rgba(241,245,249,0.2)" }}>
          CARTE JOUEUR · CLIQUER POUR RETOURNER
        </div>
      </Section>

      {/* ── WALLET HOLOGRAPHIQUE ────────────────────────────────── */}
      <Section delay={2} style={{ marginBottom:22 }}>
        <SectionTitle accent="WALLET" />
        <WalletHolo mc={profile?.coins||0} sc={profile?.store_coins||0} />
      </Section>

      {/* ── STATS 3D ────────────────────────────────────────────── */}
      <Section delay={3} style={{ marginBottom:22 }}>
        <SectionTitle accent="STATS" />
        <Stats3D profile={profile} wr={wr} />
      </Section>

      {/* ── XP LIQUIDE ──────────────────────────────────────────── */}
      <Section delay={3.5} style={{ marginBottom:22 }}>
        <LiquidXPBar coins={profile?.coins||0} div={div} />
      </Section>

      {/* ── SUBSCRIPTION ────────────────────────────────────────── */}
      <Section delay={4} style={{ marginBottom:22 }}>
        <div style={{
          background:`${getSubColor(sub)}08`, border:`1px solid ${getSubColor(sub)}20`,
          borderRadius:14, padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"center",
          position:"relative", overflow:"hidden",
        }}>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,transparent,${getSubColor(sub)}50,transparent)` }} />
          <div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, fontWeight:700, letterSpacing:2, color:"rgba(241,245,249,0.3)", marginBottom:4 }}>
              {t("profile.current_sub")}
            </div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:getSubColor(sub), letterSpacing:1 }}>
              {getSubEmoji(sub)} {getSubLabel(sub)}
            </div>
            <div style={{ fontSize:11, color:"rgba(241,245,249,0.3)", marginTop:2 }}>{getMCBoost(sub)} MC chaque lundi</div>
          </div>
          {sub === "starter" && (
            <button onClick={() => onNavigate("subscription")} style={{
              padding:"9px 16px", borderRadius:9, border:"1px solid rgba(245,158,11,0.3)",
              background:"rgba(245,158,11,0.08)", color:"#f59e0b", fontFamily:"'Bebas Neue',sans-serif",
              fontSize:13, letterSpacing:1, cursor:"pointer",
            }}>
              UPGRADE →
            </button>
          )}
        </div>
      </Section>

      {/* ── DIVISIONS ────────────────────────────────────────────── */}
      <Section delay={5} style={{ marginBottom:22 }}>
        <SectionTitle accent="DIVISIONS" />
        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
          {DIVISIONS.map((d) => {
            const coins   = profile?.coins || 0;
            const reached = coins >= d.min;
            const isCur   = d.id === div.id;
            const pct     = isCur ? getDivisionProgress(coins) : 0;
            return (
              <div key={d.id} style={{
                background: isCur ? `${d.color}10` : "transparent",
                border:`1px solid ${isCur ? d.color+"35" : "rgba(241,245,249,0.04)"}`,
                borderRadius:11, padding:"9px 12px", opacity:reached?1:0.28,
                position:"relative", overflow:"hidden",
              }}>
                {isCur && pct > 0 && d.max !== Infinity && (
                  <div style={{ position:"absolute", top:0, left:0, bottom:0, width:`${pct}%`, background:`${d.color}06`, pointerEvents:"none" }} />
                )}
                <div style={{ display:"flex", alignItems:"center", gap:10, position:"relative" }}>
                  <div style={{
                    width:32, height:32, borderRadius:9, background:`${d.color}18`,
                    border:`1px solid ${d.color}${isCur?"40":"15"}`,
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0,
                    boxShadow:isCur?`0 0 12px ${d.color}40`:"none",
                  }}>{d.icon}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:13, color:isCur?d.color:"rgba(241,245,249,0.6)", letterSpacing:1 }}>{d.name}</span>
                      {isCur && <span style={{ fontSize:8, fontWeight:800, color:d.color, background:`${d.color}20`, padding:"1px 5px", borderRadius:3, letterSpacing:1 }}>ICI</span>}
                      {reached && !isCur && <span style={{ fontSize:11, color:d.color }}>✓</span>}
                    </div>
                    {isCur && d.max !== Infinity && (
                      <div style={{ height:2, borderRadius:99, background:"rgba(255,255,255,0.05)", overflow:"hidden", marginTop:4 }}>
                        <div style={{ width:`${pct}%`, height:"100%", background:d.color, borderRadius:99 }} />
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize:11, color:isCur?d.color:"rgba(241,245,249,0.3)", fontWeight:700, flexShrink:0 }}>
                    🏅 {d.top1} SC
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ── BADGE CONSTELLATION ─────────────────────────────────── */}
      <Section delay={6} style={{ marginBottom:22 }}>
        <SectionTitle accent="BADGES" />
        <BadgeConstellation level={level} currentBadge={currentBadge} />
      </Section>

      {/* ── ACTIVITÉ RÉCENTE ─────────────────────────────────────── */}
      <Section delay={6.5} style={{ marginBottom:22 }}>
        <SectionTitle accent="ACTIVITÉ" />
        <ActivityTimeline userId={profile?.id} />
      </Section>

      {/* ── FRIENDS & REFERRAL ──────────────────────────────────── */}
      <Section delay={7} style={{ marginBottom:22 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
          {/* Friends */}
          <div onClick={() => onNavigate("leaderboard")} style={{
            background:"rgba(16,185,129,0.04)", border:"1px solid rgba(16,185,129,0.1)",
            borderRadius:14, padding:"14px", cursor:"pointer",
          }}>
            <div style={{ fontSize:22, marginBottom:6 }}>👥</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, letterSpacing:1, marginBottom:2 }}>AMIS</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, color:"#10b981" }}>
              {friendCount === null ? "…" : friendCount}
            </div>
            {pendingCount > 0 && (
              <div style={{ fontSize:9, color:"#fbbf24", fontWeight:800, marginTop:4 }}>+{pendingCount} EN ATTENTE</div>
            )}
          </div>

          {/* Referrals */}
          <div style={{
            background:"rgba(245,158,11,0.04)", border:"1px solid rgba(245,158,11,0.1)",
            borderRadius:14, padding:"14px",
          }}>
            <div style={{ fontSize:22, marginBottom:6 }}>🎁</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, letterSpacing:1, marginBottom:2 }}>FILLEULS</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, color:"#f59e0b" }}>
              {referralCount === null ? "…" : referralCount}
            </div>
            <div style={{ fontSize:9, color:"#10b981", fontWeight:800, marginTop:4 }}>{profile?.referral_sc_earned||0} SC GAGNÉS</div>
          </div>
        </div>

        {/* Referral code */}
        {refCode && (
          <div style={{ background:"rgba(245,158,11,0.03)", border:"1px solid rgba(245,158,11,0.15)", borderRadius:14, padding:"14px 16px" }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, fontWeight:700, letterSpacing:3, color:"rgba(245,158,11,0.5)", marginBottom:8 }}>TON CODE DE PARRAINAGE</div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <div style={{
                flex:1, background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.25)",
                borderRadius:10, padding:"10px 14px", fontFamily:"'Bebas Neue',sans-serif",
                fontSize:20, letterSpacing:4, color:"#f59e0b", textAlign:"center",
              }}>
                {refCode}
              </div>
              <button onClick={() => {
                navigator.clipboard?.writeText(refCode);
                setCodeCopied(true);
                setTimeout(() => setCodeCopied(false), 2000);
              }} style={{
                padding:"10px 14px", borderRadius:10,
                border:`1px solid ${codeCopied ? "rgba(16,185,129,0.4)" : "rgba(245,158,11,0.3)"}`,
                background:codeCopied?"rgba(16,185,129,0.1)":"transparent",
                color:codeCopied?"#10b981":"rgba(241,245,249,0.5)",
                fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:12,
                cursor:"pointer", whiteSpace:"nowrap", letterSpacing:1,
              }}>
                {codeCopied ? "✓ COPIÉ" : t("profile.copy_btn")}
              </button>
            </div>
          </div>
        )}
      </Section>

      {/* ── DISCLAIMER ──────────────────────────────────────────── */}
      <Section delay={8} style={{ marginBottom:22 }}>
        <div style={{ background:"rgba(239,68,68,0.03)", border:"1px solid rgba(239,68,68,0.07)", borderRadius:10, padding:"11px 14px", fontSize:11, color:"rgba(241,245,249,0.3)", lineHeight:1.65 }}>
          {t("profile.no_monetary")} <strong style={{ color:"rgba(241,245,249,0.5)" }}>{t("profile.no_monetary_strong")}</strong>.
        </div>
      </Section>

      {/* ── SCATTER LOGOUT ──────────────────────────────────────── */}
      <Section delay={9}>
        <ScatterLogout onLogout={onLogout} />
      </Section>
    </div>
  );
}
