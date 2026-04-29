import { useState, useEffect } from "react";
import { useLang } from "../lib/i18n.jsx";
import { AMM } from "../lib/amm.js";

function BetSimulator() {
  const [step,setStep]=useState(0);
  const [choice,setChoice]=useState(null);
  const [amount,setAmount]=useState(100);
  const [done,setDone]=useState(false);
  const DEMO_MARKET={title:"PSG remporte la Champions League ?",q_yes:260,q_no:140};
  const pYes=Math.round(AMM.probYes(DEMO_MARKET.q_yes,DEMO_MARKET.q_no)*100);
  const gain=choice==="yes"?Math.round(amount/AMM.probYes(DEMO_MARKET.q_yes,DEMO_MARKET.q_no)):Math.round(amount/(1-AMM.probYes(DEMO_MARKET.q_yes,DEMO_MARKET.q_no)));

  const reset=()=>{setStep(0);setChoice(null);setAmount(100);setDone(false);};

  return <div style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(16,185,129,0.15)", borderRadius:18, overflow:"hidden", marginBottom:20 }}>
    <div style={{ background:"linear-gradient(135deg,rgba(16,185,129,0.12),rgba(59,130,246,0.08))", padding:"14px 18px", borderBottom:"1px solid rgba(241,245,249,0.06)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:2, color:"#10b981" }}>SIMULATION INTERACTIVE</div>
      <div style={{ display:"flex", gap:6 }}>
        {[0,1,2,3].map(i=><div key={i} style={{ width:i<=step?22:7, height:7, borderRadius:99, background:i<=step?"#10b981":"rgba(241,245,249,0.1)", transition:"all 0.3s" }} />)}
      </div>
    </div>
    <div style={{ padding:"18px" }}>
      {step===0&&<div style={{ animation:"fadeInUp 0.3s ease" }}>
        <div style={{ fontSize:12, color:"rgba(241,245,249,0.5)", marginBottom:10, fontWeight:700, letterSpacing:1 }}>ÉTAPE 1 — CHOISIS UN MARCHÉ</div>
        <div onClick={()=>setStep(1)} className="card-hover" style={{ background:"rgba(241,245,249,0.03)", border:"1px solid rgba(16,185,129,0.2)", borderRadius:14, padding:"16px", cursor:"pointer", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"linear-gradient(90deg,#10b981,#3b82f6)" }} />
          <div style={{ display:"flex", gap:6, marginBottom:8 }}>
            <span style={{ fontSize:10, fontWeight:700, color:"#f59e0b", background:"rgba(245,158,11,0.12)", padding:"2px 8px", borderRadius:20, border:"1px solid rgba(245,158,11,0.2)" }}>Compétitions</span>
          </div>
          <div style={{ fontWeight:800, fontSize:14, marginBottom:10 }}>{DEMO_MARKET.title}</div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
            <span style={{ fontSize:11, fontWeight:800, color:"#10b981" }}>OUI {pYes}%</span>
            <span style={{ fontSize:11, fontWeight:800, color:"#ef4444" }}>NON {100-pYes}%</span>
          </div>
          <div style={{ height:4, borderRadius:99, background:"rgba(239,68,68,0.15)", overflow:"hidden" }}>
            <div style={{ width:`${pYes}%`, height:"100%", background:"linear-gradient(90deg,#10b981,#34d399)", borderRadius:99 }} />
          </div>
          <div style={{ marginTop:12, textAlign:"center", fontSize:12, color:"#10b981", fontWeight:700 }}>👆 Clique pour parier →</div>
        </div>
      </div>}
      {step===1&&<div style={{ animation:"fadeInUp 0.3s ease" }}>
        <div style={{ fontSize:12, color:"rgba(241,245,249,0.5)", marginBottom:10, fontWeight:700, letterSpacing:1 }}>ÉTAPE 2 — OUI OU NON ?</div>
        <div style={{ fontSize:13, color:"rgba(241,245,249,0.6)", marginBottom:14, fontStyle:"italic" }}>"{DEMO_MARKET.title}"</div>
        <div style={{ display:"flex", gap:10 }}>
          {["yes","no"].map(s=>(
            <button key={s} className="btn-animated" onClick={()=>{setChoice(s);setStep(2);}}
              style={{ flex:1, padding:"16px 0", borderRadius:14, border:`2px solid ${choice===s?(s==="yes"?"#10b981":"#ef4444"):"rgba(241,245,249,0.08)"}`, background:choice===s?(s==="yes"?"rgba(16,185,129,0.12)":"rgba(239,68,68,0.12)"):"rgba(241,245,249,0.03)", color:s==="yes"?"#10b981":"#ef4444", fontWeight:800, fontSize:15, cursor:"pointer", transition:"all 0.2s" }}>
              {s==="yes"?`✅ OUI — ${pYes}%`:`❌ NON — ${100-pYes}%`}
            </button>
          ))}
        </div>
      </div>}
      {step===2&&<div style={{ animation:"fadeInUp 0.3s ease" }}>
        <div style={{ fontSize:12, color:"rgba(241,245,249,0.5)", marginBottom:10, fontWeight:700, letterSpacing:1 }}>ÉTAPE 3 — COMBIEN DE MC ?</div>
        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          {[50,100,200,500].map(v=>(
            <button key={v} className="btn-animated" onClick={()=>setAmount(v)} style={{ flex:1, padding:"10px 0", borderRadius:10, border:`1px solid ${amount===v?"#10b981":"rgba(241,245,249,0.07)"}`, background:amount===v?"rgba(16,185,129,0.1)":"transparent", color:amount===v?"#10b981":"rgba(241,245,249,0.4)", fontWeight:700, fontSize:13, cursor:"pointer" }}>{v}</button>
          ))}
        </div>
        <div style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:12, padding:"12px 14px", marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}><span style={{ fontSize:13, color:"rgba(241,245,249,0.4)" }}>Mise</span><span style={{ fontFamily:"'Bebas Neue',sans-serif", color:"#fbbf24", fontSize:16 }}>{amount} MC</span></div>
          <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ fontSize:13, color:"rgba(241,245,249,0.4)" }}>Gain potentiel</span><span style={{ fontFamily:"'Bebas Neue',sans-serif", color:"#10b981", fontSize:20 }}>+{gain} MC 🏆</span></div>
        </div>
        <button className="btn-animated" onClick={()=>setStep(3)} style={{ width:"100%", padding:"13px 0", borderRadius:12, border:"none", background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", fontWeight:800, fontSize:15, cursor:"pointer", boxShadow:"0 8px 25px rgba(16,185,129,0.3)" }}>CONFIRMER MA PRÉDICTION →</button>
      </div>}
      {step===3&&<div style={{ animation:"winPop 0.5s ease", textAlign:"center", padding:"10px 0" }}>
        <div style={{ fontSize:48, marginBottom:10 }}>🎉</div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:"#10b981", letterSpacing:2, marginBottom:6 }}>PRÉDICTION PLACÉE !</div>
        <div style={{ fontSize:13, color:"rgba(241,245,249,0.5)", marginBottom:6 }}>Tu as misé <strong style={{color:"#fbbf24"}}>{amount} MC</strong> sur <strong style={{color:choice==="yes"?"#10b981":"#ef4444"}}>{choice==="yes"?"OUI":"NON"}</strong></div>
        <div style={{ fontSize:13, color:"rgba(241,245,249,0.5)", marginBottom:16 }}>Gain potentiel : <strong style={{color:"#10b981"}}>+{gain} MC</strong></div>
        <div style={{ background:"rgba(16,185,129,0.06)", border:"1px solid rgba(16,185,129,0.15)", borderRadius:12, padding:"10px 14px", marginBottom:16, fontSize:12, color:"rgba(241,245,249,0.45)", lineHeight:1.6 }}>
          Dans la vraie app, les gains sont crédités automatiquement quand le résultat est connu. Tu gagnes aussi +5 XP par pari !
        </div>
        <button className="btn-animated" onClick={reset} style={{ padding:"10px 24px", borderRadius:10, border:"1px solid rgba(16,185,129,0.2)", background:"rgba(16,185,129,0.06)", color:"#10b981", fontWeight:700, fontSize:13, cursor:"pointer" }}>🔄 Rejouer la démo</button>
      </div>}
    </div>
  </div>;
}

