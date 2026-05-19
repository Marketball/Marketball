import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLang } from "../lib/i18n.jsx";
import { AMM } from "../lib/amm.js";

gsap.registerPlugin(ScrollTrigger);

/* ─── Styles ────────────────────────────────────────────────────────────── */
function injectStyles() {
  if (document.getElementById("hiw-styles")) return;
  const s = document.createElement("style");
  s.id = "hiw-styles";
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400&family=Barlow+Condensed:wght@300;400;600;700;900&display=swap');

    @keyframes hiw-pulse    { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(1.7)} }
    @keyframes hiw-winPop   { 0%{transform:scale(0.6);opacity:0} 65%{transform:scale(1.06)} 100%{transform:scale(1);opacity:1} }
    @keyframes hiw-fadeUp   { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
    @keyframes hiw-fadeIn   { from{opacity:0} to{opacity:1} }
    @keyframes hiw-scan     { 0%{top:0%} 100%{top:100%} }
    @keyframes hiw-ticker   { from{transform:translateX(0)} to{transform:translateX(-50%)} }
    @keyframes hiw-floatA   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
    @keyframes hiw-floatB   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
    @keyframes hiw-chartDraw { from{clip-path:polygon(0 100%,0 100%,0 100%,0 100%,0 100%,0 100%,0 100%)} to{clip-path:polygon(0 100%,0 68%,16% 55%,30% 42%,47% 28%,65% 35%,80% 18%,100% 8%,100% 100%)} }
    @keyframes hiw-greenBar { from{height:0%} to{height:65%} }
    @keyframes hiw-blinkDot { 0%,100%{opacity:1} 45%,55%{opacity:0} }
    @keyframes hiw-scaleIn  { from{transform:scaleY(0);opacity:0} to{transform:scaleY(1);opacity:1} }

    .hiw-btn       { transition: transform 0.15s ease, filter 0.15s ease; }
    .hiw-btn:hover { transform: translateY(-2px) !important; filter: brightness(1.12); }
    .hiw-stat      { transition: transform 0.25s ease, border-color 0.25s ease; }
    .hiw-stat:hover{ transform: translateY(-5px) !important; border-color: rgba(16,185,129,0.4) !important; }
    .hiw-faq       { transition: background 0.18s; cursor: pointer; }
    .hiw-faq:hover { background: rgba(16,185,129,0.025) !important; }
    .hiw-dot       { transition: width 0.3s ease, background 0.3s ease; border:none; cursor:pointer; padding:0; }
    .hiw-step-row  { transition: background 0.2s; cursor: pointer; }
    .hiw-step-row:hover { background: rgba(16,185,129,0.025) !important; }
    .hiw-float-a   { animation: hiw-floatA 4s ease-in-out infinite; }
    .hiw-float-b   { animation: hiw-floatB 3.5s ease-in-out infinite 0.7s; }
    .hiw-blink     { animation: hiw-blinkDot 1.2s ease infinite; }
  `;
  document.head.appendChild(s);
}

/* ─── BetSimulator ─────────────────────────────────────────────────────── */
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
  const LABELS = ["Marché","Position","Mise","Validé"];

  return (
    <div style={{ background:"rgba(16,185,129,0.03)", border:"1px solid rgba(16,185,129,0.14)", borderRadius:18, overflow:"hidden" }}>
      <div style={{ padding:"13px 18px", borderBottom:"1px solid rgba(16,185,129,0.08)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
          <div className="hiw-blink" style={{ width:6, height:6, borderRadius:"50%", background:G }} />
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, letterSpacing:2.5, color:G }}>SIMULATION LIVE</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:3 }}>
          {LABELS.map((l, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:2 }}>
              <div style={{ width:20, height:20, borderRadius:"50%", background:i<step?G:i===step?"rgba(16,185,129,0.15)":"rgba(241,245,249,0.04)", border:`1px solid ${i<=step?G:"rgba(241,245,249,0.08)"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                {i < step
                  ? <span style={{ fontSize:9, color:"#030712", fontWeight:900 }}>✓</span>
                  : <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:8, fontWeight:700, color:i===step?G:"rgba(241,245,249,0.2)" }}>{i+1}</span>}
              </div>
              {i < 3 && <div style={{ width:10, height:1, background:i<step?G:"rgba(241,245,249,0.06)" }} />}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:"20px 18px" }}>
        {step === 0 && (
          <div style={{ animation:"hiw-fadeUp 0.3s ease" }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, letterSpacing:3, color:"rgba(241,245,249,0.3)", marginBottom:12 }}>01 · CHOISIS UN MARCHÉ</div>
            <div onClick={() => setStep(1)} style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(16,185,129,0.16)", borderRadius:12, padding:14, cursor:"pointer", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${G},transparent)` }} />
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:9, letterSpacing:3, color:"#f59e0b", marginBottom:7 }}>⚽ CHAMPIONS LEAGUE</div>
              <div style={{ fontFamily:"'Barlow',sans-serif", fontWeight:900, fontSize:14, color:"#f1f5f9", marginBottom:10 }}>PSG remporte la Champions League ?</div>
              <div style={{ display:"flex", gap:5, marginBottom:6 }}>
                <div style={{ flex:pYes, height:4, borderRadius:"4px 0 0 4px", background:`linear-gradient(90deg,${G},#34d399)` }} />
                <div style={{ flex:100-pYes, height:4, borderRadius:"0 4px 4px 0", background:"rgba(239,68,68,0.3)" }} />
              </div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:11, color:G }}>OUI {pYes}%</span>
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:11, color:"#ef4444" }}>NON {100-pYes}%</span>
              </div>
              <div style={{ marginTop:10, textAlign:"right", fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:11, letterSpacing:1, color:G }}>PARIER →</div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={{ animation:"hiw-fadeUp 0.3s ease" }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, letterSpacing:3, color:"rgba(241,245,249,0.3)", marginBottom:8 }}>02 · PRENDS POSITION</div>
            <div style={{ fontFamily:"'Barlow',sans-serif", fontStyle:"italic", fontSize:12, color:"rgba(241,245,249,0.35)", marginBottom:14 }}>"PSG remporte la Champions League ?"</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {[
                { s:"yes", label:"OUI", pct:pYes, color:G, border:"rgba(16,185,129,0.28)", bg:"rgba(16,185,129,0.06)" },
                { s:"no", label:"NON", pct:100-pYes, color:"#ef4444", border:"rgba(239,68,68,0.28)", bg:"rgba(239,68,68,0.06)" },
              ].map(({ s, label, pct, color, border, bg }) => (
                <button key={s} className="hiw-btn" onClick={() => { setChoice(s); setStep(2); }}
                  style={{ padding:"20px 8px", borderRadius:12, border:`1px solid ${border}`, background:bg, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                  <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, color, letterSpacing:2, lineHeight:1 }}>{label}</span>
                  <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:13, color, letterSpacing:1 }}>{pct}%</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ animation:"hiw-fadeUp 0.3s ease" }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, letterSpacing:3, color:"rgba(241,245,249,0.3)", marginBottom:12 }}>03 · COMBIEN DE MC ?</div>
            <div style={{ display:"flex", gap:5, marginBottom:14 }}>
              {[50, 100, 200, 500].map(v => (
                <button key={v} onClick={() => setAmount(v)} className="hiw-btn"
                  style={{ flex:1, padding:"11px 0", borderRadius:9, border:`1px solid ${amount===v?G:"rgba(241,245,249,0.06)"}`, background:amount===v?"rgba(16,185,129,0.09)":"rgba(241,245,249,0.02)", color:amount===v?G:"rgba(241,245,249,0.28)", fontFamily:"'Bebas Neue',sans-serif", fontSize:17, cursor:"pointer" }}>
                  {v}
                </button>
              ))}
            </div>
            <div style={{ background:"rgba(3,7,18,0.5)", border:"1px solid rgba(241,245,249,0.05)", borderRadius:10, padding:"12px 16px", marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, color:"rgba(241,245,249,0.25)", letterSpacing:2 }}>MISE</span>
                <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:"#fbbf24", letterSpacing:1 }}>{amount} MC</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, color:"rgba(241,245,249,0.25)", letterSpacing:2 }}>GAIN POTENTIEL</span>
                <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:G, letterSpacing:1 }}>+{gain} MC</span>
              </div>
            </div>
            <button className="hiw-btn" onClick={() => setStep(3)}
              style={{ width:"100%", padding:"13px 0", borderRadius:10, border:"none", background:`linear-gradient(135deg,${G},#059669)`, color:"#fff", fontFamily:"'Bebas Neue',sans-serif", fontSize:17, letterSpacing:2, cursor:"pointer", boxShadow:"0 6px 24px rgba(16,185,129,0.3)" }}>
              CONFIRMER LA PRÉDICTION →
            </button>
          </div>
        )}

        {step === 3 && (
          <div style={{ animation:"hiw-winPop 0.5s ease", textAlign:"center", padding:"12px 0" }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:48, color:G, letterSpacing:3, lineHeight:0.9, marginBottom:10 }}>PRÉDICTION<br/>PLACÉE</div>
            <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:12, color:"rgba(241,245,249,0.4)", margin:"0 0 3px" }}>
              Mise de <strong style={{color:"#fbbf24"}}>{amount} MC</strong> sur <strong style={{color:choice==="yes"?G:"#ef4444"}}>{choice==="yes"?"OUI":"NON"}</strong>
            </p>
            <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:12, color:"rgba(241,245,249,0.4)", margin:"0 0 16px" }}>
              Gain potentiel : <strong style={{color:G}}>+{gain} MC</strong>
            </p>
            <div style={{ background:"rgba(16,185,129,0.04)", border:"1px solid rgba(16,185,129,0.1)", borderRadius:9, padding:"10px 12px", marginBottom:16, fontSize:11, fontFamily:"'Barlow',sans-serif", color:"rgba(241,245,249,0.35)", lineHeight:1.7 }}>
              Les gains sont crédités automatiquement quand le résultat est connu.
            </div>
            <button className="hiw-btn" onClick={reset}
              style={{ padding:"9px 22px", borderRadius:9, border:"1px solid rgba(16,185,129,0.18)", background:"transparent", color:G, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:12, letterSpacing:1, cursor:"pointer" }}>
              REJOUER LA DÉMO
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── FAQ ───────────────────────────────────────────────────────────────── */
function FAQItem({ q, a, index }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="hiw-faq" onClick={() => setOpen(!open)}
      style={{ borderBottom:"1px solid rgba(241,245,249,0.05)", borderLeft:`2px solid ${open?"#10b981":"rgba(241,245,249,0.06)"}`, background:open?"rgba(16,185,129,0.02)":"transparent", transition:"border-color 0.2s,background 0.2s" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 14px 14px 12px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:12, color:"rgba(16,185,129,0.3)", letterSpacing:1 }}>0{index+1}</span>
          <span style={{ fontFamily:"'Barlow',sans-serif", fontWeight:700, fontSize:13, color:"#f1f5f9" }}>{q}</span>
        </div>
        <div style={{ fontSize:18, color:open?"#10b981":"rgba(241,245,249,0.18)", transition:"transform 0.2s,color 0.2s", transform:open?"rotate(45deg)":"none", flexShrink:0, marginLeft:8 }}>+</div>
      </div>
      {open && (
        <div style={{ padding:"0 14px 12px 36px", animation:"hiw-fadeIn 0.2s ease" }}>
          <p style={{ margin:0, fontFamily:"'Barlow',sans-serif", fontSize:12, color:"rgba(241,245,249,0.4)", lineHeight:1.75 }}>{a}</p>
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
    <div style={{ border:"1px solid rgba(241,245,249,0.05)", borderRadius:14, overflow:"hidden" }}>
      {items.map((item, i) => <FAQItem key={i} q={item.q} a={item.a} index={i} />)}
    </div>
  );
}

/* ─── Live Market Visual ────────────────────────────────────────────────── */
function LiveMarketCard() {
  const G = "#10b981";
  const BAR_HEIGHTS = [32, 48, 28, 58, 40, 72, 55, 80, 65, 90];
  return (
    <div style={{ background:"#060e1a", border:"1px solid rgba(16,185,129,0.12)", borderRadius:18, overflow:"hidden", position:"relative" }}>
      {/* Top bar */}
      <div style={{ padding:"12px 16px", borderBottom:"1px solid rgba(16,185,129,0.07)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
          <div className="hiw-blink" style={{ width:5, height:5, borderRadius:"50%", background:G }} />
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:9, letterSpacing:3, color:"rgba(16,185,129,0.6)" }}>MARCHÉ LIVE · AMM</span>
        </div>
        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:9, letterSpacing:1, color:"rgba(241,245,249,0.2)" }}>PSG CL 2025</span>
      </div>

      <div style={{ padding:"14px 16px 0" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:6 }}>
          <div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:9, letterSpacing:2, color:"rgba(241,245,249,0.3)", marginBottom:2 }}>PROBABILITÉ OUI</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:40, color:G, letterSpacing:1, lineHeight:1 }}>65<span style={{ fontSize:22, opacity:0.6 }}>%</span></div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:9, letterSpacing:1, color:"rgba(241,245,249,0.2)", marginBottom:2 }}>GAIN SI OUI</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, color:"#fbbf24", letterSpacing:1, lineHeight:1 }}>× 1.54</div>
          </div>
        </div>

        {/* Animated chart */}
        <div style={{ position:"relative", height:72, marginBottom:0 }}>
          {/* Grid lines */}
          {[0,33,66,100].map(pct => (
            <div key={pct} style={{ position:"absolute", left:0, right:0, top:`${100-pct}%`, height:1, background:"rgba(241,245,249,0.03)" }} />
          ))}
          {/* SVG area chart */}
          <svg width="100%" height="72" preserveAspectRatio="none" style={{ display:"block" }}>
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.3"/>
                <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
              </linearGradient>
            </defs>
            <path
              d="M0,72 L0,49 L12,40 L22,30 L35,20 L47,25 L58,13 L70,18 L82,6 L92,10 L100%,5 L100%,72 Z"
              fill="url(#chartGrad)"
              style={{ animation:"hiw-chartDraw 1.8s cubic-bezier(0.4,0,0.2,1) forwards" }}
            />
            <path
              d="M0,49 L12,40 L22,30 L35,20 L47,25 L58,13 L70,18 L82,6 L92,10"
              fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round"
              style={{ animation:"hiw-chartDraw 1.8s cubic-bezier(0.4,0,0.2,1) forwards" }}
            />
          </svg>
          {/* Dot at end */}
          <div style={{ position:"absolute", right:2, top:5, width:6, height:6, borderRadius:"50%", background:G, boxShadow:`0 0 10px ${G}` }} />
        </div>

        {/* Bar chart section */}
        <div style={{ borderTop:"1px solid rgba(241,245,249,0.04)", paddingTop:10, paddingBottom:12, display:"flex", alignItems:"flex-end", gap:3, height:60 }}>
          {BAR_HEIGHTS.map((h, i) => (
            <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
              <div style={{
                background:i===BAR_HEIGHTS.length-1?G:i>6?"rgba(16,185,129,0.25)":"rgba(241,245,249,0.06)",
                borderRadius:"2px 2px 0 0",
                height:`${h}%`,
                transformOrigin:"bottom",
                animation:`hiw-scaleIn 0.4s ease ${i*0.05}s both`,
              }} />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom: trade buttons */}
      <div style={{ display:"flex", borderTop:"1px solid rgba(241,245,129,0.05)" }}>
        <div style={{ flex:1, padding:"10px 0", textAlign:"center", borderRight:"1px solid rgba(241,245,129,0.05)", background:"rgba(16,185,129,0.05)" }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, color:G, letterSpacing:1 }}>OUI</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, fontWeight:700, color:"rgba(16,185,129,0.4)", letterSpacing:1 }}>65%</div>
        </div>
        <div style={{ flex:1, padding:"10px 0", textAlign:"center", background:"rgba(239,68,68,0.04)" }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, color:"#ef4444", letterSpacing:1 }}>NON</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, fontWeight:700, color:"rgba(239,68,68,0.4)", letterSpacing:1 }}>35%</div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────────── */
