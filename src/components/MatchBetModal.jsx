import { useState, useEffect } from "react";
import { calcLiveMatchOdds, calcExactScoreOdds, calcScorerOdds, calcOverUnderOdds, filterScorers } from "../lib/amm.js";
import { fmt } from "../lib/helpers.js";
import { squadReq, fixtureReq } from "../lib/supabase.js";

// Vérifie si un pari over/under est déjà garanti (gain ou perte) en live
const isOverUnderSettled = (predLabel, match) => {
  const isLive = match.status === "IN_PLAY" || match.status === "PAUSED";
  if (!isLive || match.home_score == null) return false;
  const total = (match.home_score ?? 0) + (match.away_score ?? 0);
  const line = predLabel.includes("1.5") ? 1.5 : predLabel.includes("3.5") ? 3.5 : 2.5;
  const isOver = predLabel.startsWith("Plus");
  if (isOver && total > line) return "win"; // Déjà garanti gagnant
  if (!isOver && total > line) return "loss"; // Impossible de gagner
  return false;
};

const MAX_BET = 100000;

export default function MatchBetModal({ match, onClose, onConfirm, coins, betsFrozenUntil, initialPrediction, alreadyBet=0 }) {
  const isLive=match.status==="IN_PLAY"||match.status==="PAUSED";
  const liveHome=match.home_score??0, liveAway=match.away_score??0;

  const [betType,setBetType]=useState("winner"),[prediction,setPrediction]=useState(initialPrediction||""),[amount,setAmount]=useState("");
  const [scorerTeam,setScorerTeam]=useState("home"),[homePlayers,setHomePlayers]=useState([]),[awayPlayers,setAwayPlayers]=useState([]),[loadingPlayers,setLoadingPlayers]=useState(false);
  const [selectedPlayerPos,setSelectedPlayerPos]=useState("");
  const [homeStarters,setHomeStarters]=useState(new Set());
  const [awayStarters,setAwayStarters]=useState(new Set());
  const [homeSubs,setHomeSubs]=useState(new Set());
  const [awaySubs,setAwaySubs]=useState(new Set());
  // Initialiser au score actuel si live, sinon 1-0
  const [homeGoals,setHomeGoals]=useState(isLive?liveHome:1),[awayGoals,setAwayGoals]=useState(isLive?liveAway:1);
  const [triedConfirm,setTriedConfirm]=useState(false);
  const odds=calcLiveMatchOdds(match);
  const totalGoals=liveHome+liveAway;
  // Noms des buteurs déjà marqués
  const alreadyScored=new Set((match.scorers||[]).map(s=>s.name));

  useEffect(()=>{
    if(!match.home_team_id&&!match.away_team_id) return;
    setLoadingPlayers(true);
    const timeout=(ms)=>new Promise((_,reject)=>setTimeout(()=>reject(new Error("timeout")),ms));
    Promise.all([
      match.home_team_id?Promise.race([squadReq(match.home_team_id),timeout(9000)]):Promise.resolve(null),
      match.away_team_id?Promise.race([squadReq(match.away_team_id),timeout(9000)]):Promise.resolve(null),
      match.id?Promise.race([fixtureReq(match.id),timeout(9000)]):Promise.resolve(null),
    ]).then(([hD,aD,fix])=>{
      if(hD?.squad) setHomePlayers(filterScorers(hD.squad));
      if(aD?.squad) setAwayPlayers(filterScorers(aD.squad));
      if(fix?.home_starters?.length) setHomeStarters(new Set(fix.home_starters));
      if(fix?.away_starters?.length) setAwayStarters(new Set(fix.away_starters));
      if(fix?.home_subs?.length) setHomeSubs(new Set(fix.home_subs));
      if(fix?.away_subs?.length) setAwaySubs(new Set(fix.away_subs));
    }).catch(()=>{}).finally(()=>setLoadingPlayers(false));
  },[match.home_team_id,match.away_team_id]);

  const currentPlayers=scorerTeam==="home"?homePlayers:awayPlayers;
  const getOdds=()=>{
    if(betType==="winner"){if(prediction===match.home_team)return odds.oddsHome;if(prediction==="Nul")return odds.oddsDraw;if(prediction===match.away_team)return odds.oddsAway;return 2;}
    if(betType==="exact_score") return calcExactScoreOdds(homeGoals,awayGoals,odds,match);
    if(betType==="first_scorer") return prediction?calcScorerOdds(prediction,true,selectedPlayerPos,currentPlayers.find(p=>(p.name||p)===prediction)||{}):5;
    if(betType==="scorer") return prediction?calcScorerOdds(prediction,false,selectedPlayerPos,currentPlayers.find(p=>(p.name||p)===prediction)||{}):3;
    if(betType==="over_under"){const line=prediction.includes("1.5")?1.5:prediction.includes("3.5")?3.5:2.5;return calcOverUnderOdds(line,prediction.startsWith("Plus"),odds);}
    return 2;
  };
  const currentOdds=getOdds();
  const remaining=Math.max(0, MAX_BET - alreadyBet);
  const maxInput=Math.min(remaining, coins);
  const amtNum=parseInt(amount)||0;
  const gain=Math.round(amtNum*currentOdds);
  const finalPred=betType==="exact_score"?`${homeGoals}-${awayGoals}`:prediction;
  const isFrozen=betsFrozenUntil>0&&Date.now()<betsFrozenUntil;
  const isFinished=match.status==="FINISHED";
  const elapsed=match.elapsed||0;
  const lateStageLocked=isLive&&elapsed>=85&&(betType==="winner"||betType==="exact_score");
  const ouSettled=betType==="over_under"&&prediction?isOverUnderSettled(prediction,match):false;
  const firstScorerLocked=isLive&&totalGoals>0;
  const exactScoreImpossible=isLive&&(homeGoals<liveHome||awayGoals<liveAway);
  const canBet=!isFrozen&&!isFinished&&!lateStageLocked&&!ouSettled&&!exactScoreImpossible&&finalPred&&amtNum>=1&&amtNum<=coins&&amtNum<=remaining&&remaining>0;

  const lateStage=isLive&&elapsed>=85;
  const BET_TYPES=[
    {id:"winner",label:"🏆 Vainqueur",desc:lateStage?"🔒 Fermé (85e+)":"1X2",locked:isFinished||lateStage},
    {id:"exact_score",label:"🎯 Score exact",desc:lateStage?"🔒 Fermé (85e+)":"Cotes Poisson",locked:isFinished||lateStage},
    {id:"first_scorer",label:"⚽ 1er buteur",desc:isFinished?"🔒 Terminé":firstScorerLocked?"🔒 But déjà marqué":"x2.5 min",locked:isFinished||firstScorerLocked},
    {id:"scorer",label:"🥅 Buteur",desc:isFinished?"🔒 Terminé":"x1.5 min",locked:isFinished},
    {id:"over_under",label:"📊 +/- buts",desc:isFinished?"🔒 Terminé":"Over/Under",locked:isFinished},
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
          <input type="number" min={0} max={15} value={homeGoals} onChange={e=>{setHomeGoals(Math.max(0,Math.min(15,+e.target.value)));setTriedConfirm(false);}} style={{ width:62, padding:"10px", background:"rgba(241,245,249,0.04)", border:"1px solid rgba(241,245,249,0.1)", borderRadius:11, color:"#f1f5f9", fontSize:24, fontWeight:800, outline:"none", textAlign:"center", fontFamily:"'Bebas Neue',sans-serif" }} />
        </div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:"rgba(241,245,249,0.2)", marginTop:18 }}>—</div>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:10, color:"rgba(241,245,249,0.3)", marginBottom:6 }}>{match.away_team}</div>
          <input type="number" min={0} max={15} value={awayGoals} onChange={e=>{setAwayGoals(Math.max(0,Math.min(15,+e.target.value)));setTriedConfirm(false);}} style={{ width:62, padding:"10px", background:"rgba(241,245,249,0.04)", border:"1px solid rgba(241,245,249,0.1)", borderRadius:11, color:"#f1f5f9", fontSize:24, fontWeight:800, outline:"none", textAlign:"center", fontFamily:"'Bebas Neue',sans-serif" }} />
        </div>
      </div>
      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
        {(isLive
          ? [[liveHome,liveAway],[liveHome+1,liveAway],[liveHome,liveAway+1],[liveHome+2,liveAway],[liveHome+1,liveAway+1],[liveHome,liveAway+2],[liveHome+2,liveAway+1],[liveHome+3,liveAway]]
          : [[1,0],[2,0],[2,1],[1,1],[0,1],[0,2],[3,1],[3,0]]
        ).map(([h,a])=>{
          const o=calcExactScoreOdds(h,a,odds,match),sel=homeGoals===h&&awayGoals===a;
          return <button key={`${h}-${a}`} onClick={()=>{setHomeGoals(h);setAwayGoals(a);setTriedConfirm(false);}}
            style={{ padding:"5px 10px", borderRadius:8, border:`1px solid ${sel?"#10b981":"rgba(241,245,249,0.07)"}`, background:sel?"rgba(16,185,129,0.1)":"transparent", color:sel?"#10b981":"rgba(241,245,249,0.4)", fontSize:11, fontWeight:700, cursor:"pointer" }}>
            {h}-{a} <span style={{ color:"#fbbf24", fontFamily:"'Bebas Neue',sans-serif" }}>x{o}</span>
          </button>;
        })}
      </div>
    </div>;
    if(betType==="first_scorer"||betType==="scorer") return <div>
      <div style={{ display:"flex", gap:8, marginBottom:10 }}>
        {["home","away"].map(t=><button key={t} onClick={()=>{setScorerTeam(t);setPrediction("");setSelectedPlayerPos("");}} style={{ flex:1, padding:"8px", borderRadius:10, border:`1px solid ${scorerTeam===t?"#10b981":"rgba(241,245,249,0.07)"}`, background:scorerTeam===t?"rgba(16,185,129,0.08)":"transparent", color:scorerTeam===t?"#10b981":"rgba(241,245,249,0.35)", fontWeight:700, fontSize:11, cursor:"pointer" }}>{t==="home"?match.home_team:match.away_team}</button>)}
      </div>
      {loadingPlayers?<div style={{ textAlign:"center", padding:20, color:"rgba(241,245,249,0.3)", fontSize:13 }}>Chargement joueurs...</div>
        :currentPlayers.length>0?(
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, maxHeight:220, overflowY:"auto" }}>
            {currentPlayers.map(p=>{
              const name = typeof p==="object"?p.name:p;
              const pos  = typeof p==="object"?p.position:"";
              const goals = p.goals||0;
              const appearances = p.appearances||0;
              const rating = p.rating||0;
              const starterSet = scorerTeam==="home"?homeStarters:awayStarters;
              const subSet     = scorerTeam==="home"?homeSubs:awaySubs;
              const lineupKnown = starterSet.size>0||subSet.size>0;
              const isStarter = lineupKnown ? (starterSet.has(name)?true:subSet.has(name)?false:null) : null;
              const o=calcScorerOdds(name,betType==="first_scorer",pos,{goals,appearances,rating,isStarter});
              const hasScored=alreadyScored.has(name);
              const sel=prediction===name;
              return <button key={name} onClick={()=>!hasScored&&(setPrediction(name),setSelectedPlayerPos(pos))}
                style={{ padding:"8px 10px", borderRadius:10, border:`1px solid ${hasScored?"rgba(239,68,68,0.15)":sel?"#10b981":"rgba(241,245,249,0.06)"}`, background:hasScored?"rgba(239,68,68,0.05)":sel?"rgba(16,185,129,0.1)":"rgba(241,245,249,0.02)", color:hasScored?"rgba(239,68,68,0.4)":sel?"#10b981":"rgba(241,245,249,0.55)", fontWeight:700, fontSize:11, cursor:hasScored?"not-allowed":"pointer", display:"flex", flexDirection:"column", gap:3, transition:"all 0.15s", opacity:hasScored?0.5:1, textAlign:"left" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:80 }}>{name}{hasScored?" ⚽":""}</span>
                  <span style={{ fontFamily:"'Bebas Neue',sans-serif", color:hasScored?"rgba(241,245,249,0.2)":"#fbbf24", fontSize:12, flexShrink:0 }}>{hasScored?"—":`x${o}`}</span>
                </div>
                <div style={{ display:"flex", gap:5, alignItems:"center" }}>
                  {appearances>0&&<span style={{ fontSize:9, color:"rgba(241,245,249,0.35)" }}>{goals}⚽ · {appearances}m</span>}
                  {rating>0&&<span style={{ fontSize:9, color:"rgba(251,191,36,0.55)" }}>★{rating.toFixed(1)}</span>}
                  {isStarter===true&&<span style={{ fontSize:8, fontWeight:800, color:"#10b981", background:"rgba(16,185,129,0.12)", padding:"1px 4px", borderRadius:4 }}>TITU</span>}
                  {isStarter===false&&<span style={{ fontSize:8, fontWeight:800, color:"rgba(241,245,249,0.3)", background:"rgba(241,245,249,0.05)", padding:"1px 4px", borderRadius:4 }}>REM.</span>}
                </div>
              </button>;
            })}
          </div>
        ):<div style={{ fontSize:12, color:"rgba(241,245,249,0.25)", textAlign:"center", padding:16 }}>Joueurs non disponibles</div>}
    </div>;
    if(betType==="over_under") return <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
      {[{l:"Plus de 1.5",ln:1.5,ov:true},{l:"Moins de 1.5",ln:1.5,ov:false},{l:"Plus de 2.5",ln:2.5,ov:true},{l:"Moins de 2.5",ln:2.5,ov:false},{l:"Plus de 3.5",ln:3.5,ov:true},{l:"Moins de 3.5",ln:3.5,ov:false}].map(opt=>{
        const o=calcOverUnderOdds(opt.ln,opt.ov,odds),sel=prediction===opt.l;
        const settled=isOverUnderSettled(opt.l,match);
        return <button key={opt.l} onClick={()=>!settled&&setPrediction(opt.l)} style={{ flex:"1 1 45%", padding:"10px 10px", borderRadius:11, border:`2px solid ${settled?"rgba(241,245,249,0.04)":sel?"#f59e0b":"rgba(241,245,249,0.07)"}`, background:settled?"rgba(241,245,249,0.02)":sel?"rgba(245,158,11,0.1)":"transparent", color:settled?"rgba(241,245,249,0.2)":sel?"#f59e0b":"rgba(241,245,249,0.4)", fontWeight:700, fontSize:11, cursor:settled?"not-allowed":"pointer", display:"flex", justifyContent:"space-between", transition:"all 0.2s", opacity:settled?0.5:1 }}>
          <span>{opt.l} buts{settled===true&&" 🔒"}</span>
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14 }}>{settled?"—":`x${o}`}</span>
        </button>;
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
        {BET_TYPES.map(t=><button key={t.id} onClick={()=>{if(t.locked)return;setBetType(t.id);setPrediction("");setScorerTeam("home");setSelectedPlayerPos("");}} style={{ padding:"10px 12px", borderRadius:10, border:`2px solid ${t.locked?"rgba(241,245,249,0.03)":betType===t.id?"#10b981":"rgba(241,245,249,0.06)"}`, background:t.locked?"rgba(241,245,249,0.01)":betType===t.id?"rgba(16,185,129,0.08)":"transparent", color:t.locked?"rgba(241,245,249,0.2)":betType===t.id?"#10b981":"rgba(241,245,249,0.35)", fontWeight:700, fontSize:11, cursor:t.locked?"not-allowed":"pointer", textAlign:"left", transition:"all 0.2s", opacity:t.locked?0.5:1 }}><div>{t.label}</div><div style={{ fontSize:9, fontWeight:400, opacity:0.6, marginTop:1 }}>{t.desc}</div></button>)}
      </div>
      <div style={{ marginBottom:16 }}>{renderInputs()}</div>
      {alreadyBet>0&&<div style={{ fontSize:10, color:remaining===0?"#ef4444":"rgba(241,245,249,0.35)", textAlign:"right", marginBottom:6 }}>{remaining===0?"🔒 Limite de 100 000 MC atteinte sur ce match":`${remaining.toLocaleString()} MC restants sur ce match`}</div>}
      {remaining===0
        ? <div style={{ textAlign:"center", padding:"14px 0", marginBottom:8, fontSize:13, color:"#ef4444", fontWeight:700, background:"rgba(239,68,68,0.06)", borderRadius:11, border:"1px solid rgba(239,68,68,0.15)" }}>🔒 Tu as déjà misé 100 000 MC sur ce match</div>
        : <input type="number" value={amount} placeholder="Ex: 200" min={1} max={maxInput} onChange={e=>{const v=e.target.value;if(v===""){setAmount("");}else{setAmount(Math.min(maxInput,Math.max(1,parseInt(v)||1)).toString());}}} style={{ width:"100%", padding:"11px 14px", background:"rgba(241,245,249,0.04)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:11, color:"#f1f5f9", fontSize:22, fontWeight:800, outline:"none", boxSizing:"border-box", marginBottom:8, fontFamily:"'Bebas Neue',sans-serif", letterSpacing:1 }} />
      }
      <div style={{ display:"flex", gap:6, marginBottom:14 }}>{[50,100,200,500].map(v=><button key={v} onClick={()=>remaining>0&&setAmount(String(Math.min(v,maxInput)))} style={{ flex:1, padding:"7px 0", borderRadius:9, border:"1px solid rgba(241,245,249,0.07)", background:amount===String(v)?"rgba(16,185,129,0.1)":"transparent", color:remaining===0?"rgba(241,245,249,0.15)":amount===String(v)?"#10b981":"rgba(241,245,249,0.4)", fontSize:13, fontWeight:700, cursor:remaining===0?"not-allowed":"pointer", fontFamily:"'Bebas Neue',sans-serif" }}>{v}</button>)}</div>
      <div style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:12, padding:"12px 14px", marginBottom:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}><span style={{ fontSize:13, color:"rgba(241,245,249,0.35)" }}>Prediction</span><span style={{ fontWeight:700, fontSize:13 }}>{finalPred||"—"}</span></div>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}><span style={{ fontSize:13, color:"rgba(241,245,249,0.35)" }}>Cote</span><span style={{ fontFamily:"'Bebas Neue',sans-serif", color:"#fbbf24", fontSize:18, letterSpacing:1 }}>x{currentOdds}</span></div>
        <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ fontSize:13, color:"rgba(241,245,249,0.35)" }}>Gain potentiel</span><span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:"#10b981", letterSpacing:1 }}>+{fmt(gain)} 🪙</span></div>
      </div>
      {isFinished&&<div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:10, padding:"10px 14px", marginBottom:10, fontSize:12, color:"#ef4444", fontWeight:700, textAlign:"center" }}>🔒 Match terminé — aucun pari possible</div>}
      {lateStageLocked&&<div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:10, padding:"10px 14px", marginBottom:10, fontSize:12, color:"#ef4444", fontWeight:700, textAlign:"center" }}>🔒 Paris fermés ({elapsed}e min) — trop proche de la fin</div>}
      {isFrozen&&!isFinished&&!lateStageLocked&&<div style={{ background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:10, padding:"10px 14px", marginBottom:10, fontSize:12, color:"#fbbf24", fontWeight:700, textAlign:"center" }}>⏳ Paris suspendus — score en cours de mise à jour</div>}
      {exactScoreImpossible&&triedConfirm&&<div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:10, padding:"10px 14px", marginBottom:10, fontSize:12, color:"#ef4444", fontWeight:700, textAlign:"center" }}>❌ Score impossible — le match est à {liveHome}-{liveAway}</div>}
      {ouSettled==="win"&&<div style={{ background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.25)", borderRadius:10, padding:"10px 14px", marginBottom:10, fontSize:12, color:"#10b981", fontWeight:700, textAlign:"center" }}>✅ Issue déjà garantie — pari non disponible</div>}
      {ouSettled==="loss"&&<div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:10, padding:"10px 14px", marginBottom:10, fontSize:12, color:"#ef4444", fontWeight:700, textAlign:"center" }}>❌ Issue impossible — pari non disponible</div>}
      <button onClick={()=>{if(exactScoreImpossible){setTriedConfirm(true);return;}canBet&&onConfirm(match,betType,finalPred,amtNum,gain,currentOdds);}} disabled={!canBet&&!exactScoreImpossible} style={{ width:"100%", padding:"13px 0", borderRadius:12, border:"none", background:canBet?"linear-gradient(135deg,#10b981,#059669)":"rgba(241,245,249,0.04)", color:canBet?"#fff":"rgba(241,245,249,0.2)", fontWeight:800, fontSize:15, cursor:canBet?"pointer":"not-allowed", transition:"all 0.2s", boxShadow:canBet?"0 8px 25px rgba(16,185,129,0.3)":"none" }}>
        {remaining===0?"Limite atteinte 🔒":isFrozen?"Paris suspendus ⏳":ouSettled?"Non disponible":!finalPred?"Choisir une prediction":coins<amount?"Pas assez de MC":"CONFIRMER →"}
      </button>
    </div>
  </div>;
}
