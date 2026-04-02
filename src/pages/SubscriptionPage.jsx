import { SUBSCRIPTION_PLANS } from "../lib/constants.js";
import { getSubPlan, getSubColor, getSubEmoji, getSubLabel, getMCBoost } from "../lib/helpers.js";

export default function SubscriptionPage({ profile, onSubscribe }) {
  const currentSub=getSubPlan(profile);
  return <div className="page-enter">
    {/* HERO */}
    <div style={{ position:"relative", textAlign:"center", padding:"32px 20px 28px", marginBottom:32, background:"linear-gradient(180deg,rgba(16,185,129,0.06),transparent)", borderRadius:24, border:"1px solid rgba(16,185,129,0.08)", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:-60, left:"50%", transform:"translateX(-50%)", width:300, height:300, borderRadius:"50%", background:"radial-gradient(circle,rgba(16,185,129,0.07),transparent 65%)", pointerEvents:"none" }} />
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:11, letterSpacing:4, color:"#10b981", marginBottom:10 }}>CHOISIR TA LIGUE</div>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:38, letterSpacing:3, marginBottom:8 }}>TES <span style={{ color:"#10b981" }}>AVANTAGES</span></div>
      <div style={{ fontSize:13, color:"rgba(241,245,249,0.4)", maxWidth:380, margin:"0 auto", lineHeight:1.6 }}>Plus ta ligue est élevée, plus tu reçois de MC chaque lundi et plus tes récompenses sont exclusives.</div>
      {/* Barre progression */}
      <div style={{ marginTop:20, position:"relative" }}>
        <div style={{ height:4, borderRadius:99, background:"rgba(241,245,249,0.06)", overflow:"hidden", margin:"0 20px" }}>
          <div style={{ width:currentSub==="starter"?"16%":currentSub==="pro"?"50%":"100%", height:"100%", background:`linear-gradient(90deg,#94a3b8,${getSubColor(currentSub)})`, borderRadius:99, transition:"width 1.2s ease", boxShadow:`0 0 10px ${getSubColor(currentSub)}` }} />
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:8, padding:"0 16px" }}>
          {SUBSCRIPTION_PLANS.map(p=>(
            <div key={p.id} style={{ textAlign:"center", opacity:p.id===currentSub?1:0.4 }}>
              <div style={{ fontSize:16, marginBottom:2 }}>{p.emoji}</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:10, color:p.color, letterSpacing:1 }}>{p.label}</div>
              {p.id===currentSub&&<div style={{ width:6, height:6, borderRadius:"50%", background:p.color, margin:"4px auto 0", boxShadow:`0 0 6px ${p.color}` }} />}
            </div>
          ))}
        </div>
      </div>
    </div>
    {/* Hero plan actuel */}
    <div style={{ position:"relative", background:`linear-gradient(135deg,${getSubColor(currentSub)}18,rgba(3,7,18,0.95))`, border:`1px solid ${getSubColor(currentSub)}35`, borderRadius:22, padding:"24px 22px", marginBottom:32, overflow:"hidden" }}>
      <div style={{ position:"absolute", top:-40, right:-40, width:180, height:180, borderRadius:"50%", background:`radial-gradient(circle,${getSubColor(currentSub)}20,transparent 70%)`, pointerEvents:"none" }} />
      <div style={{ fontSize:10, color:"rgba(241,245,249,0.35)", fontWeight:700, letterSpacing:2, marginBottom:10 }}>TON ABONNEMENT ACTUEL</div>
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:14 }}>
        <div style={{ width:56, height:56, borderRadius:16, background:`${getSubColor(currentSub)}20`, border:`2px solid ${getSubColor(currentSub)}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, flexShrink:0, boxShadow:`0 0 20px ${getSubColor(currentSub)}25` }}>{getSubEmoji(currentSub)}</div>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:getSubColor(currentSub), letterSpacing:2 }}>{getSubLabel(currentSub)}</div>
          <div style={{ fontSize:12, color:"rgba(241,245,249,0.45)", marginTop:2 }}>{getMCBoost(currentSub)} MarketCoins offerts chaque lundi</div>
        </div>
      </div>
      <div style={{ height:3, borderRadius:99, background:"rgba(241,245,249,0.06)", overflow:"hidden" }}>
        <div style={{ width:currentSub==="starter"?"33%":currentSub==="pro"?"66%":"100%", height:"100%", background:`linear-gradient(90deg,${getSubColor(currentSub)}88,${getSubColor(currentSub)})`, borderRadius:99, transition:"width 1s ease", boxShadow:`0 0 8px ${getSubColor(currentSub)}` }} />
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
        {["Starter","Pro","Elite"].map((l,i)=><span key={l} style={{ fontSize:9, fontWeight:700, color:["#94a3b8","#3b82f6","#f59e0b"][i], opacity:["starter","pro","elite"][i]===currentSub?1:0.35 }}>{l}</span>)}
      </div>
    </div>
    {/* Comparatif */}
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {SUBSCRIPTION_PLANS.map((plan)=>{
        const isCurrent=currentSub===plan.id;
        const color=plan.color;
        return <div key={plan.id} style={{ position:"relative", borderRadius:22, overflow:"hidden", border:`1px solid ${isCurrent?color+"50":plan.popular?"rgba(59,130,246,0.2)":"rgba(241,245,249,0.06)"}`, boxShadow:isCurrent?`0 8px 40px ${color}20`:plan.popular?"0 8px 30px rgba(59,130,246,0.1)":"none" }}>
          <div style={{ height:4, background:isCurrent?`linear-gradient(90deg,${color},${color}88)`:plan.popular?"linear-gradient(90deg,#3b82f6,#2563eb)":"rgba(241,245,249,0.06)" }} />
          <div style={{ background:isCurrent?`linear-gradient(145deg,${color}10,rgba(3,7,18,0.98))`:"rgba(241,245,249,0.02)", padding:"20px 22px 22px" }}>
            {plan.popular&&!isCurrent&&<div style={{ display:"inline-flex", alignItems:"center", gap:5, background:"rgba(59,130,246,0.12)", border:"1px solid rgba(59,130,246,0.25)", borderRadius:20, padding:"3px 10px", marginBottom:14, fontSize:10, fontWeight:800, color:"#60a5fa", letterSpacing:1 }}>⚡ POPULAIRE</div>}
            {isCurrent&&<div style={{ display:"inline-flex", alignItems:"center", gap:5, background:`${color}15`, border:`1px solid ${color}30`, borderRadius:20, padding:"3px 10px", marginBottom:14, fontSize:10, fontWeight:800, color, letterSpacing:1 }}>✓ TON PLAN</div>}
            {plan.id==="elite"&&!isCurrent&&<div style={{ display:"inline-flex", alignItems:"center", gap:5, background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.2)", borderRadius:20, padding:"3px 10px", marginBottom:14, fontSize:10, fontWeight:800, color:"#f59e0b", letterSpacing:1 }}>👑 PREMIUM</div>}
            {plan.id==="starter"&&!isCurrent&&<div style={{ marginBottom:14 }} />}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:52, height:52, borderRadius:15, background:`${color}18`, border:`1px solid ${color}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, boxShadow:isCurrent?`0 0 20px ${color}30`:"none" }}>{plan.emoji}</div>
                <div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, letterSpacing:2, color:isCurrent?color:"#f1f5f9" }}>{plan.label.toUpperCase()}</div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:plan.id==="starter"?"rgba(241,245,249,0.3)":"#fbbf24", letterSpacing:1 }}>{plan.priceLabel}</div>
                </div>
              </div>
              <div style={{ textAlign:"center", background:"rgba(251,191,36,0.06)", border:"1px solid rgba(251,191,36,0.15)", borderRadius:12, padding:"8px 14px" }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:"#fbbf24", letterSpacing:1, lineHeight:1 }}>{plan.mcBoost}</div>
                <div style={{ fontSize:9, color:"rgba(241,245,249,0.3)", fontWeight:700, letterSpacing:1, marginTop:2 }}>MC/LUNDI</div>
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:7, marginBottom:20, background:"rgba(241,245,249,0.02)", borderRadius:12, padding:"14px" }}>
              {(plan.features||[]).map(f=><div key={f} style={{ display:"flex", alignItems:"center", gap:9, fontSize:12, color:"rgba(241,245,249,0.7)" }}>
                <div style={{ width:18, height:18, borderRadius:5, background:`${color}20`, border:`1px solid ${color}35`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <span style={{ color, fontSize:10, fontWeight:800 }}>✓</span>
                </div>
                {f}
              </div>)}
              {(plan.noFeatures||[]).map(f=><div key={f} style={{ display:"flex", alignItems:"center", gap:9, fontSize:12, color:"rgba(241,245,249,0.18)" }}>
                <div style={{ width:18, height:18, borderRadius:5, background:"rgba(241,245,249,0.03)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <span style={{ fontSize:10 }}>✗</span>
                </div>
                {f}
              </div>)}
            </div>
            {isCurrent?(
              <div style={{ display:"flex", gap:8 }}>
                <div style={{ flex:1, padding:"12px 0", borderRadius:12, background:`${color}12`, border:`1px solid ${color}25`, color, fontWeight:800, fontSize:13, textAlign:"center" }}>✓ Plan actuel</div>
                {plan.id!=="starter"&&<button onClick={()=>onSubscribe("starter")} style={{ padding:"12px 16px", borderRadius:12, border:"1px solid rgba(239,68,68,0.15)", background:"rgba(239,68,68,0.05)", color:"#f87171", fontWeight:700, fontSize:12, cursor:"pointer" }}>Résilier</button>}
                {plan.id==="pro"&&<button onClick={()=>onSubscribe("elite")} style={{ flex:1, padding:"12px 0", borderRadius:12, border:"none", background:"linear-gradient(135deg,#f59e0b,#d97706)", color:"#fff", fontWeight:800, fontSize:13, cursor:"pointer", boxShadow:"0 6px 20px rgba(245,158,11,0.3)" }}>Passer Elite 👑</button>}
              </div>
            ):(
              <button onClick={()=>onSubscribe(plan.id)} style={{ width:"100%", padding:"14px 0", borderRadius:13, border:"none", background:plan.id==="starter"?"rgba(241,245,249,0.04)":`linear-gradient(135deg,${color},${color}aa)`, color:plan.id==="starter"?"rgba(241,245,249,0.25)":"#fff", fontWeight:800, fontSize:14, cursor:plan.id==="starter"?"default":"pointer", boxShadow:plan.id!=="starter"?`0 10px 30px ${color}30`:"none", letterSpacing:plan.id!=="starter"?0.5:0, transition:"all 0.2s" }}>
                {plan.id==="starter"?"Plan gratuit par défaut":`S'abonner — ${plan.priceLabel} →`}
              </button>
            )}
          </div>
        </div>;
      })}
    </div>
    {/* Note légale */}
    <div style={{ marginTop:24, padding:"12px 16px", background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.05)", borderRadius:12, fontSize:11, color:"rgba(241,245,249,0.25)", lineHeight:1.7 }}>
      Plafond de dépenses : 14,99€/mois. Les MarketCoins n'ont aucune valeur monétaire. Résiliation possible à tout moment. Conforme à la loi JONUM française.
    </div>
  </div>;
}