function FAQItem({ q, a }) {
  const [open,setOpen]=useState(false);
  return <div onClick={()=>setOpen(!open)} style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:11, overflow:"hidden", cursor:"pointer" }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 16px" }}>
      <div style={{ fontWeight:700, fontSize:13 }}>{q}</div>
      <div style={{ fontSize:14, color:"rgba(241,245,249,0.3)", transition:"transform 0.2s", transform:open?"rotate(180deg)":"none" }}>▾</div>
    </div>
    {open&&<div style={{ padding:"0 16px 12px", fontSize:13, color:"rgba(241,245,249,0.4)", lineHeight:1.6, animation:"fadeIn 0.2s ease" }}>{a}</div>}
  </div>;
}

function FAQList() {
  const { t } = useLang();
  const items = [
    {q:t("howto.faq1_q"),a:t("howto.faq1_a")},
    {q:t("howto.faq2_q"),a:t("howto.faq2_a")},
    {q:t("howto.faq3_q"),a:t("howto.faq3_a")},
    {q:t("howto.faq4_q"),a:t("howto.faq4_a")},
    {q:t("howto.faq5_q"),a:t("howto.faq5_a")},
  ];
  return <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:32 }}>
    {items.map((item,i)=><FAQItem key={i} q={item.q} a={item.a} />)}
  </div>;
}

