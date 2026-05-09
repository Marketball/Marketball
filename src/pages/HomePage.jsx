import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);
import { AMM } from "../lib/amm.js";
import { getDivision, fmt, mTitle } from "../lib/helpers.js";
import { req } from "../lib/supabase.js";
import { useLang } from "../lib/i18n.jsx";
import BadgeTag from "../components/ui/BadgeTag.jsx";
import XPBar from "../components/ui/XPBar.jsx";
import MCBadge from "../components/ui/MCBadge.jsx";
import SCBadge from "../components/ui/SCBadge.jsx";
import MatchCard from "../components/MatchCard.jsx";
import MarketCard from "../components/MarketCard.jsx";
import ChallengeModal from "../components/ChallengeModal.jsx";

function useIsMobile() {
  const [m, setM] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", h, { passive: true });
    return () => window.removeEventListener("resize", h);
  }, []);
  return m;
}

export default function HomePage({ markets, coins, sc, username, onBet, onViewDetail, onNavigate, matches, onMatchBet, profile, leaderboard, session, showToast, onAwardXP }) {
  const live=matches.filter(m=>m.status==="IN_PLAY"||m.status==="PAUSED").slice(0,3);
  const upcoming=matches.filter(m=>m.status==="SCHEDULED").slice(0,3);
  const div=getDivision(profile?.coins||0);
  const isMobile = useIsMobile();
  const topMarket=markets.length>0?markets.reduce((a,b)=>(b.total_volume||0)>(a.total_volume||0)?b:a,markets[0]):null;
  const myRank=leaderboard?.findIndex(p=>p.id===profile?.id);
  const rankDisplay=myRank>=0?myRank+1:null;
  const [pulse,setPulse]=useState(false);
  const [showTopChallenge,setShowTopChallenge]=useState(false);
  const { t, lang } = useLang();
  const contentRef = useRef(null);
  const heroRef = useRef(null);
  const orbRef = useRef(null);
  useEffect(()=>{const timer=setInterval(()=>setPulse(p=>!p),2000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{
    if (!heroRef.current) return;
    const els = heroRef.current.querySelectorAll("[data-hero]");
    gsap.fromTo(els,
      { opacity:0, y:30, filter:"blur(4px)" },
      { opacity:1, y:0, filter:"blur(0px)", duration:0.6, stagger:0.1, ease:"power3.out", delay:0.1 }
    );
    if (orbRef.current) {
      gsap.to(orbRef.current, { scale:1.15, y:-12, duration:3.5, ease:"sine.inOut", yoyo:true, repeat:-1 });
    }
  }, []);
  useEffect(()=>{
    if (!contentRef.current) return;
    const els = contentRef.current.querySelectorAll(".card-hover");
    if (!els.length) return;
    els.forEach((el, i) => {
      gsap.fromTo(el,
        { opacity:0, y:55, scale:0.91 },
        { opacity:1, y:0, scale:1, duration:0.55, ease:"power3.out", clearProps:"transform,scale", delay: i * 0.06,
          scrollTrigger:{ trigger:el, start:"top 92%", once:true } }
      );
    });
  }, []);

  return <div ref={contentRef} className="page-enter">
    {/* LIGNE HERO : [Quêtes] [Hero] [Classement] sur desktop, hero seul sur mobile */}
    <div style={{ display:(!isMobile&&session)?"grid":"block", gridTemplateColumns:"1fr 2fr 1fr", gap:12, marginBottom:18, alignItems:"stretch" }}>

      {/* Bulle gauche — quêtes */}
      {!isMobile && session && <QuestsBubble profile={profile} session={session} onNavigate={onNavigate} />}

      {/* Hero central */}
      <div ref={heroRef} style={{ background:`linear-gradient(135deg,${div.color}15,rgba(59,130,246,0.04))`, border:`1px solid ${div.color}20`, borderRadius:22, padding:"22px 24px", position:"relative", overflow:"hidden", ...(isMobile||!session?{marginBottom:0}:{}) }}>
        <div ref={orbRef} style={{ position:"absolute", top:-60, right:-60, width:200, height:200, borderRadius:"50%", background:`radial-gradient(circle,${div.color}20,transparent 70%)`, pointerEvents:"none" }} />
        <div data-hero style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#10b981", letterSpacing:3 }}>{t("home.welcome")} {username?.toUpperCase()}</div>
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            {rankDisplay&&<div style={{ display:"flex", alignItems:"center", gap:4, background:"rgba(251,191,36,0.1)", border:"1px solid rgba(251,191,36,0.2)", borderRadius:20, padding:"3px 10px" }}>
              <span style={{ fontSize:11 }}>🏆</span>
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:13, color:"#fbbf24", letterSpacing:1 }}>#{rankDisplay} {t("home.this_week")}</span>
            </div>}
            {(profile?.streak||0)>0&&<div style={{ display:"flex", alignItems:"center", gap:4, background:"rgba(245,158,11,0.12)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:20, padding:"3px 10px" }}>
              <span style={{ fontSize:12 }}>🔥</span>
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:13, color:"#f59e0b", letterSpacing:1 }}>{profile.streak}J</span>
            </div>}
          </div>
        </div>
        <div data-hero style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:`${div.color}18`, border:`1.5px solid ${div.color}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, boxShadow:`0 0 14px ${div.color}30`, flexShrink:0 }}>
            {div.icon}
          </div>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:div.color, letterSpacing:2, lineHeight:1 }}>{div.name}</div>
            <div style={{ fontSize:10, color:"rgba(241,245,249,0.3)", letterSpacing:1, marginTop:2 }}>Division actuelle</div>
          </div>
        </div>
        <div data-hero><XPBar coins={profile?.coins||0} /></div>
        <div data-hero style={{ display:"flex", gap:10, flexWrap:"wrap", marginTop:14 }}><MCBadge amount={coins} size="lg" /><SCBadge amount={sc} size="lg" /></div>
      </div>

      {/* Bulle droite — classement */}
      {!isMobile && session && <RankingBubble profile={profile} leaderboard={leaderboard} onNavigate={onNavigate} />}
    </div>

    {/* MISSIONS DÉMARRAGE */}
    <MissionsStarter profile={profile} session={session} onNavigate={onNavigate} onAwardXP={onAwardXP} showToast={showToast} />

    {/* MARCHE DU MOMENT */}
    {topMarket&&<div style={{ position:"relative", background:"linear-gradient(135deg,rgba(16,185,129,0.1),rgba(59,130,246,0.06))", border:"1px solid rgba(16,185,129,0.2)", borderRadius:20, padding:"18px 20px", marginBottom:20, overflow:"hidden", animation:pulse?"market-pulse 2s ease":"none", transition:"all 0.3s" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"linear-gradient(90deg,#10b981,#3b82f6,#10b981)", backgroundSize:"200% 100%", animation:"shimmer 2s linear infinite" }} />
      <div style={{ position:"absolute", top:-30, right:-30, width:120, height:120, borderRadius:"50%", background:"radial-gradient(circle,rgba(16,185,129,0.1),transparent 70%)", pointerEvents:"none" }} />
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10, cursor:"pointer" }} onClick={()=>onViewDetail && onViewDetail(topMarket)}>
        <div style={{ width:8, height:8, borderRadius:"50%", background:"#10b981", boxShadow:"0 0 8px #10b981", animation:"pulse 1s infinite" }} />
        <span style={{ fontSize:10, fontWeight:800, color:"#10b981", letterSpacing:2 }}>{t("home.market_moment")}</span>
        <span style={{ marginLeft:"auto", fontSize:10, color:"rgba(241,245,249,0.4)" }}>🔥 {fmt(topMarket.total_volume)} {t("home.staked")}</span>
      </div>
      <div style={{ fontWeight:800, fontSize:15, color:"#f1f5f9", marginBottom:12, lineHeight:1.4, cursor:"pointer" }} onClick={()=>onViewDetail && onViewDetail(topMarket)}>{mTitle(topMarket,lang)}</div>
      <div style={{ display:"flex", gap:8, marginBottom:10 }}>
        {[{s:t("common.yes"),side:"yes",i:0},{s:t("common.no"),side:"no",i:1}].map(({s,side,i})=>{
          const pct=i===0?Math.round(AMM.probYes(topMarket.q_yes,topMarket.q_no)*100):100-Math.round(AMM.probYes(topMarket.q_yes,topMarket.q_no)*100);
          const c=i===0?"#10b981":"#ef4444";
          return <button key={s} className="btn-animated" onClick={()=>onBet(topMarket,side)} style={{ flex:1, background:`${c}10`, border:`1px solid ${c}25`, borderRadius:10, padding:"8px 10px", textAlign:"center", cursor:"pointer", transition:"all 0.2s" }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:c, letterSpacing:1 }}>{pct}%</div>
            <div style={{ fontSize:10, color:c, fontWeight:700, opacity:0.7 }}>{s} →</div>
          </button>;
        })}
        <div style={{ flex:1, background:"rgba(241,245,249,0.03)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:10, padding:"8px 10px", textAlign:"center", cursor:"pointer" }} onClick={()=>onViewDetail && onViewDetail(topMarket)}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:"#f1f5f9", letterSpacing:1 }}>{topMarket.participants||0}</div>
          <div style={{ fontSize:10, color:"rgba(241,245,249,0.4)", fontWeight:700 }}>{t("home.players")}</div>
        </div>
      </div>
      <div style={{ display:"flex", gap:6 }}>
        <button className="btn-animated" onClick={()=>onViewDetail && onViewDetail(topMarket)} style={{ flex:1, padding:"8px 0", borderRadius:10, border:"1px solid rgba(16,185,129,0.2)", background:"transparent", color:"rgba(241,245,249,0.4)", fontWeight:700, fontSize:12, cursor:"pointer" }}>{t("home.stats_bettors")}</button>
        {session&&<button className="btn-animated" onClick={()=>setShowTopChallenge(true)} style={{ padding:"8px 14px", borderRadius:10, border:"1px solid rgba(245,158,11,0.2)", background:"rgba(245,158,11,0.04)", color:"#f59e0b", fontWeight:700, fontSize:12, cursor:"pointer" }}>{t("home.challenge_btn")}</button>}
      </div>
    </div>}
    {showTopChallenge&&topMarket&&session&&<ChallengeModal market={topMarket} profile={profile} session={session} onClose={()=>setShowTopChallenge(false)} showToast={showToast||((m)=>alert(m))} />}

    {/* EN DIRECT */}
    {live.length>0&&<>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:2, marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ width:8, height:8, borderRadius:"50%", background:"#ef4444", animation:"pulse 1s infinite", boxShadow:"0 0 8px #ef4444" }} />
        <span style={{ color:"#ef4444" }}>{t("matches.live")}</span>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:11, marginBottom:20 }}>{live.map(m=><MatchCard key={m.id} match={m} onBet={onMatchBet} />)}</div>
    </>}

    {/* MARCHES EN VEDETTE */}
    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:2, marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>
      <span style={{ width:3, height:18, background:"#3b82f6", borderRadius:99, display:"inline-block" }} />{t("home.featured_markets")}
    </div>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))", gap:11 }}>{markets.slice(0,6).map(m=><MarketCard key={m.id} market={m} onBet={onBet} onViewDetail={onViewDetail} session={session} profile={profile} />)}</div>
    <button className="btn-animated" onClick={()=>onNavigate("markets")} style={{ width:"100%", marginTop:14, marginBottom:26, padding:"11px 0", borderRadius:12, border:"1px solid rgba(241,245,249,0.07)", background:"transparent", color:"rgba(241,245,249,0.35)", fontWeight:700, cursor:"pointer", fontSize:13 }}>{t("home.see_all_markets")}</button>

    {/* MATCHS À VENIR */}
    {upcoming.length>0&&<>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:2, marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ width:3, height:18, background:"#10b981", borderRadius:99, display:"inline-block" }} />{t("home.upcoming_matches")}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:11, marginBottom:14 }}>{upcoming.map(m=><MatchCard key={m.id} match={m} onBet={onMatchBet} />)}</div>
      <button className="btn-animated" onClick={()=>onNavigate("matches")} style={{ width:"100%", marginBottom:26, padding:"11px 0", borderRadius:12, border:"1px solid rgba(241,245,249,0.07)", background:"transparent", color:"rgba(241,245,249,0.35)", fontWeight:700, cursor:"pointer", fontSize:13 }}>{t("home.see_all_matches")}</button>
    </>}

    {/* BULLES QUÊTES + CLASSEMENT — mobile (après les matchs) */}
    {session && isMobile && <InfoBubbles profile={profile} session={session} leaderboard={leaderboard} onNavigate={onNavigate} />}

    {/* GUIDE CTA */}
    <div onClick={()=>onNavigate("howto")} className="card-hover" style={{ marginTop:26, background:"rgba(16,185,129,0.04)", border:"1px solid rgba(16,185,129,0.1)", borderRadius:16, padding:"18px 20px", display:"flex", alignItems:"center", gap:14, cursor:"pointer", transition:"all 0.2s" }}>
      <div style={{ width:44, height:44, borderRadius:12, background:"rgba(16,185,129,0.12)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>❓</div>
      <div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:1, marginBottom:2 }}>{t("home.how_title")}</div>
        <div style={{ fontSize:12, color:"rgba(241,245,249,0.4)" }}>{t("home.how_desc")}</div>
      </div>
      <div style={{ fontSize:18, color:"rgba(241,245,249,0.3)", marginLeft:"auto" }}>→</div>
    </div>
  </div>;
}

// ── Conteneur des 2 bulles côte à côte ──────────────────────────────────────
function InfoBubbles({ profile, session, leaderboard, onNavigate }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:18 }}>
      <QuestsBubble profile={profile} session={session} onNavigate={onNavigate} />
      <RankingBubble profile={profile} leaderboard={leaderboard} onNavigate={onNavigate} />
    </div>
  );
}

// ── Bulle quêtes du jour + défis saison ─────────────────────────────────────
function QuestsBubble({ profile, session, onNavigate }) {
  const today = new Date().toISOString().split("T")[0];
  const questKey = `mb_quests_${today}_${profile?.id||""}`;
  const permKey  = `mb_pquests_${profile?.id||""}`;

  const [claimed,   setClaimed]   = useState(() => { try { return JSON.parse(localStorage.getItem(questKey)||"{}"); } catch { return {}; } });
  const [claimedLT, setClaimedLT] = useState(() => { try { return JSON.parse(localStorage.getItem(permKey)||"{}")  ; } catch { return {}; } });
  const [expanded,  setExpanded]  = useState(false);
  const [mktCount,  setMktCount]  = useState(0);
  const [mtchCount, setMtchCount] = useState(0);

  const QUEST_MC = 50;

  useEffect(() => {
    if (!profile?.id || !session) return;
    Promise.all([
      req(`user_bets?user_id=eq.${profile.id}&created_at=gte.${today}T00:00:00&select=id&limit=10`, { _token: session.token }),
      req(`match_bets?user_id=eq.${profile.id}&created_at=gte.${today}T00:00:00&select=id&limit=5`, { _token: session.token }),
    ]).then(([mb, mtb]) => {
      setMktCount(mb?.length || 0);
      setMtchCount(mtb?.length || 0);
    }).catch(() => {});
  }, [profile?.id]);

  const quests = [
    { id:"login",    icon:"🔐", label:"Connexion du jour",  progress:1,                    goal:1 },
    { id:"bet3",     icon:"📊", label:"3 paris marchés",    progress:Math.min(mktCount,3),  goal:3 },
    { id:"matchbet", icon:"⚽", label:"1 pari sur un match",progress:Math.min(mtchCount,1), goal:1 },
  ];

  const ltQuests = [
    { id:"reach_gold3",   icon:"⭐", label:"Atteindre Or III",        done:(profile?.coins||0)>=175001, sc:5 },
    { id:"top3_div",      icon:"🥉", label:"Top 3 de sa division",    done:false, sc:5 },
    { id:"top1_div",      icon:"🥇", label:"Top 1 de sa division",    done:false, sc:5 },
    { id:"reach_diamond", icon:"💎", label:"Atteindre Diamant",       done:(profile?.coins||0)>=600001, sc:5 },
  ];

  const claimedCount = quests.filter(q => claimed[q.id]).length;
  const pct = Math.round((claimedCount / quests.length) * 100);

  return (
    <div style={{ background:"rgba(251,191,36,0.03)", border:"1px solid rgba(251,191,36,0.12)", borderRadius:18, padding:"14px 14px", display:"flex", flexDirection:"column" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:13, letterSpacing:2, color:"#f1f5f9" }}>⚡ QUÊTES DU JOUR</div>
        <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:12, color:"#fbbf24", letterSpacing:1 }}>{claimedCount}/3</span>
      </div>

      {/* Barre progression */}
      <div style={{ height:3, background:"rgba(241,245,249,0.06)", borderRadius:99, marginBottom:10, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:"linear-gradient(90deg,#fbbf24,#f59e0b)", borderRadius:99, transition:"width 0.6s" }} />
      </div>

      {/* Quêtes */}
      <div style={{ display:"flex", flexDirection:"column", gap:5, flex:1 }}>
        {quests.map(q => {
          const done = q.progress >= q.goal;
          const isClaimed = claimed[q.id];
          return (
            <div key={q.id} style={{ display:"flex", alignItems:"center", gap:7, padding:"6px 9px", borderRadius:9, background:isClaimed?"rgba(16,185,129,0.06)":"rgba(241,245,249,0.02)", border:`1px solid ${isClaimed?"rgba(16,185,129,0.12)":"rgba(241,245,249,0.05)"}` }}>
              <span style={{ fontSize:13, flexShrink:0 }}>{q.icon}</span>
              <span style={{ flex:1, fontSize:10, color:isClaimed?"rgba(241,245,249,0.35)":"rgba(241,245,249,0.65)", textDecoration:isClaimed?"line-through":"none", lineHeight:1.3 }}>{q.label}</span>
              {isClaimed
                ? <span style={{ fontSize:11, color:"#10b981", flexShrink:0 }}>✓</span>
                : done
                  ? <button onClick={()=>onNavigate("wallet")} style={{ flexShrink:0, fontSize:9, padding:"3px 7px", borderRadius:6, border:"none", background:"linear-gradient(135deg,#fbbf24,#f59e0b)", color:"#030712", fontWeight:800, cursor:"pointer" }}>+{QUEST_MC} MC</button>
                  : <span style={{ flexShrink:0, fontSize:10, color:"rgba(241,245,249,0.25)", fontFamily:"'Bebas Neue',sans-serif" }}>{q.progress}/{q.goal}</span>
              }
            </div>
          );
        })}
      </div>

      {/* Bouton défis long terme */}
      <button onClick={()=>setExpanded(e=>!e)}
        style={{ width:"100%", marginTop:8, padding:"6px 0", borderRadius:9, border:"1px solid rgba(251,191,36,0.15)", background:"transparent", color:"rgba(251,191,36,0.6)", fontWeight:700, fontSize:9, cursor:"pointer", letterSpacing:1.5, transition:"all 0.2s" }}>
        {expanded ? "▲ MASQUER" : "▼ DÉFIS SAISON (+SC)"}
      </button>

      {expanded && (
        <div style={{ marginTop:7, display:"flex", flexDirection:"column", gap:5 }}>
          {ltQuests.map(q => {
            const isClaimed = claimedLT[q.id];
            return (
              <div key={q.id} style={{ display:"flex", alignItems:"center", gap:7, padding:"6px 9px", borderRadius:9, background:isClaimed?"rgba(16,185,129,0.06)":q.done?"rgba(16,185,129,0.04)":"rgba(241,245,249,0.015)", border:`1px solid ${isClaimed?"rgba(16,185,129,0.12)":q.done&&!isClaimed?"rgba(16,185,129,0.2)":"rgba(241,245,249,0.05)"}` }}>
                <span style={{ fontSize:13, flexShrink:0 }}>{q.icon}</span>
                <span style={{ flex:1, fontSize:10, color:isClaimed?"rgba(241,245,249,0.3)":q.done?"#f1f5f9":"rgba(241,245,249,0.5)", textDecoration:isClaimed?"line-through":"none", lineHeight:1.3 }}>{q.label}</span>
                {isClaimed
                  ? <span style={{ fontSize:11, color:"#10b981", flexShrink:0 }}>✓</span>
                  : q.done
                    ? <button onClick={()=>onNavigate("wallet")} style={{ flexShrink:0, fontSize:9, padding:"3px 7px", borderRadius:6, border:"none", background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", fontWeight:800, cursor:"pointer" }}>+{q.sc} SC</button>
                    : <span style={{ flexShrink:0, fontFamily:"'Bebas Neue',sans-serif", fontSize:10, color:"rgba(241,245,249,0.25)" }}>+{q.sc} SC</span>
                }
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Bulle mini classement division ───────────────────────────────────────────
function RankingBubble({ profile, leaderboard, onNavigate }) {
  const div = getDivision(profile?.coins || 0);
  const [divRank, setDivRank] = useState(null);
  const [divPlayers, setDivPlayers] = useState([]);

  useEffect(() => {
    if (!profile?.id) return;
    const maxFilter = isFinite(div.max) ? `&coins=lte.${div.max}` : "";
    req(`profiles?select=id,username,weekly_profit,coins&coins=gte.${div.min}${maxFilter}&order=weekly_profit.desc&limit=20`)
      .then(players => {
        if (!players?.length) return;
        setDivPlayers(players.slice(0, 5));
        const idx = players.findIndex(p => p.id === profile.id);
        setDivRank(idx >= 0 ? idx + 1 : null);
      }).catch(() => {});
  }, [profile?.id, div.id]);

  const globalIdx = leaderboard?.findIndex(p => p.id === profile?.id);
  const globalRank = globalIdx >= 0 ? globalIdx + 1 : null;

  const top3 = divPlayers.slice(0, 3);
  const meNotInTop3 = divRank !== null && divRank > 3;
  const MEDALS = ["🥇","🥈","🥉"];

  return (
    <div style={{ background:`linear-gradient(135deg,${div.color}0d,rgba(3,7,18,0.4))`, border:`1px solid ${div.color}20`, borderRadius:18, padding:"14px 14px", display:"flex", flexDirection:"column" }}>
      {/* Division header */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
        <div style={{ width:32, height:32, borderRadius:9, background:`${div.color}18`, border:`1.5px solid ${div.color}35`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, flexShrink:0 }}>
          {div.icon}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:13, color:div.color, letterSpacing:1.5, lineHeight:1 }}>{div.name}</div>
          <div style={{ fontSize:9, color:"rgba(241,245,249,0.3)", letterSpacing:1 }}>TA DIVISION</div>
        </div>
        {divRank && (
          <div style={{ textAlign:"center", flexShrink:0 }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:"#fbbf24", letterSpacing:1, lineHeight:1 }}>#{divRank}</div>
            <div style={{ fontSize:8, color:"rgba(241,245,249,0.3)", letterSpacing:1 }}>RANG</div>
          </div>
        )}
      </div>

      {/* Top 3 de la division */}
      <div style={{ display:"flex", flexDirection:"column", gap:4, flex:1 }}>
        {top3.map((p, i) => {
          const isMe = p.id === profile?.id;
          return (
            <div key={p.id} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 8px", borderRadius:8, background:isMe?`${div.color}12`:"rgba(241,245,249,0.015)", border:`1px solid ${isMe?div.color+"25":"rgba(241,245,249,0.04)"}` }}>
              <span style={{ fontSize:12, flexShrink:0 }}>{MEDALS[i]}</span>
              <span style={{ flex:1, fontSize:10, fontWeight:isMe?800:500, color:isMe?"#fbbf24":"rgba(241,245,249,0.6)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.username}{isMe?" (toi)":""}</span>
              <span style={{ flexShrink:0, fontFamily:"'Bebas Neue',sans-serif", fontSize:11, color:"#10b981", letterSpacing:0.5 }}>+{fmt(p.weekly_profit||0)}</span>
            </div>
          );
        })}

        {/* Ma position si hors top 3 */}
        {meNotInTop3 && (
          <div style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 8px", borderRadius:8, background:"rgba(251,191,36,0.06)", border:"1px solid rgba(251,191,36,0.15)" }}>
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:11, color:"#fbbf24", flexShrink:0 }}>#{divRank}</span>
            <span style={{ flex:1, fontSize:10, fontWeight:800, color:"#fbbf24", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{profile?.username} (toi)</span>
            <span style={{ flexShrink:0, fontFamily:"'Bebas Neue',sans-serif", fontSize:11, color:"#10b981" }}>+{fmt(profile?.weekly_profit||0)}</span>
          </div>
        )}

        {divPlayers.length === 0 && (
          <div style={{ fontSize:10, color:"rgba(241,245,249,0.2)", textAlign:"center", padding:"10px 0" }}>Chargement...</div>
        )}
      </div>

      {/* Rang global + lien */}
      <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:6 }}>
        {globalRank && (
          <div style={{ fontSize:9, color:"rgba(241,245,249,0.35)", background:"rgba(241,245,249,0.03)", borderRadius:6, padding:"3px 8px", border:"1px solid rgba(241,245,249,0.06)" }}>
            Global <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:11, color:"#fbbf24" }}>#{globalRank}</span>
          </div>
        )}
        <button onClick={()=>onNavigate("leaderboard")}
          style={{ flex:1, padding:"5px 0", borderRadius:8, border:`1px solid ${div.color}20`, background:"transparent", color:div.color, fontWeight:700, fontSize:9, cursor:"pointer", letterSpacing:1 }}>
          CLASSEMENT →
        </button>
      </div>
    </div>
  );
}

// ── Missions démarrage (nouveaux joueurs) ────────────────────────────────────
function MissionsStarter({ profile, session, onNavigate, onAwardXP, showToast }) {
  const hasBet      = (profile?.total_bets || 0) > 0;
  const hasInvited  = (profile?.referral_sc_earned || 0) > 0;
  const [discordDone, setDiscordDone] = useState(() => localStorage.getItem("mb_discord_done") === "1");

  const allDone = hasBet && discordDone && hasInvited;
  // Affiche uniquement pour les nouveaux joueurs (< 10 paris) et tant que tout n'est pas fait
  if (!session || allDone || (profile?.total_bets || 0) >= 10) return null;

  const handleDiscord = async () => {
    if (discordDone) return;
    window.open("https://discord.gg/marketball", "_blank");
    localStorage.setItem("mb_discord_done", "1");
    setDiscordDone(true);
    try { await onAwardXP?.(20); } catch {}
    showToast?.("Discord rejoint ! +20 XP 🎉");
  };

  const handleFirstBet = () => onNavigate?.("markets");

  const missions = [
    {
      done: true,
      icon: "⚽",
      label: "Compte créé",
      reward: "+3 000 MC",
      rewardColor: "#fbbf24",
      action: null,
    },
    {
      done: hasBet,
      icon: "📊",
      label: "Faire ton premier pari",
      reward: "+10 XP",
      rewardColor: "#3b82f6",
      action: hasBet ? null : handleFirstBet,
      cta: "Parier →",
    },
    {
      done: discordDone,
      icon: "💬",
      label: "Rejoindre Discord",
      reward: "+20 XP",
      rewardColor: "#5865f2",
      action: discordDone ? null : handleDiscord,
      cta: "Rejoindre →",
    },
    {
      done: hasInvited,
      icon: "🎁",
      label: "Inviter un ami",
      reward: "+5 SC",
      rewardColor: "#10b981",
      action: hasInvited ? null : () => onNavigate?.("profile"),
      cta: "Mon code →",
    },
  ];

  const doneCount = missions.filter(m => m.done).length;
  const pct = Math.round((doneCount / missions.length) * 100);

  return (
    <div style={{ marginBottom: 20, background: "rgba(16,185,129,0.03)", border: "1px solid rgba(16,185,129,0.1)", borderRadius: 18, padding: "16px 18px", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, letterSpacing: 2, color: "#f1f5f9" }}>
            🎯 MISSIONS DÉMARRAGE
          </span>
        </div>
        <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, color: "#10b981", letterSpacing: 1 }}>
          {doneCount}/{missions.length}
        </span>
      </div>

      {/* Barre de progression */}
      <div style={{ height: 4, background: "rgba(241,245,249,0.06)", borderRadius: 99, marginBottom: 14, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#10b981,#3b82f6)", borderRadius: 99, transition: "width 0.6s ease" }} />
      </div>

      {/* Missions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {missions.map((m, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 12px", borderRadius: 11,
            background: m.done ? "rgba(16,185,129,0.05)" : "rgba(241,245,249,0.02)",
            border: `1px solid ${m.done ? "rgba(16,185,129,0.12)" : "rgba(241,245,249,0.06)"}`,
            transition: "all 0.3s",
          }}>
            {/* Checkbox */}
            <div style={{
              width: 22, height: 22, borderRadius: 7, flexShrink: 0,
              background: m.done ? "#10b981" : "rgba(241,245,249,0.05)",
              border: `1.5px solid ${m.done ? "#10b981" : "rgba(241,245,249,0.12)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.3s",
            }}>
              {m.done && <span style={{ fontSize: 12, color: "#fff" }}>✓</span>}
            </div>

            <span style={{ fontSize: 16, flexShrink: 0 }}>{m.icon}</span>

            <span style={{ flex: 1, fontSize: 13, color: m.done ? "rgba(241,245,249,0.4)" : "rgba(241,245,249,0.75)", textDecoration: m.done ? "line-through" : "none", textDecorationColor: "rgba(241,245,249,0.2)" }}>
              {m.label}
            </span>

            {m.done ? (
              <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 13, color: m.rewardColor, letterSpacing: 1, opacity: 0.6 }}>
                {m.reward}
              </span>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 12, color: m.rewardColor, letterSpacing: 1 }}>
                  {m.reward}
                </span>
                {m.action && (
                  <button onClick={m.action}
                    style={{ padding: "5px 12px", borderRadius: 8, border: "none", background: "rgba(16,185,129,0.15)", color: "#10b981", fontWeight: 800, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>
                    {m.cta}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
