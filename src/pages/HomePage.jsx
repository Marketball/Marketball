import { useState, useEffect } from "react";
import { AMM } from "../lib/amm.js";
import { getLevel, getBadge, fmt } from "../lib/helpers.js";
import BadgeTag from "../components/ui/BadgeTag.jsx";
import XPBar from "../components/ui/XPBar.jsx";
import MCBadge from "../components/ui/MCBadge.jsx";
import SCBadge from "../components/ui/SCBadge.jsx";
import MatchCard from "../components/MatchCard.jsx";
import MarketCard from "../components/MarketCard.jsx";

export default function HomePage({ markets, coins, sc, username, onBet, onNavigate, matches, onMatchBet, profile, leaderboard, session }) {
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

    {/* EN DIRECT */}
    {live.length>0&&<>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:2, marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ width:8, height:8, borderRadius:"50%", background:"#ef4444", animation:"pulse 1s infinite", boxShadow:"0 0 8px #ef4444" }} />
        <span style={{ color:"#ef4444" }}>EN DIRECT</span>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:11, marginBottom:20 }}>{live.map(m=><MatchCard key={m.id} match={m} onBet={onMatchBet} />)}</div>
    </>}

    {/* MARCHES EN VEDETTE */}
    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:2, marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>
      <span style={{ width:3, height:18, background:"#3b82f6", borderRadius:99, display:"inline-block" }} />MARCHES EN VEDETTE
    </div>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))", gap:11 }}>{markets.slice(0,6).map(m=><MarketCard key={m.id} market={m} onBet={onBet} session={session} profile={profile} />)}</div>
    <button className="btn-animated" onClick={()=>onNavigate("markets")} style={{ width:"100%", marginTop:14, marginBottom:26, padding:"11px 0", borderRadius:12, border:"1px solid rgba(241,245,249,0.07)", background:"transparent", color:"rgba(241,245,249,0.35)", fontWeight:700, cursor:"pointer", fontSize:13 }}>Voir tous les marches →</button>

    {/* MATCHS À VENIR */}
    {upcoming.length>0&&<>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:2, marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ width:3, height:18, background:"#10b981", borderRadius:99, display:"inline-block" }} />MATCHS À VENIR
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:11, marginBottom:14 }}>{upcoming.map(m=><MatchCard key={m.id} match={m} onBet={onMatchBet} />)}</div>
      <button className="btn-animated" onClick={()=>onNavigate("matches")} style={{ width:"100%", marginBottom:26, padding:"11px 0", borderRadius:12, border:"1px solid rgba(241,245,249,0.07)", background:"transparent", color:"rgba(241,245,249,0.35)", fontWeight:700, cursor:"pointer", fontSize:13 }}>Voir tous les matchs →</button>
    </>}

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