export default function HowItWorksPage({ onNavigate }) {
  const { t } = useLang();
  const [activeStep, setActiveStep]   = useState(-1);
  const [videoFrame, setVideoFrame]   = useState(0);

  const heroRef   = useRef(null);
  const statsRef  = useRef(null);
  const stepsRef  = useRef(null);
  const faqRef    = useRef(null);
  const ctaRef    = useRef(null);

  useEffect(() => { injectStyles(); }, []);

  /* GSAP animations */
  useEffect(() => {
    const ctx = gsap.context(() => {

      /* Hero: stagger title lines on mount */
      gsap.fromTo(".hiw-hero-line",
        { opacity: 0, y: 60 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.1, delay: 0.1 }
      );
      gsap.fromTo(".hiw-hero-sub",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", delay: 0.5 }
      );

      /* Stats: slide up on scroll */
      gsap.fromTo(".hiw-stat",
        { opacity: 0, y: 36 },
        { opacity: 1, y: 0, duration: 0.55, ease: "power2.out", stagger: 0.1,
          scrollTrigger: { trigger: statsRef.current, start: "top 88%", once: true } }
      );

      /* Steps: slide in from left on scroll */
      gsap.fromTo(".hiw-step-row",
        { opacity: 0, x: -28 },
        { opacity: 1, x: 0, duration: 0.45, ease: "power2.out", stagger: 0.07,
          scrollTrigger: { trigger: stepsRef.current, start: "top 88%", once: true } }
      );

      /* FAQ: fade up on scroll */
      gsap.fromTo(".hiw-faq",
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power2.out", stagger: 0.08,
          scrollTrigger: { trigger: faqRef.current, start: "top 88%", once: true } }
      );

      /* CTA: scale up */
      gsap.fromTo(ctaRef.current,
        { opacity: 0, scale: 0.97 },
        { opacity: 1, scale: 1, duration: 0.55, ease: "power2.out",
          scrollTrigger: { trigger: ctaRef.current, start: "top 90%", once: true } }
      );

    });
    return () => ctx.revert();
  }, []);

  const VIDEO_FRAMES = [
    { color:"#10b981", icon:"⚽", text:"MARCHÉS DE PRÉDICTION", sub:"Parie sur les transferts et matchs" },
    { color:"#3b82f6", icon:"📈", text:"COTES DYNAMIQUES",    sub:"Comme une vraie bourse football" },
    { color:"#f59e0b", icon:"🏆", text:"GAGNE DES RÉCOMPENSES", sub:"Maillots, places VIP, cartes cadeaux" },
    { color:"#a78bfa", icon:"👑", text:"MONTE DE NIVEAU",     sub:"Rookie → Scout → Analyst → Pro → Legend" },
    { color:"#f59e0b", icon:"💎", text:"3 FORMULES",          sub:"Starter gratuit · Pro 4.99€ · Elite 14.99€" },
    { color:"#5865f2", icon:"🌐", text:"COMMUNAUTÉ",          sub:"News, analyses et marchés proposés" },
  ];
  useEffect(() => {
    const id = setInterval(() => setVideoFrame(f => (f+1) % VIDEO_FRAMES.length), 3000);
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

  const TICKER_ITEMS = ["MARCHÉS PRÉDICTION","COTES DYNAMIQUES","PARIS MATCHS","BUTEURS","SCORE EXACT","OVER/UNDER","STORECOIN REWARDS","CASHOUT PRO","CLASSEMENT HEBDO","BADGES & NIVEAUX"];

  const G = "#10b981";
  const frame = VIDEO_FRAMES[videoFrame];

  return (
    <div className="page-enter" style={{ paddingBottom:48 }}>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <div ref={heroRef} style={{ position:"relative", borderRadius:22, overflow:"hidden", marginBottom:18, minHeight:300 }}>
        {/* BG layers */}
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(160deg,#070f1c 0%,#030712 60%)" }} />
        <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(rgba(16,185,129,0.07) 1px,transparent 1px)", backgroundSize:"22px 22px" }} />
        {/* Diagonal band */}
        <div style={{ position:"absolute", top:0, right:"-6%", width:"55%", height:"100%", background:"linear-gradient(140deg,rgba(16,185,129,0.09),rgba(16,185,129,0.02))", clipPath:"polygon(22% 0,100% 0,100% 100%,0 100%)" }} />
        {/* Scan line */}
        <div style={{ position:"absolute", left:0, right:0, height:1, background:`linear-gradient(90deg,transparent 5%,${G}70,transparent 95%)`, animation:"hiw-scan 7s linear infinite", opacity:0.4, zIndex:2 }} />

        {/* Floating decorative cards — top right */}
        <div style={{ position:"absolute", top:22, right:14, zIndex:3, display:"flex", flexDirection:"column", gap:7 }}>
          <div className="hiw-float-a" style={{ background:"rgba(3,7,18,0.65)", border:"1px solid rgba(16,185,129,0.18)", borderRadius:10, padding:"8px 12px", backdropFilter:"blur(8px)" }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:8, fontWeight:700, letterSpacing:2, color:"rgba(16,185,129,0.5)", marginBottom:2 }}>MARCHÉ</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:19, color:G, letterSpacing:1, lineHeight:1 }}>+240 MC</div>
          </div>
          <div className="hiw-float-b" style={{ background:"rgba(3,7,18,0.65)", border:"1px solid rgba(59,130,246,0.15)", borderRadius:10, padding:"8px 12px", backdropFilter:"blur(8px)" }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:8, fontWeight:700, letterSpacing:2, color:"rgba(59,130,246,0.5)", marginBottom:2 }}>COTE LIVE</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:19, color:"#3b82f6", letterSpacing:1, lineHeight:1 }}>× 2.4</div>
          </div>
        </div>

        {/* Content */}
        <div style={{ position:"relative", zIndex:4, padding:"40px 22px 32px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:14 }}>
            <div className="hiw-blink" style={{ width:6, height:6, borderRadius:"50%", background:G }} />
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:9, color:"rgba(16,185,129,0.65)", letterSpacing:4 }}>MARKETBALL · GUIDE COMPLET</span>
          </div>

          {/* Large title — each line animated by GSAP */}
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", letterSpacing:2, lineHeight:0.86, marginBottom:18 }}>
            <div className="hiw-hero-line" style={{ fontSize:"clamp(58px,16vw,100px)", color:"#f1f5f9", opacity:0 }}>COMMENT</div>
            <div className="hiw-hero-line" style={{ fontSize:"clamp(58px,16vw,100px)", opacity:0 }}>
              <span style={{ color:G }}>ÇA</span>
              <span style={{ color:"rgba(241,245,249,0.12)", WebkitTextStroke:"1px rgba(241,245,249,0.18)" }}> MARCHE</span>
            </div>
            <div className="hiw-hero-line" style={{ fontSize:"clamp(58px,16vw,100px)", color:"#f1f5f9", opacity:0 }}>?</div>
          </div>

          <p className="hiw-hero-sub" style={{ fontFamily:"'Barlow',sans-serif", fontSize:13, color:"rgba(241,245,249,0.38)", margin:"0 0 24px", maxWidth:240, lineHeight:1.65, opacity:0 }}>
            {t("howto.subtitle")}
          </p>

          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <button className="hiw-btn" onClick={() => onNavigate("home")}
              style={{ padding:"11px 26px", borderRadius:9, border:"none", background:G, color:"#030712", fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:2, cursor:"pointer" }}>
              JOUER MAINTENANT
            </button>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:10, color:"rgba(241,245,249,0.18)", letterSpacing:1 }}>↓ SCROLL</span>
          </div>
        </div>
      </div>

      {/* ── TICKER STRIP ─────────────────────────────────────────────────── */}
      <div style={{ overflow:"hidden", marginBottom:18, borderTop:"1px solid rgba(16,185,129,0.08)", borderBottom:"1px solid rgba(16,185,129,0.08)", padding:"8px 0", background:"rgba(16,185,129,0.02)" }}>
        <div style={{ display:"flex", whiteSpace:"nowrap", animation:"hiw-ticker 22s linear infinite" }}>
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:11, letterSpacing:3, color:"rgba(16,185,129,0.45)", paddingRight:40 }}>
              {item}
              <span style={{ marginLeft:40, color:"rgba(16,185,129,0.18)" }}>·</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── STAT CARDS ───────────────────────────────────────────────────── */}
      <div ref={statsRef} style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9, marginBottom:18 }}>
        {STATS.map((s, i) => (
          <div key={i} className="hiw-stat"
            style={{ background:"rgba(241,245,249,0.015)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:14, padding:"16px 14px", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", bottom:-8, right:-4, fontFamily:"'Bebas Neue',sans-serif", fontSize:62, color:"rgba(16,185,129,0.035)", letterSpacing:-1, lineHeight:1, userSelect:"none", pointerEvents:"none" }}>
              {s.num}
            </div>
            <div style={{ position:"absolute", left:0, top:0, bottom:0, width:2, background:`linear-gradient(180deg,${G},transparent)`, opacity:0.4 }} />
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:38, color:G, letterSpacing:0, lineHeight:1 }}>{s.num}</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:9, color:"rgba(241,245,249,0.28)", letterSpacing:1.5, lineHeight:1.5, marginTop:6, whiteSpace:"pre-line" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── LIVE MARKET VISUAL ───────────────────────────────────────────── */}
      <div style={{ marginBottom:18 }}>
        <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:14 }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:2, color:"rgba(241,245,249,0.65)" }}>MARCHÉ</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:2, color:G }}>EN DIRECT</div>
          <div style={{ flex:1, height:1, background:"rgba(241,245,249,0.05)", marginLeft:4 }} />
        </div>
        <LiveMarketCard />
      </div>

      {/* ── FEATURE CAROUSEL ─────────────────────────────────────────────── */}
      <div style={{ marginBottom:18, borderRadius:16, overflow:"hidden", border:"1px solid rgba(241,245,249,0.05)" }}>
        <div style={{ position:"relative", minHeight:188, display:"flex", flexDirection:"column", justifyContent:"flex-end", overflow:"hidden" }}>
          <div style={{ position:"absolute", inset:0, background:"#050d18" }} />
          <div style={{ position:"absolute", inset:0, background:`linear-gradient(140deg,${frame.color}18,transparent 65%)`, transition:"background 1s ease" }} />
          <div style={{ position:"absolute", top:"50%", right:"3%", transform:"translateY(-50%)", fontSize:96, opacity:0.08, lineHeight:1, userSelect:"none", pointerEvents:"none", transition:"opacity 0.6s ease" }}>
            {frame.icon}
          </div>
          <div style={{ position:"absolute", bottom:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${frame.color},transparent 65%)`, transition:"background 1s ease" }} />
          <div style={{ position:"relative", zIndex:2, padding:"20px 20px 18px" }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:9, letterSpacing:3, color:frame.color, marginBottom:7, transition:"color 0.6s" }}>MARKETBALL FEATURE</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, letterSpacing:2, color:"#f1f5f9", lineHeight:1, marginBottom:5 }}>{frame.text}</div>
            <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:12, color:"rgba(241,245,249,0.38)" }}>{frame.sub}</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:5, padding:"9px 14px", background:"rgba(241,245,249,0.01)", borderTop:"1px solid rgba(241,245,249,0.04)" }}>
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:9, color:"rgba(241,245,249,0.15)", letterSpacing:1.5, marginRight:4 }}>
            {String(videoFrame+1).padStart(2,"0")}/{VIDEO_FRAMES.length}
          </span>
          {VIDEO_FRAMES.map((_, i) => (
            <button key={i} className="hiw-dot" onClick={() => setVideoFrame(i)}
              style={{ width:i===videoFrame?20:5, height:5, borderRadius:99, background:i===videoFrame?G:"rgba(241,245,129,0.08)" }} />
          ))}
        </div>
      </div>

      {/* ── SIMULATOR ────────────────────────────────────────────────────── */}
      <div style={{ marginBottom:18 }}>
        <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:14 }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:2, color:"rgba(241,245,249,0.65)" }}>ESSAIE</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:2, color:G }}>PAR TOI-MÊME</div>
          <div style={{ flex:1, height:1, background:"rgba(241,245,249,0.05)", marginLeft:4 }} />
        </div>
        <BetSimulator />
      </div>

      {/* ── STEPS ────────────────────────────────────────────────────────── */}
      <div ref={stepsRef} style={{ marginBottom:18 }}>
        <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:14 }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:2, color:"rgba(241,245,249,0.65)" }}>LES</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:2, color:G }}>ÉTAPES</div>
          <div style={{ flex:1, height:1, background:"rgba(241,245,249,0.05)", marginLeft:4 }} />
        </div>
        <div style={{ border:"1px solid rgba(241,245,249,0.05)", borderRadius:14, overflow:"hidden" }}>
          {STEPS.map((step, i) => (
            <div key={i} className="hiw-step-row"
              style={{ background:activeStep===i?"rgba(16,185,129,0.025)":"transparent", borderBottom:i<STEPS.length-1?"1px solid rgba(241,245,249,0.05)":"none", position:"relative", overflow:"hidden" }}
              onClick={() => setActiveStep(activeStep===i?-1:i)}>
              {activeStep === i && <div style={{ position:"absolute", left:0, top:0, bottom:0, width:2, background:step.color }} />}
              <div style={{ display:"flex", alignItems:"center", padding:"13px 0" }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, color:activeStep===i?step.color:"rgba(241,245,249,0.07)", letterSpacing:0, lineHeight:1, width:54, textAlign:"right", paddingRight:10, flexShrink:0, transition:"color 0.2s" }}>
                  {String(i+1).padStart(2,"0")}
                </div>
                <div style={{ width:1, height:30, background:"rgba(241,245,249,0.06)", flexShrink:0 }} />
                <div style={{ flex:1, paddingLeft:12, paddingRight:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                    <span style={{ fontSize:13 }}>{step.icon}</span>
                    <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, letterSpacing:1.5, color:activeStep===i?"#f1f5f9":"rgba(241,245,249,0.6)" }}>{step.title}</span>
                  </div>
                  {step.desc && <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:11, color:"rgba(241,245,249,0.25)" }}>{step.desc}</div>}
                  {step.discordLink && (
                    <a href="https://discord.gg/marketball" target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:11, color:"#5865f2", display:"inline-flex", alignItems:"center", gap:3, textDecoration:"none" }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="#5865f2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                      Rejoindre le Discord →
                    </a>
                  )}
                </div>
                <div style={{ fontSize:15, color:activeStep===i?G:"rgba(241,245,249,0.15)", paddingRight:14, flexShrink:0, transition:"color 0.2s", fontWeight:300 }}>
                  {activeStep === i ? "−" : "+"}
                </div>
              </div>
              {activeStep === i && (
                <div style={{ paddingLeft:66, paddingRight:16, paddingBottom:14, animation:"hiw-fadeIn 0.2s ease" }}>
                  <p style={{ margin:0, fontFamily:"'Barlow',sans-serif", fontSize:12, color:"rgba(241,245,249,0.4)", lineHeight:1.8, borderLeft:`2px solid ${step.color}30`, paddingLeft:10 }}>
                    {step.detail}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <div ref={faqRef} style={{ marginBottom:26 }}>
        <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:14 }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:2, color:G }}>FAQ</div>
          <div style={{ flex:1, height:1, background:"rgba(241,245,249,0.05)", marginLeft:4 }} />
        </div>
        <FAQList />
      </div>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <div ref={ctaRef} style={{ borderRadius:20, overflow:"hidden", position:"relative", minHeight:190 }}>
        <div style={{ position:"absolute", inset:0, background:`linear-gradient(135deg,${G},#059669 55%,#047857)` }} />
        <div style={{ position:"absolute", top:0, right:"-4%", width:"46%", height:"100%", background:"rgba(3,7,18,0.15)", clipPath:"polygon(24% 0,100% 0,100% 100%,0 100%)" }} />
        {/* Background grid on CTA */}
        <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(rgba(3,7,18,0.12) 1px,transparent 1px)", backgroundSize:"18px 18px" }} />
        <div style={{ position:"absolute", bottom:-16, right:12, fontFamily:"'Bebas Neue',sans-serif", fontSize:120, color:"rgba(3,7,18,0.08)", lineHeight:1, userSelect:"none", pointerEvents:"none", letterSpacing:-4 }}>MB</div>

        <div style={{ position:"relative", zIndex:1, padding:"30px 22px" }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:9, letterSpacing:4, color:"rgba(3,7,18,0.45)", marginBottom:7 }}>PRÊT À JOUER ?</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:38, letterSpacing:2, color:"#030712", lineHeight:1, marginBottom:7 }}>
            {t("howto.cta_title")}
          </div>
          <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:12, color:"rgba(3,7,18,0.45)", margin:"0 0 20px", maxWidth:260, lineHeight:1.6 }}>
            {t("howto.cta_sub")}
          </p>
          <button className="hiw-btn" onClick={() => onNavigate("home")}
            style={{ padding:"12px 26px", borderRadius:9, border:"2px solid rgba(3,7,18,0.15)", background:"#030712", color:G, fontFamily:"'Bebas Neue',sans-serif", fontSize:17, letterSpacing:2, cursor:"pointer", boxShadow:"0 10px 30px rgba(3,7,18,0.25)" }}>
            {t("howto.cta_btn")} →
          </button>
        </div>
      </div>
    </div>
  );
}
