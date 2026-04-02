import { useState, useEffect } from "react";
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

export default function HowItWorksPage({ onNavigate }) {
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
    {icon:"🎁",title:"Inscris-toi gratuitement",color:"#10b981",desc:"500 MC gratuits a l'inscription. Aucune carte bancaire requise.",detail:"Les MarketCoins (MC) n'ont aucune valeur monetaire mais te permettent de participer a tous les marches et paris."},
    {icon:"📊",title:"Choisis un marche",color:"#3b82f6",desc:"Transferts, matchs, performances. Chaque marche pose une question sur le football.",detail:"Les cotes bougent selon les paris des autres joueurs, comme une vraie bourse. Plus les gens parient d'un cote, plus la cote baisse."},
    {icon:"⚽",title:"Parie sur les matchs",color:"#f59e0b",desc:"Vainqueur, score exact, 1er buteur, buteur ou +/- buts.",detail:"Quand le match se termine, tes gains sont credites automatiquement si tu as gagne. Chaque pari rapporte +5 XP."},
    {icon:"👑",title:"Choisis ta Ligue",color:"#f59e0b",desc:"Starter gratuit, Pro a 4.99€/mois, Elite a 14.99€/mois.",detail:"Plus ta ligue est elevee, plus tu recois de MC chaque lundi (100 → 150 → 250), plus tes recompenses sont prestigieuses. La ligue Elite donne acces aux marches exclusifs et aux recompenses VIP."},
    {icon:"🏆",title:"Monte de niveau",color:"#a78bfa",desc:"Chaque pari donne 5 XP. Chaque gain donne du XP bonus. La progression est permanente.",detail:"Les badges (Rookie → Scout → Analyst → Pro → Legend) sont ta reputation sur MarketBall. Un joueur niveau 40 a construit un avantage competitif qu'il ne veut pas perdre."},
    {icon:"💎",title:"Gagne des StoreCoins",color:"#34d399",desc:"Via la roue quotidienne (jusqu'a 1 SC/jour) ou le classement hebdomadaire.",detail:"Echange tes SC dans le Store contre des cadeaux reels. Starter : cartes cadeaux. Pro : maillots. Elite : maillots dedicaces et places VIP."},
    {icon:"🎡",title:"Bonus quotidiens",color:"#ec4899",desc:"Roue : jusqu'a 200 MC ou 1 SC par jour. Streak : bonus MC chaque jour consecutif.",detail:"Streak 3 jours = +30 MC, streak 7 jours = +100 MC. Reviens chaque jour pour maximiser tes gains et gravir le classement !"},
    {icon:"🌐",title:"Communaute Discord",color:"#5865f2",desc:"Rejoins le serveur Discord MarketBall pour les news et les analyses.",detail:"News en temps reel, salons exclusifs Pro/Elite, et les meilleurs joueurs (niveau 60+) peuvent proposer leurs propres marches de prediction !"},
  ];
  return <div className="page-enter">
    <div style={{ textAlign:"center", marginBottom:32 }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:36, letterSpacing:3, marginBottom:8 }}>COMMENT CA <span style={{ color:"#10b981" }}>MARCHE ?</span></div>
      <div style={{ fontSize:14, color:"rgba(241,245,249,0.4)", maxWidth:480, margin:"0 auto" }}>La premiere plateforme de predictions football en mode bourse. Gratuit, legal, addictif.</div>
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
    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:2, marginBottom:14 }}>ESSAIE TOI-MÊME</div>
    <BetSimulator />
    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:2, marginBottom:14 }}>LES ÉTAPES</div>
    <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:32 }}>
      {STEPS.map((step,i)=>(
        <div key={i} onClick={()=>setActiveStep(activeStep===i?-1:i)} style={{ background:activeStep===i?"rgba(241,245,249,0.04)":"rgba(241,245,249,0.02)", border:`1px solid ${activeStep===i?step.color+"30":"rgba(241,245,249,0.06)"}`, borderRadius:14, overflow:"hidden", cursor:"pointer", transition:"all 0.2s" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px" }}>
            <div style={{ width:40,height:40,borderRadius:11,background:`${step.color}15`,border:`1px solid ${step.color}25`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0 }}>{step.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:1 }}>{step.title}</div>
              <div style={{ fontSize:12, color:"rgba(241,245,249,0.4)", marginTop:2 }}>{step.desc}</div>
            </div>
            <div style={{ fontSize:14, color:"rgba(241,245,249,0.3)", transition:"transform 0.2s", transform:activeStep===i?"rotate(180deg)":"none" }}>▾</div>
          </div>
          {activeStep===i&&<div style={{ padding:"0 16px 14px 70px", animation:"fadeIn 0.2s ease" }}>
            <div style={{ fontSize:13, color:"rgba(241,245,249,0.45)", lineHeight:1.6, background:`${step.color}08`, border:`1px solid ${step.color}15`, borderRadius:9, padding:"11px 13px" }}>{step.detail}</div>
          </div>}
        </div>
      ))}
    </div>
    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:2, marginBottom:14 }}>FAQ</div>
    <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:32 }}>
      {[
        {q:"C'est gratuit ?",a:"L'inscription est 100% gratuite avec 500 MC offerts. Des abonnements optionnels existent : Pro (4.99€/mois) et Elite (14.99€/mois) pour plus de MC et des récompenses exclusives. Plafond de dépenses à 14.99€/mois."},
        {q:"C'est legal en France ?",a:"Oui, totalement legal. Les MC n'ont aucune valeur monetaire. Ce n'est pas du jeu d'argent."},
        {q:"Comment les paris sont resolus ?",a:"Quand un match se termine, nos systemes resolvent tes paris automatiquement. Si tu as gagne, les coins sont credites et ton XP augmente."},
        {q:"1 SC = combien de MC ?",a:"1 SC = 10 MC lors de la conversion dans le Wallet. Les SC s'achetent a 1€=1SC ou se gagnent avec la roue."},
        {q:"C'est quoi les cotes dynamiques ?",a:"Les cotes bougent selon les paris des joueurs, comme une bourse. Plus les gens parient sur PSG, plus la cote de PSG baisse."},
      ].map((item,i)=>{
        const [open,setOpen]=useState(false);
        return <div key={i} onClick={()=>setOpen(!open)} style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:11, overflow:"hidden", cursor:"pointer" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 16px" }}>
            <div style={{ fontWeight:700, fontSize:13 }}>{item.q}</div>
            <div style={{ fontSize:14, color:"rgba(241,245,249,0.3)", transition:"transform 0.2s", transform:open?"rotate(180deg)":"none" }}>▾</div>
          </div>
          {open&&<div style={{ padding:"0 16px 12px", fontSize:13, color:"rgba(241,245,249,0.4)", lineHeight:1.6, animation:"fadeIn 0.2s ease" }}>{item.a}</div>}
        </div>;
      })}
    </div>
    <div style={{ background:"linear-gradient(135deg,rgba(16,185,129,0.08),rgba(59,130,246,0.05))", border:"1px solid rgba(16,185,129,0.12)", borderRadius:18, padding:"26px", textAlign:"center" }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:2, marginBottom:8 }}>PRET A JOUER ?</div>
      <div style={{ fontSize:13, color:"rgba(241,245,249,0.4)", marginBottom:18 }}>Rejoins des milliers de joueurs et prouve que tu es le meilleur oracle du football</div>
      <button onClick={()=>onNavigate("home")} style={{ padding:"13px 32px", borderRadius:12, border:"none", background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", fontWeight:800, fontSize:14, cursor:"pointer", boxShadow:"0 8px 25px rgba(16,185,129,0.3)" }}>COMMENCER →</button>
    </div>
  </div>;
}
