import { useState } from "react";
import { AMM } from "../lib/amm.js";
import { WEEKLY_MC_LIMIT } from "../lib/constants.js";
import { isPro, fmt, getWeekKey } from "../lib/helpers.js";
import SpinWheel from "../components/ui/SpinWheel.jsx";

export default function WalletPage({ coins, sc, bets, matchBets, profile, onSpin, onWatchAd, onConvertSC, onCashout, markets }) {
  const [convertAmount,setConvertAmount]=useState(1);
  const lastSpin=profile?.last_spin?new Date(profile.last_spin).getTime():0;
  const canSpin=Date.now()-lastSpin>86400000;
  const today=new Date().toISOString().split("T")[0];
  const adsToday=profile?.ads_reset_date===today?(profile?.ads_watched_today||0):0;
  const canAd=adsToday<3;
  const weekKey=getWeekKey();
  const weeklyConverted=profile?.weekly_reset_date===weekKey?(profile?.weekly_mc_purchased||0):0;
  const remainingLimit=WEEKLY_MC_LIMIT-weeklyConverted;
  const mcFromConvert=convertAmount*10; // 1 SC = 10 MC
  const allBets=[
    ...(matchBets||[]).map(b=>({...b,isMatch:true})),
    ...(bets||[]).map(b=>({...b,isMatch:false}))
  ].sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));

  return <div className="page-enter">
    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, letterSpacing:2, marginBottom:20 }}>WALLET</div>
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
    <div style={{ background:"rgba(59,130,246,0.04)", border:"1px solid rgba(59,130,246,0.1)", borderRadius:14, padding:"16px 18px", marginBottom:14 }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:1, color:"#60a5fa", marginBottom:4 }}>CONVERTIR SC EN MC</div>
      <div style={{ fontSize:12, color:"rgba(241,245,249,0.3)", marginBottom:10 }}>1 SC = 10 MC · {remainingLimit} MC disponibles cette semaine</div>
      <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
        <div style={{ flex:1 }}>
          <input type="number" value={convertAmount} min={1} max={Math.min(sc,Math.floor(remainingLimit/10))} onChange={e=>setConvertAmount(Math.max(1,Math.min(sc,Math.floor(remainingLimit/10),+e.target.value||1)))}
            style={{ width:"100%", padding:"9px 12px", background:"rgba(241,245,249,0.04)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:10, color:"#f1f5f9", fontSize:16, fontWeight:700, outline:"none", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:1 }} />
          <div style={{ fontSize:11, color:"#10b981", marginTop:4 }}>= {mcFromConvert} MC</div>
        </div>
        <button onClick={()=>sc>=convertAmount&&remainingLimit>=mcFromConvert&&onConvertSC(convertAmount)}
          disabled={sc<convertAmount||remainingLimit<mcFromConvert}
          style={{ padding:"9px 16px", borderRadius:10, border:"none", background:sc>=convertAmount&&remainingLimit>=mcFromConvert?"linear-gradient(135deg,#3b82f6,#2563eb)":"rgba(241,245,249,0.04)", color:sc>=convertAmount&&remainingLimit>=mcFromConvert?"#fff":"rgba(241,245,249,0.2)", fontWeight:800, cursor:"pointer", fontSize:13, whiteSpace:"nowrap", marginTop:2 }}>
          Convertir →
        </button>
      </div>
    </div>
    <div style={{ background:"rgba(245,158,11,0.04)", border:"1px solid rgba(245,158,11,0.1)", borderRadius:16, padding:"20px", marginBottom:12 }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:1, marginBottom:4 }}>ROUE QUOTIDIENNE</div>
      <div style={{ fontSize:12, color:"rgba(241,245,249,0.3)", marginBottom:16 }}>Jusqu'a 200 MC ou 1 SC par jour !</div>
      <SpinWheel onSpin={onSpin} canSpin={canSpin} />
    </div>
    <div style={{ background:"rgba(59,130,246,0.04)", border:"1px solid rgba(59,130,246,0.1)", borderRadius:14, padding:"16px 20px", marginBottom:22 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <div><div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:1, marginBottom:2 }}>PUB RECOMPENSEE</div><div style={{ fontSize:12, color:"rgba(241,245,249,0.3)" }}>+20 MC · {adsToday}/3 aujourd'hui</div></div>
        <button onClick={()=>canAd&&onWatchAd()} disabled={!canAd} style={{ padding:"9px 16px", borderRadius:10, border:"none", background:canAd?"linear-gradient(135deg,#3b82f6,#2563eb)":"rgba(241,245,249,0.04)", color:canAd?"#fff":"rgba(241,245,249,0.2)", fontWeight:800, cursor:canAd?"pointer":"not-allowed", fontSize:13 }}>{canAd?"REGARDER":"Limite"}</button>
      </div>
      <div style={{ height:3, background:"rgba(59,130,246,0.1)", borderRadius:99, overflow:"hidden" }}><div style={{ width:`${(adsToday/3)*100}%`, height:"100%", background:"linear-gradient(90deg,#3b82f6,#60a5fa)", borderRadius:99, transition:"width 0.5s" }} /></div>
    </div>
    {allBets.length>0&&<>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:2, marginBottom:12 }}>MES PARIS</div>
      {allBets.map((b,i)=>{
        // Cashout marché AMM
        const isMarketBet=!b.isMatch&&!!b.market_id;
        const isMatchBet=!!b.isMatch;
        const canCashoutMarket=isPro(profile)&&b.status==="pending"&&isMarketBet&&b.side&&b.amount&&b.id;
        const canCashoutMatch=isPro(profile)&&b.status==="pending"&&isMatchBet&&b.id;
        const market=markets?.find(m=>m.id===b.market_id);
        const cashoutMarketVal=canCashoutMarket&&market?AMM.cashoutValue(market.q_yes,market.q_no,b.amount,b.side):0;
        const cashoutMatchVal=canCashoutMatch?Math.round((b.cost||0)*0.75):0; // 75% remboursé
        const canCashout=canCashoutMarket||canCashoutMatch;
        const cashoutVal=isMarketBet?cashoutMarketVal:cashoutMatchVal;
        const statusLabel=b.status==="cashed_out"?"CASHOUT":b.status;
        return <div key={i} style={{ background:b.status==="won"?"rgba(16,185,129,0.06)":b.status==="lost"?"rgba(239,68,68,0.06)":b.status==="cashed_out"?"rgba(59,130,246,0.06)":"rgba(241,245,249,0.02)", border:`1px solid ${b.status==="won"?"rgba(16,185,129,0.2)":b.status==="lost"?"rgba(239,68,68,0.15)":b.status==="cashed_out"?"rgba(59,130,246,0.2)":"rgba(241,245,249,0.05)"}`, borderRadius:12, padding:"13px 16px", marginBottom:8 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:13, marginBottom:3 }}>{b.market_title||b.match_title||"Paris"}</div>
              <div style={{ fontSize:12, color:"rgba(241,245,249,0.3)" }}>
                <span style={{ color:b.status==="won"?"#10b981":b.status==="lost"?"#ef4444":"#60a5fa", fontWeight:700 }}>{b.side||b.prediction}</span>
                {" · "}{fmt(b.cost)} MC
                {isMatchBet&&<span style={{ marginLeft:6, fontSize:10, color:"rgba(241,245,249,0.25)" }}>⚽ Match</span>}
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
            <button className="btn-animated" onClick={()=>onCashout(b,cashoutVal,b.isMatch)}
              style={{ padding:"5px 12px", borderRadius:8, border:"none", background:"linear-gradient(135deg,#3b82f6,#2563eb)", color:"#fff", fontWeight:800, fontSize:11, cursor:"pointer", boxShadow:"0 4px 12px rgba(59,130,246,0.3)" }}>
              +{fmt(cashoutVal)} MC
            </button>
          </div>}
        </div>;
      })}
    </>}
  </div>;
}
