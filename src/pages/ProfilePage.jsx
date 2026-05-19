import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";
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

      {/* ── WALLET ──────────────────────────────────────────────── */}
      <Section delay={2} style={{ marginBottom:22 }}>
        <SectionTitle accent="WALLET" />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {[
            { label:"MARKETCOINS", val:profile?.coins||0, color:"#fbbf24", prefix:"", suffix:" MC", icon:"🪙" },
            { label:"STORECOINS",  val:profile?.store_coins||0, color:"#10b981", prefix:"", suffix:" SC", icon:"💎" },
          ].map((w, i) => (
            <motion.div key={w.label}
              initial={{ opacity:0, scale:0.92 }} animate={{ opacity:1, scale:1 }}
              transition={{ delay: 0.25 + i * 0.08, duration:0.4 }}
              style={{
                background:`${w.color}08`, border:`1px solid ${w.color}25`,
                borderRadius:14, padding:"16px 14px", position:"relative", overflow:"hidden",
              }}
            >
              <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,transparent,${w.color}60,transparent)` }} />
              <div style={{ position:"absolute", bottom:-10, right:-4, fontFamily:"'Bebas Neue',sans-serif", fontSize:52, color:`${w.color}08`, lineHeight:1, userSelect:"none" }}>
                {w.val}
              </div>
              <div style={{ fontSize:16, marginBottom:4 }}>{w.icon}</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, color:w.color, letterSpacing:0, lineHeight:1 }}>{fmt(w.val)}</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, fontWeight:700, letterSpacing:2, color:"rgba(241,245,249,0.3)", marginTop:4 }}>{w.label}</div>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── STATS ───────────────────────────────────────────────── */}
      <Section delay={3} style={{ marginBottom:22 }}>
        <SectionTitle accent="STATS" />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          <AnimStatCard label="PARIS"     value={profile?.total_bets||0}  color="#3b82f6" delay={1} />
          <AnimStatCard label="VICTOIRES" value={profile?.total_wins||0}  color="#10b981" delay={2} />
          <AnimStatCard label="PRÉCISION" value={wr}                       color="#a78bfa" delay={3} isPercent />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:8 }}>
          <AnimStatCard label="PROFIT TOTAL"  value={profile?.total_profit||0}  color="#34d399" delay={4} suffix=" MC" />
          <AnimStatCard label="PROFIT HEBDO"  value={profile?.weekly_profit||0} color="#10b981" delay={5} suffix=" MC" />
        </div>
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

      {/* ── BADGE TIMELINE ──────────────────────────────────────── */}
      <Section delay={6} style={{ marginBottom:22 }}>
        <SectionTitle accent="BADGES" />
        <div style={{ background:"rgba(241,245,249,0.01)", border:"1px solid rgba(241,245,249,0.04)", borderRadius:14, padding:"14px 16px" }}>
          {BADGES.map((badge, i) => (
            <BadgeTimelineItem
              key={badge.id}
              badge={badge}
              unlocked={level >= badge.minLevel}
              isCurrent={badge.id === currentBadge.id}
              index={i}
            />
          ))}
        </div>
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

      {/* ── LOGOUT ──────────────────────────────────────────────── */}
      <Section delay={9}>
        <button onClick={onLogout} style={{
          width:"100%", padding:"14px 0", borderRadius:12,
          border:"1px solid rgba(239,68,68,0.15)", background:"rgba(239,68,68,0.04)",
          color:"#f87171", fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:2, cursor:"pointer",
        }}>
          {t("profile.logout_btn")}
        </button>
      </Section>
    </div>
  );
}
