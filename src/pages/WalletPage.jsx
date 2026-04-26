import { useState, useMemo } from "react";
import { AMM } from "../lib/amm.js";
import { WEEKLY_MC_LIMIT, MC_TO_SC_RATE } from "../lib/constants.js";
import { isPro, fmt, getWeekKey } from "../lib/helpers.js";
import { req } from "../lib/supabase.js";
import SpinWheel from "../components/ui/SpinWheel.jsx";

function ChartSVG({ points }) {
  const W=300, H=70, PAD=10;
  const minV=Math.min(...points), maxV=Math.max(...points);
  const range=maxV-minV||1;
  const n=points.length;
  const toX=i=>n===1?W/2:(i/(n-1))*W;
  const toY=v=>PAD+(1-(v-minV)/range)*(H-PAD*2);
  const zeroY=toY(Math.max(0,minV));
  const ptStr=points.map((v,i)=>`${toX(i)},${toY(v)}`).join(" ");
  const lastVal=points[n-1];
  const color=lastVal>=0?"#10b981":"#ef4444";
  const areaPts=`0,${zeroY} ${ptStr} ${toX(n-1)},${zeroY}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ overflow:"visible" }}>
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={0} y1={zeroY} x2={W} y2={zeroY} stroke="rgba(241,245,249,0.07)" strokeWidth={1} strokeDasharray="4,3" />
      <polygon points={areaPts} fill="url(#chartGrad)" />
      <polyline points={ptStr} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={toX(n-1)} cy={toY(lastVal)} r={3.5} fill={color} />
      <text x={W} y={PAD-2} textAnchor="end" fill="rgba(241,245,249,0.3)" fontSize={9} fontFamily="'Bebas Neue',sans-serif">{maxV>=0?`+${maxV.toLocaleString("fr-FR")}`:maxV.toLocaleString("fr-FR")}</text>
      {minV<0&&<text x={W} y={H+2} textAnchor="end" fill="rgba(241,245,249,0.3)" fontSize={9} fontFamily="'Bebas Neue',sans-serif">{minV.toLocaleString("fr-FR")}</text>}
    </svg>
  );
}

export default function WalletPage({ coins, sc, bets, matchBets, profile, onSpin, onWatchAd, onConvertSC, onConvertMCtoSC, onCashout, markets, session, showToast }) {
  const [mcConvertAmount,setMcConvertAmount]=useState(500);
  const [cashoutConfirm,setCashoutConfirm]=useState(null);
  const [betFilter,setBetFilter]=useState("tous");
  const lastSpin=profile?.last_spin?new Date(profile.last_spin).getTime():0;
  const canSpin=Date.now()-lastSpin>86400000;
  const today=new Date().toISOString().split("T")[0];
  const adsToday=profile?.ads_reset_date===today?(profile?.ads_watched_today||0):0;
  const canAd=adsToday<3;
  const weekKey=getWeekKey();
  const weeklyConverted=profile?.weekly_reset_date===weekKey?(profile?.weekly_mc_purchased||0):0;
  const remainingLimit=WEEKLY_MC_LIMIT-weeklyConverted;

  const allBets=[
    ...(matchBets||[]).map(b=>({...b,isMatch:true})),
    ...(bets||[]).map(b=>({...b,isMatch:false}))
  ].sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));

  // Stats historique
  const resolvedBets=allBets.filter(b=>b.status==="won"||b.status==="lost");
  const wonBets=resolvedBets.filter(b=>b.status==="won");
  const totalWagered=resolvedBets.reduce((s,b)=>s+(b.cost||0),0);
  const netProfit=wonBets.reduce((s,b)=>s+(b.potential_gain||0),0)-totalWagered;
  const winRate=resolvedBets.length>0?Math.round((wonBets.length/resolvedBets.length)*100):0;
  const chartPoints=useMemo(()=>{
    const asc=[...resolvedBets].sort((a,b)=>new Date(a.created_at||0)-new Date(b.created_at||0));
    let cum=0;
    const pts=[0,...asc.map(b=>{cum+=b.status==="won"?(b.potential_gain||0)-(b.cost||0):-(b.cost||0);return cum;})];
    return pts;
  },[resolvedBets.length]);

  // Filtre paris
  const filteredBets=betFilter==="tous"?allBets:betFilter==="encours"?allBets.filter(b=>b.status==="pending"):allBets.filter(b=>b.status!=="pending");

  // Quêtes du jour
  const todayMarketBets=(bets||[]).filter(b=>(b.created_at||"").startsWith(today));
  const todayMatchBets=(matchBets||[]).filter(b=>(b.created_at||"").startsWith(today));
  const questKey=`mb_quests_${today}_${profile?.id||""}`;
  const [claimedQuests,setClaimedQuests]=useState(()=>{try{return JSON.parse(localStorage.getItem(questKey)||"{}")}catch{return {}}});
  const quests=[
    {id:"login",label:"Connexion du jour",desc:"Se connecter aujourd'hui",icon:"🔐",xp:5,progress:1,goal:1},
    {id:"bet3",label:"Parieur actif",desc:"3 paris sur les marchés",icon:"📊",xp:15,progress:Math.min(todayMarketBets.length,3),goal:3},
    {id:"matchbet",label:"Fan de matchs",desc:"1 pari sur un match",icon:"⚽",xp:10,progress:Math.min(todayMatchBets.length,1),goal:1},
  ];
  const claimQuest=async(questId,xpReward)=>{
    if(!session||claimedQuests[questId])return;
    const nc={...claimedQuests,[questId]:true};
    localStorage.setItem(questKey,JSON.stringify(nc));
    setClaimedQuests(nc);
    try{
      await req(`profiles?id=eq.${profile.id}`,{method:"PATCH",_token:session.token,body:JSON.stringify({xp:(profile?.xp||0)+xpReward})});
      showToast?.(`+${xpReward} XP gagné ! 🎉`);
    }catch{}
  };

  return <div className="page-enter">
    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, letterSpacing:2, marginBottom:20 }}>WALLET</div>

    {/* Soldes */}
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
      {[{l:"MARKETCOINS",v:coins,c:"#fbbf24",d:"Pour jouer"},{l:"STORECOINS",v:sc,c:"#10b981",d:"Pour les recompenses"}].map(item=>(
        <div key={item.l} style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:16, padding:"18px", textAlign:"center", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:-20, right:-20, width:80, height:80, borderRadius:"50%", background:`radial-gradient(circle,${item.c}12,transparent 70%)` }} />
          <div style={{ fontSize:10, color:"rgba(241,245,249,0.3)", fontWeight:700, letterSpacing:1.5, marginBottom:6 }}>{item.l}</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:36, color:item.c, letterSpacing:2 }}>{fmt(item.v)}</div>
          <div style={{ fontSize:11, color:"rgba(241,245,249,0.2)", marginTop:3 }}>{item.d}</div>
        </div>
      ))}
    </div>

    {/* Convertir MC → SC */}
    <div style={{ background:"rgba(16,185,129,0.04)", border:"1px solid rgba(16,185,129,0.1)", borderRadius:14, padding:"16px 18px", marginBottom:14 }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:1, color:"#10b981", marginBottom:4 }}>CONVERTIR MC → SC</div>
      <div style={{ fontSize:12, color:"rgba(241,245,249,0.3)", marginBottom:10 }}>{MC_TO_SC_RATE} MC = 1 SC · {fmt(coins)} MC disponibles</div>
      <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
        <div style={{ flex:1 }}>
          <input type="number" value={mcConvertAmount} min={MC_TO_SC_RATE} step={MC_TO_SC_RATE} placeholder={`Ex: ${MC_TO_SC_RATE}`}
            onChange={e=>setMcConvertAmount(Math.max(MC_TO_SC_RATE,Math.min(coins,parseInt(e.target.value)||MC_TO_SC_RATE)))}
            style={{ width:"100%", padding:"9px 12px", background:"rgba(241,245,249,0.04)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:10, color:"#f1f5f9", fontSize:16, fontWeight:700, outline:"none", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:1 }} />
          <div style={{ fontSize:11, color:"#10b981", marginTop:4 }}>{fmt(mcConvertAmount)} MC → {Math.floor(mcConvertAmount/MC_TO_SC_RATE)} SC</div>
        </div>
        <button onClick={()=>coins>=mcConvertAmount&&Math.floor(mcConvertAmount/MC_TO_SC_RATE)>=1&&onConvertMCtoSC?.(Math.floor(mcConvertAmount/MC_TO_SC_RATE))}
          disabled={coins<mcConvertAmount||Math.floor(mcConvertAmount/MC_TO_SC_RATE)<1}
          style={{ padding:"9px 16px", borderRadius:10, border:"none", background:coins>=mcConvertAmount&&Math.floor(mcConvertAmount/MC_TO_SC_RATE)>=1?"linear-gradient(135deg,#10b981,#059669)":"rgba(241,245,249,0.04)", color:coins>=mcConvertAmount&&Math.floor(mcConvertAmount/MC_TO_SC_RATE)>=1?"#fff":"rgba(241,245,249,0.2)", fontWeight:800, cursor:"pointer", fontSize:13, whiteSpace:"nowrap", marginTop:2 }}>
          Convertir →
        </button>
      </div>
    </div>

    {/* Roue */}
    <div style={{ background:"rgba(245,158,11,0.04)", border:"1px solid rgba(245,158,11,0.1)", borderRadius:16, padding:"20px", marginBottom:12 }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:1, marginBottom:4 }}>ROUE QUOTIDIENNE</div>
      <div style={{ fontSize:12, color:"rgba(241,245,249,0.3)", marginBottom:16 }}>Gagne entre 1 et 5 SC ou jusqu'à 200 MC par jour !</div>
      <SpinWheel onSpin={onSpin} canSpin={canSpin} />
    </div>

    {/* Pub */}
    <div style={{ background:"rgba(59,130,246,0.04)", border:"1px solid rgba(59,130,246,0.1)", borderRadius:14, padding:"16px 20px", marginBottom:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <div><div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:1, marginBottom:2 }}>PUB RECOMPENSEE</div><div style={{ fontSize:12, color:"rgba(241,245,249,0.3)" }}>+20 MC · {adsToday}/3 aujourd'hui</div></div>
        <button onClick={()=>canAd&&onWatchAd()} disabled={!canAd} style={{ padding:"9px 16px", borderRadius:10, border:"none", background:canAd?"linear-gradient(135deg,#3b82f6,#2563eb)":"rgba(241,245,249,0.04)", color:canAd?"#fff":"rgba(241,245,249,0.2)", fontWeight:800, cursor:canAd?"pointer":"not-allowed", fontSize:13 }}>{canAd?"REGARDER":"Limite"}</button>
      </div>
      <div style={{ height:3, background:"rgba(59,130,246,0.1)", borderRadius:99, overflow:"hidden" }}><div style={{ width:`${(adsToday/3)*100}%`, height:"100%", background:"linear-gradient(90deg,#3b82f6,#60a5fa)", borderRadius:99, transition:"width 0.5s" }} /></div>
    </div>

    {/* Quêtes du jour */}
    <div style={{ background:"rgba(167,139,250,0.04)", border:"1px solid rgba(167,139,250,0.1)", borderRadius:16, padding:"16px 18px", marginBottom:20 }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:1, color:"#a78bfa", marginBottom:12 }}>⚡ QUÊTES DU JOUR</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {quests.map(q=>{
          const done=q.progress>=q.goal;
          const claimed=!!claimedQuests[q.id];
          return <div key={q.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, background:done?"rgba(16,185,129,0.05)":"rgba(241,245,249,0.02)", border:`1px solid ${done?"rgba(16,185,129,0.12)":"rgba(241,245,249,0.05)"}`, transition:"all 0.3s" }}>
            <span style={{ fontSize:18, flexShrink:0 }}>{q.icon}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:700, color:done?"#10b981":"#f1f5f9", marginBottom:1 }}>{q.label}</div>
              <div style={{ fontSize:10, color:"rgba(241,245,249,0.3)" }}>{q.desc}</div>
              {!done&&q.goal>1&&<div style={{ marginTop:5, height:3, background:"rgba(241,245,249,0.06)", borderRadius:99 }}><div style={{ width:`${(q.progress/q.goal)*100}%`, height:"100%", background:"#a78bfa", borderRadius:99, transition:"width 0.4s" }} /></div>}
            </div>
            <div style={{ flexShrink:0 }}>
              {claimed
                ?<span style={{ fontSize:10, color:"rgba(241,245,249,0.25)", fontWeight:700 }}>Réclamé ✓</span>
                :done
                  ?<button onClick={()=>claimQuest(q.id,q.xp)} style={{ padding:"5px 12px", borderRadius:8, border:"none", background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", fontWeight:800, fontSize:11, cursor:"pointer", boxShadow:"0 4px 10px rgba(16,185,129,0.25)" }}>+{q.xp} XP</button>
                  :<span style={{ fontSize:11, color:"rgba(241,245,249,0.3)", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:1 }}>{q.progress}/{q.goal}</span>}
            </div>
          </div>;
        })}
      </div>
    </div>

    {/* Mes paris */}
    {allBets.length>0&&<>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:2, marginBottom:12 }}>MES PARIS</div>

      {/* Stats résumé */}
      {resolvedBets.length>0&&<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:14 }}>
        {[
          {label:"MISÉ",val:`🪙 ${fmt(totalWagered)}`,color:"#fbbf24"},
          {label:"PROFIT NET",val:`${netProfit>=0?"+":""}${fmt(netProfit)}`,color:netProfit>=0?"#10b981":"#ef4444"},
          {label:"VICTOIRES",val:`${winRate}%`,color:"#a78bfa"},
        ].map(s=>(
          <div key={s.label} style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.05)", borderRadius:10, padding:"10px 8px", textAlign:"center" }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, color:s.color, letterSpacing:1 }}>{s.val}</div>
            <div style={{ fontSize:9, color:"rgba(241,245,249,0.25)", fontWeight:700, letterSpacing:1, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>}

      {/* Graphique profit cumulé */}
      {chartPoints.length>2&&<div style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.05)", borderRadius:12, padding:"12px 14px", marginBottom:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"rgba(241,245,249,0.35)", letterSpacing:0.5 }}>PROFIT CUMULÉ</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14, color:netProfit>=0?"#10b981":"#ef4444", letterSpacing:1 }}>{netProfit>=0?"+":""}{fmt(netProfit)} MC</div>
        </div>
        <ChartSVG points={chartPoints} />
      </div>}

      {/* Filtre */}
      <div style={{ display:"flex", gap:6, marginBottom:12 }}>
        {[{id:"tous",l:`Tous (${allBets.length})`},{id:"encours",l:`En cours (${allBets.filter(b=>b.status==="pending").length})`},{id:"resolus",l:`Résolus (${allBets.filter(b=>b.status!=="pending").length})`}].map(f=>(
          <button key={f.id} onClick={()=>setBetFilter(f.id)}
            style={{ padding:"5px 11px", borderRadius:16, border:`1px solid ${betFilter===f.id?"#a78bfa":"rgba(241,245,249,0.07)"}`, background:betFilter===f.id?"rgba(167,139,250,0.1)":"transparent", color:betFilter===f.id?"#a78bfa":"rgba(241,245,249,0.35)", fontWeight:700, fontSize:11, cursor:"pointer", transition:"all 0.2s", whiteSpace:"nowrap" }}>
            {f.l}
          </button>
        ))}
      </div>

      {filteredBets.length===0&&<div style={{ textAlign:"center", padding:24, color:"rgba(241,245,249,0.25)", fontSize:13 }}>Aucun pari dans cette catégorie</div>}

      {filteredBets.map((b,i)=>{
        const isMarketBet=!b.isMatch&&!!b.market_id;
        const isMatchBet=!!b.isMatch;
        const hasFreeCashout=(profile?.free_cashouts||0)>0;
        const canCashoutMarket=(isPro(profile)||hasFreeCashout)&&b.status==="pending"&&isMarketBet&&b.side&&b.amount&&b.id;
        const canCashoutMatch=(isPro(profile)||hasFreeCashout)&&b.status==="pending"&&isMatchBet&&b.id;
        const market=markets?.find(m=>m.id===b.market_id);
        const cashoutMarketVal=canCashoutMarket&&market?AMM.cashoutValue(market.q_yes,market.q_no,b.amount,b.side):0;
        const cashoutMatchVal=canCashoutMatch?Math.round((b.cost||0)*0.75):0;
        const canCashout=canCashoutMarket||canCashoutMatch;
        const cashoutVal=isMarketBet?cashoutMarketVal:cashoutMatchVal;
        const isParlay=b.bet_type==="parlay";
        let parlayLegs=[];
        if(isParlay){try{parlayLegs=JSON.parse(b.prediction||"[]");}catch{}}
        return <div key={i} style={{ background:b.status==="won"?"rgba(16,185,129,0.06)":b.status==="lost"?"rgba(239,68,68,0.06)":b.status==="cashed_out"?"rgba(59,130,246,0.06)":"rgba(241,245,249,0.02)", border:`1px solid ${b.status==="won"?"rgba(16,185,129,0.2)":b.status==="lost"?"rgba(239,68,68,0.15)":b.status==="cashed_out"?"rgba(59,130,246,0.2)":"rgba(241,245,249,0.05)"}`, borderRadius:12, padding:"13px 16px", marginBottom:8 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                {isParlay&&<span style={{ fontSize:10, fontWeight:800, color:"#f59e0b", background:"rgba(245,158,11,0.12)", padding:"1px 7px", borderRadius:10, border:"1px solid rgba(245,158,11,0.2)" }}>🎯 COMBINÉ x{parlayLegs.length}</span>}
                <div style={{ fontWeight:700, fontSize:13 }}>{isParlay?`${parlayLegs.length} sélections`:b.market_title||b.match_title||"Paris"}</div>
              </div>
              {isParlay&&<div style={{ fontSize:11, color:"rgba(241,245,249,0.3)", marginBottom:4 }}>
                {parlayLegs.map((l,li)=><div key={li} style={{ marginBottom:1 }}>• {l.matchTitle} — <span style={{ color:"#f59e0b" }}>{l.prediction}</span> (x{l.odds})</div>)}
              </div>}
              <div style={{ fontSize:12, color:"rgba(241,245,249,0.3)" }}>
                {!isParlay&&<span style={{ color:b.status==="won"?"#10b981":b.status==="lost"?"#ef4444":"#60a5fa", fontWeight:700 }}>{b.side||b.prediction}</span>}
                {!isParlay&&" · "}{fmt(b.cost)} MC
                {isMatchBet&&!isParlay&&<span style={{ marginLeft:6, fontSize:10, color:"rgba(241,245,249,0.25)" }}>⚽ Match</span>}
                {isMarketBet&&<span style={{ marginLeft:6, fontSize:10, color:"rgba(241,245,249,0.25)" }}>📊 Marché</span>}
              </div>
            </div>
            <div style={{ textAlign:"right", flexShrink:0 }}>
              {b.status==="won"?<div style={{ fontFamily:"'Bebas Neue',sans-serif", color:"#10b981", fontSize:16, letterSpacing:1 }}>+{fmt(b.potential_gain)} 🏆</div>
                :b.status==="lost"?<div style={{ fontFamily:"'Bebas Neue',sans-serif", color:"#ef4444", fontSize:14, letterSpacing:1 }}>PERDU</div>
                :b.status==="cashed_out"?<div style={{ fontFamily:"'Bebas Neue',sans-serif", color:"#3b82f6", fontSize:14, letterSpacing:1 }}>CASHÉ 💰</div>
                :<><div style={{ fontSize:10, padding:"2px 8px", borderRadius:20, background:"rgba(251,191,36,0.1)", color:"#fbbf24", fontWeight:700, marginBottom:3, display:"inline-block" }}>En cours</div><div style={{ fontFamily:"'Bebas Neue',sans-serif", color:"#10b981", fontSize:15, letterSpacing:1 }}>+{fmt(b.potential_gain)}</div></>}
            </div>
          </div>
          {canCashout&&cashoutVal>0&&<div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid rgba(241,245,249,0.05)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:11, color:"rgba(241,245,249,0.35)" }}>
              {isMarketBet?"Cashout selon cotes actuelles":"Cashout anticipé · 75% remboursé"}
              <span style={{ color:"#3b82f6", fontWeight:700, marginLeft:6 }}>⚡ Pro</span>
            </div>
            <button className="btn-animated" onClick={()=>setCashoutConfirm({bet:b,value:cashoutVal,isMatch:b.isMatch})}
              style={{ padding:"5px 12px", borderRadius:8, border:"none", background:"linear-gradient(135deg,#3b82f6,#2563eb)", color:"#fff", fontWeight:800, fontSize:11, cursor:"pointer", boxShadow:"0 4px 12px rgba(59,130,246,0.3)" }}>
              +{fmt(cashoutVal)} MC
            </button>
          </div>}
        </div>;
      })}
    </>}

    {/* Modale confirmation cashout */}
    {cashoutConfirm&&<div onClick={()=>setCashoutConfirm(null)} style={{ position:"fixed", inset:0, background:"rgba(3,7,18,0.85)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(12px)", padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"rgba(15,23,42,0.98)", border:"1px solid rgba(59,130,246,0.25)", borderRadius:20, padding:"28px 24px", width:340, maxWidth:"100%", boxShadow:"0 40px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:2, marginBottom:8 }}>CONFIRMER LE CASHOUT</div>
        <div style={{ fontSize:13, color:"rgba(241,245,249,0.45)", marginBottom:20, lineHeight:1.6 }}>
          {cashoutConfirm.isMatch?"75% de ta mise te sera remboursée.":"Valeur calculée selon les cotes actuelles du marché."}<br/>
          Cette action est <strong style={{color:"#f87171"}}>irréversible</strong>.
        </div>
        <div style={{ background:"rgba(59,130,246,0.08)", border:"1px solid rgba(59,130,246,0.2)", borderRadius:12, padding:"14px", marginBottom:20, textAlign:"center" }}>
          <div style={{ fontSize:11, color:"rgba(241,245,249,0.35)", marginBottom:4 }}>TU RÉCUPÈRES</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:32, color:"#3b82f6", letterSpacing:2 }}>+{fmt(cashoutConfirm.value)} 🪙</div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={()=>setCashoutConfirm(null)} style={{ flex:1, padding:"12px 0", borderRadius:11, border:"1px solid rgba(241,245,249,0.1)", background:"transparent", color:"rgba(241,245,249,0.4)", fontWeight:700, fontSize:13, cursor:"pointer" }}>Annuler</button>
          <button onClick={()=>{onCashout(cashoutConfirm.bet,cashoutConfirm.value,cashoutConfirm.isMatch);setCashoutConfirm(null);}}
            style={{ flex:2, padding:"12px 0", borderRadius:11, border:"none", background:"linear-gradient(135deg,#3b82f6,#2563eb)", color:"#fff", fontWeight:800, fontSize:13, cursor:"pointer", boxShadow:"0 6px 20px rgba(59,130,246,0.3)" }}>
            Confirmer +{fmt(cashoutConfirm.value)} MC
          </button>
        </div>
      </div>
    </div>}
  </div>;
}
