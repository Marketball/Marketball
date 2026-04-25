import { useState } from "react";
import { AMM } from "../lib/amm.js";
import { catColor, timeLeft, fmt } from "../lib/helpers.js";
import ProbBar from "./ui/ProbBar.jsx";
import ShareMenu from "./ShareMenu.jsx";
import MarketStatsModal from "./MarketStatsModal.jsx";
import ChallengeModal from "./ChallengeModal.jsx";

export default function MarketCard({ market, onBet, isNew, isTrending, session, profile, showToast }) {
  const [hover,setHover]=useState(false);
  const [showShare,setShowShare]=useState(false);
  const [showStats,setShowStats]=useState(false);
  const [showChallenge,setShowChallenge]=useState(false);
  const isMulti=market.market_type==="multi";
  const options=market.options||[];
  const p=isMulti?null:AMM.probYes(market.q_yes,market.q_no), cc=catColor(market.category);
  return <><div className="card-hover" onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onClick={()=>{if(showShare)setShowShare(false);else setShowStats(true);}}
    style={{ background:hover?"rgba(241,245,249,0.04)":"rgba(241,245,249,0.02)", border:`1px solid ${hover?(isMulti?"rgba(245,158,11,0.2)":"rgba(16,185,129,0.15)"):"rgba(241,245,249,0.06)"}`, borderRadius:18, padding:"20px 22px", position:"relative", overflow:"hidden", boxShadow:hover?"0 16px 40px rgba(0,0,0,0.3)":"0 4px 15px rgba(0,0,0,0.15)", cursor:"pointer" }}>
    <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${isMulti?"#f59e0b":cc},transparent)` }} />
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
      <div style={{ flex:1, paddingRight:12 }}>
        <div style={{ display:"flex", gap:6, marginBottom:8, flexWrap:"wrap" }}>
          <span style={{ fontSize:10, fontWeight:700, color:cc, background:`${cc}12`, padding:"2px 8px", borderRadius:20, border:`1px solid ${cc}20` }}>{market.category}</span>
          {isMulti&&<span style={{ fontSize:10, fontWeight:700, color:"#f59e0b", background:"rgba(245,158,11,0.1)", padding:"2px 8px", borderRadius:20, border:"1px solid rgba(245,158,11,0.2)" }}>🎯 {options.length} choix</span>}
          {isNew&&<span style={{ fontSize:10, fontWeight:700, color:"#f97316", background:"rgba(249,115,22,0.12)", padding:"2px 8px", borderRadius:20, border:"1px solid rgba(249,115,22,0.25)", animation:"pulse 2s infinite" }}>🔥 NOUVEAU</span>}
          {isTrending&&!isNew&&<span style={{ fontSize:10, fontWeight:700, color:"#a78bfa", background:"rgba(167,139,250,0.1)", padding:"2px 8px", borderRadius:20, border:"1px solid rgba(167,139,250,0.2)" }}>📈 TENDANCE</span>}
          <span style={{ fontSize:10, color:"rgba(241,245,249,0.3)" }}>⏱ {timeLeft(market.closes_at)}</span>
        </div>
        <div style={{ fontWeight:800, fontSize:15, color:"#f1f5f9", lineHeight:1.4, marginBottom:3 }}>{market.title}</div>
        <div style={{ fontSize:12, color:"rgba(241,245,249,0.3)", display:"flex", alignItems:"center", gap:6 }}>
          {market.source}
          {market.proposed_by&&<span style={{ color:"#f59e0b", fontSize:10, fontWeight:700 }}>· 👑 {market.proposed_by}</span>}
        </div>
      </div>
      {!isMulti&&<div style={{ display:"flex", flexDirection:"column", gap:4, flexShrink:0 }}>
        <button className="btn-animated" onClick={e=>{e.stopPropagation();onBet(market,"yes");}} style={{ background:"rgba(16,185,129,0.08)", border:"1px solid rgba(16,185,129,0.2)", borderRadius:9, padding:"5px 10px", cursor:"pointer", textAlign:"center", minWidth:58 }}>
          <div className="prob-pct" style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, lineHeight:1, color:"#10b981", letterSpacing:1 }}>{Math.round(p*100)}<span style={{ fontSize:14 }}>%</span></div>
          <div style={{ fontSize:9, color:"rgba(16,185,129,0.6)", letterSpacing:1, fontWeight:700 }}>OUI</div>
        </button>
        <button className="btn-animated" onClick={e=>{e.stopPropagation();onBet(market,"no");}} style={{ background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.15)", borderRadius:9, padding:"5px 10px", cursor:"pointer", textAlign:"center", minWidth:58 }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, lineHeight:1, color:"#ef4444", letterSpacing:1 }}>{100-Math.round(p*100)}<span style={{ fontSize:11 }}>%</span></div>
          <div style={{ fontSize:9, color:"rgba(239,68,68,0.5)", letterSpacing:1, fontWeight:700 }}>NON</div>
        </button>
      </div>}
    </div>
    {isMulti?(
      <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:12 }}>
        {options.slice(0,4).map(opt=>{
          const pct=opt.pct||Math.round(100/opt.odds);
          return <div key={opt.label} style={{ borderRadius:8, overflow:"hidden", border:"1px solid rgba(245,158,11,0.1)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 10px", position:"relative" }}>
              <div style={{ position:"absolute", left:0, top:0, bottom:0, width:`${pct}%`, background:"rgba(245,158,11,0.08)", transition:"width 0.5s" }} />
              <span style={{ fontSize:12, color:"rgba(241,245,249,0.7)", fontWeight:600, position:"relative" }}>{opt.label}</span>
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:13, color:"#fbbf24", letterSpacing:1, position:"relative" }}>{pct}%</span>
            </div>
          </div>;
        })}
        {options.length>4&&<div style={{ fontSize:11, color:"rgba(241,245,249,0.3)", textAlign:"center" }}>+{options.length-4} autres options</div>}
      </div>
    ):(
      <ProbBar qYes={market.q_yes} qNo={market.q_no} />
    )}
    <div style={{ display:"flex", gap:16, margin:"12px 0 14px" }}>
      <div><div style={{ fontSize:9, color:"rgba(241,245,249,0.25)", marginBottom:2, letterSpacing:1 }}>VOLUME</div><div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, color:"#fbbf24", letterSpacing:1 }}>🪙 {fmt(market.total_volume)}</div></div>
      <div><div style={{ fontSize:9, color:"rgba(241,245,249,0.25)", marginBottom:2, letterSpacing:1 }}>JOUEURS</div><div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, letterSpacing:1 }}>{fmt(market.participants)}</div></div>
    </div>
    <div style={{ display:"flex", gap:6, position:"relative" }}>
      <button className="btn-animated" onClick={(e)=>{e.stopPropagation();setShowShare(!showShare);}} style={{ padding:"10px 12px", borderRadius:11, border:"1px solid rgba(241,245,249,0.08)", background:"transparent", color:"rgba(241,245,249,0.4)", fontWeight:700, fontSize:13, cursor:"pointer", transition:"all 0.2s" }}>↗</button>
      <button className="btn-animated" onClick={(e)=>{e.stopPropagation();setShowStats(true);}} style={{ padding:"10px 12px", borderRadius:11, border:"1px solid rgba(241,245,249,0.08)", background:"transparent", color:"rgba(241,245,249,0.4)", fontWeight:700, fontSize:13, cursor:"pointer", transition:"all 0.2s" }}>📊</button>
      {session&&<button className="btn-animated" onClick={(e)=>{e.stopPropagation();setShowChallenge(true);}} style={{ padding:"10px 12px", borderRadius:11, border:"1px solid rgba(245,158,11,0.2)", background:"rgba(245,158,11,0.04)", color:"#f59e0b", fontWeight:700, fontSize:13, cursor:"pointer", transition:"all 0.2s" }}>⚔️</button>}
      <button className="btn-animated" onClick={(e)=>{e.stopPropagation();onBet(market);}} style={{ flex:1, padding:"10px 0", borderRadius:11, border:`1px solid ${hover?(isMulti?"rgba(245,158,11,0.3)":"rgba(16,185,129,0.3)"):"rgba(241,245,249,0.08)"}`, background:hover?(isMulti?"rgba(245,158,11,0.08)":"rgba(16,185,129,0.08)"):"transparent", color:hover?(isMulti?"#f59e0b":"#10b981"):"rgba(241,245,249,0.45)", fontWeight:700, fontSize:13, cursor:"pointer", transition:"all 0.2s" }}>PREDIRE →</button>
      {showShare&&<ShareMenu market={market} onClose={()=>setShowShare(false)} />}
    </div>
  </div>
  {showStats&&<MarketStatsModal market={market} onClose={()=>setShowStats(false)} onBet={onBet} session={session} profile={profile} />}
  {showChallenge&&<ChallengeModal market={market} profile={profile} session={session} onClose={()=>setShowChallenge(false)} showToast={showToast||((m)=>alert(m))} />}
  </>;
}
