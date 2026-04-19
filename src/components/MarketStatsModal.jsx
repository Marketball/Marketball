import { useState, useEffect } from "react";
import { req } from "../lib/supabase.js";
import { fmt, fmtPct } from "../lib/helpers.js";
import { AMM } from "../lib/amm.js";
import CommentsSection from "./ui/CommentsSection.jsx";

const COLORS = ["#10b981","#ef4444","#f59e0b","#3b82f6","#8b5cf6","#ec4899"];

function MiniDonut({ entries }) {
  const total = entries.reduce((s,e) => s + e.v, 0);
  if (!total) return null;
  const R = 28, ri = 16, CX = 34, CY = 34;
  let angle = -Math.PI / 2;
  const slices = entries.map((e, i) => {
    const sweep = (e.v / total) * 2 * Math.PI;
    const x1 = CX + R * Math.cos(angle), y1 = CY + R * Math.sin(angle);
    const x1i = CX + ri * Math.cos(angle), y1i = CY + ri * Math.sin(angle);
    angle += sweep;
    const x2 = CX + R * Math.cos(angle), y2 = CY + R * Math.sin(angle);
    const x2i = CX + ri * Math.cos(angle), y2i = CY + ri * Math.sin(angle);
    const lg = sweep > Math.PI ? 1 : 0;
    return { d:`M ${x1} ${y1} A ${R} ${R} 0 ${lg} 1 ${x2} ${y2} L ${x2i} ${y2i} A ${ri} ${ri} 0 ${lg} 0 ${x1i} ${y1i} Z`, c: e.color };
  });
  return (
    <svg viewBox="0 0 68 68" width={68} height={68} style={{ flexShrink:0 }}>
      {slices.map((s,i) => <path key={i} d={s.d} fill={s.c} opacity={0.85} />)}
    </svg>
  );
}

