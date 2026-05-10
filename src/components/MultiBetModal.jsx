import { useState } from "react";
import { fmt } from "../lib/helpers.js";
import MCBadge from "./ui/MCBadge.jsx";

const MAX_BET = 100000;

export default function MultiBetModal({ market, onClose, onConfirm, coins, alreadyBet=0 }) {
  const options = market.options || [];
  const [selected, setSelected] = useState(null);
  const [coinsInput, setCoinsInput] = useState("");

  const remaining = Math.max(0, MAX_BET - alreadyBet);
  const maxInput = Math.min(remaining, coins);
  const coinsNum = coinsInput === "" ? 0 : Math.max(0, Math.min(maxInput, parseInt(coinsInput) || 0));
  const selectedOpt = options.find(o => o.label === selected);
  const gain = selectedOpt && coinsNum > 0 ? Math.round(coinsNum * selectedOpt.odds) : 0;
  const canBet = selected && coinsNum >= 1 && coinsNum <= coins && remaining > 0;

  const handleInput = (e) => {
    const val = e.target.value;
    if (val === "") { setCoinsInput(""); return; }
    const n = parseInt(val);
    if (!isNaN(n)) setCoinsInput(Math.min(maxInput, Math.max(0, n)).toString());
  };

  return <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(3,7,18,0.88)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(16px)", animation:"fadeIn 0.2s ease" }}>
    <div onClick={e=>e.stopPropagation()} style={{ background:"rgba(15,20,40,0.97)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:22, padding:28, width:400, maxWidth:"95vw", boxShadow:"0 50px 100px rgba(0,0,0,0.6)", animation:"fadeInUp 0.3s ease", maxHeight:"90vh", overflowY:"auto" }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:2, marginBottom:4 }}>PLACER UNE PREDICTION</div>
      <div style={{ display:"flex", gap:6, marginBottom:8, alignItems:"center" }}>
        <span style={{ fontSize:10, fontWeight:700, color:"#f59e0b", background:"rgba(245,158,11,0.12)", padding:"2px 8px", borderRadius:20, border:"1px solid rgba(245,158,11,0.2)" }}>🎯 MULTI-CHOIX</span>
      </div>
      <div style={{ fontSize:13, color:"rgba(241,245,249,0.4)", marginBottom:20, lineHeight:1.5 }}>{market.title}</div>

      <div style={{ fontSize:11, fontWeight:700, color:"rgba(241,245,249,0.35)", marginBottom:10, letterSpacing:0.5 }}>CHOISIS UNE OPTION</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:18 }}>
        {options.map(opt => (
          <button key={opt.label} onClick={() => setSelected(opt.label)}
            style={{ padding:"12px 14px", borderRadius:12, border:`2px solid ${selected===opt.label?"#f59e0b":"rgba(241,245,249,0.07)"}`, background:selected===opt.label?"rgba(245,158,11,0.1)":"transparent", color:selected===opt.label?"#f59e0b":"rgba(241,245,249,0.6)", fontWeight:700, fontSize:13, cursor:"pointer", transition:"all 0.2s", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span>{opt.label}</span>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:1, color:selected===opt.label?"#fbbf24":"rgba(241,245,249,0.35)" }}>{opt.pct||Math.round(100/opt.odds)}%</div>
              <div style={{ fontSize:10, color:"rgba(241,245,249,0.25)" }}>×{opt.odds}</div>
            </div>
          </button>
        ))}
      </div>

      <div style={{ marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"rgba(241,245,249,0.35)" }}>COMBIEN DE MC TU MISES ?</div>
          {alreadyBet>0&&<div style={{ fontSize:10, color:remaining===0?"#ef4444":"rgba(241,245,249,0.3)" }}>{remaining===0?"🔒 Limite atteinte":`${remaining.toLocaleString()} MC restants`}</div>}
        </div>
        {remaining===0
          ? <div style={{ textAlign:"center", padding:"14px 0", fontSize:13, color:"#ef4444", fontWeight:700, background:"rgba(239,68,68,0.06)", borderRadius:11, border:"1px solid rgba(239,68,68,0.15)" }}>🔒 Tu as déjà misé 100 000 MC sur ce marché</div>
          : <input type="number" value={coinsInput} placeholder="Ex: 100" min={1} max={maxInput}
              onChange={handleInput}
              style={{ width:"100%", padding:"11px 14px", background:"rgba(241,245,249,0.04)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:11, color:"#f1f5f9", fontSize:22, fontWeight:800, outline:"none", boxSizing:"border-box", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:1 }} />
        }
        <div style={{ display:"flex", gap:6, marginTop:8 }}>
          {[50,100,200,500].map(v => (
            <button key={v} onClick={() => remaining>0&&setCoinsInput(Math.min(v, maxInput).toString())}
              style={{ flex:1, padding:"7px 0", borderRadius:9, border:`1px solid ${coinsInput===v.toString()?"rgba(245,158,11,0.3)":"rgba(241,245,249,0.07)"}`, background:coinsInput===v.toString()?"rgba(245,158,11,0.1)":"transparent", color:remaining===0?"rgba(241,245,249,0.15)":coinsInput===v.toString()?"#f59e0b":"rgba(241,245,249,0.4)", fontSize:13, fontWeight:700, cursor:remaining===0?"not-allowed":"pointer", fontFamily:"'Bebas Neue',sans-serif" }}>{v}</button>
          ))}
        </div>
      </div>

      <div style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:12, padding:"13px 15px", marginBottom:18 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:7 }}><span style={{ fontSize:13, color:"rgba(241,245,249,0.35)" }}>Mise</span><MCBadge amount={coinsNum||0} /></div>
        <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ fontSize:13, color:"rgba(241,245,249,0.35)" }}>Gain potentiel</span><span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:"#fbbf24", letterSpacing:1 }}>🪙 +{fmt(gain)}</span></div>
        {selectedOpt&&<div style={{ fontSize:11, color:"rgba(241,245,249,0.25)", marginTop:6 }}>Cote fixe · résolution manuelle par l'admin</div>}
      </div>

      <button onClick={() => canBet && onConfirm(selected, selectedOpt.odds, coinsNum, gain)} disabled={!canBet}
        style={{ width:"100%", padding:"13px 0", borderRadius:12, border:"none", background:canBet?"linear-gradient(135deg,#f59e0b,#d97706)":"rgba(241,245,249,0.04)", color:canBet?"#fff":"rgba(241,245,249,0.2)", fontWeight:800, fontSize:15, cursor:canBet?"pointer":"not-allowed", transition:"all 0.2s", boxShadow:canBet?"0 8px 25px rgba(245,158,11,0.3)":"none" }}>
        {remaining===0?"Limite atteinte 🔒":!selected?"Choisis une option":coinsNum===0?"Entrer un montant":"CONFIRMER →"}
      </button>
    </div>
  </div>;
}
