import { useState, useRef } from "react";
import { gsap } from "gsap";
import { calcLiveMatchOdds } from "../lib/amm.js";
import { compColor, compEmoji, compLabel, formatMatchDate, getClubColor } from "../lib/helpers.js";

export default function MatchCard({ match, onBet, onStats }) {
  const [hover, setHover] = useState(false);
  const [imgErr, setImgErr] = useState({});
  const cardRef = useRef(null);
  const cc = compColor(match.competition);
  const isLive = match.status === "IN_PLAY" || match.status === "PAUSED";
  const isFinished = match.status === "FINISHED";
  const odds = calcLiveMatchOdds(match);

  const handleEnter = () => {
    setHover(true);
    if (!isFinished) gsap.to(cardRef.current, { y: -7, scale: 1.013, duration: 0.32, ease: "power2.out" });
  };
  const handleLeave = () => {
    setHover(false);
    gsap.to(cardRef.current, { y: 0, scale: 1, duration: 0.5, ease: "power3.out" });
  };

  const Logo = ({ logo, name, side }) => {
    const clubColor = getClubColor(name);
    if (logo && !imgErr[side]) return <img src={logo} alt={name}
      style={{ width: 36, height: 36, objectFit: "contain", display: "block", margin: "0 auto 6px", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.55))" }}
      onError={() => setImgErr(e => ({ ...e, [side]: true }))} />;
    const init = name ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?";
    return <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${clubColor}20`, border: `1.5px solid ${clubColor}45`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px", fontFamily: "'Bebas Neue',sans-serif", fontSize: 12, color: clubColor, letterSpacing: 1 }}>{init}</div>;
  };

  return <div
    ref={cardRef}
    className="card-hover"
    onMouseEnter={handleEnter}
    onMouseLeave={handleLeave}
    onClick={() => !isFinished && onBet(match)}
    style={{
      background: hover ? "rgba(241,245,249,0.045)" : "rgba(241,245,249,0.02)",
      border: `1px solid ${isLive ? "rgba(239,68,68,0.32)" : hover ? "rgba(16,185,129,0.18)" : "rgba(241,245,249,0.07)"}`,
      borderRadius: 10,
      padding: "16px 18px 14px 22px",
      position: "relative",
      overflow: "hidden",
      boxShadow: isLive ? "0 0 24px rgba(239,68,68,0.1)" : hover ? "0 22px 55px rgba(0,0,0,0.45)" : "0 4px 16px rgba(0,0,0,0.15)",
      cursor: isFinished ? "default" : "pointer",
    }}
  >
    {/* Left accent bar */}
    <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 3, background: isLive ? "#ef4444" : cc, opacity: hover || isLive ? 1 : 0.55, borderRadius: "0 2px 2px 0", transition: "opacity 0.25s", boxShadow: isLive ? "0 0 8px #ef4444" : "none" }} />

    {/* Header */}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <span style={{ fontSize: 9, fontWeight: 800, color: cc, background: `${cc}12`, padding: "3px 7px", borderRadius: 4, border: `1px solid ${cc}24`, letterSpacing: "1.5px", textTransform: "uppercase" }}>{compEmoji(match.competition)} {compLabel(match.competition)}</span>
      {isLive
        ? <span style={{ fontSize: 9, fontWeight: 800, color: "#ef4444", display: "flex", alignItems: "center", gap: 5, letterSpacing: "1px", textTransform: "uppercase" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#ef4444", display: "inline-block", animation: "pulse 1s infinite", boxShadow: "0 0 5px #ef4444" }} />
            LIVE{match.elapsed && <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 11, letterSpacing: 1 }}> {match.elapsed}'</span>}
          </span>
        : isFinished
          ? <span style={{ fontSize: 9, color: "rgba(241,245,249,0.22)", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase" }}>FT</span>
          : <span style={{ fontSize: 9, color: "rgba(241,245,249,0.3)", fontWeight: 600 }}>{formatMatchDate(match.match_date)}</span>
      }
    </div>

    {/* Teams + score */}
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <div style={{ flex: 1, textAlign: "center" }}>
        <Logo logo={match.home_logo} name={match.home_team} side="home" />
        <div style={{ fontSize: 11, fontWeight: 800, color: "#f1f5f9", letterSpacing: "0.3px", lineHeight: 1.2 }}>{match.home_team}</div>
      </div>
      <div style={{ textAlign: "center", padding: "0 12px", flexShrink: 0 }}>
        {(isLive || isFinished)
          ? <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 34, color: "#f1f5f9", letterSpacing: 3, lineHeight: 1, textShadow: isLive ? "0 0 20px rgba(239,68,68,0.35)" : "none" }}>
              {match.home_score ?? 0}<span style={{ color: "rgba(241,245,249,0.2)", margin: "0 3px", fontSize: 24 }}>—</span>{match.away_score ?? 0}
            </div>
          : <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, color: "rgba(241,245,249,0.18)", letterSpacing: 5 }}>VS</div>
        }
      </div>
      <div style={{ flex: 1, textAlign: "center" }}>
        <Logo logo={match.away_logo} name={match.away_team} side="away" />
        <div style={{ fontSize: 11, fontWeight: 800, color: "#f1f5f9", letterSpacing: "0.3px", lineHeight: 1.2 }}>{match.away_team}</div>
      </div>
    </div>

    {/* Odds */}
    {!isFinished && <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
      {[
        { l: "1", o: odds.oddsHome, c: "#10b981", pred: match.home_team },
        { l: "X", o: odds.oddsDraw, c: "#94a3b8", pred: "Nul" },
        { l: "2", o: odds.oddsAway, c: "#ef4444", pred: match.away_team },
      ].map(item => (
        <button key={item.l} className="btn-animated"
          onClick={e => { e.stopPropagation(); !isFinished && onBet(match, item.pred); }}
          style={{ flex: 1, textAlign: "center", background: "rgba(241,245,249,0.025)", border: "1px solid rgba(241,245,249,0.07)", borderRadius: 6, padding: "7px 0", cursor: "pointer" }}
          onMouseEnter={e => { e.currentTarget.style.background = `${item.c}12`; e.currentTarget.style.borderColor = `${item.c}40`; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(241,245,249,0.025)"; e.currentTarget.style.borderColor = "rgba(241,245,249,0.07)"; }}>
          <div style={{ fontSize: 8, color: "rgba(241,245,249,0.28)", marginBottom: 2, letterSpacing: "2px", textTransform: "uppercase" }}>{item.l}</div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, color: item.c, letterSpacing: 1 }}>{item.o}</div>
        </button>
      ))}
    </div>}

    {/* Footer */}
    <div style={{ display: "flex", gap: 5, paddingTop: 2 }}>
      <button className="btn-animated" onClick={e => { e.stopPropagation(); onStats && onStats(match); }}
        style={{ padding: "9px 11px", borderRadius: 6, border: "1px solid rgba(241,245,249,0.08)", background: "transparent", color: "rgba(241,245,249,0.35)", fontSize: 13, cursor: "pointer" }}>📊</button>
      {!isFinished && <button className="btn-animated" onClick={e => { e.stopPropagation(); onBet(match); }}
        style={{ flex: 1, padding: "9px 0", borderRadius: 6, border: `1px solid ${hover ? "rgba(16,185,129,0.42)" : "rgba(241,245,249,0.1)"}`, background: hover ? "rgba(16,185,129,0.08)" : "transparent", color: hover ? "#10b981" : "rgba(241,245,249,0.38)", fontWeight: 800, fontSize: 10, letterSpacing: "2.5px", textTransform: "uppercase", cursor: "pointer" }}>PARIER →</button>}
      {isFinished && <button className="btn-animated" onClick={e => { e.stopPropagation(); onStats && onStats(match); }}
        style={{ flex: 1, padding: "9px 0", borderRadius: 6, border: "1px solid rgba(241,245,249,0.08)", background: "transparent", color: "rgba(241,245,249,0.28)", fontWeight: 800, fontSize: 10, letterSpacing: "2.5px", textTransform: "uppercase", cursor: "pointer" }}>STATS →</button>}
    </div>
  </div>;
}
