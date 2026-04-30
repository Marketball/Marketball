import { useState, useRef } from "react";
import { gsap } from "gsap";
import { AMM } from "../lib/amm.js";
import { catColor, timeLeft, fmt, mTitle } from "../lib/helpers.js";
import { useLang } from "../lib/i18n.jsx";
import ProbBar from "./ui/ProbBar.jsx";
import ShareMenu from "./ShareMenu.jsx";
import MarketStatsModal from "./MarketStatsModal.jsx";
import ChallengeModal from "./ChallengeModal.jsx";

export default function MarketCard({ market, onBet, isNew, isTrending, session, profile, showToast }) {
  const [hover, setHover] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);
  const cardRef = useRef(null);
  const isMulti = market.market_type === "multi";
  const options = market.options || [];
  const p = isMulti ? null : AMM.probYes(market.q_yes, market.q_no);
  const cc = catColor(market.category);
  const accentColor = isMulti ? "#f59e0b" : cc;
  const { t, lang } = useLang();

  const handleEnter = () => {
    setHover(true);
    gsap.to(cardRef.current, { y: -7, scale: 1.013, duration: 0.32, ease: "power2.out" });
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
        background: hover ? "rgba(241,245,249,0.045)" : "rgba(241,245,249,0.02)",
        border: `1px solid ${hover ? `${accentColor}28` : "rgba(241,245,249,0.07)"}`,
        borderRadius: 10,
        padding: "18px 20px 16px 24px",
        position: "relative",
        overflow: "hidden",
        boxShadow: hover ? `0 22px 55px rgba(0,0,0,0.45), inset 0 0 0 0 transparent` : "0 4px 16px rgba(0,0,0,0.15)",
        cursor: "pointer",
      }}
    >
      {/* Left accent bar */}
      <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 3, background: accentColor, opacity: hover ? 1 : 0.55, borderRadius: "0 2px 2px 0", transition: "opacity 0.25s" }} />

      {/* Tags + timer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", flex: 1, paddingRight: 8 }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: cc, background: `${cc}14`, padding: "3px 7px", borderRadius: 4, border: `1px solid ${cc}26`, letterSpacing: "1.5px", textTransform: "uppercase" }}>{market.category}</span>
          {isMulti && <span style={{ fontSize: 9, fontWeight: 800, color: "#f59e0b", background: "rgba(245,158,11,0.1)", padding: "3px 7px", borderRadius: 4, border: "1px solid rgba(245,158,11,0.22)", letterSpacing: "1.5px", textTransform: "uppercase" }}>MULTI · {options.length}</span>}
          {isNew && <span style={{ fontSize: 9, fontWeight: 800, color: "#f97316", background: "rgba(249,115,22,0.1)", padding: "3px 7px", borderRadius: 4, border: "1px solid rgba(249,115,22,0.22)", letterSpacing: "1.5px", textTransform: "uppercase", animation: "pulse 2s infinite" }}>NEW</span>}
          {isTrending && !isNew && <span style={{ fontSize: 9, fontWeight: 800, color: "#a78bfa", background: "rgba(167,139,250,0.1)", padding: "3px 7px", borderRadius: 4, border: "1px solid rgba(167,139,250,0.22)", letterSpacing: "1.5px", textTransform: "uppercase" }}>HOT</span>}
        </div>
        <span style={{ fontSize: 9, color: "rgba(241,245,249,0.28)", fontWeight: 700, letterSpacing: "0.5px", flexShrink: 0, paddingTop: 2 }}>⏱ {timeLeft(market.closes_at)}</span>
      </div>

      {/* Title + yes/no */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ flex: 1, paddingRight: !isMulti ? 12 : 0 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#f1f5f9", lineHeight: 1.45, marginBottom: 5 }}>{mTitle(market, lang)}</div>
          {market.source && <div style={{ fontSize: 10, color: "rgba(241,245,249,0.28)", display: "flex", alignItems: "center", gap: 6 }}>
            {market.source}
            {market.proposed_by && <span style={{ color: "#f59e0b", fontSize: 9, fontWeight: 800, letterSpacing: "0.5px" }}>· 👑 {market.proposed_by}</span>}
          </div>}
        </div>
        {!isMulti && <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
          <button className="btn-animated" onClick={e => { e.stopPropagation(); onBet(market, "yes"); }}
            style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.22)", borderRadius: 6, padding: "5px 10px", cursor: "pointer", textAlign: "center", minWidth: 58 }}>
            <div className="prob-pct" style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, lineHeight: 1, color: "#10b981", letterSpacing: 1 }}>{Math.round(p * 100)}<span style={{ fontSize: 13 }}>%</span></div>
            <div style={{ fontSize: 8, color: "rgba(16,185,129,0.6)", letterSpacing: "2px", fontWeight: 800, textTransform: "uppercase" }}>{t("common.yes")}</div>
          </button>
          <button className="btn-animated" onClick={e => { e.stopPropagation(); onBet(market, "no"); }}
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)", borderRadius: 6, padding: "5px 10px", cursor: "pointer", textAlign: "center", minWidth: 58 }}>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, lineHeight: 1, color: "#ef4444", letterSpacing: 1 }}>{100 - Math.round(p * 100)}<span style={{ fontSize: 11 }}>%</span></div>
            <div style={{ fontSize: 8, color: "rgba(239,68,68,0.5)", letterSpacing: "2px", fontWeight: 800, textTransform: "uppercase" }}>{t("common.no")}</div>
          </button>
        </div>}
      </div>

      {/* Multi options or ProbBar */}
      {isMulti ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
          {options.slice(0, 4).map(opt => {
            const pct = opt.pct || Math.round(100 / opt.odds);
            return <div key={opt.label} style={{ borderRadius: 5, overflow: "hidden", border: "1px solid rgba(245,158,11,0.1)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", position: "relative" }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: "rgba(245,158,11,0.07)", transition: "width 0.5s" }} />
                <span style={{ fontSize: 11, color: "rgba(241,245,249,0.7)", fontWeight: 600, position: "relative" }}>{opt.label}</span>
                <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 13, color: "#fbbf24", letterSpacing: 1, position: "relative" }}>{pct}%</span>
              </div>
            </div>;
          })}
          {options.length > 4 && <div style={{ fontSize: 10, color: "rgba(241,245,249,0.28)", textAlign: "center", paddingTop: 2 }}>+{options.length - 4} options</div>}
        </div>
      ) : (
        <div style={{ marginBottom: 0 }}><ProbBar qYes={market.q_yes} qNo={market.q_no} /></div>
      )}

      {/* Stats row with editorial dividers */}
      <div style={{ display: "flex", gap: 20, marginTop: 12, paddingTop: 10, paddingBottom: 12, borderTop: "1px solid rgba(241,245,249,0.05)", borderBottom: "1px solid rgba(241,245,249,0.05)" }}>
        <div>
          <div style={{ fontSize: 8, color: "rgba(241,245,249,0.25)", marginBottom: 3, letterSpacing: "2px", textTransform: "uppercase" }}>Volume</div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, color: "#fbbf24", letterSpacing: 1 }}>🪙 {fmt(market.total_volume)}</div>
        </div>
        <div>
          <div style={{ fontSize: 8, color: "rgba(241,245,249,0.25)", marginBottom: 3, letterSpacing: "2px", textTransform: "uppercase" }}>{t("markets.players")}</div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, color: "#f1f5f9", letterSpacing: 1 }}>{fmt(market.participants)}</div>
        </div>
      </div>

      {/* Footer actions */}
      <div style={{ display: "flex", gap: 5, marginTop: 12, position: "relative" }}>
        <button className="btn-animated" onClick={e => { e.stopPropagation(); setShowShare(!showShare); }}
          style={{ padding: "9px 11px", borderRadius: 6, border: "1px solid rgba(241,245,249,0.08)", background: "transparent", color: "rgba(241,245,249,0.35)", fontSize: 13, cursor: "pointer" }}>↗</button>
        <button className="btn-animated" onClick={e => { e.stopPropagation(); setShowStats(true); }}
          style={{ padding: "9px 11px", borderRadius: 6, border: "1px solid rgba(241,245,249,0.08)", background: "transparent", color: "rgba(241,245,249,0.35)", fontSize: 13, cursor: "pointer" }}>📊</button>
        {session && <button className="btn-animated" onClick={e => { e.stopPropagation(); setShowChallenge(true); }}
          style={{ padding: "9px 11px", borderRadius: 6, border: "1px solid rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.04)", color: "#f59e0b", fontSize: 13, cursor: "pointer" }}>⚔️</button>}
        <button className="btn-animated" onClick={e => { e.stopPropagation(); onBet(market); }}
          style={{ flex: 1, padding: "9px 0", borderRadius: 6, border: `1px solid ${hover ? `${accentColor}45` : "rgba(241,245,249,0.1)"}`, background: hover ? `${accentColor}0d` : "transparent", color: hover ? accentColor : "rgba(241,245,249,0.38)", fontWeight: 800, fontSize: 10, letterSpacing: "2.5px", textTransform: "uppercase", cursor: "pointer" }}>PREDIRE →</button>
        {showShare && <ShareMenu market={market} onClose={() => setShowShare(false)} />}
      </div>
    </div>
    {showStats && <MarketStatsModal market={market} onClose={() => setShowStats(false)} onBet={onBet} session={session} profile={profile} />}
    {showChallenge && <ChallengeModal market={market} profile={profile} session={session} onClose={() => setShowChallenge(false)} showToast={showToast || ((m) => alert(m))} />}
  </>;
}
