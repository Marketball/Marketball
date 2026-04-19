import { useState, useEffect } from "react";
import { calcLiveMatchOdds, calcExactScoreOdds, calcScorerOdds, calcOverUnderOdds, filterScorers } from "../lib/amm.js";
import { fmt } from "../lib/helpers.js";
import { squadReq } from "../lib/supabase.js";

export default function MatchBetModal({ match, onClose, onConfirm, coins }) {
  const [betType,setBetType]=useState("winner"),[prediction,setPrediction]=useState(""),[amount,setAmount]=useState("");
  const [scorerTeam,setScorerTeam]=useState("home"),[homePlayers,setHomePlayers]=useState([]),[awayPlayers,setAwayPlayers]=useState([]),[loadingPlayers,setLoadingPlayers]=useState(false);
  const [homeGoals,setHomeGoals]=useState(1),[awayGoals,setAwayGoals]=useState(1);
  const odds=calcLiveMatchOdds(match);

  useEffect(()=>{
    if(!match.home_team_id&&!match.away_team_id) return;
    setLoadingPlayers(true);
    const timeout=(ms)=>new Promise((_,reject)=>setTimeout(()=>reject(new Error("timeout")),ms));
    Promise.all([
      match.home_team_id?Promise.race([squadReq(match.home_team_id),timeout(9000)]):Promise.resolve(null),
      match.away_team_id?Promise.race([squadReq(match.away_team_id),timeout(9000)]):Promise.resolve(null),
    ]).then(([hD,aD])=>{
      if(hD?.squad) setHomePlayers(filterScorers(hD.squad));
      if(aD?.squad) setAwayPlayers(filterScorers(aD.squad));
    }).catch(()=>{}).finally(()=>setLoadingPlayers(false));
  },[match.home_team_id,match.away_team_id]);

  const currentPlayers=scorerTeam==="home"?homePlayers:awayPlayers;
  const getOdds=()=>{
    if(betType==="winner"){if(prediction===match.home_team)return odds.oddsHome;if(prediction==="Nul")return odds.oddsDraw;if(prediction===match.away_team)return odds.oddsAway;return 2;}
    if(betType==="exact_score") return calcExactScoreOdds(homeGoals,awayGoals,odds,match);
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
          const o=calcExactScoreOdds(h,a,odds,match),sel=homeGoals===h&&awayGoals===a;
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

  return <div onClick={onClose} className="modal-overlay" style={{ position:"fixed", inset:0, background:"rgba(3,7,18,0.88)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(16px)", padding:16, animation:"fadeIn 0.2s ease" }}>
    <div onClick={e=>e.stopPropagation()} className="modal-inner" style={{ background:"rgba(15,20,40,0.97)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:22, padding:24, width:430, maxWidth:"100%", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 50px 100px rgba(0,0,0,0.6)", backdropFilter:"blur(20px)", animation:"fadeInUp 0.3s ease" }}>
      <div style={{ display:"flex", alignItems:"center", marginBottom:16, background:"rgba(241,245,249,0.03)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:12, padding:"12px 16px" }}>
        <div style={{ textAlign:"center", flex:1 }}><div style={{ fontWeight:800, fontSize:13 }}>{match.home_team}</div><div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14, color:"#10b981", letterSpacing:1, marginTop:2 }}>x{odds.oddsHome}</div></div>
        <div style={{ padding:"0 12px", textAlign:"center" }}><div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:"rgba(241,245,249,0.2)", letterSpacing:2 }}>VS</div><div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:12, color:"#94a3b8", letterSpacing:1 }}>x{odds.oddsDraw}</div></div>
        <div style={{ textAlign:"center", flex:1 }}><div style={{ fontWeight:800, fontSize:13 }}>{match.away_team}</div><div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14, color:"#ef4444", letterSpacing:1, marginTop:2 }}>x{odds.oddsAway}</div></div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:16 }}>
        {BET_TYPES.map(t=><button key={t.id} onClick={()=>{setBetType(t.id);setPrediction("");setScorerTeam("home");}} style={{ padding:"10px 12px", borderRadius:10, border:`2px solid ${betType===t.id?"#10b981":"rgba(241,245,249,0.06)"}`, background:betType===t.id?"rgba(16,185,129,0.08)":"transparent", color:betType===t.id?"#10b981":"rgba(241,245,249,0.35)", fontWeight:700, fontSize:11, cursor:"pointer", textAlign:"left", transition:"all 0.2s" }}><div>{t.label}</div><div style={{ fontSize:9, fontWeight:400, opacity:0.6, marginTop:1 }}>{t.desc}</div></button>)}
      </div>
      <div style={{ marginBottom:16 }}>{renderInputs()}</div>
      <input type="number" value={amount} placeholder="Ex: 200" min={1} max={coins} onChange={e=>{const v=e.target.value;if(v===""){setAmount("");}else{setAmount(Math.min(coins,Math.max(1,parseInt(v)||1)).toString());}}} style={{ width:"100%", padding:"11px 14px", background:"rgba(241,245,249,0.04)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:11, color:"#f1f5f9", fontSize:22, fontWeight:800, outline:"none", boxSizing:"border-box", marginBottom:8, fontFamily:"'Bebas Neue',sans-serif", letterSpacing:1 }} />
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
