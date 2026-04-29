import { STORE_ITEMS, SUBSCRIPTION_PLANS } from "../lib/constants.js";
import { getSubPlan, getSubColor, getSubEmoji, getSubLabel, getMCBoost } from "../lib/helpers.js";
import MCBadge from "../components/ui/MCBadge.jsx";
import SCBadge from "../components/ui/SCBadge.jsx";
import { useLang } from "../lib/i18n.jsx";

export default function StorePage({ coins, sc, profile, onRedeemSC, onSubscribe, onNavigate }) {
  const currentSub=getSubPlan(profile);
  const subColor=getSubColor(currentSub);
  const { t, lang } = useLang();

  return <div className="page-enter">
    {/* HERO HEADER */}
    <div style={{ position:"relative", background:`linear-gradient(135deg,${subColor}20,rgba(3,7,18,0.98))`, border:`1px solid ${subColor}30`, borderRadius:24, padding:"24px 22px", marginBottom:28, overflow:"hidden" }}>
      <div style={{ position:"absolute", top:-50, right:-50, width:200, height:200, borderRadius:"50%", background:`radial-gradient(circle,${subColor}25,transparent 70%)`, pointerEvents:"none" }} />
      <div style={{ position:"absolute", bottom:-30, left:-30, width:140, height:140, borderRadius:"50%", background:`radial-gradient(circle,${subColor}12,transparent 70%)`, pointerEvents:"none" }} />
      <div style={{ fontSize:10, fontWeight:700, color:"rgba(241,245,249,0.35)", letterSpacing:2, marginBottom:12 }}>{t("store.my_store")}</div>
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <MCBadge amount={coins} size="lg" />
        <SCBadge amount={sc} size="lg" />
      </div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:40, height:40, borderRadius:11, background:`${subColor}20`, border:`1px solid ${subColor}35`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{getSubEmoji(currentSub)}</div>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:subColor, letterSpacing:1 }}>{t("store.league_label")} {getSubLabel(currentSub).toUpperCase()}</div>
            <div style={{ fontSize:11, color:"rgba(241,245,249,0.35)" }}>{getMCBoost(currentSub)} {t("store.mc_monday")}</div>
          </div>
        </div>
        <button onClick={()=>onNavigate("subscription")} style={{ padding:"7px 14px", borderRadius:10, border:`1px solid ${subColor}35`, background:`${subColor}12`, color:subColor, fontWeight:700, fontSize:11, cursor:"pointer" }}>{t("store.change")}</button>
      </div>
    </div>
    {/* TITRE */}
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
      <div style={{ width:3, height:22, background:"linear-gradient(180deg,#10b981,#3b82f6)", borderRadius:99 }} />
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, letterSpacing:2 }}>{t("store.rewards_title")}</div>
    </div>
    <div style={{ fontSize:12, color:"rgba(241,245,249,0.35)", marginBottom:24 }}>{t("store.rewards_desc")}</div>

    {/* RECOMPENSES PAR LIGUE */}
    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:2, marginBottom:6 }}>{t("store.rewards_title")}</div>
    <div style={{ fontSize:12, color:"rgba(241,245,249,0.35)", marginBottom:20 }}>{t("store.rewards_sub")}</div>
    {["starter","pro","elite"].map(planId=>{
      const planInfo=SUBSCRIPTION_PLANS.find(p=>p.id===planId);
      const items=STORE_ITEMS.filter(r=>r.plan===planId);
      if(items.length===0) return null;
      const planOrder=["starter","pro","elite"];
      const userOrder=planOrder.indexOf(currentSub);
      const planOrderIdx=planOrder.indexOf(planId);
      const accessible=userOrder>=planOrderIdx;
      return <div key={planId} style={{ marginBottom:28 }}>
        {/* Section header */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, paddingBottom:10, borderBottom:`1px solid ${planInfo.color}20` }}>
          <div style={{ width:32, height:32, borderRadius:9, background:`${planInfo.color}15`, border:`1px solid ${planInfo.color}25`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{planInfo.emoji}</div>
          <div>
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:17, letterSpacing:1, color:planInfo.color }}>{planInfo.label}</span>
            {!accessible&&<span style={{ marginLeft:8, fontSize:10, color:planInfo.color, background:`${planInfo.color}12`, border:`1px solid ${planInfo.color}25`, borderRadius:20, padding:"2px 9px", fontWeight:700 }}>🔒 Débloquer</span>}
            {accessible&&<span style={{ marginLeft:8, fontSize:10, color:"#10b981", fontWeight:700 }}>✓ Débloqué</span>}
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(185px,1fr))", gap:10 }}>
          {items.map(r=>{
            const affordable=sc>=r.cost;
            return <div key={r.id} className="card-hover" style={{ background:accessible?`${planInfo.color}05`:"rgba(241,245,249,0.015)", border:`1px solid ${accessible?planInfo.color+"25":"rgba(241,245,249,0.06)"}`, borderRadius:16, overflow:"hidden", position:"relative", transition:"all 0.2s" }}>
              {/* Contenu visible même si locked */}
              <div style={{ padding:"16px 16px 12px", filter:accessible?"none":"blur(0px)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                  <div style={{ fontSize:34 }}>{r.emoji}</div>
                  <div style={{ background:`${planInfo.color}15`, border:`1px solid ${planInfo.color}25`, borderRadius:8, padding:"3px 8px", textAlign:"right" }}>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:13, color:planInfo.color }}>{r.value}</div>
                  </div>
                </div>
                <div style={{ fontWeight:800, fontSize:13, color:accessible?"#f1f5f9":"rgba(241,245,249,0.5)", marginBottom:3 }}>{lang==="en"&&r.name_en?r.name_en:r.name}</div>
                <div style={{ fontSize:11, color:"rgba(241,245,249,0.3)", marginBottom:10, lineHeight:1.4 }}>{lang==="en"&&r.description_en?r.description_en:r.description}</div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:13, color:"#10b981" }}>💎 {r.cost} SC</div>
                  {accessible?(
                    <button onClick={()=>affordable&&onRedeemSC(r)} disabled={!affordable}
                      style={{ padding:"6px 12px", borderRadius:8, border:"none", background:affordable?`linear-gradient(135deg,${planInfo.color},${planInfo.color}cc)`:"rgba(241,245,249,0.06)", color:affordable?"#fff":"rgba(241,245,249,0.25)", fontWeight:800, fontSize:11, cursor:affordable?"pointer":"not-allowed", transition:"all 0.2s" }}>
                      {affordable?"OBTENIR":"Insuf."}
                    </button>
                  ):(
                    <div style={{ fontSize:11, color:planInfo.color, fontWeight:700 }}>🔒</div>
                  )}
                </div>
              </div>
              {/* Overlay lock - semi transparent pour voir le contenu */}
              {!accessible&&<div style={{ position:"absolute", inset:0, background:`linear-gradient(135deg,rgba(3,7,18,0.55),rgba(3,7,18,0.65))`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", backdropFilter:"blur(1.5px)", cursor:"pointer" }} onClick={()=>onNavigate("subscription")}>
                <div style={{ width:38, height:38, borderRadius:"50%", background:`${planInfo.color}20`, border:`2px solid ${planInfo.color}50`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:6, boxShadow:`0 0 16px ${planInfo.color}40` }}>
                  <span style={{ fontSize:18 }}>🔒</span>
                </div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:12, color:planInfo.color, letterSpacing:1, textAlign:"center" }}>LIGUE {planInfo.label.toUpperCase()}</div>
                <div style={{ fontSize:10, color:"rgba(241,245,249,0.5)", marginTop:2 }}>Tap pour s'abonner</div>
              </div>}
            </div>;
          })}
        </div>
      </div>;
    })}
  </div>;
}
