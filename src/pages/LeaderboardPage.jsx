import { useState, useEffect, useRef, useCallback } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);
import { req } from "../lib/supabase.js";
import { DIVISIONS } from "../lib/constants.js";
import { getDivision, getSubPlan, fmt } from "../lib/helpers.js";
import BadgeTag from "../components/ui/BadgeTag.jsx";
import SubBadge from "../components/ui/SubBadge.jsx";
import Avatar from "../components/ui/Avatar.jsx";
import { useLang } from "../lib/i18n.jsx";

/* ─── Inject styles ──────────────────────────────────────────────────────── */
function injectLbStyles() {
  if (document.getElementById("lb-styles")) return;
  const s = document.createElement("style");
  s.id = "lb-styles";
  s.textContent = `
    @keyframes lb-shimmer    { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
    @keyframes lb-glow-green { 0%,100%{box-shadow:0 0 0 1px rgba(16,185,129,0.15),0 0 20px rgba(16,185,129,0.1)} 50%{box-shadow:0 0 0 1px rgba(16,185,129,0.4),0 0 30px rgba(16,185,129,0.25)} }
    @keyframes lb-glow-gold  { 0%,100%{box-shadow:0 0 12px rgba(251,191,36,0.3),inset 0 0 12px rgba(251,191,36,0.05)} 50%{box-shadow:0 0 28px rgba(251,191,36,0.55),inset 0 0 20px rgba(251,191,36,0.1)} }
    @keyframes lb-crown      { 0%,100%{transform:translateY(0) rotate(-5deg)} 50%{transform:translateY(-5px) rotate(5deg)} }
    @keyframes lb-float      { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
    @keyframes lb-pulse-dot  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.8)} }
    @keyframes lb-scan-h     { 0%{top:0;opacity:0.4} 90%{opacity:0.4} 100%{top:100%;opacity:0} }
    @keyframes lb-bar-grow   { from{transform:scaleX(0)} to{transform:scaleX(1)} }
    @keyframes lb-rise       { from{transform:scaleY(0);opacity:0} to{transform:scaleY(1);opacity:1} }
    @keyframes lb-ticker     { from{transform:translateX(0)} to{transform:translateX(-50%)} }
    @keyframes lb-urgent     { 0%,100%{text-shadow:0 0 8px rgba(16,185,129,0.4)} 50%{text-shadow:0 0 20px rgba(16,185,129,0.9),0 0 40px rgba(16,185,129,0.4)} }
    @keyframes lb-spark      { 0%{opacity:1;transform:translate(0,0) scale(1)} 100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(0)} }

    .lb-row  { transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease; cursor: pointer; }
    .lb-row:hover { transform: translateY(-3px) !important; }
    .lb-tilt { transition: transform 0.1s ease; }
    .lb-tab  { transition: all 0.18s ease; border: none; cursor: pointer; }
    .lb-divbtn { transition: all 0.18s ease; cursor: pointer; }
    .lb-divbtn:hover { filter: brightness(1.15); }
  `;
  document.head.appendChild(s);
}

/* ─── Countdown hook ─────────────────────────────────────────────────────── */
export function useCountdown() {
  const [parts, setParts] = useState({ d:0, h:0, m:0, s:0 });
  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const next = new Date(now);
      const day = now.getDay();
      next.setDate(now.getDate() + (day === 0 ? 1 : 8 - day));
      next.setHours(0,0,0,0);
      const diff = next - now;
      setParts({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, []);
  return parts;
}

/* ─── Countdown unit ─────────────────────────────────────────────────────── */
function CountdownUnit({ value, label, urgent }) {
  const str = String(value).padStart(2, "0");
  const G = "#10b981";
  return (
    <div style={{ textAlign:"center", flex:1 }}>
      <div style={{ position:"relative", background:"linear-gradient(180deg,#0b1929 50%,#070f1c 50%)", border:`1px solid ${urgent?"rgba(16,185,129,0.35)":"rgba(241,245,249,0.07)"}`, borderRadius:8, overflow:"hidden" }}>
        <div style={{ position:"absolute", top:"50%", left:0, right:0, height:1, background:urgent?"rgba(16,185,129,0.2)":"rgba(241,245,249,0.06)", zIndex:2 }} />
        <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,transparent,${urgent?G:"rgba(241,245,249,0.1)"},transparent)` }} />
        <div style={{
          fontFamily:"'Bebas Neue',sans-serif", fontSize:38, letterSpacing:3, lineHeight:1.15, padding:"6px 4px",
          color: urgent ? G : "#f1f5f9",
          animation: urgent ? "lb-urgent 1.5s ease infinite" : "none",
        }}>
          {str}
        </div>
      </div>
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:8, fontWeight:700, letterSpacing:2.5, color:urgent?"rgba(16,185,129,0.5)":"rgba(241,245,249,0.2)", marginTop:5 }}>{label}</div>
    </div>
  );
}

/* ─── Tilt card ──────────────────────────────────────────────────────────── */
function TiltCard({ children, style }) {
  const ref = useRef(null);
  const onMove = useCallback((e) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(500px) rotateX(${-y*10}deg) rotateY(${x*10}deg) translateZ(6px)`;
  }, []);
  const onLeave = useCallback(() => { if (ref.current) ref.current.style.transform = ""; }, []);
  return (
    <div ref={ref} className="lb-tilt" onMouseMove={onMove} onMouseLeave={onLeave} style={style}>
      {children}
    </div>
  );
}

