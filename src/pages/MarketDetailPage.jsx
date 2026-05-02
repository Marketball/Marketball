import { useState, useEffect } from "react";
import { req } from "../lib/supabase.js";
import { fmt, fmtPct, mTitle, catColor, timeLeft } from "../lib/helpers.js";
import { useLang } from "../lib/i18n.jsx";
import { AMM } from "../lib/amm.js";
import ProbBar from "../components/ui/ProbBar.jsx";
import CommentsSection from "../components/ui/CommentsSection.jsx";

const COLORS = ["#10b981","#ef4444","#f59e0b","#3b82f6","#8b5cf6","#ec4899"];

function OddsChart({ bets, market }) {
  const isMulti = market.market_type === "multi";
  if (isMulti || !bets || bets.length < 2) return null;
  const sorted = [...bets].sort((a,b) => new Date(a.created_at||0)-new Date(b.created_at||0));
  let qy = market.q_yes||100, qn = market.q_no||100;
  sorted.forEach(b => {
    if (b.side==="yes") qy = Math.max(1, qy-(b.amount||0));
    else if (b.side==="no") qn = Math.max(1, qn-(b.amount||0));
  });
  const points = [Math.round(AMM.probYes(qy,qn)*100)];
  sorted.forEach(b => {
    if (b.side==="yes") qy += (b.amount||0);
    else if (b.side==="no") qn += (b.amount||0);
    points.push(Math.round(AMM.probYes(qy,qn)*100));
  });
  const W=300, H=60, PAD=8, n=points.length;
  const minV=Math.min(...points), maxV=Math.max(...points), range=maxV-minV||1;
  const toX = i => n===1?W/2:(i/(n-1))*W;
  const toY = v => PAD+(1-(v-minV)/range)*(H-PAD*2);
  const ptStr = points.map((v,i)=>`${toX(i)},${toY(v)}`).join(" ");
  const lastP = points[points.length-1];
  const color = lastP>=50?"#10b981":"#ef4444";
  const areaD = `M 0,${toY(points[0])} ${points.map((v,i)=>`L ${toX(i)},${toY(v)}`).join(" ")} L ${W},${H} L 0,${H} Z`;
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"rgba(241,245,249,0.35)", letterSpacing:0.5 }}>ÉVOLUTION PROBA OUI</div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14, color, letterSpacing:1 }}>{lastP}%</div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ overflow:"visible" }}>
        <defs>
          <linearGradient id="oddsGradD" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={0} y1={toY(50)} x2={W} y2={toY(50)} stroke="rgba(241,245,249,0.08)" strokeWidth={1} strokeDasharray="3,3" />
        <path d={areaD} fill="url(#oddsGradD)" />
        <polyline points={ptStr} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={toX(n-1)} cy={toY(lastP)} r={3} fill={color} />
        <text x={0} y={toY(minV)+3} fill="rgba(241,245,249,0.25)" fontSize={8} fontFamily="'Bebas Neue',sans-serif">{minV}%</text>
        <text x={0} y={toY(maxV)-2} fill="rgba(241,245,249,0.25)" fontSize={8} fontFamily="'Bebas Neue',sans-serif">{maxV}%</text>
      </svg>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:"rgba(241,245,249,0.2)", marginTop:3 }}>
        <span>1er pari</span><span>{n-1} paris</span>
      </div>
    </div>
  );
}

function MiniDonut({ entries }) {
  const total = entries.reduce((s,e)=>s+e.v,0);
  if (!total) return null;
  const R=28, ri=16, CX=34, CY=34;
  let angle=-Math.PI/2;
  const slices = entries.map((e) => {
    const sweep=(e.v/total)*2*Math.PI;
    const x1=CX+R*Math.cos(angle), y1=CY+R*Math.sin(angle);
    const x1i=CX+ri*Math.cos(angle), y1i=CY+ri*Math.sin(angle);
    angle+=sweep;
    const x2=CX+R*Math.cos(angle), y2=CY+R*Math.sin(angle);
    const x2i=CX+ri*Math.cos(angle), y2i=CY+ri*Math.sin(angle);
    const lg=sweep>Math.PI?1:0;
    return { d:`M ${x1} ${y1} A ${R} ${R} 0 ${lg} 1 ${x2} ${y2} L ${x2i} ${y2i} A ${ri} ${ri} 0 ${lg} 0 ${x1i} ${y1i} Z`, c:e.color };
  });
  return (
    <svg viewBox="0 0 68 68" width={68} height={68} style={{ flexShrink:0 }}>
      {slices.map((s,i)=><path key={i} d={s.d} fill={s.c} opacity={0.85}/>)}
    </svg>
  );
}

