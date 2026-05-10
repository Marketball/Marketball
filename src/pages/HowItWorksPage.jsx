import { useState, useEffect } from "react";
import { useLang } from "../lib/i18n.jsx";
import { AMM } from "../lib/amm.js";

function injectStyles() {
  if (document.getElementById("hiw-styles")) return;
  const s = document.createElement("style");
  s.id = "hiw-styles";
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,300;0,400;0,700;0,900;1,400;1,700&family=Barlow+Condensed:wght@300;400;600;700;900&display=swap');

    @keyframes hiw-fadeUp   { from { opacity:0; transform:translateY(32px); } to { opacity:1; transform:translateY(0); } }
    @keyframes hiw-fadeIn   { from { opacity:0; } to { opacity:1; } }
    @keyframes hiw-winPop   { 0%{transform:scale(0.6);opacity:0} 65%{transform:scale(1.06)} 100%{transform:scale(1);opacity:1} }
    @keyframes hiw-pulse    { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.5)} }
    @keyframes hiw-scan     { 0%{top:-2px} 100%{top:100%} }

    .hiw-btn      { transition: transform 0.18s ease, filter 0.18s ease, box-shadow 0.18s ease; }
    .hiw-btn:hover{ transform: translateY(-2px) !important; filter: brightness(1.1); }
    .hiw-stat     { transition: transform 0.28s ease, box-shadow 0.28s ease; }
    .hiw-stat:hover{ transform: translateY(-5px); box-shadow: 0 24px 60px rgba(16,185,129,0.14) !important; }
    .hiw-faq      { transition: border-color 0.2s, background 0.2s; }
    .hiw-faq:hover{ border-color: rgba(16,185,129,0.22) !important; }
    .hiw-step     { transition: background 0.22s; }
    .hiw-step:hover{ background: rgba(16,185,129,0.03) !important; }
    .hiw-dot      { transition: width 0.3s ease, background 0.3s ease; border:none; cursor:pointer; padding:0; }
  `;
  document.head.appendChild(s);
}

/* ─── Bet Simulator ──────────────────────────────────────────────────────── */
function BetSimulator() {
  const [step, setStep]     = useState(0);
  const [choice, setChoice] = useState(null);
  const [amount, setAmount] = useState(100);
  const G = "#10b981";
  const MARKET = { q_yes: 260, q_no: 140 };
  const pYes = Math.round(AMM.probYes(MARKET.q_yes, MARKET.q_no) * 100);
  const gain  = choice === "yes"
    ? Math.round(amount / AMM.probYes(MARKET.q_yes, MARKET.q_no))
    : Math.round(amount / (1 - AMM.probYes(MARKET.q_yes, MARKET.q_no)));
  const reset = () => { setStep(0); setChoice(null); setAmount(100); };

  const LABELS = ["Marché", "Position", "Mise", "Validé"];
  return (
    <div style={{ background:"rgba(16,185,129,0.03)", border:"1px solid rgba(16,185,129,0.16)", borderRadius:20, overflow:"hidden" }}>
      {/* Header bar */}
      <div style={{ padding:"14px 20px", borderBottom:"1px solid rgba(16,185,129,0.1)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:7, height:7, borderRadius:"50%", background:G, animation:"hiw-pulse 2s infinite" }} />
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:11, letterSpacing:2.5, color:G }}>SIMULATION LIVE</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
          {LABELS.map((l, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:3 }}>
              <div style={{ width:22, height:22, borderRadius:"50%", background:i<step?G:i===step?"rgba(16,185,129,0.18)":"rgba(241,245,249,0.05)", border:`1px solid ${i<=step?G:"rgba(241,245,249,0.1)"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                {i < step
                  ? <span style={{ fontSize:10, color:"#030712", fontWeight:900 }}>✓</span>
                  : <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, fontWeight:700, color:i===step?G:"rgba(241,245,249,0.25)" }}>{i+1}</span>}
              </div>
              {i < 3 && <div style={{ width:14, height:1, background:i<step?G:"rgba(241,245,249,0.08)" }} />}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:"22px 20px" }}>
        {step === 0 && (
          <div style={{ animation:"hiw-fadeUp 0.35s ease" }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, letterSpacing:3, color:"rgba(241,245,249,0.35)", marginBottom:14 }}>01 · CHOISIS UN MARCHÉ</div>
            <div onClick={() => setStep(1)} style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(16,185,129,0.18)", borderRadius:14, padding:16, cursor:"pointer", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${G},transparent)` }} />
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, letterSpacing:3, color:"#f59e0b", marginBottom:8 }}>⚽ COMPÉTITIONS · CHAMPIONS LEAGUE</div>
              <div style={{ fontFamily:"'Barlow',sans-serif", fontWeight:900, fontSize:15, color:"#f1f5f9", marginBottom:12 }}>PSG remporte la Champions League ?</div>
              <div style={{ display:"flex", gap:6, marginBottom:7 }}>
                <div style={{ flex:pYes, height:5, borderRadius:"5px 0 0 5px", background:`linear-gradient(90deg,${G},#34d399)` }} />
                <div style={{ flex:100-pYes, height:5, borderRadius:"0 5px 5px 0", background:"rgba(239,68,68,0.35)" }} />
              </div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:11, color:G }}>OUI {pYes}%</span>
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:11, color:"#ef4444" }}>NON {100-pYes}%</span>
              </div>
              <div style={{ marginTop:12, textAlign:"right", fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:11, letterSpacing:1, color:G }}>PARIER SUR CE MARCHÉ →</div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={{ animation:"hiw-fadeUp 0.35s ease" }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, letterSpacing:3, color:"rgba(241,245,249,0.35)", marginBottom:8 }}>02 · PRENDS POSITION</div>
            <div style={{ fontFamily:"'Barlow',sans-serif", fontStyle:"italic", fontSize:13, color:"rgba(241,245,249,0.4)", marginBottom:16 }}>"PSG remporte la Champions League ?"</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {[
                { s:"yes", label:"OUI", pct:pYes, color:G, border:"rgba(16,185,129,0.3)", bg:"rgba(16,185,129,0.07)" },
                { s:"no", label:"NON", pct:100-pYes, color:"#ef4444", border:"rgba(239,68,68,0.3)", bg:"rgba(239,68,68,0.07)" },
              ].map(({ s, label, pct, color, border, bg }) => (
                <button key={s} className="hiw-btn" onClick={() => { setChoice(s); setStep(2); }}
                  style={{ padding:"22px 10px", borderRadius:14, border:`1px solid ${border}`, background:bg, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
                  <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:32, color, letterSpacing:2, lineHeight:1 }}>{label}</span>
                  <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:14, color, letterSpacing:1 }}>{pct}%</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ animation:"hiw-fadeUp 0.35s ease" }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, letterSpacing:3, color:"rgba(241,245,249,0.35)", marginBottom:14 }}>03 · COMBIEN DE MC ?</div>
            <div style={{ display:"flex", gap:6, marginBottom:16 }}>
              {[50, 100, 200, 500].map(v => (
                <button key={v} onClick={() => setAmount(v)} className="hiw-btn"
                  style={{ flex:1, padding:"12px 0", borderRadius:10, border:`1px solid ${amount===v?G:"rgba(241,245,249,0.07)"}`, background:amount===v?"rgba(16,185,129,0.1)":"rgba(241,245,249,0.02)", color:amount===v?G:"rgba(241,245,249,0.35)", fontFamily:"'Bebas Neue',sans-serif", fontSize:18, cursor:"pointer" }}>
                  {v}
                </button>
              ))}
            </div>
            <div style={{ background:"rgba(3,7,18,0.55)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:12, padding:"14px 18px", marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:11, color:"rgba(241,245,249,0.3)", letterSpacing:2 }}>MISE</span>
                <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, color:"#fbbf24", letterSpacing:1 }}>{amount} MC</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:11, color:"rgba(241,245,249,0.3)", letterSpacing:2 }}>GAIN POTENTIEL</span>
                <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, color:G, letterSpacing:1 }}>+{gain} MC</span>
              </div>
            </div>
            <button className="hiw-btn" onClick={() => setStep(3)}
              style={{ width:"100%", padding:"14px 0", borderRadius:12, border:"none", background:`linear-gradient(135deg,${G},#059669)`, color:"#fff", fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:2, cursor:"pointer", boxShadow:"0 8px 30px rgba(16,185,129,0.35)" }}>
              CONFIRMER LA PRÉDICTION →
            </button>
          </div>
        )}

        {step === 3 && (
          <div style={{ animation:"hiw-winPop 0.55s ease", textAlign:"center", padding:"14px 0" }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:52, color:G, letterSpacing:3, lineHeight:0.9, marginBottom:10 }}>PRÉDICTION<br/>PLACÉE</div>
            <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:13, color:"rgba(241,245,249,0.45)", margin:"0 0 4px" }}>
              Mise de <strong style={{color:"#fbbf24"}}>{amount} MC</strong> sur <strong style={{color:choice==="yes"?G:"#ef4444"}}>{choice==="yes"?"OUI":"NON"}</strong>
            </p>
            <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:13, color:"rgba(241,245,249,0.45)", margin:"0 0 18px" }}>
              Gain potentiel : <strong style={{color:G}}>+{gain} MC</strong>
            </p>
            <div style={{ background:"rgba(16,185,129,0.05)", border:"1px solid rgba(16,185,129,0.12)", borderRadius:10, padding:"11px 14px", marginBottom:18, fontSize:12, fontFamily:"'Barlow',sans-serif", color:"rgba(241,245,249,0.4)", lineHeight:1.6 }}>
              Les gains sont crédités automatiquement quand le résultat est connu.
            </div>
            <button className="hiw-btn" onClick={reset}
              style={{ padding:"10px 24px", borderRadius:10, border:"1px solid rgba(16,185,129,0.2)", background:"transparent", color:G, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:13, letterSpacing:1, cursor:"pointer" }}>
              REJOUER LA DÉMO
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── FAQ ────────────────────────────────────────────────────────────────── */
function FAQItem({ q, a, index }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="hiw-faq" onClick={() => setOpen(!open)}
      style={{ borderTop:"none", borderRight:"none", borderBottom:"1px solid rgba(241,245,249,0.06)", borderLeft:`3px solid ${open?"#10b981":"rgba(241,245,249,0.07)"}`, background:open?"rgba(16,185,129,0.025)":"transparent", cursor:"pointer" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"15px 16px 15px 14px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:13, color:"rgba(16,185,129,0.35)", letterSpacing:1 }}>0{index+1}</span>
          <span style={{ fontFamily:"'Barlow',sans-serif", fontWeight:700, fontSize:13, color:"#f1f5f9" }}>{q}</span>
        </div>
        <div style={{ fontSize:20, color:open?"#10b981":"rgba(241,245,249,0.2)", transition:"transform 0.2s, color 0.2s", transform:open?"rotate(45deg)":"none", flexShrink:0 }}>+</div>
      </div>
      {open && (
        <div style={{ padding:"0 16px 14px 40px", animation:"hiw-fadeIn 0.22s ease" }}>
          <p style={{ margin:0, fontFamily:"'Barlow',sans-serif", fontSize:13, color:"rgba(241,245,249,0.42)", lineHeight:1.7 }}>{a}</p>
        </div>
      )}
    </div>
  );
}

function FAQList() {
  const { t } = useLang();
  const items = [
    { q:t("howto.faq1_q"), a:t("howto.faq1_a") },
    { q:t("howto.faq2_q"), a:t("howto.faq2_a") },
    { q:t("howto.faq3_q"), a:t("howto.faq3_a") },
    { q:t("howto.faq4_q"), a:t("howto.faq4_a") },
    { q:t("howto.faq5_q"), a:t("howto.faq5_a") },
  ];
  return (
    <div style={{ border:"1px solid rgba(241,245,249,0.06)", borderRadius:14, overflow:"hidden" }}>
      {items.map((item, i) => <FAQItem key={i} q={item.q} a={item.a} index={i} />)}
    </div>
  );
}

/* ─── Section Header ─────────────────────────────────────────────────────── */
function SectionHead({ label, accent }) {
  return (
    <div style={{ display:"flex", alignItems:"baseline", gap:10, marginBottom:18 }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, letterSpacing:2, color:"rgba(241,245,249,0.7)" }}>{label}</div>
      {accent && <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, letterSpacing:2, color:"#10b981" }}>{accent}</div>}
      <div style={{ flex:1, height:1, background:"rgba(241,245,249,0.06)", marginLeft:4 }} />
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function HowItWorksPage({ onNavigate }) {
  const { t } = useLang();
  const [activeStep, setActiveStep] = useState(-1);
  const [videoFrame, setVideoFrame] = useState(0);

  useEffect(() => { injectStyles(); }, []);

  const VIDEO_FRAMES = [
    { color:"#10b981", icon:"⚽", text:"MARCHÉ DE PRÉDICTION", sub:"Parie sur les transferts et matchs" },
    { color:"#3b82f6", icon:"📈", text:"COTES DYNAMIQUES",    sub:"Comme une vraie bourse football" },
    { color:"#f59e0b", icon:"🏆", text:"GAGNE DES RÉCOMPENSES", sub:"Maillots, places VIP, cartes cadeaux" },
    { color:"#a78bfa", icon:"👑", text:"MONTE DE NIVEAU",     sub:"Rookie → Scout → Analyst → Pro → Legend" },
    { color:"#f59e0b", icon:"💎", text:"3 FORMULES",          sub:"Starter gratuit · Pro 4.99€ · Elite 14.99€" },
    { color:"#5865f2", icon:"🌐", text:"COMMUNAUTÉ",          sub:"News, analyses et marchés proposés" },
  ];

  useEffect(() => {
    const id = setInterval(() => setVideoFrame(f => (f + 1) % VIDEO_FRAMES.length), 2800);
    return () => clearInterval(id);
  }, []);

  const STEPS = [
    { icon:"🎁", title:t("howto.step1_title"), color:"#10b981", desc:t("howto.step1_desc"), detail:t("howto.step1_detail") },
    { icon:"📊", title:t("howto.step2_title"), color:"#3b82f6", desc:t("howto.step2_desc"), detail:t("howto.step2_detail") },
    { icon:"⚽", title:t("howto.step3_title"), color:"#f59e0b", desc:t("howto.step3_desc"), detail:t("howto.step3_detail") },
    { icon:"👑", title:t("howto.step4_title"), color:"#f59e0b", desc:t("howto.step4_desc"), detail:t("howto.step4_detail") },
    { icon:"🏆", title:t("howto.step5_title"), color:"#a78bfa", desc:t("howto.step5_desc"), detail:t("howto.step5_detail") },
    { icon:"💎", title:t("howto.step6_title"), color:"#34d399", desc:t("howto.step6_desc"), detail:t("howto.step6_detail") },
    { icon:"🎡", title:t("howto.step7_title"), color:"#ec4899", desc:t("howto.step7_desc"), detail:t("howto.step7_detail") },
    { icon:"🌐", title:t("howto.step8_title"), color:"#5865f2", desc:null, discordLink:true, detail:t("howto.step8_detail") },
  ];

  const STATS = [
    { num:"100%", label:"GRATUIT\nPOUR DÉMARRER" },
    { num:"AMM",  label:"COTES AUTO-\nAJUSTÉES" },
    { num:"3",    label:"TYPES DE\nMARCHÉS" },
    { num:"0€",   label:"ARGENT RÉEL\nEN JEU" },
  ];

  const G = "#10b981";
  const frame = VIDEO_FRAMES[videoFrame];

  return (
    <div className="page-enter" style={{ paddingBottom:48 }}>

      {/* ── HERO ── Nike / Juventus editorial diagonal ─────────────────── */}
      <div style={{ position:"relative", marginBottom:24, borderRadius:20, overflow:"hidden", minHeight:240 }}>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(160deg,#050d15,#030712 60%)" }} />
        {/* Diagonal green slash */}
        <div style={{ position:"absolute", top:0, right:"-8%", width:"52%", height:"100%", background:`linear-gradient(150deg,${G}18,rgba(16,185,129,0.04))`, clipPath:"polygon(18% 0,100% 0,100% 100%,0 100%)", zIndex:1 }} />
        <div style={{ position:"absolute", top:0, right:"24%", width:2, height:"100%", background:`linear-gradient(180deg,transparent,${G}55,transparent)`, zIndex:2 }} />
        {/* Scan line */}
        <div style={{ position:"absolute", left:0, right:0, height:1, background:`linear-gradient(90deg,transparent 10%,${G}80,transparent 90%)`, animation:"hiw-scan 5s linear infinite", zIndex:3, opacity:0.35 }} />

        <div style={{ position:"relative", zIndex:4, padding:"36px 22px 30px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
            <div style={{ width:28, height:1, background:G }} />
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, color:G, letterSpacing:3.5 }}>MARKETBALL · GUIDE</span>
          </div>

          <div style={{ fontFamily:"'Bebas Neue',sans-serif", lineHeight:0.88, letterSpacing:2, marginBottom:16 }}>
            <div style={{ fontSize:"clamp(54px,15vw,90px)", color:"#f1f5f9" }}>COMMENT</div>
            <div style={{ fontSize:"clamp(54px,15vw,90px)" }}>
              <span style={{ color:G }}>ÇA</span>
              <span style={{ color:"#f1f5f9" }}> MARCHE</span>
              <span style={{ color:G }}>?</span>
            </div>
          </div>

          <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:14, color:"rgba(241,245,249,0.4)", margin:"0 0 22px", maxWidth:300, lineHeight:1.6 }}>
            {t("howto.subtitle")}
          </p>

          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <button className="hiw-btn" onClick={() => onNavigate("home")}
              style={{ padding:"11px 24px", borderRadius:10, border:"none", background:G, color:"#030712", fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:1.5, cursor:"pointer" }}>
              JOUER MAINTENANT
            </button>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:11, color:"rgba(241,245,249,0.25)", letterSpacing:1 }}>↓ SCROLL</span>
          </div>
        </div>
      </div>

      {/* ── NBA STAT CARDS ─────────────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10, marginBottom:24 }}>
        {STATS.map((s, i) => (
          <div key={i} className="hiw-stat"
            style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.07)", borderRadius:14, padding:"18px 16px", position:"relative", overflow:"hidden" }}>
            {/* Ghost number */}
            <div style={{ position:"absolute", bottom:-10, right:-6, fontFamily:"'Bebas Neue',sans-serif", fontSize:68, color:"rgba(16,185,129,0.04)", letterSpacing:-2, lineHeight:1, userSelect:"none", pointerEvents:"none" }}>
              {s.num}
            </div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:40, color:G, letterSpacing:0, lineHeight:1 }}>{s.num}</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, color:"rgba(241,245,249,0.3)", letterSpacing:1.5, lineHeight:1.45, marginTop:7, whiteSpace:"pre-line" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── FEATURE CAROUSEL — Juventus / editorial ────────────────────── */}
      <div style={{ marginBottom:24, borderRadius:18, overflow:"hidden", border:"1px solid rgba(241,245,249,0.06)" }}>
        <div style={{ position:"relative", minHeight:196, display:"flex", flexDirection:"column", justifyContent:"flex-end", overflow:"hidden" }}>
          <div style={{ position:"absolute", inset:0, background:"#030c14" }} />
          <div style={{ position:"absolute", inset:0, background:`linear-gradient(140deg,${frame.color}1a,transparent 65%)`, transition:"background 0.9s ease" }} />
          {/* Ghost icon */}
          <div style={{ position:"absolute", top:"50%", right:"4%", transform:"translateY(-50%)", fontFamily:"'Bebas Neue',sans-serif", fontSize:110, color:`${frame.color}10`, lineHeight:1, userSelect:"none", pointerEvents:"none", transition:"color 0.9s ease" }}>
            {frame.icon}
          </div>
          {/* Bottom accent */}
          <div style={{ position:"absolute", bottom:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${frame.color},transparent 70%)`, transition:"background 0.9s ease" }} />

          <div style={{ position:"relative", zIndex:2, padding:"22px 22px 20px" }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, letterSpacing:3, color:frame.color, marginBottom:8, transition:"color 0.6s" }}>
              MARKETBALL FEATURE
            </div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:34, letterSpacing:2, color:"#f1f5f9", lineHeight:1, marginBottom:7 }}>
              {frame.text}
            </div>
            <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:13, color:"rgba(241,245,249,0.42)" }}>{frame.sub}</div>
          </div>
        </div>

        {/* Dot nav */}
        <div style={{ display:"flex", alignItems:"center", gap:5, padding:"10px 16px", background:"rgba(241,245,249,0.015)", borderTop:"1px solid rgba(241,245,249,0.05)" }}>
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, color:"rgba(241,245,249,0.18)", letterSpacing:1.5, marginRight:4 }}>
            {String(videoFrame+1).padStart(2,"0")}/{VIDEO_FRAMES.length}
          </span>
          {VIDEO_FRAMES.map((_, i) => (
            <button key={i} className="hiw-dot" onClick={() => setVideoFrame(i)}
              style={{ width:i===videoFrame?22:6, height:6, borderRadius:99, background:i===videoFrame?G:"rgba(241,245,249,0.1)" }} />
          ))}
        </div>
      </div>

      {/* ── SIMULATOR ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom:24 }}>
        <SectionHead label="ESSAIE" accent="PAR TOI-MÊME" />
        <BetSimulator />
      </div>

      {/* ── STEPS — Crypto platform numbered style ─────────────────────── */}
      <div style={{ marginBottom:24 }}>
        <SectionHead label="LES" accent="ÉTAPES" />
        <div style={{ border:"1px solid rgba(241,245,249,0.06)", borderRadius:14, overflow:"hidden" }}>
          {STEPS.map((step, i) => (
            <div key={i} className="hiw-step"
              style={{ background:activeStep===i?"rgba(16,185,129,0.03)":"transparent", cursor:"pointer", borderBottom:i<STEPS.length-1?"1px solid rgba(241,245,249,0.06)":"none", position:"relative", overflow:"hidden" }}
              onClick={() => setActiveStep(activeStep===i?-1:i)}>
              {/* Active left accent */}
              {activeStep === i && <div style={{ position:"absolute", left:0, top:0, bottom:0, width:3, background:step.color }} />}

              <div style={{ display:"flex", alignItems:"center", padding:"15px 0" }}>
                {/* Step number */}
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:34, color:activeStep===i?step.color:"rgba(241,245,249,0.09)", letterSpacing:0, lineHeight:1, width:60, textAlign:"right", paddingRight:12, flexShrink:0, transition:"color 0.22s" }}>
                  {String(i+1).padStart(2,"0")}
                </div>
                {/* Vertical rule */}
                <div style={{ width:1, height:34, background:"rgba(241,245,249,0.07)", flexShrink:0 }} />
                {/* Text */}
                <div style={{ flex:1, paddingLeft:14, paddingRight:12 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:2 }}>
                    <span style={{ fontSize:15 }}>{step.icon}</span>
                    <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:1.5, color:activeStep===i?"#f1f5f9":"rgba(241,245,249,0.65)" }}>{step.title}</span>
                  </div>
                  {step.desc && <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:12, color:"rgba(241,245,249,0.3)" }}>{step.desc}</div>}
                  {step.discordLink && (
                    <a href="https://discord.gg/marketball" target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:12, color:"#5865f2", display:"inline-flex", alignItems:"center", gap:4, textDecoration:"none" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="#5865f2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                      Rejoindre le Discord →
                    </a>
                  )}
                </div>
                <div style={{ fontSize:16, color:activeStep===i?G:"rgba(241,245,249,0.18)", paddingRight:16, flexShrink:0, transition:"color 0.2s", fontWeight:300 }}>
                  {activeStep === i ? "−" : "+"}
                </div>
              </div>

              {activeStep === i && (
                <div style={{ paddingLeft:74, paddingRight:20, paddingBottom:16, animation:"hiw-fadeIn 0.22s ease" }}>
                  <p style={{ margin:0, fontFamily:"'Barlow',sans-serif", fontSize:13, color:"rgba(241,245,249,0.45)", lineHeight:1.75, borderLeft:`2px solid ${step.color}35`, paddingLeft:12 }}>
                    {step.detail}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <div style={{ marginBottom:28 }}>
        <SectionHead label="FAQ" />
        <FAQList />
      </div>

      {/* ── CTA — Nike diagonal banner ─────────────────────────────────── */}
      <div style={{ borderRadius:20, overflow:"hidden", position:"relative", minHeight:180 }}>
        <div style={{ position:"absolute", inset:0, background:`linear-gradient(135deg,${G},#059669 60%,#047857)` }} />
        {/* Diagonal dark slice */}
        <div style={{ position:"absolute", top:0, right:"-5%", width:"48%", height:"100%", background:"rgba(3,7,18,0.18)", clipPath:"polygon(22% 0,100% 0,100% 100%,0 100%)" }} />
        {/* Ghost letters */}
        <div style={{ position:"absolute", bottom:-18, right:14, fontFamily:"'Bebas Neue',sans-serif", fontSize:130, color:"rgba(3,7,18,0.1)", lineHeight:1, userSelect:"none", pointerEvents:"none", letterSpacing:-4 }}>MB</div>

        <div style={{ position:"relative", zIndex:1, padding:"32px 24px" }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, letterSpacing:3.5, color:"rgba(3,7,18,0.5)", marginBottom:8 }}>PRÊT À JOUER ?</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:40, letterSpacing:2, color:"#030712", lineHeight:1, marginBottom:8 }}>
            {t("howto.cta_title")}
          </div>
          <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:13, color:"rgba(3,7,18,0.5)", margin:"0 0 22px", maxWidth:280, lineHeight:1.55 }}>
            {t("howto.cta_sub")}
          </p>
          <button className="hiw-btn" onClick={() => onNavigate("home")}
            style={{ padding:"13px 28px", borderRadius:10, border:"2px solid rgba(3,7,18,0.18)", background:"#030712", color:G, fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:2, cursor:"pointer", boxShadow:"0 10px 32px rgba(3,7,18,0.3)" }}>
            {t("howto.cta_btn")} →
          </button>
        </div>
      </div>
    </div>
  );
}
