import { useState, useEffect } from "react";
import { req } from "../lib/supabase.js";
import { fmt, fmtPct } from "../lib/helpers.js";
import { AMM } from "../lib/amm.js";

export default function MarketStatsModal({ market, onClose, onBet }) {
  const [bets, setBets] = useState(null);
  const isMulti = market.market_type === "multi";

  useEffect(() => {
    req(`user_bets?market_id=eq.${market.id}&select=side,cost,status&limit=500`)
      .then(data => setBets(data || []))
      .catch(() => setBets([]));
  }, [market.id]);

  // Calcul distribution
  const distribution = {};
  if (bets) {
    bets.forEach(b => {
      const key = b.side || "?";
      if (!distribution[key]) distribution[key] = { count: 0, volume: 0 };
      distribution[key].count++;
      distribution[key].volume += b.cost || 0;
    });
  }
  const totalVolume = Object.values(distribution).reduce((s, v) => s + v.volume, 0);
  const totalCount = Object.values(distribution).reduce((s, v) => s + v.count, 0);

  const entries = isMulti
    ? (market.options || []).map(opt => ({
        label: opt.label,
        pct: opt.pct || Math.round(100 / opt.odds),
        odds: opt.odds,
        bets: distribution[opt.label] || { count: 0, volume: 0 },
      }))
    : [
        { label: "OUI", color: "#10b981", prob: AMM.probYes(market.q_yes, market.q_no), bets: distribution["yes"] || { count: 0, volume: 0 } },
        { label: "NON", color: "#ef4444", prob: 1 - AMM.probYes(market.q_yes, market.q_no), bets: distribution["no"] || { count: 0, volume: 0 } },
      ];

  return <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(3,7,18,0.88)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(16px)", animation:"fadeIn 0.2s ease", padding:20 }}>
    <div onClick={e=>e.stopPropagation()} style={{ background:"rgba(15,20,40,0.97)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:22, padding:28, width:420, maxWidth:"100%", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 50px 100px rgba(0,0,0,0.6)", animation:"fadeInUp 0.3s ease" }}>

      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:2, marginBottom:4 }}>STATISTIQUES</div>
      <div style={{ fontSize:13, color:"rgba(241,245,249,0.4)", marginBottom:20, lineHeight:1.5 }}>{market.title}</div>

      {/* Stats globales */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:20 }}>
        {[
          { label:"PARIEURS", val: fmt(market.participants||0) },
          { label:"VOLUME", val: `🪙 ${fmt(market.total_volume||0)}` },
          { label:"PARIS", val: fmt(totalCount) },
        ].map(s=>(
          <div key={s.label} style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:10, padding:"10px 8px", textAlign:"center" }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:1 }}>{s.val}</div>
            <div style={{ fontSize:9, color:"rgba(241,245,249,0.3)", fontWeight:700, letterSpacing:1, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Distribution */}
      <div style={{ fontSize:11, fontWeight:700, color:"rgba(241,245,249,0.35)", marginBottom:10, letterSpacing:0.5 }}>RÉPARTITION DES PARIS</div>
      {bets === null ? (
        <div style={{ textAlign:"center", padding:20, color:"rgba(241,245,249,0.25)" }}>Chargement...</div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
          {entries.map((e, i) => {
            const betPct = totalVolume > 0 ? Math.round((e.bets.volume / totalVolume) * 100) : 0;
            const color = isMulti ? ["#f59e0b","#3b82f6","#10b981","#8b5cf6","#ef4444","#ec4899"][i % 6] : e.color;
            return <div key={e.label}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <span style={{ fontSize:13, fontWeight:700 }}>{e.label}</span>
                  {!isMulti && <span style={{ fontSize:11, color:"rgba(241,245,249,0.3)" }}>{fmtPct(e.prob)} de chance</span>}
                  {isMulti && <span style={{ fontSize:11, color:"rgba(241,245,249,0.3)" }}>{e.pct}% · ×{e.odds}</span>}
                </div>
                <div style={{ textAlign:"right" }}>
                  <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14, color, letterSpacing:1 }}>{betPct}%</span>
                  <span style={{ fontSize:10, color:"rgba(241,245,249,0.3)", marginLeft:6 }}>{e.bets.count} pari{e.bets.count>1?"s":""}</span>
                </div>
              </div>
              {/* Barre */}
              <div style={{ height:8, background:"rgba(241,245,249,0.05)", borderRadius:99, overflow:"hidden" }}>
                <div style={{ width:`${betPct}%`, height:"100%", background:`linear-gradient(90deg,${color},${color}99)`, borderRadius:99, transition:"width 0.6s ease" }} />
              </div>
              <div style={{ fontSize:10, color:"rgba(241,245,249,0.2)", marginTop:3 }}>🪙 {fmt(e.bets.volume)} MC misés</div>
            </div>;
          })}
        </div>
      )}

      <div style={{ display:"flex", gap:8 }}>
        <button onClick={onClose} style={{ flex:1, padding:"11px 0", borderRadius:11, border:"1px solid rgba(241,245,249,0.1)", background:"transparent", color:"rgba(241,245,249,0.4)", fontWeight:700, fontSize:13, cursor:"pointer" }}>Fermer</button>
        <button onClick={()=>{onClose();onBet(market);}} style={{ flex:2, padding:"11px 0", borderRadius:11, border:"none", background:isMulti?"linear-gradient(135deg,#f59e0b,#d97706)":"linear-gradient(135deg,#10b981,#059669)", color:"#fff", fontWeight:800, fontSize:13, cursor:"pointer" }}>PARIER →</button>
      </div>
    </div>
  </div>;
}
