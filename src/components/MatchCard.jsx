import { useState, useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { calcLiveMatchOdds } from "../lib/amm.js";
import { compColor, compEmoji, compLabel, formatMatchDate, getClubColor } from "../lib/helpers.js";

gsap.registerPlugin(ScrollTrigger);

export default function MatchCard({ match, onBet, onStats }) {
  const [hover, setHover] = useState(false);
  const [imgErr, setImgErr] = useState({});
  const cardRef = useRef(null);
  const scoreRef = useRef(null);
  const cc = compColor(match.competition);
  const isLive = match.status === "IN_PLAY" || match.status === "PAUSED";
  const isFinished = match.status === "FINISHED";
  const odds = calcLiveMatchOdds(match);

  // Count-up on live/finished score when entering viewport
  useEffect(() => {
    if (!scoreRef.current || (!isLive && !isFinished)) return;
    const home = match.home_score ?? 0;
    const away = match.away_score ?? 0;
    if (home === 0 && away === 0) return;
    const obj = { h: 0, a: 0 };
    const st = ScrollTrigger.create({
      trigger: cardRef.current, start: "top 93%", once: true,
      onEnter: () => gsap.to(obj, {
        h: home, a: away, duration: 0.9, ease: "power2.out", roundProps: "h,a",
        onUpdate: () => { if (scoreRef.current) scoreRef.current.textContent = `${obj.h} — ${obj.a}`; }
      })
    });
    return () => st.kill();
  }, [isLive, isFinished, match.home_score, match.away_score]);

  const handleEnter = () => {
    setHover(true);
    if (!isFinished) gsap.to(cardRef.current, { y: -8, scale: 1.016, duration: 0.3, ease: "power2.out" });
  };
  const handleLeave = () => {
    setHover(false);
    gsap.to(cardRef.current, { y: 0, scale: 1, duration: 0.5, ease: "power3.out" });
  };

  const Logo = ({ logo, name, side }) => {
    const clubColor = getClubColor(name);
    if (logo && !imgErr[side]) return <img src={logo} alt={name}
      style={{ width: 38, height: 38, objectFit: "contain", display: "block", margin: "0 auto 7px", filter: "drop-shadow(0 2px 10px rgba(0,0,0,0.6))" }}
      onError={() => setImgErr(e => ({ ...e, [side]: true }))} />;
    const init = name ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?";
    return <div style={{ width: 38, height: 38, borderRadius: "50%", background: `${clubColor}1a`, border: `1.5px solid ${clubColor}40`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 7px", fontFamily: "'Bebas Neue',sans-serif", fontSize: 13, color: clubColor, letterSpacing: 1 }}>{init}</div>;
  };

  const accentColor = isLive ? "#ef4444" : cc;

  return <div
    ref={cardRef}
    className="card-hover"
    onMouseEnter={handleEnter}
    onMouseLeave={handleLeave}
    onClick={() => !isFinished && onBet(match)}
    style={{
      background: hover ? "rgba(241,245,249,0.032)" : "rgba(241,245,249,0.018)",
      border: "1px solid rgba(241,245,249,0.07)",
      borderTop: `3px solid ${accentColor}`,
      borderRadius: 4,
      overflow: "hidden",
      boxShadow: isLive
        ? `0 0 30px rgba(239,68,68,0.12), 0 4px 20px rgba(0,0,0,0.2)`
        : hover ? "0 24px 60px rgba(0,0,0,0.5)" : "0 4px 20px rgba(0,0,0,0.18)",
      cursor: isFinished ? "default" : "pointer",
    }}
  >
    {/* ── Header ── */}
    <div style={{ padding: "11px 15px 9px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(241,245,249,0.04)" }}>
      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: cc, background: `${cc}12`, padding: "2px 6px", borderRadius: 2, letterSpacing: "0.5px" }}>
        {compEmoji(match.competition)} {compLabel(match.competition).toUpperCase()}
      </span>
      {isLive
        ? <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, fontWeight: 700, color: "#ef4444", display: "flex", alignItems: "center", gap: 5, letterSpacing: "1.5px" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#ef4444", display: "inline-block", animation: "pulse 1s infinite", boxShadow: "0 0 6px #ef4444" }} />
            LIVE{match.elapsed && ` ${match.elapsed}'`}
          </span>
        : isFinished
          ? <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: "rgba(241,245,249,0.22)", letterSpacing: "1.5px" }}>FT</span>
          : <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: "rgba(241,245,249,0.3)" }}>{formatMatchDate(match.match_date)}</span>
      }
    </div>

    {/* ── Teams + Score ── */}
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 15px 14px" }}>
      <div style={{ flex: 1, textAlign: "center" }}>
        <Logo logo={match.home_logo} name={match.home_team} side="home" />
        <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 12, fontWeight: 700, color: "#f1f5f9", letterSpacing: "0.5px", lineHeight: 1.2 }}>{match.home_team}</div>
      </div>
      <div style={{ textAlign: "center", padding: "0 10px", flexShrink: 0 }}>
        {(isLive || isFinished)
          ? <div ref={scoreRef} style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 38, color: "#f1f5f9", letterSpacing: 3, lineHeight: 1, textShadow: isLive ? "0 0 24px rgba(239,68,68,0.4)" : "none" }}>
              {match.home_score ?? 0} — {match.away_score ?? 0}
            </div>
          : <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, color: "rgba(241,245,249,0.16)", letterSpacing: 6 }}>VS</div>
        }
      </div>
      <div style={{ flex: 1, textAlign: "center" }}>
        <Logo logo={match.away_logo} name={match.away_team} side="away" />
        <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 12, fontWeight: 700, color: "#f1f5f9", letterSpacing: "0.5px", lineHeight: 1.2 }}>{match.away_team}</div>
      </div>
    </div>

    {/* ── Odds strip ── */}
    {!isFinished && <div style={{ display: "flex", borderTop: "1px solid rgba(241,245,249,0.05)", borderBottom: "1px solid rgba(241,245,249,0.05)" }}>
      {[
        { l: "1", o: odds.oddsHome, c: "#10b981", pred: match.home_team },
        { l: "X", o: odds.oddsDraw, c: "#94a3b8", pred: "Nul" },
        { l: "2", o: odds.oddsAway, c: "#ef4444", pred: match.away_team },
      ].map((item, i) => (
        <button key={item.l} className="btn-animated"
          onClick={e => { e.stopPropagation(); onBet(match, item.pred); }}
          style={{ flex: 1, textAlign: "center", background: "transparent", border: "none", borderRight: i < 2 ? "1px solid rgba(241,245,249,0.05)" : "none", padding: "10px 0", cursor: "pointer" }}
          onMouseEnter={e => { e.currentTarget.style.background = `${item.c}10`; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: "rgba(241,245,249,0.26)", marginBottom: 3, letterSpacing: "2px" }}>{item.l}</div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, color: item.c, letterSpacing: 1 }}>{item.o}</div>
        </button>
      ))}
    </div>}

    {/* ── Footer ── */}
    <div style={{ display: "flex", gap: 4, padding: "9px 11px" }}>
      <button className="btn-animated" onClick={e => { e.stopPropagation(); onStats && onStats(match); }}
        style={{ padding: "8px 10px", borderRadius: 2, border: "1px solid rgba(241,245,249,0.08)", background: "transparent", color: "rgba(241,245,249,0.35)", fontSize: 13, cursor: "pointer" }}>📊</button>
      {!isFinished && <button className="btn-animated" onClick={e => { e.stopPropagation(); onBet(match); }}
        style={{ flex: 1, padding: "8px 0", borderRadius: 2, border: `1px solid ${hover ? "rgba(16,185,129,0.45)" : "rgba(241,245,249,0.1)"}`, background: hover ? "rgba(16,185,129,0.08)" : "transparent", color: hover ? "#10b981" : "rgba(241,245,249,0.4)", fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "3px", textTransform: "uppercase", cursor: "pointer" }}>PARIER →</button>}
      {isFinished && <button className="btn-animated" onClick={e => { e.stopPropagation(); onStats && onStats(match); }}
        style={{ flex: 1, padding: "8px 0", borderRadius: 2, border: "1px solid rgba(241,245,249,0.08)", background: "transparent", color: "rgba(241,245,249,0.28)", fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "3px", textTransform: "uppercase", cursor: "pointer" }}>STATS →</button>}
    </div>
  </div>;
}