/* ─── 3D Podium ──────────────────────────────────────────────────────────── */
function Podium3D({ players, onViewProfile }) {
  const podRef = useRef(null);
  useEffect(() => {
    if (!podRef.current || !players?.length) return;
    const cols = podRef.current.querySelectorAll(".pod-col");
    gsap.fromTo(cols,
      { scaleY:0, opacity:0 },
      { scaleY:1, opacity:1, duration:0.9, ease:"power3.out", stagger:{ from:"center", amount:0.25 }, transformOrigin:"bottom center", delay:0.1 }
    );
    const labels = podRef.current.querySelectorAll(".pod-info");
    gsap.fromTo(labels,
      { opacity:0, y:16 },
      { opacity:1, y:0, duration:0.6, ease:"power2.out", stagger:0.08, delay:0.5 }
    );
  }, [players]);

  if (!players || players.length < 2) return null;
  const order = [players[1], players[0], players[2]];
  const heights = [110, 155, 90];
  const medals  = ["🥈","🥇","🥉"];
  const ranks   = [2, 1, 3];
  const cols    = ["#94a3b8","#fbbf24","#cd7f32"];

  return (
    <div ref={podRef} style={{ display:"flex", gap:6, alignItems:"flex-end", paddingBottom:0, marginBottom:0 }}>
      {order.map((p, vi) => {
        if (!p) return <div key={vi} style={{ flex:1 }} />;
        const isGold = ranks[vi] === 1;
        const c = cols[vi];
        return (
          <div key={vi} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center" }}>
            {/* Info above */}
            <div className="pod-info" style={{ textAlign:"center", marginBottom:8, opacity:0 }}>
              {isGold && (
                <div style={{ fontSize:14, animation:"lb-crown 2.5s ease-in-out infinite", display:"inline-block", marginBottom:2 }}>👑</div>
              )}
              <div style={{ position:"relative", display:"inline-block", marginBottom:4 }}>
                <Avatar username={p.username} size={isGold?46:36} radius={isGold?13:10} />
                {isGold && (
                  <div style={{ position:"absolute", inset:-3, borderRadius:16, border:"2px solid #fbbf24", animation:"lb-glow-gold 2s ease infinite" }} />
                )}
              </div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:isGold?13:11, letterSpacing:1, color:c, maxWidth:70, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {p.username}
              </div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:isGold?17:13, color:c, letterSpacing:1, lineHeight:1.1 }}>
                +{fmt(p.weekly_profit||0)}
              </div>
            </div>

            {/* Column */}
            <div className="pod-col" style={{
              width:"100%", height:heights[vi],
              background:`linear-gradient(180deg,${c}22,${c}08)`,
              border:`1px solid ${c}30`, borderBottom:"none",
              borderRadius:"8px 8px 0 0",
              position:"relative", overflow:"hidden",
              transformOrigin:"bottom",
            }}>
              {/* Top shimmer line */}
              <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${c},transparent)`, animation:"lb-shimmer 2.5s linear infinite", backgroundSize:"200%" }} />
              {/* Ghost rank */}
              <div style={{ position:"absolute", bottom:-8, left:"50%", transform:"translateX(-50%)", fontFamily:"'Bebas Neue',sans-serif", fontSize:56, color:`${c}12`, letterSpacing:-2, lineHeight:1, pointerEvents:"none", userSelect:"none" }}>
                {ranks[vi]}
              </div>
              {/* Medal */}
              <div style={{ position:"absolute", top:10, left:"50%", transform:"translateX(-50%)", fontSize:isGold?22:18, opacity:0.7 }}>
                {medals[vi]}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Reward cards ───────────────────────────────────────────────────────── */
function RewardCards({ division }) {
  const rewards = [
    { label:"🥇 TOP 1", sc:division.top1, color:"#fbbf24", bg:"rgba(251,191,36,0.06)" },
    { label:"🥈 TOP 2", sc:division.top2, color:"#94a3b8", bg:"rgba(148,163,184,0.06)" },
    { label:"🥉 TOP 3", sc:division.top3, color:"#cd7f32", bg:"rgba(205,127,50,0.06)" },
    { label:"🎯 TOP 30%", sc:division.bonus, color:"#10b981", bg:"rgba(16,185,129,0.06)" },
  ];
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7, marginBottom:18 }}>
      {rewards.map((r) => (
        <TiltCard key={r.label} style={{
          background:r.bg, border:`1px solid ${r.color}25`, borderRadius:12,
          padding:"12px 10px", textAlign:"center", position:"relative", overflow:"hidden",
        }}>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,transparent,${r.color}60,transparent)`, animation:"lb-shimmer 3s linear infinite", backgroundSize:"200%" }} />
          <div style={{ fontSize:11, color:"rgba(241,245,249,0.35)", fontWeight:700, letterSpacing:1, marginBottom:5 }}>{r.label}</div>
          <div style={{
            fontFamily:"'Bebas Neue',sans-serif", fontSize:24, letterSpacing:2, lineHeight:1,
            background:`linear-gradient(135deg,${r.color},#fff,${r.color})`,
            backgroundSize:"200%", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            animation:"lb-shimmer 2s linear infinite",
          }}>
            +{r.sc} SC
          </div>
        </TiltCard>
      ))}
    </div>
  );
}