export default function MarketStatsModal({ market, onClose, onBet, session, profile }) {
  const [bets, setBets] = useState(null);
  const [tab, setTab] = useState("repartition");
  const isMulti = market.market_type === "multi";

  useEffect(() => {
    req(`user_bets?market_id=eq.${market.id}&select=side,cost,status,username&order=created_at.desc&limit=500`, session ? { _token: session.token } : undefined)
      .then(data => setBets(data || []))
      .catch(() => setBets([]));
  }, [market.id]);

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
    ? (market.options || []).map((opt, i) => ({
        label: opt.label, pct: opt.pct || Math.round(100 / opt.odds), odds: opt.odds,
        bets: distribution[opt.label] || { count: 0, volume: 0 }, color: COLORS[i % COLORS.length],
      }))
    : [
        { label:"OUI", color:"#10b981", prob:AMM.probYes(market.q_yes,market.q_no), bets:distribution["yes"]||{count:0,volume:0} },
        { label:"NON", color:"#ef4444", prob:1-AMM.probYes(market.q_yes,market.q_no), bets:distribution["no"]||{count:0,volume:0} },
      ];

  const donutData = entries.map(e => ({ v: e.bets.volume, color: e.color }));

  const TABS = [
    { id:"repartition", label:"📊 Répartition" },
    { id:"parieurs",    label:`👥 Parieurs (${totalCount})` },
    { id:"comments",   label:"💬 Commentaires" },
  ];

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(3,7,18,0.88)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(16px)", animation:"fadeIn 0.2s ease", padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"rgba(15,20,40,0.97)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:22, padding:24, width:430, maxWidth:"100%", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 50px 100px rgba(0,0,0,0.6)", animation:"fadeInUp 0.3s ease" }}>

        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:2, marginBottom:3 }}>STATISTIQUES</div>
        <div style={{ fontSize:12, color:"rgba(241,245,249,0.35)", marginBottom:16, lineHeight:1.4 }}>{market.title}</div>

        {/* Stats globales */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:16 }}>
          {[{label:"PARIEURS",val:fmt(market.participants||0)},{label:"VOLUME",val:`🪙 ${fmt(market.total_volume||0)}`},{label:"PARIS",val:fmt(totalCount)}].map(s=>(
            <div key={s.label} style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:10, padding:"9px 8px", textAlign:"center" }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:1 }}>{s.val}</div>
              <div style={{ fontSize:9, color:"rgba(241,245,249,0.3)", fontWeight:700, letterSpacing:1, marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:6, marginBottom:16, borderBottom:"1px solid rgba(241,245,249,0.06)", paddingBottom:12 }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{ flex:1, padding:"7px 4px", borderRadius:10, border:`1px solid ${tab===t.id?"#10b981":"rgba(241,245,249,0.07)"}`, background:tab===t.id?"rgba(16,185,129,0.08)":"transparent", color:tab===t.id?"#10b981":"rgba(241,245,249,0.35)", fontWeight:700, fontSize:10, cursor:"pointer", transition:"all 0.2s", whiteSpace:"nowrap" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab : Répartition */}
        {tab==="repartition"&&<>
          {bets === null ? (
            <div style={{ textAlign:"center", padding:20, color:"rgba(241,245,249,0.25)" }}>Chargement...</div>
          ) : (
            <>
              {/* Donut + légende */}
              {totalVolume > 0 && (
                <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
                  <MiniDonut entries={donutData} />
                  <div style={{ flex:1 }}>
                    {entries.map(e => {
                      const pct = totalVolume > 0 ? Math.round((e.bets.volume / totalVolume) * 100) : 0;
                      return (
                        <div key={e.label} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                          <div style={{ width:8, height:8, borderRadius:2, background:e.color, flexShrink:0 }} />
                          <span style={{ fontSize:11, color:"rgba(241,245,249,0.6)", flex:1 }}>{e.label}</span>
                          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:13, color:e.color, letterSpacing:1 }}>{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Barres détaillées */}
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {entries.map(e => {
                  const betPct = totalVolume > 0 ? Math.round((e.bets.volume / totalVolume) * 100) : 0;
                  return (
                    <div key={e.label}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                          <span style={{ fontSize:13, fontWeight:700 }}>{e.label}</span>
                          {!isMulti && <span style={{ fontSize:11, color:"rgba(241,245,249,0.3)" }}>{fmtPct(e.prob)} de chance</span>}
                          {isMulti && <span style={{ fontSize:11, color:"rgba(241,245,249,0.3)" }}>{e.pct}% · ×{e.odds}</span>}
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14, color:e.color, letterSpacing:1 }}>{betPct}%</span>
                          <span style={{ fontSize:10, color:"rgba(241,245,249,0.3)", marginLeft:6 }}>{e.bets.count} pari{e.bets.count>1?"s":""}</span>
                        </div>
                      </div>
                      <div style={{ height:8, background:"rgba(241,245,249,0.05)", borderRadius:99, overflow:"hidden" }}>
                        <div style={{ width:`${betPct}%`, height:"100%", background:`linear-gradient(90deg,${e.color},${e.color}99)`, borderRadius:99, transition:"width 0.6s ease" }} />
                      </div>
                      <div style={{ fontSize:10, color:"rgba(241,245,249,0.2)", marginTop:3 }}>🪙 {fmt(e.bets.volume)} MC misés</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>}

        {/* Tab : Parieurs */}
        {tab==="parieurs"&&<>
          {bets === null ? (
            <div style={{ textAlign:"center", padding:20, color:"rgba(241,245,249,0.25)" }}>Chargement...</div>
          ) : bets.length === 0 ? (
            <div style={{ textAlign:"center", padding:24, color:"rgba(241,245,249,0.2)", fontSize:13 }}>Aucun pari pour l'instant</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:340, overflowY:"auto" }}>
              {bets.map((b, i) => {
                const colorEntry = entries.find(e => e.label === b.side || (e.label==="OUI" && b.side==="yes") || (e.label==="NON" && b.side==="no"));
                const color = colorEntry?.color || "#94a3b8";
                const label = b.side === "yes" ? "OUI" : b.side === "no" ? "NON" : b.side;
                return (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.05)", borderRadius:10 }}>
                    <div style={{ width:28, height:28, borderRadius:8, background:`${color}15`, border:`1px solid ${color}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color, flexShrink:0 }}>
                      {(b.username||"?").slice(0,2).toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:12, color:"#f1f5f9" }}>{b.username||"Anonyme"}</div>
                      <div style={{ fontSize:10, color:"rgba(241,245,249,0.3)" }}>
                        <span style={{ color, fontWeight:700 }}>{label}</span>
                        {" · "}{fmt(b.cost)} MC
                      </div>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div style={{ fontSize:10, padding:"2px 7px", borderRadius:12, background:b.status==="won"?"rgba(16,185,129,0.12)":b.status==="lost"?"rgba(239,68,68,0.1)":"rgba(251,191,36,0.08)", color:b.status==="won"?"#10b981":b.status==="lost"?"#ef4444":"#fbbf24", fontWeight:700 }}>
                        {b.status==="won"?"✓ Gagné":b.status==="lost"?"✗ Perdu":"En cours"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>}

        {/* Tab : Commentaires */}
        {tab==="comments"&&(
          <CommentsSection refId={market.id} refType="market" session={session} profile={profile} />
        )}

        <div style={{ display:"flex", gap:8, marginTop:16 }}>
          <button onClick={onClose} style={{ flex:1, padding:"11px 0", borderRadius:11, border:"1px solid rgba(241,245,249,0.1)", background:"transparent", color:"rgba(241,245,249,0.4)", fontWeight:700, fontSize:13, cursor:"pointer" }}>Fermer</button>
          <button onClick={()=>{onClose();onBet(market);}} style={{ flex:2, padding:"11px 0", borderRadius:11, border:"none", background:isMulti?"linear-gradient(135deg,#f59e0b,#d97706)":"linear-gradient(135deg,#10b981,#059669)", color:"#fff", fontWeight:800, fontSize:13, cursor:"pointer" }}>PARIER →</button>
        </div>
      </div>
    </div>
  );
}
