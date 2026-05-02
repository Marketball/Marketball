import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

import { STORE_ITEMS, SUBSCRIPTION_PLANS } from "../lib/constants.js";
import { getSubPlan, getSubColor, getSubEmoji, getSubLabel, getMCBoost } from "../lib/helpers.js";
import MCBadge from "../components/ui/MCBadge.jsx";
import SCBadge from "../components/ui/SCBadge.jsx";
import { useLang } from "../lib/i18n.jsx";

const MONO = "'IBM Plex Mono','Fira Mono','Courier New',monospace";

export default function StorePage({ coins, sc, profile, onRedeemSC, onSubscribe, onNavigate }) {
  const { t, lang } = useLang();
  const currentSub = getSubPlan(profile);
  const subColor = getSubColor(currentSub);
  const isEliteUser = currentSub === "elite";

  const pageRef   = useRef(null);
  const scanRef   = useRef(null);
  const headRef   = useRef(null);
  const walletRef = useRef(null);
  const orbRef    = useRef(null);
  const rowsCtx   = useRef(null);

  // ── Font injection ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (document.getElementById("ibm-plex")) return;
    const l = document.createElement("link");
    l.id = "ibm-plex";
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&display=swap";
    document.head.appendChild(l);
  }, []);

  // ── Cinema entrance ─────────────────────────────────────────────────────────
  useEffect(() => {
    const ctx = gsap.context(() => {
      // scanner line sweeps left → right
      gsap.fromTo(scanRef.current,
        { scaleX: 0, transformOrigin: "left center" },
        { scaleX: 1, duration: 1.2, ease: "power4.inOut", delay: 0.05 }
      );
      // heading rises
      gsap.fromTo(headRef.current,
        { y: 36, opacity: 0, filter: "blur(6px)" },
        { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.9, ease: "power3.out", delay: 0.35 }
      );
      // wallet badges cascade
      if (walletRef.current) {
        gsap.fromTo([...walletRef.current.children],
          { x: -24, opacity: 0 },
          { x: 0, opacity: 1, stagger: 0.09, duration: 0.55, ease: "power3.out", delay: 0.65 }
        );
      }
      // ambient orb breathe
      if (orbRef.current) {
        gsap.to(orbRef.current, {
          scale: 1.25, opacity: 0.9, duration: 4, ease: "sine.inOut", yoyo: true, repeat: -1,
        });
      }
    }, pageRef);
    return () => ctx.revert();
  }, []);

  // ── ScrollTrigger rows ──────────────────────────────────────────────────────
  useEffect(() => {
    const ctx = gsap.context(() => {
      const rows = pageRef.current?.querySelectorAll(".s-row");
      if (!rows?.length) return;
      rows.forEach((row, i) => {
        gsap.fromTo(row,
          { x: -38, opacity: 0 },
          {
            x: 0, opacity: 1, duration: 0.48, ease: "power3.out",
            delay: (i % 6) * 0.045,
            scrollTrigger: { trigger: row, start: "top 93%", once: true },
          }
        );
      });
    }, pageRef);
    rowsCtx.current = ctx;
    return () => ctx.revert();
  }, []);

  const planOrder = ["starter", "elite"];
  const userTierIdx = planOrder.indexOf(currentSub);
  const allNames = STORE_ITEMS.map(r =>
    `${r.emoji} ${lang === "en" && r.name_en ? r.name_en : r.name}`
  ).join("   ·   ");

  return (
    <div ref={pageRef} style={{ fontFamily: MONO, paddingBottom: 60, position: "relative" }}>

      {/* ── KEYFRAMES ────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes s-ticker { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes s-blink  { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>

      {/* ── AMBIENT ORB ─────────────────────────────────────────────────── */}
      <div ref={orbRef} style={{
        position:"fixed", top:"-15%", right:"-10%", width:420, height:420,
        borderRadius:"50%", pointerEvents:"none", zIndex:0,
        background:"radial-gradient(circle,rgba(16,185,129,0.055),transparent 68%)",
      }} />

      {/* ══════════════════════════════════════════════════════════════════
          HERO / MASTHEAD
      ══════════════════════════════════════════════════════════════════ */}
      <div style={{ position:"relative", zIndex:1, marginBottom:0 }}>

        {/* Scanner line */}
        <div ref={scanRef} style={{
          height:1.5, marginBottom:26,
          background:"linear-gradient(90deg,transparent,#10b981 20%,#10b981 80%,transparent)",
          boxShadow:"0 0 12px rgba(16,185,129,0.5)",
        }} />

        <div ref={headRef}>
          {/* Top row: masthead + sub pill */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18, flexWrap:"wrap", gap:12 }}>
            <div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:56, lineHeight:0.88, letterSpacing:3, color:"#f1f5f9" }}>
                MARKET<span style={{ color:"#10b981" }}>STORE</span>
              </div>
              <div style={{ fontFamily:MONO, fontSize:9, color:"rgba(241,245,249,0.28)", letterSpacing:4, marginTop:8, textTransform:"uppercase" }}>
                Season Rewards &nbsp;/&nbsp; Exchange Center
              </div>
            </div>

            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8, paddingTop:4 }}>
              {/* Sub pill */}
              <div style={{
                display:"flex", alignItems:"center", gap:8,
                background:`${subColor}10`, border:`1px solid ${subColor}35`,
                borderRadius:6, padding:"6px 14px",
              }}>
                <span style={{ fontSize:14 }}>{getSubEmoji(currentSub)}</span>
                <span style={{ fontFamily:MONO, fontSize:10, fontWeight:700, color:subColor, letterSpacing:2 }}>
                  {getSubLabel(currentSub).toUpperCase()}
                </span>
                <span style={{ animation:"s-blink 2s infinite", color:subColor, fontSize:8 }}>●</span>
              </div>
              <button
                onClick={() => onNavigate("subscription")}
                style={{
                  fontFamily:MONO, fontSize:9, fontWeight:700, letterSpacing:2,
                  padding:"5px 12px", borderRadius:4, cursor:"pointer",
                  border:"1px solid rgba(241,245,249,0.1)", background:"transparent",
                  color:"rgba(241,245,249,0.35)", transition:"all 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.color="#f1f5f9"; e.currentTarget.style.borderColor="rgba(241,245,249,0.3)"; }}
                onMouseLeave={e => { e.currentTarget.style.color="rgba(241,245,249,0.35)"; e.currentTarget.style.borderColor="rgba(241,245,249,0.1)"; }}
              >
                CHANGE PLAN →
              </button>
            </div>
          </div>

          {/* Wallet row */}
          <div ref={walletRef} style={{ display:"flex", gap:14, marginBottom:22, alignItems:"center", flexWrap:"wrap" }}>
            <MCBadge amount={coins} size="lg" />
            <SCBadge amount={sc} size="lg" />
            <div style={{
              fontFamily:MONO, fontSize:9, color:"rgba(241,245,249,0.22)", letterSpacing:2,
              borderLeft:"1px solid rgba(241,245,249,0.08)", paddingLeft:14, marginLeft:2,
              lineHeight:1.8,
            }}>
              {getMCBoost(currentSub).toLocaleString("fr-FR")} MC / LUNDI
            </div>
          </div>
        </div>

        {/* Ticker tape */}
        <div style={{
          borderTop:"1px solid rgba(241,245,249,0.05)",
          borderBottom:"1px solid rgba(241,245,249,0.05)",
          padding:"7px 0", overflow:"hidden",
        }}>
          <div style={{ display:"flex", whiteSpace:"nowrap", animation:"s-ticker 35s linear infinite" }}>
            {[allNames, allNames].map((txt, i) => (
              <span key={i} style={{ fontFamily:MONO, fontSize:10, color:"rgba(241,245,249,0.18)", letterSpacing:1.5, paddingRight:60 }}>
                {txt}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TIER SECTIONS
      ══════════════════════════════════════════════════════════════════ */}
      {["starter", "elite"].map((planId, sIdx) => {
        const plan    = SUBSCRIPTION_PLANS.find(p => p.id === planId);
        const items   = STORE_ITEMS.filter(r => r.plan === planId);
        if (!items.length) return null;
        const accessible = userTierIdx >= planOrder.indexOf(planId);
        const featured   = items[0];
        const rest       = items.slice(1);
        const C          = plan.color;

        return (
          <div key={planId} style={{ marginTop:52, position:"relative", zIndex:1 }}>

            {/* ── Section header ── */}
            <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:12 }}>
              <span style={{ fontFamily:MONO, fontSize:10, color:"rgba(241,245,249,0.18)", letterSpacing:3 }}>
                {String(sIdx + 1).padStart(2,"0")}
              </span>
              <div style={{ width:2, height:36, background:accessible ? C : "rgba(241,245,249,0.08)", borderRadius:1, flexShrink:0 }} />
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:4, color: accessible ? C : "rgba(241,245,249,0.25)" }}>
                  {plan.label.toUpperCase()}
                </div>
                <div style={{ fontFamily:MONO, fontSize:9, color:"rgba(241,245,249,0.22)", letterSpacing:3, marginTop:2 }}>
                  {accessible
                    ? `${items.length} REWARDS AVAILABLE`
                    : "SUBSCRIPTION REQUIRED"}
                </div>
              </div>
              {!accessible && (
                <button
                  onClick={() => onNavigate("subscription")}
                  style={{
                    fontFamily:MONO, fontSize:9, fontWeight:700, letterSpacing:2,
                    padding:"9px 18px", borderRadius:5, cursor:"pointer",
                    border:`1px solid ${C}50`, background:`${C}10`, color:C, transition:"all 0.2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${C}25`; }}
                  onMouseLeave={e => { e.currentTarget.style.background = `${C}10`; }}
                >
                  UNLOCK ELITE →
                </button>
              )}
            </div>

            {/* Gradient rule */}
            <div style={{
              height:1,
              background:`linear-gradient(90deg,${C}50,${C}20 40%,transparent)`,
              marginBottom:2,
            }} />

            {/* ── Items container ── */}
            <div style={{ position:"relative", overflow:"hidden" }}>

              {/* ── FEATURED ITEM (first) ── */}
              <FeaturedRow item={featured} plan={plan} accessible={accessible} sc={sc} lang={lang} onRedeemSC={onRedeemSC} onNavigate={onNavigate} />

              {/* ── STRIP ROWS ── */}
              {rest.map((item, i) => (
                <StripRow key={item.id} item={item} plan={plan} accessible={accessible} sc={sc} lang={lang} onRedeemSC={onRedeemSC} idx={i + 1} />
              ))}

              {/* ── LOCK OVERLAY (elite only, if inaccessible) ── */}
              {!accessible && (
                <LockOverlay plan={plan} onNavigate={onNavigate} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   FEATURED ROW — first item of each section, large format
───────────────────────────────────────────────────────────────────────────── */
function FeaturedRow({ item, plan, accessible, sc, lang, onRedeemSC, onNavigate }) {
  const C = plan.color;
  const affordable = accessible && sc >= item.cost;
  const btnRef = useRef(null);
  const name = lang === "en" && item.name_en ? item.name_en : item.name;
  const desc = lang === "en" && item.description_en ? item.description_en : item.description;

  const handleBtnEnter = () => {
    if (!affordable) return;
    gsap.to(btnRef.current, { background: C, color: "#030712", scale: 1.02, duration: 0.2, ease: "power2.out" });
  };
  const handleBtnLeave = () => {
    if (!affordable) return;
    gsap.to(btnRef.current, { background: `${C}15`, color: C, scale: 1, duration: 0.2 });
  };

  return (
    <div className="s-row" style={{
      display:"flex", alignItems:"center", gap:20,
      padding:"22px 20px",
      borderBottom:"1px solid rgba(241,245,249,0.05)",
      background: accessible ? `${C}04` : "rgba(241,245,249,0.008)",
      filter: !accessible ? "blur(1.5px) opacity(0.35)" : "none",
      position:"relative",
    }}>
      {/* Big emoji */}
      <div style={{ fontSize:48, flexShrink:0, lineHeight:1 }}>{item.emoji}</div>

      {/* Name block */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:5 }}>
          <span style={{ fontFamily:MONO, fontSize:14, fontWeight:600, color: accessible ? "#f1f5f9" : "rgba(241,245,249,0.4)", letterSpacing:0.3 }}>
            {name}
          </span>
          <span style={{ fontFamily:MONO, fontSize:9, color:C, background:`${C}15`, border:`1px solid ${C}25`, borderRadius:3, padding:"2px 7px", letterSpacing:1.5 }}>
            {item.value}
          </span>
          <span style={{ fontFamily:MONO, fontSize:8, color:"rgba(241,245,249,0.2)", background:"rgba(241,245,249,0.04)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:3, padding:"2px 7px", letterSpacing:1.5 }}>
            FEATURED
          </span>
        </div>
        <div style={{ fontFamily:MONO, fontSize:10, color:"rgba(241,245,249,0.25)", letterSpacing:0.3, lineHeight:1.55 }}>
          {desc}
        </div>
      </div>

      {/* Price + button */}
      <div style={{ textAlign:"right", flexShrink:0 }}>
        <div style={{
          fontFamily:"'Bebas Neue',sans-serif",
          fontSize:48, letterSpacing:2, lineHeight:1,
          color: !accessible ? "rgba(241,245,249,0.1)" : affordable ? C : "rgba(241,245,249,0.2)",
        }}>
          {item.cost}
        </div>
        <div style={{ fontFamily:MONO, fontSize:9, color:"rgba(241,245,249,0.25)", letterSpacing:3, marginBottom:10 }}>SC</div>
        {accessible ? (
          <button
            ref={btnRef}
            onClick={() => affordable && onRedeemSC(item)}
            disabled={!affordable}
            onMouseEnter={handleBtnEnter}
            onMouseLeave={handleBtnLeave}
            style={{
              fontFamily:MONO, fontSize:9, fontWeight:700, letterSpacing:2,
              padding:"9px 18px", borderRadius:5,
              border:`1px solid ${affordable ? C + "50" : "rgba(241,245,249,0.08)"}`,
              background: affordable ? `${C}15` : "rgba(241,245,249,0.03)",
              color: affordable ? C : "rgba(241,245,249,0.2)",
              cursor: affordable ? "pointer" : "not-allowed", transition:"color 0.15s",
            }}
          >
            {affordable ? "OBTENIR →" : "INSUF."}
          </button>
        ) : (
          <div style={{ fontFamily:MONO, fontSize:10, color:C, letterSpacing:1 }}>🔒</div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   STRIP ROW — compact item row
───────────────────────────────────────────────────────────────────────────── */
function StripRow({ item, plan, accessible, sc, lang, onRedeemSC, idx }) {
  const C = plan.color;
  const rowRef = useRef(null);
  const btnRef = useRef(null);
  const affordable = accessible && sc >= item.cost;
  const name = lang === "en" && item.name_en ? item.name_en : item.name;
  const desc = lang === "en" && item.description_en ? item.description_en : item.description;

  const onEnter = () => {
    if (!accessible) return;
    gsap.to(rowRef.current, { backgroundColor: `${C}07`, duration: 0.18 });
  };
  const onLeave = () => {
    if (!accessible) return;
    gsap.to(rowRef.current, { backgroundColor: "transparent", duration: 0.18 });
  };
  const onBtnEnter = () => {
    if (!affordable) return;
    gsap.to(btnRef.current, { background: C, color: "#030712", scale: 1.04, duration: 0.18, ease: "power2.out" });
  };
  const onBtnLeave = () => {
    if (!affordable) return;
    gsap.to(btnRef.current, { background: `${C}12`, color: C, scale: 1, duration: 0.18 });
  };

  return (
    <div
      ref={rowRef}
      className="s-row"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{
        display:"flex", alignItems:"center", gap:14,
        padding:"12px 20px",
        borderBottom:"1px solid rgba(241,245,249,0.04)",
        filter: !accessible ? "blur(1.5px) opacity(0.35)" : "none",
        transition:"border-left 0.2s",
      }}
    >
      {/* Index */}
      <div style={{ fontFamily:MONO, fontSize:9, color:"rgba(241,245,249,0.14)", letterSpacing:1, minWidth:22, flexShrink:0 }}>
        {String(idx + 1).padStart(2,"0")}
      </div>

      {/* Emoji */}
      <div style={{ fontSize:22, flexShrink:0 }}>{item.emoji}</div>

      {/* Name + desc */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap", marginBottom:2 }}>
          <span style={{ fontFamily:MONO, fontSize:11, fontWeight:600, color: accessible ? "#f1f5f9" : "rgba(241,245,249,0.35)", letterSpacing:0.2 }}>
            {name}
          </span>
          <span style={{ fontFamily:MONO, fontSize:8, color:C, background:`${C}10`, border:`1px solid ${C}18`, borderRadius:3, padding:"1px 6px", letterSpacing:1 }}>
            {item.value}
          </span>
        </div>
        <div style={{ fontFamily:MONO, fontSize:9.5, color:"rgba(241,245,249,0.2)", letterSpacing:0.2 }}>
          {desc}
        </div>
      </div>

      {/* Price */}
      <div style={{ textAlign:"right", minWidth:46, flexShrink:0 }}>
        <div style={{
          fontFamily:"'Bebas Neue',sans-serif",
          fontSize:28, letterSpacing:2, lineHeight:1,
          color: !accessible ? "rgba(241,245,249,0.08)" : affordable ? C : "rgba(241,245,249,0.2)",
        }}>
          {item.cost}
        </div>
        <div style={{ fontFamily:MONO, fontSize:7, color:"rgba(241,245,249,0.2)", letterSpacing:2 }}>SC</div>
      </div>

      {/* Button */}
      {accessible && (
        <button
          ref={btnRef}
          onClick={() => affordable && onRedeemSC(item)}
          disabled={!affordable}
          onMouseEnter={onBtnEnter}
          onMouseLeave={onBtnLeave}
          style={{
            fontFamily:MONO, fontSize:8, fontWeight:700, letterSpacing:1.5,
            padding:"7px 12px", borderRadius:4, flexShrink:0,
            border:`1px solid ${affordable ? C + "45" : "rgba(241,245,249,0.07)"}`,
            background: affordable ? `${C}12` : "rgba(241,245,249,0.03)",
            color: affordable ? C : "rgba(241,245,249,0.18)",
            cursor: affordable ? "pointer" : "not-allowed", transition:"color 0.15s",
          }}
        >
          {affordable ? "GET →" : "INSUF"}
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   LOCK OVERLAY
───────────────────────────────────────────────────────────────────────────── */
function LockOverlay({ plan, onNavigate }) {
  const C = plan.color;
  const btnRef = useRef(null);

  return (
    <div
      onClick={() => onNavigate("subscription")}
      style={{
        position:"absolute", inset:0, zIndex:10, cursor:"pointer",
        background:`repeating-linear-gradient(-48deg,
          rgba(3,7,18,0.82) 0px, rgba(3,7,18,0.82) 14px,
          rgba(3,7,18,0.75) 14px, rgba(3,7,18,0.75) 15px,
          ${C}06 15px, ${C}06 16px,
          rgba(3,7,18,0.75) 16px, rgba(3,7,18,0.75) 17px)`,
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        gap:14, backdropFilter:"blur(3px)",
      }}
    >
      {/* Lock ring */}
      <div style={{
        width:60, height:60, borderRadius:"50%",
        background:`${C}12`, border:`2px solid ${C}40`,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:26, boxShadow:`0 0 40px ${C}35`,
      }}>🔒</div>

      <div style={{ textAlign:"center" }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:4, color:C, marginBottom:4 }}>
          ELITE REQUIRED
        </div>
        <div style={{ fontFamily:MONO, fontSize:9, color:"rgba(241,245,249,0.35)", letterSpacing:2 }}>
          15€ / MOIS · ACCÈS TOTAL
        </div>
      </div>

      <button
        ref={btnRef}
        style={{
          fontFamily:MONO, fontSize:10, fontWeight:700, letterSpacing:2,
          padding:"11px 26px", borderRadius:5,
          border:`1px solid ${C}55`, background:`${C}15`, color:C,
          cursor:"pointer", transition:"all 0.2s",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = `${C}30`; e.currentTarget.style.boxShadow = `0 0 20px ${C}30`; }}
        onMouseLeave={e => { e.currentTarget.style.background = `${C}15`; e.currentTarget.style.boxShadow = "none"; }}
      >
        UPGRADE NOW →
      </button>
    </div>
  );
}
