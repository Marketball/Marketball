import { useState, useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AMM } from "../lib/amm.js";
import { catColor, timeLeft, fmt, mTitle } from "../lib/helpers.js";
import { useLang } from "../lib/i18n.jsx";
import ProbBar from "./ui/ProbBar.jsx";
import ShareMenu from "./ShareMenu.jsx";
import MarketStatsModal from "./MarketStatsModal.jsx";
import ChallengeModal from "./ChallengeModal.jsx";

gsap.registerPlugin(ScrollTrigger);

export default function MarketCard({ market, onBet, isNew, isTrending, session, profile, showToast }) {
  const [hover, setHover] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);
  const cardRef = useRef(null);
  const yesNumRef = useRef(null);
  const isMulti = market.market_type === "multi";
  const options = market.options || [];
  const p = isMulti ? null : AMM.probYes(market.q_yes, market.q_no);
  const yesPct = isMulti ? null : Math.round(p * 100);
  const noPct = isMulti ? null : 100 - yesPct;
  const cc = catColor(market.category);
  const accent = isMulti ? "#f59e0b" : cc;
  const { t, lang } = useLang();

  // Count-up animation on scroll entry
  useEffect(() => {
    if (!yesNumRef.current || isMulti || yesPct === null) return;
    yesNumRef.current.textContent = "0";
    const obj = { val: 0 };
    const st = ScrollTrigger.create({
      trigger: cardRef.current,
      start: "top 92%",
      once: true,
      onEnter: () => gsap.to(obj, {
        val: yesPct, duration: 1.1, ease: "power2.out",
        onUpdate: () => { if (yesNumRef.current) yesNumRef.current.textContent = Math.round(obj.val); }
      })
    });
    return () => st.kill();
  }, [yesPct, isMulti]);

  const handleEnter = () => {
    setHover(true);
    gsap.to(cardRef.current, { y: -8, scale: 1.016, duration: 0.3, ease: "power2.out" });
  };
  const handleLeave = () => {
    setHover(false);
    gsap.to(cardRef.current, { y: 0, scale: 1, duration: 0.5, ease: "power3.out" });
  };

  return <>
    <div
      ref={cardRef}
      className="card-hover"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={() => { if (showShare) setShowShare(false); else setShowStats(true); }}
      style={{
        background: hover ? "rgba(241,245,249,0.032)" : "rgba(241,245,249,0.018)",
        border: "1px solid rgba(241,245,249,0.07)",
        borderTop: `3px solid ${accent}`,
        borderRadius: 4,
        overflow: "hidden",
        boxShadow: hover ? `0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px ${accent}28` : "0 4px 20px rgba(0,0,0,0.18)",
        cursor: "pointer",
      }}
    >
      {/* ── Header: tags + timer ── */}
      <div style={{ padding: "11px 15px 9px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(241,245,249,0.04)" }}>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: cc, background: `${cc}14`, padding: "2px 6px", borderRadius: 2, letterSpacing: "0.5px" }}>{market.category?.toUpperCase()}</span>
          {isMulti && <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: "#f59e0b", background: "rgba(245,158,11,0.1)", padding: "2px 6px", borderRadius: 2 }}>MULTI·{options.length}</span>}
          {isNew && <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: "#f97316", background: "rgba(249,115,22,0.1)", padding: "2px 6px", borderRadius: 2, animation: "pulse 2s infinite" }}>NEW</span>}
          {isTrending && !isNew && <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: "#a78bfa", background: "rgba(167,139,250,0.1)", padding: "2px 6px", borderRadius: 2 }}>HOT</span>}
        </div>
        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: "rgba(241,245,249,0.28)" }}>{timeLeft(market.closes_at)}</span>
      </div>

      {/* ── Title ── */}
      <div style={{ padding: "13px 15px 11px" }}>
        <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 15, color: "#f1f5f9", lineHeight: 1.4, marginBottom: market.source ? 5 : 0 }}>{mTitle(market, lang)}</div>
        {market.source && <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: "rgba(241,245,249,0.26)", letterSpacing: "0.3px" }}>
          {market.source}{market.proposed_by && <span style={{ color: "#f59e0b", marginLeft: 8 }}>👑 {market.proposed_by}</span>}
        </div>}
      </div>

      {/* ── YES / NO split or multi ── */}
      {isMulti ? (
        <div style={{ padding: "0 15px 13px", display: "flex", flexDirection: "column", gap: 3 }}>
          {options.slice(0, 4).map(opt => {
            const pct = opt.pct || Math.round(100 / opt.odds);
            return <div key={opt.label} style={{ position: "relative", borderRadius: 2, overflow: "hidden", background: "rgba(241,245,249,0.02)", border: "1px solid rgba(241,245,249,0.06)" }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: "rgba(245,158,11,0.08)", transition: "width 0.6s" }} />
              <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 10px", position: "relative" }}>
                <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 13, fontWeight: 600, color: "rgba(241,245,249,0.8)" }}>{opt.label}</span>
                <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, color: "#fbbf24", letterSpacing: 1 }}>{pct}%</span>
              </div>
            </div>;
          })}
          {options.length > 4 && <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: "rgba(241,245,249,0.28)", textAlign: "center", paddingTop: 4 }}>+{options.length - 4} options</div>}
        </div>
      ) : (
        <div style={{ display: "flex", borderTop: "1px solid rgba(241,245,249,0.05)", borderBottom: "1px solid rgba(241,245,249,0.05)" }}>
          {/* YES — dominant anchor */}
          <button className="btn-animated" onClick={e => { e.stopPropagation(); onBet(market, "yes"); }}
            style={{ flex: 3, padding: "16px 15px", background: hover ? "rgba(16,185,129,0.07)" : "transparent", border: "none", borderRight: "1px solid rgba(241,245,249,0.05)", cursor: "pointer", textAlign: "left" }}>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", lineHeight: 0.9, color: "#10b981", letterSpacing: -1, marginBottom: 4 }}>
              <span ref={yesNumRef} style={{ fontSize: 56 }}>{yesPct}</span><span style={{ fontSize: 22, opacity: 0.65 }}>%</span>
            </div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: "rgba(16,185,129,0.55)", letterSpacing: "2px" }}>YES</div>
          </button>
          {/* NO — secondary */}
          <button className="btn-animated" onClick={e => { e.stopPropagation(); onBet(market, "no"); }}
            style={{ flex: 2, padding: "16px 13px", background: hover ? "rgba(239,68,68,0.05)" : "transparent", border: "none", cursor: "pointer", textAlign: "right" }}>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", lineHeight: 0.9, color: "#ef4444", letterSpacing: -0.5, marginBottom: 4 }}>
              <span style={{ fontSize: 34 }}>{noPct}</span><span style={{ fontSize: 16, opacity: 0.65 }}>%</span>
            </div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: "rgba(239,68,68,0.5)", letterSpacing: "2px" }}>NO</div>
          </button>
        </div>
      )}

      {/* Prob bar */}
      {!isMulti && <ProbBar qYes={market.q_yes} qNo={market.q_no} />}

      {/* ── Stats strip ── */}
      <div style={{ display: "flex", gap: 22, padding: "9px 15px 10px", borderBottom: "1px solid rgba(241,245,249,0.05)" }}>
        <div>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: "rgba(241,245,249,0.22)", letterSpacing: "1.5px", marginBottom: 3 }}>VOLUME</div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 15, color: "#fbbf24", letterSpacing: 1 }}>🪙 {fmt(market.total_volume)}</div>
        </div>
        <div>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: "rgba(241,245,249,0.22)", letterSpacing: "1.5px", marginBottom: 3 }}>{t("markets.players").toUpperCase()}</div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 15, color: "#f1f5f9", letterSpacing: 1 }}>{fmt(market.participants)}</div>
        </div>
      </div>

      {/* ── Actions ── */}
      <div style={{ display: "flex", gap: 4, padding: "9px 11px", position: "relative" }}>
        <button className="btn-animated" onClick={e => { e.stopPropagation(); setShowShare(!showShare); }}
          style={{ padding: "8px 10px", borderRadius: 2, border: "1px solid rgba(241,245,249,0.08)", background: "transparent", color: "rgba(241,245,249,0.35)", fontSize: 13, cursor: "pointer" }}>↗</button>
        <button className="btn-animated" onClick={e => { e.stopPropagation(); setShowStats(true); }}
          style={{ padding: "8px 10px", borderRadius: 2, border: "1px solid rgba(241,245,249,0.08)", background: "transparent", color: "rgba(241,245,249,0.35)", fontSize: 13, cursor: "pointer" }}>📊</button>
        {session && <button className="btn-animated" onClick={e => { e.stopPropagation(); setShowChallenge(true); }}
          style={{ padding: "8px 10px", borderRadius: 2, border: "1px solid rgba(245,158,11,0.2)", background: "transparent", color: "#f59e0b", fontSize: 13, cursor: "pointer" }}>⚔️</button>}
        <button className="btn-animated" onClick={e => { e.stopPropagation(); onBet(market); }}
          style={{ flex: 1, padding: "8px 0", borderRadius: 2, border: `1px solid ${hover ? `${accent}50` : "rgba(241,245,249,0.1)"}`, background: hover ? `${accent}12` : "transparent", color: hover ? accent : "rgba(241,245,249,0.4)", fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "3px", textTransform: "uppercase", cursor: "pointer" }}>PRÉDIRE →</button>
        {showShare && <ShareMenu market={market} onClose={() => setShowShare(false)} />}
      </div>
    </div>
    {showStats && <MarketStatsModal market={market} onClose={() => setShowStats(false)} onBet={onBet} session={session} profile={profile} />}
    {showChallenge && <ChallengeModal market={market} profile={profile} session={session} onClose={() => setShowChallenge(false)} showToast={showToast || ((m) => alert(m))} />}
  </>;
}