export default function MarketDetailPage({ market: marketProp, onBack, onBet, session, profile }) {
  const { lang } = useLang();
  const [market, setMarket] = useState(marketProp);
  const [bets, setBets] = useState(null);
  const [tab, setTab] = useState("repartition");
  const isMulti = market.market_type === "multi";
  const p = isMulti ? null : AMM.probYes(market.q_yes, market.q_no);
  const cc = catColor(market.category);

  useEffect(() => {
    req(`custom_markets?id=eq.${marketProp.id}&select=*`)
      .then(d => { if (d?.[0]) setMarket(d[0]); })
      .catch(() => {});
    req(
      `user_bets?market_id=eq.${marketProp.id}&select=side,cost,status,username,amount,created_at&order=created_at.asc&limit=500`,
      session ? { _token: session.token } : undefined
    ).then(d => setBets(d||[])).catch(()=>setBets([]));
  }, [marketProp.id]);

  const distribution = {};
  (bets||[]).forEach(b => {
    const key = b.side||"?";
    if (!distribution[key]) distribution[key]={count:0,volume:0};
    distribution[key].count++;
    distribution[key].volume += b.cost||0;
  });
  const totalVolume = Object.values(distribution).reduce((s,v)=>s+v.volume,0);
  const totalCount  = Object.values(distribution).reduce((s,v)=>s+v.count,0);

  const entries = isMulti
    ? (market.options||[]).map((opt,i)=>({
        label:opt.label, pct:opt.pct||Math.round(100/opt.odds), odds:opt.odds,
        bets:distribution[opt.label]||{count:0,volume:0}, color:COLORS[i%COLORS.length],
      }))
    : [
        { label:"OUI", color:"#10b981", prob:AMM.probYes(market.q_yes,market.q_no), bets:distribution["yes"]||{count:0,volume:0} },
        { label:"NON", color:"#ef4444", prob:1-AMM.probYes(market.q_yes,market.q_no), bets:distribution["no"]||{count:0,volume:0} },
      ];

  const donutData = entries.map(e=>({v:e.bets.volume,color:e.color}));
  const TABS = [
    { id:"repartition", label:"📊 Répartition" },
    { id:"parieurs",    label:`👥 Parieurs (${totalCount})` },
    { id:"comments",   label:"💬 Commentaires" },
  ];

  return (
    <div className="page-enter" style={{ paddingBottom:48 }}>

      {/* Retour */}
      <button onClick={onBack} style={{ display:"flex", alignItems:"center", gap:6, background:"transparent", border:"none", color:"rgba(241,245,249,0.4)", fontSize:13, fontWeight:700, cursor:"pointer", marginBottom:20, padding:0, letterSpacing:0.5 }}>
        ← Retour
      </button>

      {/* Hero */}
      <div style={{ marginBottom:22 }}>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10, alignItems:"center" }}>
          <span style={{ fontSize:9, fontWeight:800, color:cc, background:`${cc}14`, padding:"3px 7px", borderRadius:4, border:`1px solid ${cc}26`, letterSpacing:"1.5px", textTransform:"uppercase" }}>{market.category}</span>
          {isMulti&&<span style={{ fontSize:9, fontWeight:800, color:"#f59e0b", background:"rgba(245,158,11,0.1)", padding:"3px 7px", borderRadius:4, border:"1px solid rgba(245,158,11,0.22)", letterSpacing:"1.5px", textTransform:"uppercase" }}>MULTI · {(market.options||[]).length}</span>}
          <span style={{ fontSize:10, color:"rgba(241,245,249,0.28)", fontWeight:700, marginLeft:"auto" }}>⏱ {timeLeft(market.closes_at)}</span>
        </div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, lineHeight:1.25, color:"#f1f5f9", marginBottom:7 }}>{mTitle(market,lang)}</div>
        {market.source&&<div style={{ fontSize:11, color:"rgba(241,245,249,0.3)" }}>
          {market.source}
          {market.proposed_by&&<span style={{ color:"#f59e0b", fontWeight:800 }}> · 👑 {market.proposed_by}</span>}
        </div>}
      </div>

      {/* YES / NO big buttons */}
      {!isMulti&&(
        <div style={{ display:"flex", gap:10, marginBottom:14 }}>
          <button onClick={()=>onBet(market,"yes")} style={{ flex:1, background:"rgba(16,185,129,0.08)", border:"1px solid rgba(16,185,129,0.22)", borderRadius:14, padding:"16px 10px", cursor:"pointer", textAlign:"center" }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:44, lineHeight:1, color:"#10b981", letterSpacing:2 }}>{Math.round(p*100)}<span style={{ fontSize:20 }}>%</span></div>
            <div style={{ fontSize:11, color:"rgba(16,185,129,0.7)", fontWeight:800, letterSpacing:2, textTransform:"uppercase", marginTop:5 }}>OUI →</div>
          </button>
          <button onClick={()=>onBet(market,"no")} style={{ flex:1, background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.18)", borderRadius:14, padding:"16px 10px", cursor:"pointer", textAlign:"center" }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:44, lineHeight:1, color:"#ef4444", letterSpacing:2 }}>{100-Math.round(p*100)}<span style={{ fontSize:20 }}>%</span></div>
            <div style={{ fontSize:11, color:"rgba(239,68,68,0.6)", fontWeight:800, letterSpacing:2, textTransform:"uppercase", marginTop:5 }}>NON →</div>
          </button>
        </div>
      )}
      {!isMulti&&<div style={{ marginBottom:18 }}><ProbBar qYes={market.q_yes} qNo={market.q_no} /></div>}

      {/* Multi options */}
      {isMulti&&(
        <div style={{ display:"flex", flexDirection:"column", gap:7, marginBottom:18 }}>
          {(market.options||[]).map((opt,i)=>{
            const pct=opt.pct||Math.round(100/opt.odds);
            const c=COLORS[i%COLORS.length];
            return <button key={opt.label} onClick={()=>onBet(market,opt.label)} style={{ borderRadius:10, border:`1px solid ${c}25`, cursor:"pointer", background:"transparent", textAlign:"left" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 14px", position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", left:0, top:0, bottom:0, width:`${pct}%`, background:`${c}0d`, pointerEvents:"none" }} />
                <span style={{ fontSize:13, color:"rgba(241,245,249,0.8)", fontWeight:600, position:"relative" }}>{opt.label}</span>
                <div style={{ position:"relative", display:"flex", gap:10, alignItems:"center" }}>
                  <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, color:c, letterSpacing:1 }}>{pct}%</span>
                  <span style={{ fontSize:11, color:"rgba(241,245,249,0.3)" }}>×{opt.odds}</span>
                </div>
              </div>
            </button>;
          })}
        </div>
      )}

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:22 }}>
        {[
          { label:"VOLUME",   val:`🪙 ${fmt(market.total_volume||0)}` },
          { label:"PARIEURS", val:fmt(market.participants||0) },
          { label:"PARIS",    val:bets===null?"...":fmt(totalCount) },
        ].map(s=>(
          <div key={s.label} style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:10, padding:"11px 8px", textAlign:"center" }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:17, letterSpacing:1 }}>{s.val}</div>
            <div style={{ fontSize:9, color:"rgba(241,245,249,0.3)", fontWeight:700, letterSpacing:1, marginTop:3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:6, marginBottom:16, borderBottom:"1px solid rgba(241,245,249,0.06)", paddingBottom:12 }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ flex:1, padding:"8px 4px", borderRadius:10, border:`1px solid ${tab===t.id?"#10b981":"rgba(241,245,249,0.07)"}`, background:tab===t.id?"rgba(16,185,129,0.08)":"transparent", color:tab===t.id?"#10b981":"rgba(241,245,249,0.35)", fontWeight:700, fontSize:10, cursor:"pointer", transition:"all 0.2s", whiteSpace:"nowrap" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Répartition */}
      {tab==="repartition"&&<>
        {bets===null
          ? <div style={{ textAlign:"center", padding:24, color:"rgba(241,245,249,0.25)" }}>Chargement...</div>
          : <>
            {totalVolume>0&&<div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
              <MiniDonut entries={donutData} />
              <div style={{ flex:1 }}>
                {entries.map(e=>{
                  const pct=totalVolume>0?Math.round((e.bets.volume/totalVolume)*100):0;
                  return <div key={e.label} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                    <div style={{ width:8, height:8, borderRadius:2, background:e.color, flexShrink:0 }} />
                    <span style={{ fontSize:11, color:"rgba(241,245,249,0.6)", flex:1 }}>{e.label}</span>
                    <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:13, color:e.color, letterSpacing:1 }}>{pct}%</span>
                  </div>;
                })}
              </div>
            </div>}
            <OddsChart bets={bets} market={market} />
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {entries.map(e=>{
                const betPct=totalVolume>0?Math.round((e.bets.volume/totalVolume)*100):0;
                return <div key={e.label}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <span style={{ fontSize:13, fontWeight:700 }}>{e.label}</span>
                      {!isMulti&&<span style={{ fontSize:11, color:"rgba(241,245,249,0.3)" }}>{fmtPct(e.prob)} de chance</span>}
                      {isMulti&&<span style={{ fontSize:11, color:"rgba(241,245,249,0.3)" }}>{e.pct}% · ×{e.odds}</span>}
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
                </div>;
              })}
            </div>
          </>
        }
      </>}

      {/* Tab Parieurs */}
      {tab==="parieurs"&&<>
        {bets===null
          ? <div style={{ textAlign:"center", padding:24, color:"rgba(241,245,249,0.25)" }}>Chargement...</div>
          : bets.length===0
            ? <div style={{ textAlign:"center", padding:24, color:"rgba(241,245,249,0.2)", fontSize:13 }}>Aucun pari pour l'instant</div>
            : <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {[...bets].reverse().map((b,i)=>{
                  const colorEntry=entries.find(e=>e.label===b.side||(e.label==="OUI"&&b.side==="yes")||(e.label==="NON"&&b.side==="no"));
                  const color=colorEntry?.color||"#94a3b8";
                  const label=b.side==="yes"?"OUI":b.side==="no"?"NON":b.side;
                  return <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.05)", borderRadius:10 }}>
                    <div style={{ width:30, height:30, borderRadius:8, background:`${color}15`, border:`1px solid ${color}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color, flexShrink:0 }}>
                      {(b.username||"?").slice(0,2).toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:13, color:"#f1f5f9" }}>{b.username||"Anonyme"}</div>
                      <div style={{ fontSize:11, color:"rgba(241,245,249,0.3)" }}>
                        <span style={{ color, fontWeight:700 }}>{label}</span>{" · "}{fmt(b.cost)} MC
                      </div>
                    </div>
                    <div style={{ fontSize:11, padding:"3px 8px", borderRadius:12, background:b.status==="won"?"rgba(16,185,129,0.12)":b.status==="lost"?"rgba(239,68,68,0.1)":"rgba(251,191,36,0.08)", color:b.status==="won"?"#10b981":b.status==="lost"?"#ef4444":"#fbbf24", fontWeight:700, flexShrink:0 }}>
                      {b.status==="won"?"✓ Gagné":b.status==="lost"?"✗ Perdu":"En cours"}
                    </div>
                  </div>;
                })}
              </div>
        }
      </>}

      {/* Tab Commentaires */}
      {tab==="comments"&&<CommentsSection refId={market.id} refType="market" session={session} profile={profile} />}

      {/* Conditions */}
      {(market.conditions||market.conditions_en)&&(()=>{
        const text = lang==="en"&&market.conditions_en ? market.conditions_en : market.conditions;
        if (!text) return null;
        return <div style={{ marginTop:30, background:"rgba(245,158,11,0.04)", border:"1px solid rgba(245,158,11,0.15)", borderRadius:14, padding:"18px 20px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
            <span style={{ fontSize:16 }}>📋</span>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, letterSpacing:2, color:"#f59e0b" }}>{lang==="en"?"RESOLUTION CONDITIONS":"CONDITIONS DE RÉSOLUTION"}</div>
          </div>
          <div style={{ fontSize:13, color:"rgba(241,245,249,0.6)", lineHeight:1.75, whiteSpace:"pre-wrap" }}>{text}</div>
        </div>;
      })()}

      {/* Actions */}
      <div style={{ display:"flex", gap:10, marginTop:26 }}>
        <button onClick={onBack} style={{ flex:1, padding:"13px 0", borderRadius:12, border:"1px solid rgba(241,245,249,0.1)", background:"transparent", color:"rgba(241,245,249,0.4)", fontWeight:700, fontSize:13, cursor:"pointer" }}>← Retour</button>
        <button onClick={()=>onBet(market)} style={{ flex:2, padding:"13px 0", borderRadius:12, border:"none", background:isMulti?"linear-gradient(135deg,#f59e0b,#d97706)":"linear-gradient(135deg,#10b981,#059669)", color:"#fff", fontWeight:800, fontSize:14, cursor:"pointer", boxShadow:isMulti?"0 8px 25px rgba(245,158,11,0.25)":"0 8px 25px rgba(16,185,129,0.25)" }}>PARIER →</button>
      </div>
    </div>
  );
}