/* ─── Player row ─────────────────────────────────────────────────────────── */
function PlayerRow({ player, rank, isMe, onViewProfile, maxProfit, rewardSC, rewardColor }) {
  const pct = maxProfit > 0 ? Math.max(4, Math.round((player.weekly_profit||0) / maxProfit * 100)) : 4;
  const top3Colors = ["#fbbf24","#94a3b8","#cd7f32"];
  const isTop3 = rank <= 3;

  return (
    <div className="lb-row" style={{
      background: isMe ? "rgba(16,185,129,0.05)" : "rgba(241,245,249,0.015)",
      border: `1px solid ${isMe ? "rgba(16,185,129,0.2)" : "rgba(241,245,249,0.04)"}`,
      borderRadius:11, padding:"10px 12px", marginBottom:5,
      display:"flex", alignItems:"center", gap:9,
      animation: isMe ? "lb-glow-green 3s ease infinite" : "none",
      position:"relative", overflow:"hidden",
      boxShadow: isTop3 ? `0 2px 16px ${top3Colors[rank-1]}15` : "none",
    }}>
      {isMe && <div style={{ position:"absolute", left:0, top:0, bottom:0, width:2, background:"#10b981", boxShadow:"2px 0 8px rgba(16,185,129,0.4)" }} />}

      {/* Rank */}
      <div style={{ width:26, textAlign:"center", flexShrink:0 }}>
        {isTop3 ? (
          <span style={{ fontSize:17 }}>{rank===1?"🥇":rank===2?"🥈":"🥉"}</span>
        ) : (
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:13, color:"rgba(241,245,249,0.22)", letterSpacing:0 }}>{rank}</span>
        )}
      </div>

      <Avatar username={player.username} size={33} radius={9} />

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:4, flexWrap:"wrap" }}>
          <span onClick={()=>onViewProfile&&onViewProfile(player.username)} style={{ fontWeight:700, fontSize:13, color:isMe?"#10b981":"#f1f5f9", cursor:"pointer" }}>
            {player.username}
          </span>
          {player.subscription&&player.subscription!=="starter"&&<SubBadge profile={player} />}
          {isMe&&<span style={{ fontSize:8, color:"#10b981", fontWeight:900, letterSpacing:1.5, background:"rgba(16,185,129,0.12)", padding:"1px 5px", borderRadius:4 }}>YOU</span>}
        </div>
        {/* Progress bar */}
        <div style={{ height:3, background:"rgba(241,245,249,0.05)", borderRadius:99, overflow:"hidden" }}>
          <div style={{
            height:"100%", borderRadius:99,
            background: isMe ? "linear-gradient(90deg,#10b981,#34d399)" : isTop3 ? `linear-gradient(90deg,${top3Colors[rank-1]},${top3Colors[rank-1]}99)` : "rgba(241,245,249,0.15)",
            width:`${pct}%`,
            transformOrigin:"left",
            animation:"lb-bar-grow 0.8s cubic-bezier(0.4,0,0.2,1) backwards",
          }} />
        </div>
      </div>

      <div style={{ textAlign:"right", flexShrink:0 }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14, color:"#10b981", letterSpacing:1, lineHeight:1.2 }}>
          +{fmt(player.weekly_profit||0)}
        </div>
        {rewardSC ? (
          <div style={{ fontSize:9, fontWeight:800, color:rewardColor, letterSpacing:0.5, marginTop:2 }}>+{rewardSC} SC ↗</div>
        ) : null}
      </div>
    </div>
  );
}

