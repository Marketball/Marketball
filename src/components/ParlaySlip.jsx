import { useState } from "react";
import { fmt } from "../lib/helpers.js";

export default function ParlaySlip({ selections, onRemove, onConfirm, onClear, coins }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");

  const combinedOdds = selections.reduce((acc, s) => acc * s.odds, 1);
  const roundedOdds = Math.round(combinedOdds * 100) / 100;
  const amtNum = parseInt(amount) || 0;
  const gain = Math.round(amtNum * combinedOdds);
  const canBet = amtNum >= 1 && amtNum <= coins && selections.length >= 2;

  if (selections.length === 0) return null;

  return <>
    {/* Bouton flottant */}
    {!open && <button onClick={() => setOpen(true)} style={{
      position:"fixed", bottom:80, right:16, zIndex:300,
      background:"linear-gradient(135deg,#f59e0b,#d97706)",
      border:"none", borderRadius:50, padding:"11px 16px",
      color:"#fff", fontWeight:800, fontSize:13, cursor:"pointer",
      boxShadow:"0 8px 25px rgba(245,158,11,0.45)",
      display:"flex", alignItems:"center", gap:8, animation:"pulse 2s infinite"
    }}>
      🎯 COMBINÉ
      <span style={{ background:"rgba(0,0,0,0.3)", borderRadius:"50%", width:22, height:22, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:900 }}>{selections.length}</span>
    </button>}

    {/* Modal */}
    {open && <div onClick={()=>setOpen(false)} style={{ position:"fixed", inset:0, zIndex:500, background:"rgba(3,7,18,0.88)", backdropFilter:"blur(16px)", display:"flex", alignItems:"flex-end", justifyContent:"center", animation:"fadeIn 0.2s ease" }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:"100%", maxWidth:480, background:"rgba(15,20,40,0.98)", border:"1px solid rgba(245,158,11,0.2)", borderRadius:"22px 22px 0 0", padding:"24px 20px max(28px,env(safe-area-inset-bottom))", maxHeight:"88vh", overflowY:"auto", animation:"fadeInUp 0.3s ease" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:2, color:"#f59e0b" }}>🎯 PARI COMBINÉ</div>
            <div style={{ fontSize:11, color:"rgba(241,245,249,0.35)", marginTop:2 }}>Toutes les sélections doivent gagner</div>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            <button onClick={()=>{onClear();setOpen(false);}} style={{ padding:"5px 12px", borderRadius:8, border:"1px solid rgba(239,68,68,0.3)", background:"transparent", color:"#ef4444", fontSize:11, fontWeight:700, cursor:"pointer" }}>Vider</button>
            <button onClick={()=>setOpen(false)} style={{ padding:"5px 12px", borderRadius:8, border:"1px solid rgba(241,245,249,0.1)", background:"transparent", color:"rgba(241,245,249,0.4)", fontSize:11, cursor:"pointer" }}>✕</button>
          </div>
        </div>

        {/* Sélections */}
        <div style={{ display:"flex", flexDirection:"column", gap:7, marginBottom:14 }}>
          {selections.map((s,i) => (
            <div key={i} style={{ background:"rgba(245,158,11,0.06)", border:"1px solid rgba(245,158,11,0.15)", borderRadius:12, padding:"10px 14px", display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:10, color:"rgba(241,245,249,0.35)", marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.matchTitle}</div>
                <div style={{ fontWeight:700, fontSize:13 }}>{s.prediction}</div>
                <div style={{ fontSize:10, color:"rgba(241,245,249,0.3)", marginTop:1 }}>{s.betTypeLabel}</div>
              </div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:17, color:"#f59e0b", letterSpacing:1, flexShrink:0 }}>x{s.odds}</div>
              <button onClick={()=>onRemove(i)} style={{ background:"none", border:"none", color:"rgba(239,68,68,0.5)", fontSize:18, cursor:"pointer", padding:"0 2px", flexShrink:0 }}>×</button>
            </div>
          ))}
        </div>

        {selections.length < 2 && <div style={{ fontSize:12, color:"rgba(245,158,11,0.7)", background:"rgba(245,158,11,0.06)", border:"1px solid rgba(245,158,11,0.15)", borderRadius:10, padding:"10px 14px", marginBottom:14, textAlign:"center" }}>
          ⚠️ Ajoute au moins 2 sélections pour valider un combiné
        </div>}

        {/* Cote totale */}
        <div style={{ background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.2)", borderRadius:12, padding:"14px 16px", marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:amtNum>0?8:0 }}>
            <span style={{ fontSize:12, color:"rgba(241,245,249,0.45)" }}>Cote combinée ({selections.length} sél.)</span>
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, color:"#f59e0b", letterSpacing:1 }}>x{roundedOdds}</span>
          </div>
          {amtNum > 0 && <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:12, color:"rgba(241,245,249,0.45)" }}>Gain potentiel</span>
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:"#10b981", letterSpacing:1 }}>🪙 +{fmt(gain)}</span>
            </div>
          </>}
        </div>

        {/* Montant */}
        <input type="number" value={amount} placeholder="Montant à miser (MC)..." min={1} max={coins}
          onChange={e=>{const v=e.target.value;if(v==="")setAmount("");else setAmount(Math.min(coins,Math.max(1,parseInt(v)||1)).toString());}}
          style={{ width:"100%", padding:"11px 14px", background:"rgba(241,245,249,0.04)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:11, color:"#f1f5f9", fontSize:22, fontWeight:800, outline:"none", boxSizing:"border-box", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:1, marginBottom:8 }} />
        <div style={{ display:"flex", gap:6, marginBottom:14 }}>
          {[100,200,500,1000].map(v=>(
            <button key={v} onClick={()=>setAmount(Math.min(v,coins).toString())}
              style={{ flex:1, padding:"7px 0", borderRadius:9, border:"1px solid rgba(241,245,249,0.07)", background:"transparent", color:"rgba(241,245,249,0.4)", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'Bebas Neue',sans-serif" }}>{v}</button>
          ))}
        </div>

        <button onClick={()=>{if(canBet){onConfirm(selections,amtNum,gain,roundedOdds);setOpen(false);setAmount("");}}}
          disabled={!canBet}
          style={{ width:"100%", padding:"13px 0", borderRadius:12, border:"none", background:canBet?"linear-gradient(135deg,#f59e0b,#d97706)":"rgba(241,245,249,0.04)", color:canBet?"#fff":"rgba(241,245,249,0.2)", fontWeight:800, fontSize:15, cursor:canBet?"pointer":"not-allowed", transition:"all 0.2s", boxShadow:canBet?"0 8px 25px rgba(245,158,11,0.3)":"none" }}>
          {selections.length<2?"Minimum 2 sélections":amtNum===0?"Entrer un montant":`CONFIRMER LE COMBINÉ — x${roundedOdds} →`}
        </button>
      </div>
    </div>}
  </>;
}