export default function HowItWorksPage({ onNavigate }) {
  const { t } = useLang();
  const [activeStep,setActiveStep]=useState(-1);
  const [videoFrame,setVideoFrame]=useState(0);
  const VIDEO_FRAMES=[
    {bg:"#10b981",icon:"⚽",text:"MARCHE DE PREDICTION",sub:"Parie sur les transferts et matchs"},
    {bg:"#3b82f6",icon:"📈",text:"COTES DYNAMIQUES",sub:"Comme une vraie bourse football"},
    {bg:"#f59e0b",icon:"🏆",text:"GAGNE DES RECOMPENSES",sub:"Maillots, places VIP, cartes cadeaux"},
    {bg:"#a78bfa",icon:"👑",text:"MONTE DE NIVEAU",sub:"Rookie → Scout → Analyst → Pro → Legend"},
    {bg:"#f59e0b",icon:"👑",text:"3 LIGUES DISPONIBLES",sub:"Starter gratuit · Pro 4.99€ · Elite 14.99€"},
    {bg:"#5865f2",icon:"🌐",text:"COMMUNAUTE DISCORD",sub:"News, analyses et marches proposes par les joueurs"},
  ];
  useEffect(()=>{const t=setInterval(()=>setVideoFrame(f=>(f+1)%VIDEO_FRAMES.length),2500);return()=>clearInterval(t);},[]);
  const STEPS=[
    {icon:"🎁",title:t("howto.step1_title"),color:"#10b981",desc:t("howto.step1_desc"),detail:t("howto.step1_detail")},
    {icon:"📊",title:t("howto.step2_title"),color:"#3b82f6",desc:t("howto.step2_desc"),detail:t("howto.step2_detail")},
    {icon:"⚽",title:t("howto.step3_title"),color:"#f59e0b",desc:t("howto.step3_desc"),detail:t("howto.step3_detail")},
    {icon:"👑",title:t("howto.step4_title"),color:"#f59e0b",desc:t("howto.step4_desc"),detail:t("howto.step4_detail")},
    {icon:"🏆",title:t("howto.step5_title"),color:"#a78bfa",desc:t("howto.step5_desc"),detail:t("howto.step5_detail")},
    {icon:"💎",title:t("howto.step6_title"),color:"#34d399",desc:t("howto.step6_desc"),detail:t("howto.step6_detail")},
    {icon:"🎡",title:t("howto.step7_title"),color:"#ec4899",desc:t("howto.step7_desc"),detail:t("howto.step7_detail")},
    {icon:"🌐",title:t("howto.step8_title"),color:"#5865f2",desc:null,discordLink:true,detail:t("howto.step8_detail")},
  ];
  return <div className="page-enter">
    <div style={{ textAlign:"center", marginBottom:32 }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:36, letterSpacing:3, marginBottom:8 }}>{t("howto.title").split("?")[0]}<span style={{ color:"#10b981" }}>?</span></div>
      <div style={{ fontSize:14, color:"rgba(241,245,249,0.4)", maxWidth:480, margin:"0 auto" }}>{t("howto.subtitle")}</div>
    </div>
    <div style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.07)", borderRadius:18, overflow:"hidden", marginBottom:32 }}>
      <div style={{ background:`linear-gradient(135deg,${VIDEO_FRAMES[videoFrame].bg}22,rgba(3,7,18,0.9))`, padding:"44px 30px", textAlign:"center", transition:"background 0.8s ease", minHeight:190, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", position:"relative" }}>
        <div style={{ position:"absolute", inset:0, background:`radial-gradient(circle at 50% 50%,${VIDEO_FRAMES[videoFrame].bg}15,transparent 70%)`, transition:"all 0.8s ease" }} />
        <div style={{ fontSize:50, marginBottom:12, position:"relative", zIndex:1 }}>{VIDEO_FRAMES[videoFrame].icon}</div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, letterSpacing:3, color:"#f1f5f9", marginBottom:6, position:"relative", zIndex:1 }}>{VIDEO_FRAMES[videoFrame].text}</div>
        <div style={{ fontSize:13, color:"rgba(241,245,249,0.45)", position:"relative", zIndex:1 }}>{VIDEO_FRAMES[videoFrame].sub}</div>
      </div>
      <div style={{ display:"flex", justifyContent:"center", gap:8, padding:"12px 0", background:"rgba(241,245,249,0.02)" }}>
        {VIDEO_FRAMES.map((_,i)=><button key={i} onClick={()=>setVideoFrame(i)} style={{ width:i===videoFrame?22:7, height:7, borderRadius:99, background:i===videoFrame?"#10b981":"rgba(241,245,249,0.15)", border:"none", cursor:"pointer", transition:"all 0.3s ease", padding:0 }} />)}
      </div>
    </div>
    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:2, marginBottom:14 }}>{t("howto.simulator")}</div>
    <BetSimulator />
    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:2, marginBottom:14 }}>{t("howto.steps")}</div>
    <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:32 }}>
      {STEPS.map((step,i)=>(
        <div key={i} onClick={()=>setActiveStep(activeStep===i?-1:i)} style={{ background:activeStep===i?"rgba(241,245,249,0.04)":"rgba(241,245,249,0.02)", border:`1px solid ${activeStep===i?step.color+"30":"rgba(241,245,249,0.06)"}`, borderRadius:14, overflow:"hidden", cursor:"pointer", transition:"all 0.2s" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px" }}>
            <div style={{ width:40,height:40,borderRadius:11,background:`${step.color}15`,border:`1px solid ${step.color}25`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0 }}>{step.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:1 }}>{step.title}</div>
              {step.discordLink
                ? <a href="https://discord.gg/marketball" target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{ fontSize:12, color:"#5865f2", marginTop:2, display:"inline-flex", alignItems:"center", gap:4, textDecoration:"none", fontWeight:700 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#5865f2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                    {t("community.discord_join")}
                  </a>
                : <div style={{ fontSize:12, color:"rgba(241,245,249,0.4)", marginTop:2 }}>{step.desc}</div>
              }
            </div>
            <div style={{ fontSize:14, color:"rgba(241,245,249,0.3)", transition:"transform 0.2s", transform:activeStep===i?"rotate(180deg)":"none" }}>▾</div>
          </div>
          {activeStep===i&&<div style={{ padding:"0 16px 14px 70px", animation:"fadeIn 0.2s ease" }}>
            <div style={{ fontSize:13, color:"rgba(241,245,249,0.45)", lineHeight:1.6, background:`${step.color}08`, border:`1px solid ${step.color}15`, borderRadius:9, padding:"11px 13px" }}>{step.detail}</div>
          </div>}
        </div>
      ))}
    </div>
    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:2, marginBottom:14 }}>{t("howto.faq")}</div>
    <FAQList />
    <div style={{ background:"linear-gradient(135deg,rgba(16,185,129,0.08),rgba(59,130,246,0.05))", border:"1px solid rgba(16,185,129,0.12)", borderRadius:18, padding:"26px", textAlign:"center" }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:2, marginBottom:8 }}>{t("howto.cta_title")}</div>
      <div style={{ fontSize:13, color:"rgba(241,245,249,0.4)", marginBottom:18 }}>{t("howto.cta_sub")}</div>
      <button onClick={()=>onNavigate("home")} style={{ padding:"13px 32px", borderRadius:12, border:"none", background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", fontWeight:800, fontSize:14, cursor:"pointer", boxShadow:"0 8px 25px rgba(16,185,129,0.3)" }}>{t("howto.cta_btn")}</button>
    </div>
  </div>;
}