/* ─── Public Profile ─────────────────────────────────────────────────────── */
export function PublicProfilePage({ username, onBack, session, profile: myProfile, showToast }) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState(null);
  const [addingFriend, setAddingFriend] = useState(false);
  const [recentBets, setRecentBets] = useState([]);
  const myId = myProfile?.id;
  const token = session?.token;
  const { t } = useLang();

  useEffect(() => {
    const load = async () => {
      try {
        const data = await req(`profiles?username=eq.${encodeURIComponent(username)}&select=*`);
        if (data?.[0]) {
          setProfileData(data[0]);
          if (myId && data[0].id !== myId) {
            const f = await req(`friendships?or=(and(requester_id.eq.${myId},recipient_id.eq.${data[0].id}),and(requester_id.eq.${data[0].id},recipient_id.eq.${myId}))&select=*`);
            if (f?.[0]) setFriendStatus(f[0].status === "accepted" ? "accepted" : f[0].requester_id === myId ? "pending" : "incoming");
          }
          const [mb, ub] = await Promise.all([
            req(`match_bets?user_id=eq.${data[0].id}&select=match_title,prediction,cost,potential_gain,status,created_at,bet_type&order=created_at.desc&limit=5`).catch(() => []),
            req(`user_bets?user_id=eq.${data[0].id}&select=market_title,side,cost,potential_gain,status,created_at&order=created_at.desc&limit=5`).catch(() => []),
          ]);
          setRecentBets([...(mb||[]).map(b=>({...b,_type:"match"})), ...(ub||[]).map(b=>({...b,_type:"market"}))].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,5));
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, [username, myId]);

  const addFriend = async () => {
    if (!myId || !token) return;
    setAddingFriend(true);
    try {
      await req(`friendships`, { method:"POST", body:JSON.stringify({ requester_id:myId, recipient_id:profileData.id, status:"pending" }), _token:token });
      setFriendStatus("pending");
      showToast?.("Demande d'ami envoyée !");
    } catch(e) { showToast?.(e.message||"Erreur","error"); }
    setAddingFriend(false);
  };

  if (loading) return <div style={{ textAlign:"center", padding:60, color:"rgba(241,245,249,0.25)", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:2 }}>CHARGEMENT...</div>;
  if (!profileData) return <div style={{ textAlign:"center", padding:60 }}>
    <div style={{ fontSize:40, marginBottom:12 }}>👤</div>
    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:"rgba(241,245,249,0.25)" }}>Joueur introuvable</div>
    <button onClick={onBack} style={{ marginTop:16, padding:"8px 20px", borderRadius:10, border:"1px solid rgba(241,245,249,0.1)", background:"transparent", color:"rgba(241,245,249,0.4)", cursor:"pointer", fontSize:13 }}>← Retour</button>
  </div>;

  const div = getDivision(profileData.coins || 0);
  const wr = profileData.total_bets > 0 ? Math.round((profileData.total_wins / profileData.total_bets) * 100) : 0;
  const sub = getSubPlan(profileData);

  return <div className="page-enter">
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
      <button onClick={onBack} style={{ padding:"6px 14px", borderRadius:10, border:"1px solid rgba(241,245,249,0.08)", background:"transparent", color:"rgba(241,245,249,0.4)", cursor:"pointer", fontSize:13 }}>← Retour</button>
      {myId && profileData?.id !== myId && (
        friendStatus==="accepted" ? <span style={{ fontSize:12, color:"#10b981", fontWeight:700 }}>Ami ✓</span>
        : friendStatus==="pending" ? <span style={{ fontSize:12, color:"rgba(241,245,249,0.3)" }}>Demande envoyée</span>
        : friendStatus==="incoming" ? <span style={{ fontSize:12, color:"#fbbf24" }}>Demande reçue</span>
        : <button onClick={addFriend} disabled={addingFriend} style={{ padding:"7px 16px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>{addingFriend?"...":"+ Ami"}</button>
      )}
    </div>
    <div style={{ background:`linear-gradient(135deg,${div.color}18,rgba(3,7,18,0.95))`, border:`1px solid ${div.color}30`, borderRadius:20, padding:"24px", marginBottom:18, position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:-60, right:-60, width:200, height:200, borderRadius:"50%", background:`radial-gradient(circle,${div.color}20,transparent 70%)`, pointerEvents:"none" }} />
      <div style={{ display:"flex", gap:16, alignItems:"center", marginBottom:12 }}>
        <div style={{ width:64, height:64, borderRadius:18, background:`${div.color}20`, border:`2px solid ${div.color}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, flexShrink:0 }}>
          {div.icon}
        </div>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:1 }}>{profileData.username}</div>
          <div style={{ display:"flex", gap:6, marginTop:4, flexWrap:"wrap", alignItems:"center" }}>
            <BadgeTag coins={profileData.coins||0} />
            {sub!=="starter"&&<SubBadge profile={profileData} />}
          </div>
          <div style={{ fontSize:12, color:"rgba(241,245,249,0.35)", marginTop:5 }}>{fmt(profileData.coins||0)} MC · {div.name}</div>
        </div>
      </div>
    </div>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:18 }}>
      {[{label:"PARIS",val:profileData.total_bets||0,color:"#3b82f6"},{label:"WINS",val:profileData.total_wins||0,color:"#10b981"},{label:"PRÉCISION",val:`${wr}%`,color:"#a78bfa"}].map(s=>(
        <div key={s.label} style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.05)", borderRadius:12, padding:"16px 10px", textAlign:"center" }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:s.color }}>{s.val}</div>
          <div style={{ fontSize:9, color:"rgba(241,245,249,0.25)", fontWeight:700, letterSpacing:1.5, marginTop:3 }}>{s.label}</div>
        </div>
      ))}
    </div>
    <div style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.05)", borderRadius:14, padding:"16px 18px", marginBottom:18 }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:1, marginBottom:12 }}>TOUTES LES DIVISIONS</div>
      {DIVISIONS.map(d => (
        <div key={d.id} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
          <span style={{ fontSize:11, fontWeight:700, color:d.color, background:`${d.color}12`, padding:"3px 9px", borderRadius:20, border:`1px solid ${d.color}25`, minWidth:100, textAlign:"center" }}>{d.name}</span>
          <span style={{ fontSize:11, color:"rgba(241,245,249,0.35)" }}>{fmt(d.min)} – {isFinite(d.max)?fmt(d.max):"∞"} MC</span>
          {d.id === div.id && <span style={{ fontSize:12, color:d.color }}>✓</span>}
        </div>
      ))}
    </div>
    {recentBets.length>0&&<div style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.05)", borderRadius:14, padding:"16px 18px" }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:1, marginBottom:12 }}>PARIS RÉCENTS</div>
      {recentBets.map((b,i) => {
        const won=b.status==="won", lost=b.status==="lost";
        return <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:i<recentBets.length-1?"1px solid rgba(241,245,249,0.04)":"none" }}>
          <div style={{ flex:1, minWidth:0, marginRight:10 }}>
            <div style={{ fontSize:11, color:"rgba(241,245,249,0.35)", marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{b.match_title||b.market_title||"Paris"}</div>
            <div style={{ fontSize:12, fontWeight:700, color:"rgba(241,245,249,0.7)" }}>{b.prediction||b.side||"—"} <span style={{ fontSize:10, color:"rgba(241,245,249,0.3)", fontWeight:400 }}>· {b.cost} MC</span></div>
          </div>
          <div style={{ flexShrink:0, textAlign:"right" }}>
            {won&&<span style={{ fontSize:11, fontWeight:800, color:"#10b981" }}>+{b.potential_gain} 🏆</span>}
            {lost&&<span style={{ fontSize:11, fontWeight:800, color:"#ef4444" }}>Perdu</span>}
            {b.status==="pending"&&<span style={{ fontSize:10, fontWeight:700, color:"#fbbf24", background:"rgba(251,191,36,0.1)", padding:"2px 7px", borderRadius:20 }}>En cours</span>}
            {b.status==="cashed_out"&&<span style={{ fontSize:11, fontWeight:700, color:"#3b82f6" }}>Cashout</span>}
          </div>
        </div>;
      })}
    </div>}
  </div>;
}

/* ─── Private leagues ────────────────────────────────────────────────────── */
function PrivateLeagues({ profile, session, showToast }) {
  const [tab, setTab] = useState("mes-ligues");
  const [myLeagues, setMyLeagues] = useState(null);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [membersProfiles, setMembersProfiles] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [newLeagueName, setNewLeagueName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const userId = profile?.id;
  const token = session?.token;
  const G = "#10b981";

  const loadMyLeagues = async () => {
    if (!userId) return;
    const memberships = await req(`league_members?user_id=eq.${userId}&select=league_id`, { _token:token }).catch(()=>[]);
    if (memberships?.length) {
      const ids = memberships.map(m => m.league_id).join(",");
      setMyLeagues(await req(`leagues?id=in.(${ids})&select=*`).catch(()=>[]));
    } else setMyLeagues([]);
  };
  useEffect(() => { loadMyLeagues(); }, [userId]);

  const loadLeagueMembers = async (league) => {
    setSelectedLeague(league); setLoadingMembers(true);
    const members = await req(`league_members?league_id=eq.${league.id}&select=user_id`).catch(()=>[]);
    const ids = (members||[]).map(m => m.user_id).join(",");
    if (ids) {
      const profiles = await req(`profiles?id=in.(${ids})&select=id,username,coins,total_bets,total_wins,weekly_profit`).catch(()=>[]);
      setMembersProfiles((profiles||[]).sort((a,b)=>(b.weekly_profit||0)-(a.weekly_profit||0)));
    } else setMembersProfiles([]);
    setLoadingMembers(false);
  };

  const createLeague = async () => {
    if (!newLeagueName.trim()) return; setCreating(true);
    try {
      const code = Math.random().toString(36).substring(2,8).toUpperCase();
      const res = await req(`leagues`, { method:"POST", body:JSON.stringify({ name:newLeagueName.trim(), invite_code:code, created_by:userId }), _token:token, headers:{ Prefer:"return=representation" } });
      const league = Array.isArray(res) ? res[0] : res;
      if (league?.id) {
        await req(`league_members`, { method:"POST", body:JSON.stringify({ league_id:league.id, user_id:userId }), _token:token });
        showToast?.(`Ligue créée ! Code : ${code}`);
        setNewLeagueName(""); setTab("mes-ligues"); loadMyLeagues();
      }
    } catch(e) { showToast?.(e.message||"Erreur","error"); }
    setCreating(false);
  };

  const joinLeague = async () => {
    if (!joinCode.trim()) return; setJoining(true);
    try {
      const leagues = await req(`leagues?invite_code=eq.${joinCode.trim().toUpperCase()}&select=*`);
      if (!leagues?.length) { showToast?.("Code invalide","error"); setJoining(false); return; }
      const league = leagues[0];
      const existing = await req(`league_members?league_id=eq.${league.id}&user_id=eq.${userId}&select=league_id`, { _token:token });
      if (existing?.length) { showToast?.("Tu es déjà dans cette ligue","error"); setJoining(false); return; }
      await req(`league_members`, { method:"POST", body:JSON.stringify({ league_id:league.id, user_id:userId }), _token:token });
      showToast?.(`Tu as rejoint "${league.name}" !`);
      setJoinCode(""); setTab("mes-ligues"); loadMyLeagues();
    } catch(e) { showToast?.(e.message||"Erreur","error"); }
    setJoining(false);
  };

  const leaveLeague = async (leagueId) => {
    await req(`league_members?league_id=eq.${leagueId}&user_id=eq.${userId}`, { method:"DELETE", _token:token }).catch(()=>{});
    showToast?.("Tu as quitté la ligue"); setSelectedLeague(null); loadMyLeagues();
  };

  const topColors = ["#fbbf24","#94a3b8","#cd7f32"];
  const medals = ["🥇","🥈","🥉"];

  if (selectedLeague) return <div>
    <button onClick={()=>setSelectedLeague(null)} style={{ marginBottom:16, padding:"6px 14px", borderRadius:10, border:"1px solid rgba(241,245,249,0.08)", background:"transparent", color:"rgba(241,245,249,0.4)", cursor:"pointer", fontSize:13 }}>← Ligues</button>
    <div style={{ background:"linear-gradient(135deg,rgba(16,185,129,0.08),rgba(16,185,129,0.02))", border:"1px solid rgba(16,185,129,0.15)", borderRadius:16, padding:"14px 16px", marginBottom:16 }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:2 }}>{selectedLeague.name}</div>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6 }}>
        <span style={{ fontSize:11, color:"rgba(241,245,249,0.4)" }}>Code :</span>
        <span onClick={()=>{ navigator.clipboard?.writeText(selectedLeague.invite_code); showToast?.("Code copié !"); }} style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:G, letterSpacing:3, background:"rgba(16,185,129,0.1)", padding:"3px 12px", borderRadius:8, cursor:"pointer" }}>{selectedLeague.invite_code}</span>
      </div>
    </div>
    {loadingMembers ? <div style={{ textAlign:"center", padding:30, color:"rgba(241,245,249,0.25)" }}>Chargement...</div>
    : membersProfiles.map((m,i) => {
      const isMe = m.id === userId;
      return <div key={m.id} style={{ display:"flex", alignItems:"center", gap:12, background:isMe?"rgba(16,185,129,0.04)":"rgba(241,245,249,0.02)", border:`1px solid ${isMe?"rgba(16,185,129,0.12)":"rgba(241,245,249,0.05)"}`, borderRadius:12, padding:"12px 14px", marginBottom:6 }}>
        <div style={{ width:24, textAlign:"center", fontSize:i<3?18:13, fontFamily:"'Bebas Neue',sans-serif", color:i<3?topColors[i]:"rgba(241,245,249,0.4)" }}>{i<3?medals[i]:i+1}</div>
        <Avatar username={m.username} size={34} radius={9} />
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontWeight:700, fontSize:13, color:isMe?G:"#f1f5f9" }}>{m.username}</span>
            {isMe&&<span style={{ fontSize:10, color:G }}>(Vous)</span>}
          </div>
          <div style={{ fontSize:11, color:"rgba(241,245,249,0.25)", marginTop:2 }}>{m.total_wins||0}/{m.total_bets||0} paris</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, color:G, letterSpacing:1 }}>+{fmt(m.weekly_profit||0)}</div>
          <div style={{ fontSize:10, color:"rgba(241,245,249,0.25)" }}>cette semaine</div>
        </div>
      </div>;
    })}
    <button onClick={()=>leaveLeague(selectedLeague.id)} style={{ width:"100%", marginTop:16, padding:"11px 0", borderRadius:11, border:"1px solid rgba(239,68,68,0.2)", background:"transparent", color:"rgba(239,68,68,0.5)", fontWeight:700, fontSize:13, cursor:"pointer" }}>Quitter la ligue</button>
  </div>;

  return <div>
    <div style={{ display:"flex", gap:6, marginBottom:16 }}>
      {[{id:"mes-ligues",label:"🏆 Mes ligues"},{id:"creer",label:"➕ Créer"},{id:"rejoindre",label:"🔗 Rejoindre"}].map(s=>(
        <button key={s.id} onClick={()=>setTab(s.id)} style={{ flex:1, padding:"8px 4px", borderRadius:10, border:`1px solid ${tab===s.id?G:"rgba(241,245,249,0.07)"}`, background:tab===s.id?"rgba(16,185,129,0.08)":"transparent", color:tab===s.id?G:"rgba(241,245,249,0.35)", fontWeight:700, fontSize:10, cursor:"pointer" }}>{s.label}</button>
      ))}
    </div>
    {tab==="mes-ligues"&&(myLeagues===null?<div style={{ textAlign:"center", padding:30, color:"rgba(241,245,249,0.25)" }}>Chargement...</div>:myLeagues.length===0?<div style={{ textAlign:"center", padding:40 }}><div style={{ fontSize:36, marginBottom:10 }}>🏆</div><div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:"rgba(241,245,249,0.25)", marginBottom:6 }}>AUCUNE LIGUE</div></div>:myLeagues.map(l=>(
      <div key={l.id} onClick={()=>loadLeagueMembers(l)} style={{ display:"flex", alignItems:"center", gap:12, background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:14, padding:"14px 16px", marginBottom:8, cursor:"pointer" }}>
        <div style={{ width:40, height:40, borderRadius:11, background:"linear-gradient(135deg,rgba(16,185,129,0.2),rgba(16,185,129,0.05))", border:"1px solid rgba(16,185,129,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🏆</div>
        <div style={{ flex:1 }}><div style={{ fontWeight:700, fontSize:13 }}>{l.name}</div><div style={{ fontSize:11, color:"rgba(241,245,249,0.35)", marginTop:2 }}>Code : <span style={{ color:G, fontFamily:"'Bebas Neue',sans-serif", letterSpacing:1 }}>{l.invite_code}</span></div></div>
        <div style={{ fontSize:18, color:"rgba(241,245,249,0.3)" }}>›</div>
      </div>
    )))}
    {tab==="creer"&&<div style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:14, padding:20 }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, letterSpacing:1, marginBottom:14 }}>NOUVELLE LIGUE</div>
      <input value={newLeagueName} onChange={e=>setNewLeagueName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&createLeague()} placeholder="Ex: Les Loosers FC" style={{ width:"100%", padding:"12px 14px", background:"rgba(241,245,249,0.04)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:11, color:"#f1f5f9", fontSize:14, outline:"none", boxSizing:"border-box", marginBottom:12 }} />
      <button onClick={createLeague} disabled={creating||!newLeagueName.trim()} style={{ width:"100%", padding:"12px 0", borderRadius:11, border:"none", background:creating||!newLeagueName.trim()?"rgba(241,245,249,0.04)":"linear-gradient(135deg,#10b981,#059669)", color:creating||!newLeagueName.trim()?"rgba(241,245,249,0.2)":"#fff", fontWeight:800, fontSize:14, cursor:creating||!newLeagueName.trim()?"not-allowed":"pointer" }}>{creating?"...":"CRÉER →"}</button>
    </div>}
    {tab==="rejoindre"&&<div style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:14, padding:20 }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, letterSpacing:1, marginBottom:14 }}>REJOINDRE UNE LIGUE</div>
      <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} onKeyDown={e=>e.key==="Enter"&&joinLeague()} placeholder="Code d'invitation" style={{ width:"100%", padding:"12px 14px", background:"rgba(241,245,249,0.04)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:11, color:"#f1f5f9", fontSize:18, outline:"none", boxSizing:"border-box", marginBottom:14, fontFamily:"'Bebas Neue',sans-serif", letterSpacing:4, textAlign:"center" }} />
      <button onClick={joinLeague} disabled={joining||!joinCode.trim()} style={{ width:"100%", padding:"12px 0", borderRadius:11, border:"none", background:joining||!joinCode.trim()?"rgba(241,245,249,0.04)":"linear-gradient(135deg,#10b981,#059669)", color:joining||!joinCode.trim()?"rgba(241,245,249,0.2)":"#fff", fontWeight:800, fontSize:14, cursor:joining||!joinCode.trim()?"not-allowed":"pointer" }}>{joining?"...":"REJOINDRE →"}</button>
    </div>}
  </div>;
}

/* ─── Division leaderboard ───────────────────────────────────────────────── */
function DivisionLeaderboard({ division, username, onViewProfile, session }) {
  const [players, setPlayers] = useState(null);
  const listRef = useRef(null);
  const G = "#10b981";

  useEffect(() => {
    setPlayers(null);
    const load = async () => {
      try {
        const maxFilter = isFinite(division.max) ? `&coins=lte.${division.max}` : "";
        const data = await req(
          `profiles?select=id,username,coins,store_coins,weekly_profit,total_bets,total_wins,subscription&coins=gte.${division.min}${maxFilter}&order=weekly_profit.desc&limit=100`,
          { _token: session?.token }
        );
        setPlayers(data || []);
      } catch { setPlayers([]); }
    };
    load();
  }, [division.id]);

  useEffect(() => {
    if (!listRef.current || !players?.length) return;
    const rows = Array.from(listRef.current.children);
    gsap.fromTo(rows,
      { opacity:0, x:-20 },
      { opacity:1, x:0, duration:0.35, ease:"power2.out", stagger:0.04,
        scrollTrigger:{ trigger:listRef.current, start:"top 92%", once:true } }
    );
  }, [players]);

  if (!players) return (
    <div style={{ textAlign:"center", padding:48, color:"rgba(241,245,249,0.2)" }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14, letterSpacing:3 }}>CHARGEMENT...</div>
    </div>
  );
  if (!players.length) return (
    <div style={{ textAlign:"center", padding:40 }}>
      <div style={{ fontSize:36, marginBottom:10 }}>🏆</div>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:"rgba(241,245,249,0.25)" }}>AUCUN JOUEUR DANS CETTE DIVISION</div>
    </div>
  );

  const bonusBoundary = players.length > 3 ? 3 + Math.ceil((players.length - 3) * 0.3) : 3;
  const maxProfit = Math.max(...players.map(p => p.weekly_profit || 0), 1);

  const rewardFor = (i) => {
    if (i === 0) return { sc: division.top1, color: "#fbbf24" };
    if (i === 1) return { sc: division.top2, color: "#94a3b8" };
    if (i === 2) return { sc: division.top3, color: "#cd7f32" };
    if (i < bonusBoundary) return { sc: division.bonus, color: G };
    return null;
  };

  return (
    <div>
      {/* Reward cards with tilt */}
      <RewardCards division={division} />

      {/* 3D Podium */}
      {players.length >= 2 && (
        <div style={{ marginBottom:20, background:"rgba(241,245,249,0.01)", border:"1px solid rgba(241,245,249,0.04)", borderRadius:16, overflow:"hidden", padding:"14px 10px 0" }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:9, letterSpacing:3, color:"rgba(241,245,249,0.2)", marginBottom:6, paddingLeft:4 }}>PODIUM · TOP 3</div>
          <Podium3D players={players} onViewProfile={onViewProfile} />
        </div>
      )}

      {/* Full list */}
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:9, letterSpacing:3, color:"rgba(241,245,249,0.2)", marginBottom:10, marginTop:18 }}>
        CLASSEMENT COMPLET
      </div>
      <div ref={listRef}>
        {players.map((p, i) => {
          const isBonusLine = i === bonusBoundary && i > 3;
          const reward = rewardFor(i);
          const isMe = p.username === username;
          return (
            <div key={p.username}>
              {isBonusLine && (
                <div style={{ display:"flex", alignItems:"center", gap:8, margin:"10px 0 8px" }}>
                  <div style={{ flex:1, height:1, background:"rgba(241,245,249,0.05)" }} />
                  <span style={{ fontSize:9, color:"rgba(241,245,249,0.2)", fontWeight:700, letterSpacing:1.5, whiteSpace:"nowrap" }}>HORS RÉCOMPENSES</span>
                  <div style={{ flex:1, height:1, background:"rgba(241,245,249,0.05)" }} />
                </div>
              )}
              <PlayerRow
                player={p} rank={i+1} isMe={isMe}
                onViewProfile={onViewProfile}
                maxProfit={maxProfit}
                rewardSC={reward?.sc} rewardColor={reward?.color}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function LeaderboardPage({ username, onViewProfile, profile, session, showToast }) {
  const countdown = useCountdown();
  const myDivision = getDivision(profile?.coins || 0);
  const [tab, setTab] = useState("divisions");
  const [selectedDivId, setSelectedDivId] = useState(myDivision.id);
  const isLoggedIn = !!profile?.id;
  const divScrollRef = useRef(null);
  const headerRef = useRef(null);
  const selectedDiv = DIVISIONS.find(d => d.id === selectedDivId) || DIVISIONS[0];
  const isUrgent = countdown.d === 0 && countdown.h < 24;
  const G = "#10b981";

  useEffect(() => { injectLbStyles(); }, []);

  useEffect(() => {
    if (!headerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(".lb-hero-title", { opacity:0, y:40 }, { opacity:1, y:0, duration:0.7, ease:"power3.out", stagger:0.08 });
      gsap.fromTo(".lb-hero-sub",  { opacity:0 }, { opacity:1, duration:0.5, delay:0.4 });
    }, headerRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!divScrollRef.current) return;
    const idx = DIVISIONS.findIndex(d => d.id === selectedDivId);
    const btn = divScrollRef.current.children[idx];
    if (btn) btn.scrollIntoView({ behavior:"smooth", inline:"center", block:"nearest" });
  }, [selectedDivId]);

  const TABS = [
    { id:"divisions", label:"🏆 DIVISIONS" },
    { id:"ligues", label:"👥 LIGUES", locked:!isLoggedIn },
  ];

  const TICKER = ["CLASSEMENT HEBDO","RESET LUNDI","STORECOIN REWARDS","TOP 1 = MAX SC","GRIMPEZ LES DIVISIONS","WEEKLY PROFIT","PODIUM EN DIRECT","LIGUES PRIVÉES"];

  return (
    <div className="page-enter" style={{
      paddingBottom:48, position:"relative",
      backgroundImage:"linear-gradient(rgba(16,185,129,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,0.025) 1px,transparent 1px)",
      backgroundSize:"26px 26px",
    }}>

      {/* Scan line */}
      <div style={{ position:"fixed", left:0, right:0, height:1, background:`linear-gradient(90deg,transparent 5%,${G}50,transparent 95%)`, animation:"lb-scan-h 8s linear infinite", zIndex:0, pointerEvents:"none", opacity:0.5 }} />

      <div style={{ position:"relative", zIndex:1 }}>

        {/* ── Header ──────────────────────────────────────────────── */}
        <div ref={headerRef} style={{ position:"relative", marginBottom:18, paddingTop:4 }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:10 }}>
            <div style={{ width:5, height:5, borderRadius:"50%", background:G, animation:"lb-pulse-dot 2s ease infinite" }} />
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:9, color:"rgba(16,185,129,0.55)", letterSpacing:4 }}>MARKETBALL · ARENA</span>
          </div>
          <div className="lb-hero-title" style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(52px,14vw,80px)", letterSpacing:2, lineHeight:0.88, color:"#f1f5f9", opacity:0 }}>
            CLASS
          </div>
          <div className="lb-hero-title" style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(52px,14vw,80px)", letterSpacing:2, lineHeight:0.88, opacity:0 }}>
            <span style={{ color:G }}>E</span>
            <span style={{ color:"rgba(241,245,249,0.12)", WebkitTextStroke:"1px rgba(241,245,249,0.2)" }}>MENT</span>
          </div>
          <div className="lb-hero-sub" style={{ fontSize:12, color:"rgba(241,245,249,0.3)", marginTop:10, opacity:0 }}>
            Classement hebdomadaire par division · Reset chaque lundi
          </div>
        </div>

        {/* ── Ticker ──────────────────────────────────────────────── */}
        <div style={{ overflow:"hidden", marginBottom:16, borderTop:"1px solid rgba(16,185,129,0.07)", borderBottom:"1px solid rgba(16,185,129,0.07)", padding:"7px 0", background:"rgba(16,185,129,0.015)" }}>
          <div style={{ display:"flex", whiteSpace:"nowrap", animation:"lb-ticker 20s linear infinite" }}>
            {[...TICKER,...TICKER].map((item,i) => (
              <span key={i} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, letterSpacing:3, color:"rgba(16,185,129,0.4)", paddingRight:32 }}>
                {item}<span style={{ marginLeft:32, color:"rgba(16,185,129,0.15)" }}>·</span>
              </span>
            ))}
          </div>
        </div>

        {/* ── Countdown scoreboard ─────────────────────────────── */}
        <div style={{ marginBottom:18, borderRadius:16, overflow:"hidden", border:`1px solid ${isUrgent?"rgba(16,185,129,0.3)":"rgba(241,245,249,0.06)"}`, background:isUrgent?"rgba(16,185,129,0.04)":"rgba(241,245,249,0.01)", position:"relative" }}>
          {isUrgent && <div style={{ position:"absolute", inset:0, border:"1px solid rgba(16,185,129,0.2)", borderRadius:16, animation:"lb-glow-green 2s ease infinite", pointerEvents:"none" }} />}
          <div style={{ padding:"12px 14px 6px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:9, letterSpacing:3, color:isUrgent?G:"rgba(241,245,249,0.25)" }}>
              {isUrgent ? "⚡ RESET IMMINENT" : "RESET DU CLASSEMENT"}
            </div>
            <div style={{ fontSize:9, color:"rgba(241,245,249,0.2)", fontWeight:700, letterSpacing:1 }}>SC DISTRIBUÉS LUNDI</div>
          </div>
          <div style={{ display:"flex", gap:6, padding:"6px 12px 14px", alignItems:"flex-end" }}>
            <CountdownUnit value={countdown.d} label="JOURS" urgent={isUrgent} />
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:32, color:isUrgent?G:"rgba(241,245,249,0.2)", paddingBottom:18, lineHeight:1 }}>:</div>
            <CountdownUnit value={countdown.h} label="HEURES" urgent={isUrgent} />
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:32, color:isUrgent?G:"rgba(241,245,249,0.2)", paddingBottom:18, lineHeight:1 }}>:</div>
            <CountdownUnit value={countdown.m} label="MINUTES" urgent={isUrgent} />
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:32, color:isUrgent?G:"rgba(241,245,249,0.2)", paddingBottom:18, lineHeight:1 }}>:</div>
            <CountdownUnit value={countdown.s} label="SECONDES" urgent={isUrgent} />
          </div>
        </div>

        {/* ── My division highlight ────────────────────────────── */}
        {isLoggedIn && (
          <div style={{ background:`${myDivision.color}0c`, border:`1px solid ${myDivision.color}28`, borderRadius:12, padding:"10px 14px", marginBottom:14, display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, fontWeight:700, letterSpacing:2, color:"rgba(241,245,249,0.3)" }}>MA DIV.</div>
            <BadgeTag coins={profile?.coins||0} />
            <div style={{ fontSize:11, color:"rgba(241,245,249,0.35)" }}>{fmt(profile?.coins||0)} MC</div>
            <button onClick={()=>setSelectedDivId(myDivision.id)}
              style={{ marginLeft:"auto", fontSize:9, padding:"4px 12px", borderRadius:7, border:`1px solid ${myDivision.color}40`, background:`${myDivision.color}15`, color:myDivision.color, cursor:"pointer", fontWeight:800, letterSpacing:1, fontFamily:"'Barlow Condensed',sans-serif" }}>
              VOIR →
            </button>
          </div>
        )}

        {/* ── Tabs ────────────────────────────────────────────── */}
        <div style={{ display:"flex", gap:6, marginBottom:18 }}>
          {TABS.map(t => (
            <button key={t.id} className="lb-tab" onClick={()=>!t.locked&&setTab(t.id)}
              style={{ flex:1, padding:"9px 6px", borderRadius:10, border:`1px solid ${tab===t.id?G:"rgba(241,245,249,0.06)"}`, background:tab===t.id?"rgba(16,185,129,0.08)":"transparent", color:tab===t.id?G:t.locked?"rgba(241,245,249,0.18)":"rgba(241,245,249,0.4)", fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:11, letterSpacing:1.5, opacity:t.locked?0.5:1 }}>
              {t.label}{t.locked?" 🔒":""}
            </button>
          ))}
        </div>

        {tab==="divisions" && <>
          {/* Division selector */}
          <div ref={divScrollRef} style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:8, marginBottom:16, scrollbarWidth:"none" }}>
            {DIVISIONS.map(d => (
              <button key={d.id} className="lb-divbtn" onClick={()=>setSelectedDivId(d.id)}
                style={{ flexShrink:0, padding:"6px 14px", borderRadius:20, border:`1px solid ${selectedDivId===d.id?d.color:"rgba(241,245,249,0.06)"}`, background:selectedDivId===d.id?`${d.color}18`:"transparent", color:selectedDivId===d.id?d.color:"rgba(241,245,249,0.3)", fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:11, letterSpacing:1, whiteSpace:"nowrap" }}>
                {d.name}
              </button>
            ))}
          </div>

          {/* Division header */}
          <div style={{ background:`linear-gradient(135deg,${selectedDiv.color}10,rgba(3,7,18,0.8))`, border:`1px solid ${selectedDiv.color}22`, borderRadius:14, padding:"14px 16px", marginBottom:18, position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,${selectedDiv.color},transparent 70%)`, opacity:0.5 }} />
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:3, color:selectedDiv.color }}>{selectedDiv.name.toUpperCase()}</div>
                <div style={{ fontSize:11, color:"rgba(241,245,249,0.35)", marginTop:3 }}>
                  {fmt(selectedDiv.min)} – {isFinite(selectedDiv.max)?fmt(selectedDiv.max):"∞"} MC
                </div>
              </div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:42, color:`${selectedDiv.color}25`, letterSpacing:-2 }}>
                {selectedDiv.icon || "⚡"}
              </div>
            </div>
          </div>

          <DivisionLeaderboard key={selectedDivId} division={selectedDiv} username={username} onViewProfile={onViewProfile} session={session} />
        </>}

        {tab==="ligues" && <PrivateLeagues profile={profile} session={session} showToast={showToast} />}
      </div>
    </div>
  );
}
