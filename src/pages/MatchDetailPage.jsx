import { useState, useEffect } from "react";
import { req } from "../lib/supabase.js";
import { fmt, compColor, compEmoji, compLabel, formatMatchDate, getClubColor } from "../lib/helpers.js";
import { calcLiveMatchOdds, calcExactScoreOdds, calcScorerOdds, calcOverUnderOdds, filterScorers } from "../lib/amm.js";
import { fixtureReq } from "../lib/supabase.js";
import { squadReq } from "../lib/supabase.js";
import CommentsSection from "../components/ui/CommentsSection.jsx";

const BET_LABELS = { winner:"🏆 Vainqueur", exact_score:"🎯 Score exact", first_scorer:"⚽ 1er buteur", scorer:"🥅 Buteur", over_under:"📊 +/- buts" };
const TYPE_COLORS = ["#10b981","#3b82f6","#f59e0b","#8b5cf6","#ef4444","#ec4899"];
const STAT_TABS = [{ id:"repartition", label:"📊 Répartition" }, { id:"parieurs", label:"👥 Parieurs" }, { id:"comments", label:"💬 Commentaires" }];

const isOverUnderSettled = (predLabel, match) => {
  const isLive = match.status === "IN_PLAY" || match.status === "PAUSED";
  if (!isLive || match.home_score == null) return false;
  const total = (match.home_score ?? 0) + (match.away_score ?? 0);
  const line = predLabel.includes("1.5") ? 1.5 : predLabel.includes("3.5") ? 3.5 : 2.5;
  const isOver = predLabel.startsWith("Plus");
  if (isOver && total > line) return "win";
  if (!isOver && total > line) return "loss";
  return false;
};

