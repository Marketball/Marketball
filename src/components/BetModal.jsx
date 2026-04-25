import { useState } from "react";
import { AMM } from "../lib/amm.js";
import { fmt, fmtPct } from "../lib/helpers.js";
import MCBadge from "./ui/MCBadge.jsx";

export default function BetModal({ market, onClose, onConfirm, coins, initialSide }) {
  const [side,setSide]=useState(initialSide==="no"?"no":"yes");
  const [coinsInput,setCoinsInput]=useState("");
  const pYes=AMM.probYes(market.q_yes,market.q_no);

  const coinsNum=coinsInput===""?0:Math.max(0,Math.min(coins,parseInt(coinsInput)||0));
  const gain=coinsNum>0?AMM.potentialGain(market.q_yes,market.q_no,coinsNum,side):0;
  const canBet=coinsNum>=1&&coinsNum<=coins;

  const handleInput=(e)=>{
    const val=e.target.value;
    if(val==="") { setCoinsInput(""); return; }
    const n=parseInt(val);
    if(!isNaN(n)) setCoinsInput(Math.min(coins,Math.max(0,n)).toString());
  };

  return <div onClick={onClose} className="modal-overlay" style={{ position:"fixed", inset:0, background:"rgba(3,7,18,0.88)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(16px)", animation:"fadeIn 0.2s ease" }}>
    <div onClick={e=>e.stopPropagation()} className="modal-inner" style={{ background:"rgba(15,20,40,0.97)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:22, padding:28, width:380, maxWidth:"95vw", boxShadow:"0 50px 100px rgba(0,0,0,0.6)", backdropFilter:"blur(20px)", animation:"fadeInUp 0.3s ease" }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:2, marginBottom:4 }}>PLACER UNE PREDICTION</div>
      <div style={{ fontSize:13, color:"rgba(241,245,249,0.4)", marginBottom:20, lineHeight:1.5 }}>{market.title}</div>
      <div style={{ display:"flex", gap:8, marginBottom:18 }}>
        {["yes","no"].map(s=><button key={s} onClick={()=>setSide(s)} style={{ flex:1, padding:"12px 0", borderRadius:12, border:`2px solid ${side===s?(s==="yes"?"#10b981":"#ef4444"):"rgba(241,245,249,0.07)"}`, background:side===s?(s==="yes"?"rgba(16,185,129,0.1)":"rgba(239,68,68,0.1)"):"transparent", color:side===s?(s==="yes"?"#10b981":"#ef4444"):"rgba(241,245,249,0.3)", fontWeight:800, fontSize:14, cursor:"pointer", transition:"all 0.2s" }}>{s==="yes"?`OUI ${fmtPct(pYes)}`:`NON ${fmtPct(1-pYes)}`}</button>)}
      </div>
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"rgba(241,245,249,0.35)", marginBottom:7 }}>COMBIEN DE MC TU MISES ?</div>
        <input type="number" value={coinsInput} placeholder="Ex: 100" min={1} max={coins}
          onChange={handleInput}
          style={{ width:"100%", padding:"11px 14px", background:"rgba(241,245,249,0.04)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:11, color:"#f1f5f9", fontSize:22, fontWeight:800, outline:"none", boxSizing:"border-box", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:1 }} />
        <div style={{ display:"flex", gap:6, marginTop:8 }}>{[50,100,200,500].map(v=><button key={v} onClick={()=>setCoinsInput(Math.min(v,coins).toString())} style={{ flex:1, padding:"7px 0", borderRadius:9, border:`1px solid ${coinsInput===v.toString()?"rgba(16,185,129,0.3)":"rgba(241,245,249,0.07)"}`, background:coinsInput===v.toString()?"rgba(16,185,129,0.1)":"transparent", color:coinsInput===v.toString()?"#10b981":"rgba(241,245,249,0.4)", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'Bebas Neue',sans-serif" }}>{v}</button>)}</div>
      </div>
      <div style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:12, padding:"13px 15px", marginBottom:18 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:7 }}><span style={{ fontSize:13, color:"rgba(241,245,249,0.35)" }}>Mise</span><MCBadge amount={coinsNum||0} /></div>
        <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ fontSize:13, color:"rgba(241,245,249,0.35)" }}>Gain potentiel</span><span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:"#fbbf24", letterSpacing:1 }}>🪙 +{fmt(gain)}</span></div>
      </div>
      <button onClick={()=>canBet&&onConfirm(side,coinsNum,coinsNum,gain)} disabled={!canBet} style={{ width:"100%", padding:"13px 0", borderRadius:12, border:"none", background:canBet?"linear-gradient(135deg,#10b981,#059669)":"rgba(241,245,249,0.04)", color:canBet?"#fff":"rgba(241,245,249,0.2)", fontWeight:800, fontSize:15, cursor:canBet?"pointer":"not-allowed", transition:"all 0.2s", boxShadow:canBet?"0 8px 25px rgba(16,185,129,0.3)":"none" }}>
        {coinsNum===0?"Entrer un montant":coinsNum>coins?"Pas assez de MC":"CONFIRMER →"}
      </button>
    </div>
  </div>;
}
