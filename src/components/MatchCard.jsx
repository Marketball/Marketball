import { useState } from "react";
import { calcLiveMatchOdds } from "../lib/amm.js";
import { compColor, compEmoji, compLabel, formatMatchDate, getClubColor } from "../lib/helpers.js";

export default function MatchCard({ match, onBet }) {
  const [hover,setHover]=useState(false);
  const [imgErr,setImgErr]=useState({});
  const cc=compColor(match.competition);
  const isLive=match.status==="IN_PLAY"||match.status==="PAUSED";
  const isFinished=match.status==="FINISHED";
  const odds=calcLiveMatchOdds(match);
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
      {isLive?<span style={{ fontSize:10, fontWeight:800, color:"#ef4444", display:"flex", alignItems:"center", gap:4 }}>
          <span style={{ width:6,height:6,borderRadius:"50%",background:"#ef4444",display:"inline-block",animation:"pulse 1s infinite" }} />
          EN DIRECT
          {match.elapsed&&<span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:12, letterSpacing:1, marginLeft:2 }}>{match.elapsed}'</span>}
        </span>
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