function Logo({ logo, name }) {
  const [err, setErr] = useState(false);
  const clubColor = getClubColor(name);
  if (logo && !err) return (
    <img src={logo} alt={name} onError={() => setErr(true)}
      style={{ width:48, height:48, objectFit:"contain", display:"block", margin:"0 auto 8px", filter:"drop-shadow(0 2px 10px rgba(0,0,0,0.6))" }} />
  );
  const init = name ? name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() : "?";
  return <div style={{ width:48, height:48, borderRadius:"50%", background:`${clubColor}20`, border:`2px solid ${clubColor}45`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 8px", fontFamily:"'Bebas Neue',sans-serif", fontSize:15, color:clubColor }}>{init}</div>;
}

const MAX_BET = 100000;

export default function MatchDetailPage({ match, onBack, onConfirm, coins, betsFrozenUntil, session, profile, alreadyBet=0 }) {
  const isLive = match.status === "IN_PLAY" || match.status === "PAUSED";
  const isFinished = match.status === "FINISHED";
  const cc = compColor(match.competition);
  const odds = calcLiveMatchOdds(match);
  const liveHome = match.home_score ?? 0;
  const liveAway = match.away_score ?? 0;
  const totalGoals = liveHome + liveAway;
  const elapsed = match.elapsed || 0;
  const alreadyScored = new Set((match.scorers||[]).map(s=>s.name));

  // Betting state
  const [betType, setBetType] = useState("winner");
  const [prediction, setPrediction] = useState("");
  const [amount, setAmount] = useState("");
  const [scorerTeam, setScorerTeam] = useState("home");
  const [homePlayers, setHomePlayers] = useState([]);
  const [awayPlayers, setAwayPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [selectedPlayerPos, setSelectedPlayerPos] = useState("");
  const [homeStarters, setHomeStarters] = useState(new Set());
  const [awayStarters, setAwayStarters] = useState(new Set());
  const [homeSubs, setHomeSubs]     = useState(new Set());
  const [awaySubs, setAwaySubs]     = useState(new Set());
  const [homeGoals, setHomeGoals] = useState(isLive ? liveHome : 1);
  const [awayGoals, setAwayGoals] = useState(isLive ? liveAway : 1);
  const [triedConfirm, setTriedConfirm] = useState(false);
  const [betDone, setBetDone] = useState(false);

  // Stats state
  const [bets, setBets] = useState(null);
  const [tab, setTab] = useState("repartition");
  const matchTitle = `${match.home_team} vs ${match.away_team}`;

  useEffect(() => {
    req(`match_bets?match_title=eq.${encodeURIComponent(matchTitle)}&select=bet_type,prediction,cost,status,username&order=created_at.desc&limit=300`,
      session ? { _token: session.token } : undefined)
      .then(d => setBets(d || [])).catch(() => setBets([]));
  }, [matchTitle, betDone]);

  useEffect(() => {
    if (!match.home_team_id && !match.away_team_id) return;
    setLoadingPlayers(true);
    const timeout = ms => new Promise((_,r) => setTimeout(() => r(new Error("timeout")), ms));
    Promise.all([
      match.home_team_id ? Promise.race([squadReq(match.home_team_id), timeout(9000)]) : Promise.resolve(null),
      match.away_team_id ? Promise.race([squadReq(match.away_team_id), timeout(9000)]) : Promise.resolve(null),
      match.id ? Promise.race([fixtureReq(match.id), timeout(9000)]) : Promise.resolve(null),
    ]).then(([hD, aD, fix]) => {
      if (hD?.squad) setHomePlayers(filterScorers(hD.squad));
      if (aD?.squad) setAwayPlayers(filterScorers(aD.squad));
      if (fix?.home_starters?.length) setHomeStarters(new Set(fix.home_starters));
      if (fix?.away_starters?.length) setAwayStarters(new Set(fix.away_starters));
      if (fix?.home_subs?.length) setHomeSubs(new Set(fix.home_subs));
      if (fix?.away_subs?.length) setAwaySubs(new Set(fix.away_subs));
    }).catch(()=>{}).finally(()=>setLoadingPlayers(false));
  }, [match.home_team_id, match.away_team_id]);

  const currentPlayers = scorerTeam === "home" ? homePlayers : awayPlayers;

  const getOdds = () => {
    if (betType==="winner") { if(prediction===match.home_team)return odds.oddsHome; if(prediction==="Nul")return odds.oddsDraw; if(prediction===match.away_team)return odds.oddsAway; return 2; }
    if (betType==="exact_score") return calcExactScoreOdds(homeGoals, awayGoals, odds, match);
    if (betType==="first_scorer") return prediction ? calcScorerOdds(prediction, true, selectedPlayerPos, currentPlayers.find(p=>(p.name||p)===prediction)||{}) : 5;
    if (betType==="scorer") return prediction ? calcScorerOdds(prediction, false, selectedPlayerPos, currentPlayers.find(p=>(p.name||p)===prediction)||{}) : 3;
    if (betType==="over_under") { const line=prediction.includes("1.5")?1.5:prediction.includes("3.5")?3.5:2.5; return calcOverUnderOdds(line,prediction.startsWith("Plus"),odds); }
    return 2;
  };
  const currentOdds = getOdds();
  const remaining = Math.max(0, MAX_BET - alreadyBet);
  const maxInput = Math.min(remaining, coins || 0);
  const amtNum = parseInt(amount) || 0;
  const gain = Math.round(amtNum * currentOdds);
  const finalPred = betType === "exact_score" ? `${homeGoals}-${awayGoals}` : prediction;
  const isFrozen = betsFrozenUntil > 0 && Date.now() < betsFrozenUntil;
  const lateStage = isLive && elapsed >= 85;
  const lateStageLocked = lateStage && (betType==="winner" || betType==="exact_score");
  const ouSettled = betType==="over_under" && prediction ? isOverUnderSettled(prediction, match) : false;
  const firstScorerLocked = isLive && totalGoals > 0;
  const exactScoreImpossible = isLive && (homeGoals < liveHome || awayGoals < liveAway);
  const canBet = !isFrozen && !isFinished && !lateStageLocked && !ouSettled && !exactScoreImpossible && finalPred && amtNum >= 1 && amtNum <= (coins||0) && amtNum <= remaining && remaining > 0;

  const BET_TYPES = [
    { id:"winner",      label:"🏆 Vainqueur",  desc: lateStage?"🔒 Fermé (85e+)":"1X2",                  locked: isFinished||lateStage },
    { id:"exact_score", label:"🎯 Score exact", desc: lateStage?"🔒 Fermé (85e+)":"Cotes Poisson",         locked: isFinished||lateStage },
    { id:"first_scorer",label:"⚽ 1er buteur",  desc: isFinished?"🔒 Terminé":firstScorerLocked?"🔒 But déjà marqué":"x2.5 min", locked: isFinished||firstScorerLocked },
    { id:"scorer",      label:"🥅 Buteur",      desc: isFinished?"🔒 Terminé":"x1.5 min",                  locked: isFinished },
    { id:"over_under",  label:"📊 +/- buts",   desc: isFinished?"🔒 Terminé":"Over/Under",                locked: isFinished },
  ];

  const renderBetInputs = () => {
    if (betType==="winner") return (
      <div style={{ display:"flex", gap:8 }}>
        {[{l:match.home_team,o:odds.oddsHome,c:"#10b981"},{l:"Nul",o:odds.oddsDraw,c:"#94a3b8"},{l:match.away_team,o:odds.oddsAway,c:"#ef4444"}].map(opt=>(
          <button key={opt.l} onClick={()=>setPrediction(opt.l)}
            style={{ flex:1, padding:"12px 4px", borderRadius:11, border:`2px solid ${prediction===opt.l?opt.c:"rgba(241,245,249,0.07)"}`, background:prediction===opt.l?`${opt.c}10`:"transparent", color:prediction===opt.l?opt.c:"rgba(241,245,249,0.4)", fontWeight:700, fontSize:10, cursor:"pointer", transition:"all 0.2s", textAlign:"center" }}>
            <div style={{ marginBottom:4 }}>{opt.l}</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:1 }}>x{opt.o}</div>
          </button>
        ))}
      </div>
    );

    if (betType==="exact_score") return (
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:16, justifyContent:"center", marginBottom:12 }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:10, color:"rgba(241,245,249,0.3)", marginBottom:6 }}>{match.home_team}</div>
            <input type="number" min={0} max={15} value={homeGoals}
              onChange={e=>{setHomeGoals(Math.max(0,Math.min(15,+e.target.value)));setTriedConfirm(false);}}
              style={{ width:62, padding:"10px", background:"rgba(241,245,249,0.04)", border:"1px solid rgba(241,245,249,0.1)", borderRadius:11, color:"#f1f5f9", fontSize:24, fontWeight:800, outline:"none", textAlign:"center", fontFamily:"'Bebas Neue',sans-serif" }} />
          </div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:"rgba(241,245,249,0.2)", marginTop:18 }}>—</div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:10, color:"rgba(241,245,249,0.3)", marginBottom:6 }}>{match.away_team}</div>
            <input type="number" min={0} max={15} value={awayGoals}
              onChange={e=>{setAwayGoals(Math.max(0,Math.min(15,+e.target.value)));setTriedConfirm(false);}}
              style={{ width:62, padding:"10px", background:"rgba(241,245,249,0.04)", border:"1px solid rgba(241,245,249,0.1)", borderRadius:11, color:"#f1f5f9", fontSize:24, fontWeight:800, outline:"none", textAlign:"center", fontFamily:"'Bebas Neue',sans-serif" }} />
          </div>
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {(isLive
            ? [[liveHome,liveAway],[liveHome+1,liveAway],[liveHome,liveAway+1],[liveHome+2,liveAway],[liveHome+1,liveAway+1],[liveHome,liveAway+2],[liveHome+2,liveAway+1],[liveHome+3,liveAway]]
            : [[1,0],[2,0],[2,1],[1,1],[0,1],[0,2],[3,1],[3,0]]
          ).map(([h,a]) => {
            const o = calcExactScoreOdds(h,a,odds,match), sel = homeGoals===h && awayGoals===a;
            return <button key={`${h}-${a}`} onClick={()=>{setHomeGoals(h);setAwayGoals(a);setTriedConfirm(false);}}
              style={{ padding:"5px 10px", borderRadius:8, border:`1px solid ${sel?"#10b981":"rgba(241,245,249,0.07)"}`, background:sel?"rgba(16,185,129,0.1)":"transparent", color:sel?"#10b981":"rgba(241,245,249,0.4)", fontSize:11, fontWeight:700, cursor:"pointer" }}>
              {h}-{a} <span style={{ color:"#fbbf24", fontFamily:"'Bebas Neue',sans-serif" }}>x{o}</span>
            </button>;
          })}
        </div>
      </div>
    );

    if (betType==="first_scorer" || betType==="scorer") return (
      <div>
        <div style={{ display:"flex", gap:8, marginBottom:10 }}>
          {["home","away"].map(t => (
            <button key={t} onClick={()=>{setScorerTeam(t);setPrediction("");setSelectedPlayerPos("");}}
              style={{ flex:1, padding:"8px", borderRadius:10, border:`1px solid ${scorerTeam===t?"#10b981":"rgba(241,245,249,0.07)"}`, background:scorerTeam===t?"rgba(16,185,129,0.08)":"transparent", color:scorerTeam===t?"#10b981":"rgba(241,245,249,0.35)", fontWeight:700, fontSize:11, cursor:"pointer" }}>
              {t==="home" ? match.home_team : match.away_team}
            </button>
          ))}
        </div>
        {loadingPlayers
          ? <div style={{ textAlign:"center", padding:20, color:"rgba(241,245,249,0.3)", fontSize:13 }}>Chargement joueurs...</div>
          : currentPlayers.length > 0
            ? <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, maxHeight:200, overflowY:"auto" }}>
                {currentPlayers.map(p => {
                  const name = typeof p==="object" ? p.name : p;
                  const pos = typeof p==="object" ? p.position : "";
                  const goals = p.goals||0;
                  const appearances = p.appearances||0;
                  const rating = p.rating||0;
                  const starterSet = scorerTeam==="home" ? homeStarters : awayStarters;
                  const subSet     = scorerTeam==="home" ? homeSubs : awaySubs;
                  const lineupKnown = starterSet.size>0||subSet.size>0;
                  const isStarter = lineupKnown ? (starterSet.has(name)?true:subSet.has(name)?false:null) : null;
                  const o = calcScorerOdds(name, betType==="first_scorer", pos, {goals,appearances,rating,isStarter});
                  const hasScored = alreadyScored.has(name);
                  const sel = prediction===name;
                  return <button key={name} onClick={()=>!hasScored&&(setPrediction(name),setSelectedPlayerPos(pos))}
                    style={{ padding:"8px 10px", borderRadius:10, border:`1px solid ${hasScored?"rgba(239,68,68,0.15)":sel?"#10b981":"rgba(241,245,249,0.06)"}`, background:hasScored?"rgba(239,68,68,0.05)":sel?"rgba(16,185,129,0.1)":"rgba(241,245,249,0.02)", color:hasScored?"rgba(239,68,68,0.4)":sel?"#10b981":"rgba(241,245,249,0.55)", fontWeight:700, fontSize:11, cursor:hasScored?"not-allowed":"pointer", display:"flex", flexDirection:"column", gap:3, transition:"all 0.15s", opacity:hasScored?0.5:1, textAlign:"left" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:80 }}>{name}{hasScored?" ⚽":""}</span>
                      <span style={{ fontFamily:"'Bebas Neue',sans-serif", color:hasScored?"rgba(241,245,249,0.2)":"#fbbf24", fontSize:12, flexShrink:0 }}>{hasScored?"—":`x${o}`}</span>
                    </div>
                    <div style={{ display:"flex", gap:5, alignItems:"center" }}>
                      {rating>0&&<span style={{ fontSize:9, color:"rgba(251,191,36,0.55)" }}>★{rating.toFixed(1)}</span>}
                      {isStarter===true&&<span style={{ fontSize:8, fontWeight:800, color:"#10b981", background:"rgba(16,185,129,0.12)", padding:"1px 4px", borderRadius:4 }}>TITU</span>}
                      {isStarter===false&&<span style={{ fontSize:8, fontWeight:800, color:"rgba(241,245,249,0.3)", background:"rgba(241,245,249,0.05)", padding:"1px 4px", borderRadius:4 }}>REM.</span>}
                    </div>
                  </button>;
                })}
              </div>
            : <div style={{ fontSize:12, color:"rgba(241,245,249,0.25)", textAlign:"center", padding:16 }}>Joueurs non disponibles</div>
        }
      </div>
    );

    if (betType==="over_under") return (
      <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
        {[{l:"Plus de 1.5",ln:1.5,ov:true},{l:"Moins de 1.5",ln:1.5,ov:false},{l:"Plus de 2.5",ln:2.5,ov:true},{l:"Moins de 2.5",ln:2.5,ov:false},{l:"Plus de 3.5",ln:3.5,ov:true},{l:"Moins de 3.5",ln:3.5,ov:false}].map(opt => {
          const o = calcOverUnderOdds(opt.ln, opt.ov, odds), sel = prediction===opt.l;
          const settled = isOverUnderSettled(opt.l, match);
          return <button key={opt.l} onClick={()=>!settled&&setPrediction(opt.l)}
            style={{ flex:"1 1 45%", padding:"10px", borderRadius:11, border:`2px solid ${settled?"rgba(241,245,249,0.04)":sel?"#f59e0b":"rgba(241,245,249,0.07)"}`, background:settled?"rgba(241,245,249,0.02)":sel?"rgba(245,158,11,0.1)":"transparent", color:settled?"rgba(241,245,249,0.2)":sel?"#f59e0b":"rgba(241,245,249,0.4)", fontWeight:700, fontSize:11, cursor:settled?"not-allowed":"pointer", display:"flex", justifyContent:"space-between", opacity:settled?0.5:1 }}>
            <span>{opt.l} buts</span>
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14 }}>{settled?"—":`x${o}`}</span>
          </button>;
        })}
      </div>
    );
  };

  // Stats data
  const totalBets = bets?.length || 0;
  const totalVolume = bets?.reduce((s,b)=>s+(b.cost||0),0) || 0;
  const groups = {};
  if (bets) {
    bets.forEach(b => {
      const t = b.bet_type || "winner";
      if (!groups[t]) groups[t] = {};
      const p = b.prediction || "?";
      if (!groups[t][p]) groups[t][p] = { count:0, volume:0 };
      groups[t][p].count++;
      groups[t][p].volume += b.cost || 0;
    });
  }

  const handleConfirm = async () => {
    if (exactScoreImpossible) { setTriedConfirm(true); return; }
    if (!canBet) return;
    await onConfirm(match, betType, finalPred, amtNum, gain, currentOdds);
    setBetDone(true);
    setPrediction(""); setAmount(""); setTriedConfirm(false);
    setTimeout(() => setBetDone(false), 3000);
  };

  return (
    <div className="page-enter" style={{ maxWidth:560, margin:"0 auto", paddingBottom:48 }}>
      {/* Back */}
      <button onClick={onBack} style={{ display:"flex", alignItems:"center", gap:6, background:"transparent", border:"none", color:"rgba(241,245,249,0.45)", cursor:"pointer", padding:"0 0 16px", fontWeight:700, fontSize:13 }}>
        ← Retour aux matchs
      </button>

      {/* Match header */}
      <div style={{ background:"rgba(241,245,249,0.02)", border:`1px solid ${isLive?"rgba(239,68,68,0.3)":"rgba(241,245,249,0.08)"}`, borderRadius:18, padding:"20px 18px", marginBottom:20, position:"relative", overflow:"hidden", boxShadow:isLive?"0 0 40px rgba(239,68,68,0.08)":"none" }}>
        <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:isLive?"#ef4444":cc, opacity:0.7 }} />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <span style={{ fontSize:9, fontWeight:800, color:cc, background:`${cc}12`, padding:"3px 8px", borderRadius:5, border:`1px solid ${cc}24`, letterSpacing:"1.5px", textTransform:"uppercase" }}>
            {compEmoji(match.competition)} {compLabel(match.competition)}
          </span>
          {isLive
            ? <span style={{ fontSize:9, fontWeight:800, color:"#ef4444", display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:"#ef4444", display:"inline-block", animation:"pulse 1s infinite", boxShadow:"0 0 6px #ef4444" }} />
                LIVE{match.elapsed&&<span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:11 }}> {match.elapsed}'</span>}
              </span>
            : isFinished
              ? <span style={{ fontSize:9, color:"rgba(241,245,249,0.3)", fontWeight:700, letterSpacing:"1.5px" }}>TERMINÉ</span>
              : <span style={{ fontSize:11, color:"rgba(241,245,249,0.4)", fontWeight:600 }}>{formatMatchDate(match.match_date)}</span>
          }
        </div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ flex:1, textAlign:"center" }}>
            <Logo logo={match.home_logo} name={match.home_team} />
            <div style={{ fontSize:12, fontWeight:800, color:"#f1f5f9", lineHeight:1.3 }}>{match.home_team}</div>
          </div>
          <div style={{ textAlign:"center", padding:"0 12px", flexShrink:0 }}>
            {(isLive||isFinished)
              ? <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:44, color:"#f1f5f9", letterSpacing:4, lineHeight:1, textShadow:isLive?"0 0 24px rgba(239,68,68,0.4)":"none" }}>
                  {match.home_score??0} — {match.away_score??0}
                </div>
              : <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:"rgba(241,245,249,0.18)", letterSpacing:6 }}>VS</div>
            }
          </div>
          <div style={{ flex:1, textAlign:"center" }}>
            <Logo logo={match.away_logo} name={match.away_team} />
            <div style={{ fontSize:12, fontWeight:800, color:"#f1f5f9", lineHeight:1.3 }}>{match.away_team}</div>
          </div>
        </div>
        {isLive && match.scorers?.length>0 && (
          <div style={{ marginTop:14, padding:"8px 12px", background:"rgba(239,68,68,0.05)", borderRadius:9, border:"1px solid rgba(239,68,68,0.12)" }}>
            <div style={{ fontSize:9, color:"rgba(241,245,249,0.35)", letterSpacing:1, fontWeight:700, marginBottom:5 }}>⚽ BUTS</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
              {match.scorers.map((s,i)=>(
                <span key={i} style={{ fontSize:11, color:"#f1f5f9", background:"rgba(241,245,249,0.05)", padding:"2px 7px", borderRadius:6 }}>
                  {s.name} <span style={{ color:"rgba(241,245,249,0.4)" }}>{s.minute}'</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── FORMULAIRE DE PARI ─── */}
      {!isFinished && (
        <div style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.07)", borderRadius:18, padding:"20px 18px", marginBottom:20 }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:2, marginBottom:14, color:"#10b981" }}>PLACER UN PARI</div>

          {/* Cotes résumé */}
          <div style={{ display:"flex", alignItems:"center", gap:0, marginBottom:14, background:"rgba(241,245,249,0.03)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:11, overflow:"hidden" }}>
            <div style={{ flex:1, textAlign:"center", padding:"10px 6px", borderRight:"1px solid rgba(241,245,249,0.06)" }}>
              <div style={{ fontWeight:800, fontSize:11 }}>{match.home_team}</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:"#10b981", letterSpacing:1, marginTop:2 }}>x{odds.oddsHome}</div>
            </div>
            <div style={{ textAlign:"center", padding:"10px 10px", borderRight:"1px solid rgba(241,245,249,0.06)" }}>
              <div style={{ fontSize:9, color:"rgba(241,245,249,0.3)", letterSpacing:1 }}>NUL</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:"#94a3b8", letterSpacing:1, marginTop:2 }}>x{odds.oddsDraw}</div>
            </div>
            <div style={{ flex:1, textAlign:"center", padding:"10px 6px" }}>
              <div style={{ fontWeight:800, fontSize:11 }}>{match.away_team}</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:"#ef4444", letterSpacing:1, marginTop:2 }}>x{odds.oddsAway}</div>
            </div>
          </div>

          {/* Type de pari */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:14 }}>
            {BET_TYPES.map(t => (
              <button key={t.id} onClick={()=>{if(t.locked)return;setBetType(t.id);setPrediction("");setScorerTeam("home");setSelectedPlayerPos("");}}
                style={{ padding:"10px 12px", borderRadius:10, border:`2px solid ${t.locked?"rgba(241,245,249,0.03)":betType===t.id?"#10b981":"rgba(241,245,249,0.06)"}`, background:t.locked?"rgba(241,245,249,0.01)":betType===t.id?"rgba(16,185,129,0.08)":"transparent", color:t.locked?"rgba(241,245,249,0.2)":betType===t.id?"#10b981":"rgba(241,245,249,0.35)", fontWeight:700, fontSize:11, cursor:t.locked?"not-allowed":"pointer", textAlign:"left", opacity:t.locked?0.5:1 }}>
                <div>{t.label}</div>
                <div style={{ fontSize:9, fontWeight:400, opacity:0.6, marginTop:1 }}>{t.desc}</div>
              </button>
            ))}
          </div>

          {/* Choix de prédiction */}
          <div style={{ marginBottom:14 }}>{renderBetInputs()}</div>

          {/* Mise */}
          {alreadyBet>0&&<div style={{ fontSize:10, color:remaining===0?"#ef4444":"rgba(241,245,249,0.35)", textAlign:"right", marginBottom:6 }}>{remaining===0?"🔒 Limite de 100 000 MC atteinte sur ce match":`${remaining.toLocaleString()} MC restants sur ce match`}</div>}
          {remaining===0
            ? <div style={{ textAlign:"center", padding:"14px 0", marginBottom:8, fontSize:13, color:"#ef4444", fontWeight:700, background:"rgba(239,68,68,0.06)", borderRadius:11, border:"1px solid rgba(239,68,68,0.15)" }}>🔒 Tu as déjà misé 100 000 MC sur ce match</div>
            : <input type="number" value={amount} placeholder="Mise en MC…" min={1} max={maxInput}
                onChange={e=>{const v=e.target.value;if(v===""){setAmount("");}else{setAmount(Math.min(maxInput,Math.max(1,parseInt(v)||1)).toString());}}}
                style={{ width:"100%", padding:"11px 14px", background:"rgba(241,245,249,0.04)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:11, color:"#f1f5f9", fontSize:22, fontWeight:800, outline:"none", boxSizing:"border-box", marginBottom:8, fontFamily:"'Bebas Neue',sans-serif", letterSpacing:1 }} />
          }
          <div style={{ display:"flex", gap:6, marginBottom:14 }}>
            {[50,100,200,500].map(v=>(
              <button key={v} onClick={()=>remaining>0&&setAmount(String(Math.min(v,maxInput)))}
                style={{ flex:1, padding:"7px 0", borderRadius:9, border:"1px solid rgba(241,245,249,0.07)", background:amount===String(v)?"rgba(16,185,129,0.1)":"transparent", color:remaining===0?"rgba(241,245,249,0.15)":amount===String(v)?"#10b981":"rgba(241,245,249,0.4)", fontSize:13, fontWeight:700, cursor:remaining===0?"not-allowed":"pointer", fontFamily:"'Bebas Neue',sans-serif" }}>
                {v}
              </button>
            ))}
          </div>

          {/* Résumé */}
          <div style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:12, padding:"12px 14px", marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:12, color:"rgba(241,245,249,0.35)" }}>Prédiction</span>
              <span style={{ fontWeight:700, fontSize:12 }}>{finalPred||"—"}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:12, color:"rgba(241,245,249,0.35)" }}>Cote</span>
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", color:"#fbbf24", fontSize:18, letterSpacing:1 }}>x{currentOdds}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontSize:12, color:"rgba(241,245,249,0.35)" }}>Gain potentiel</span>
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:"#10b981", letterSpacing:1 }}>+{fmt(gain)} 🪙</span>
            </div>
          </div>

          {/* Alertes */}
          {lateStageLocked&&<div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:10, padding:"10px 14px", marginBottom:10, fontSize:12, color:"#ef4444", fontWeight:700, textAlign:"center" }}>🔒 Paris fermés ({elapsed}e min) — trop proche de la fin</div>}
          {isFrozen&&!lateStageLocked&&<div style={{ background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:10, padding:"10px 14px", marginBottom:10, fontSize:12, color:"#fbbf24", fontWeight:700, textAlign:"center" }}>⏳ Paris suspendus — score en cours de mise à jour</div>}
          {exactScoreImpossible&&triedConfirm&&<div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:10, padding:"10px 14px", marginBottom:10, fontSize:12, color:"#ef4444", fontWeight:700, textAlign:"center" }}>❌ Score impossible — le match est à {liveHome}-{liveAway}</div>}
          {ouSettled==="win"&&<div style={{ background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.25)", borderRadius:10, padding:"10px 14px", marginBottom:10, fontSize:12, color:"#10b981", fontWeight:700, textAlign:"center" }}>✅ Issue déjà garantie — pari non disponible</div>}
          {ouSettled==="loss"&&<div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:10, padding:"10px 14px", marginBottom:10, fontSize:12, color:"#ef4444", fontWeight:700, textAlign:"center" }}>❌ Issue impossible — pari non disponible</div>}
          {betDone&&<div style={{ background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.25)", borderRadius:10, padding:"10px 14px", marginBottom:10, fontSize:12, color:"#10b981", fontWeight:700, textAlign:"center" }}>✅ Pari enregistré !</div>}

          {/* Bouton confirmer */}
          {session ? (
            <button onClick={handleConfirm} disabled={!canBet&&!exactScoreImpossible}
              style={{ width:"100%", padding:"14px 0", borderRadius:12, border:"none", background:canBet?"linear-gradient(135deg,#10b981,#059669)":"rgba(241,245,249,0.04)", color:canBet?"#fff":"rgba(241,245,249,0.2)", fontWeight:800, fontSize:15, cursor:canBet?"pointer":"not-allowed", boxShadow:canBet?"0 8px 25px rgba(16,185,129,0.3)":"none" }}>
              {remaining===0?"Limite atteinte 🔒":isFrozen?"Paris suspendus ⏳":ouSettled?"Non disponible":!finalPred?"Choisir une prédiction":!amtNum?"Entrer une mise":(coins||0)<amtNum?"Pas assez de MC":"CONFIRMER →"}
            </button>
          ) : (
            <button onClick={onBack}
              style={{ width:"100%", padding:"14px 0", borderRadius:12, border:"none", background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", fontWeight:800, fontSize:15, cursor:"pointer" }}>
              Se connecter pour parier →
            </button>
          )}
        </div>
      )}

      {/* ─── STATS ─── */}
      <div>
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          {[{label:"PARIS",val:fmt(totalBets)},{label:"VOLUME",val:`🪙 ${fmt(totalVolume)}`}].map(s=>(
            <div key={s.label} style={{ flex:1, background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:12, padding:"12px 10px", textAlign:"center" }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:1 }}>{s.val}</div>
              <div style={{ fontSize:9, color:"rgba(241,245,249,0.3)", fontWeight:700, letterSpacing:1, marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display:"flex", gap:6, marginBottom:16 }}>
          {STAT_TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{ flex:1, padding:"9px 6px", borderRadius:11, border:`1px solid ${tab===t.id?"#10b981":"rgba(241,245,249,0.07)"}`, background:tab===t.id?"rgba(16,185,129,0.08)":"transparent", color:tab===t.id?"#10b981":"rgba(241,245,249,0.35)", fontWeight:700, fontSize:11, cursor:"pointer", transition:"all 0.2s" }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab==="repartition"&&(
          bets===null ? <div style={{ textAlign:"center", padding:30, color:"rgba(241,245,249,0.25)" }}>Chargement...</div>
          : totalBets===0 ? <div style={{ textAlign:"center", padding:40, color:"rgba(241,245,249,0.2)", fontSize:13 }}>Aucun pari pour l'instant</div>
          : <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              {Object.entries(groups).map(([betType2, predictions], gi) => {
                const typeTotal = Object.values(predictions).reduce((s,v)=>s+v.volume,0);
                const sorted = Object.entries(predictions).sort((a,b)=>b[1].volume-a[1].volume);
                return (
                  <div key={betType2} style={{ background:"rgba(241,245,249,0.01)", border:"1px solid rgba(241,245,249,0.05)", borderRadius:12, padding:"14px 16px" }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"rgba(241,245,249,0.45)", marginBottom:10 }}>{BET_LABELS[betType2]||betType2}</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {sorted.slice(0,6).map(([pred,data],i)=>{
                        const pct = typeTotal>0?Math.round((data.volume/typeTotal)*100):0;
                        const color = TYPE_COLORS[(gi+i)%TYPE_COLORS.length];
                        return (
                          <div key={pred}>
                            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                              <span style={{ fontSize:12, fontWeight:700 }}>{pred}</span>
                              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                                <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:13, color, letterSpacing:1 }}>{pct}%</span>
                                <span style={{ fontSize:10, color:"rgba(241,245,249,0.3)" }}>{data.count} pari{data.count>1?"s":""} · 🪙{fmt(data.volume)}</span>
                              </div>
                            </div>
                            <div style={{ height:5, background:"rgba(241,245,249,0.05)", borderRadius:99 }}>
                              <div style={{ width:`${pct}%`, height:"100%", background:`linear-gradient(90deg,${color},${color}88)`, borderRadius:99 }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
        )}

        {tab==="parieurs"&&(
          bets===null ? <div style={{ textAlign:"center", padding:30, color:"rgba(241,245,249,0.25)" }}>Chargement...</div>
          : bets.length===0 ? <div style={{ textAlign:"center", padding:40, color:"rgba(241,245,249,0.2)", fontSize:13 }}>Aucun pari pour l'instant</div>
          : <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {bets.map((b,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.05)", borderRadius:11 }}>
                  <div style={{ width:32, height:32, borderRadius:9, background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:"#10b981", flexShrink:0 }}>
                    {(b.username||"?").slice(0,2).toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:12, color:"#f1f5f9" }}>{b.username||"Joueur"}</div>
                    <div style={{ fontSize:10, color:"rgba(241,245,249,0.3)" }}>
                      <span style={{ color:"#60a5fa", fontWeight:700 }}>{BET_LABELS[b.bet_type]?.replace(/[🏆🎯⚽🥅📊]/u,"").trim()||b.bet_type}</span>
                      {" · "}<span style={{ color:"#f1f5f9" }}>{b.prediction}</span>
                      {" · "}{fmt(b.cost)} MC
                    </div>
                  </div>
                  <div style={{ fontSize:10, padding:"3px 8px", borderRadius:12, background:b.status==="won"?"rgba(16,185,129,0.12)":b.status==="lost"?"rgba(239,68,68,0.1)":"rgba(251,191,36,0.08)", color:b.status==="won"?"#10b981":b.status==="lost"?"#ef4444":"#fbbf24", fontWeight:700 }}>
                    {b.status==="won"?"✓":b.status==="lost"?"✗":"⏳"}
                  </div>
                </div>
              ))}
            </div>
        )}

        {tab==="comments"&&(
          <CommentsSection refId={String(match.id)} refType="match" session={session} profile={profile} />
        )}
      </div>
    </div>
  );
}
