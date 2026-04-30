import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { compColor, compEmoji, compLabel } from "../lib/helpers.js";
import MatchCard from "../components/MatchCard.jsx";
import MatchBetsModal from "../components/MatchBetsModal.jsx";
import { useLang } from "../lib/i18n.jsx";

const INTL_SLUGS = ["WC","EURO","NL","FR","WCQ_UEFA","AFCON","COPA","U21UEFA"];
const CLUB_SLUGS = ["PL","FL1","CL","PD","BL1","SA","PPL","EL","BSA","MLS","ERE","TSL"];

export default function MatchesPage({ matches, onBet, loading, session, profile }) {
  const { t } = useLang();
  const contentRef = useRef(null);
  const [tab,setTab]=useState("clubs");
  const [subComp,setSubComp]=useState("Tous");
  const [statsMatch,setStatsMatch]=useState(null);

  const clubMatches=matches.filter(m=>CLUB_SLUGS.includes(m.competition));
  const intlMatches=matches.filter(m=>INTL_SLUGS.includes(m.competition));
  const activeMatches=tab==="clubs"?clubMatches:intlMatches;

  const subComps=tab==="intl"
    ? ["Tous",...new Set(intlMatches.map(m=>m.competition))]
    : ["Tous",...new Set(clubMatches.map(m=>m.competition))];

  const filtered=subComp==="Tous"?activeMatches:activeMatches.filter(m=>m.competition===subComp);
  const live=filtered.filter(m=>m.status==="IN_PLAY"||m.status==="PAUSED");
  const upcoming=filtered.filter(m=>m.status==="SCHEDULED");
  const finished=filtered.filter(m=>m.status==="FINISHED").slice(0,6);

  useEffect(()=>{
    if (!contentRef.current) return;
    const els = contentRef.current.querySelectorAll(".card-hover");
    if (!els.length) return;
    gsap.fromTo(els, { opacity:0, y:50, scale:0.92 }, { opacity:1, y:0, scale:1, duration:0.45, stagger:0.05, ease:"power3.out", clearProps:"transform,scale" });
  }, [tab, subComp]);

  // Grouper les matchs à venir par jour
  const upcomingByDay=upcoming.reduce((acc,m)=>{
    const locale = t("nav.home")==="Home" ? "en-GB" : "fr-FR";
    const day=new Date(m.match_date).toLocaleDateString(locale,{weekday:"long",day:"numeric",month:"long"});
    if(!acc[day]) acc[day]=[];
    acc[day].push(m);
    return acc;
  },{});

  return <div ref={contentRef} className="page-enter">
    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, letterSpacing:2, marginBottom:16 }}>{t("matches.title")}</div>

    {/* Tabs principaux */}
    <div style={{ display:"flex", gap:8, marginBottom:18 }}>
      {[{id:"clubs",label:t("matches.clubs"),count:clubMatches.length},{id:"intl",label:t("matches.intl"),count:intlMatches.length}].map(tb=>(
        <button key={tb.id} onClick={()=>{setTab(tb.id);setSubComp("Tous");}} className="btn-animated"
          style={{ flex:1, padding:"12px 0", borderRadius:14, border:`2px solid ${tab===tb.id?"#10b981":"rgba(241,245,249,0.07)"}`, background:tab===tb.id?"rgba(16,185,129,0.08)":"transparent", color:tab===tb.id?"#10b981":"rgba(241,245,249,0.35)", fontWeight:700, fontSize:13, cursor:"pointer", transition:"all 0.2s" }}>
          {tb.label} <span style={{ fontSize:11, opacity:0.6 }}>({tb.count})</span>
        </button>
      ))}
    </div>

    {/* Sous-catégories */}
    <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>
      {subComps.map(c=>(
        <button key={c} onClick={()=>setSubComp(c)} style={{ padding:"5px 12px", borderRadius:20, border:`1px solid ${subComp===c?compColor(c):"rgba(241,245,249,0.07)"}`, background:subComp===c?`${compColor(c)}12`:"transparent", color:subComp===c?compColor(c):"rgba(241,245,249,0.35)", fontWeight:700, fontSize:11, cursor:"pointer", transition:"all 0.2s" }}>
          {c==="Tous"?`🔵 ${t("matches.all")}`:`${compEmoji(c)} ${compLabel(c)}`}
        </button>
      ))}
    </div>

    {loading&&<div style={{ textAlign:"center", padding:60, color:"rgba(241,245,249,0.25)", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:2, fontSize:16 }}>{t("matches.loading").toUpperCase()}</div>}

    {!loading&&live.length===0&&upcoming.length===0&&finished.length===0&&(
      <div style={{ textAlign:"center", padding:60 }}>
        <div style={{ fontSize:40, marginBottom:12 }}>📅</div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:"rgba(241,245,249,0.25)", letterSpacing:2 }}>{t("matches.no_live").toUpperCase()}</div>
      </div>
    )}

    {live.length>0&&<>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
        <div style={{ width:8, height:8, borderRadius:"50%", background:"#ef4444", animation:"pulse 1s infinite", boxShadow:"0 0 8px #ef4444" }} />
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, letterSpacing:2, color:"#ef4444" }}>{t("matches.live")}</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:11, marginBottom:24 }}>
        {live.map(m=><MatchCard key={m.id} match={m} onBet={onBet} onStats={setStatsMatch} />)}
      </div>
    </>}

    {upcoming.length>0&&<>
      <div style={{ marginBottom:12 }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, letterSpacing:2, color:"#10b981" }}>📅 {t("matches.upcoming")} — {upcoming.length} match{upcoming.length>1?"s":""}</div>
      </div>
      {Object.entries(upcomingByDay).map(([day,dayMatches])=>(
        <div key={day} style={{ marginBottom:20 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"rgba(241,245,249,0.4)", letterSpacing:1.5, textTransform:"uppercase", marginBottom:8, paddingLeft:4 }}>{day}</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:11 }}>
            {dayMatches.map(m=><MatchCard key={m.id} match={m} onBet={onBet} onStats={setStatsMatch} />)}
          </div>
        </div>
      ))}
    </>}
    {!loading&&finished.length>0&&live.length===0&&upcoming.length===0&&<>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, letterSpacing:2, marginBottom:12, color:"rgba(241,245,249,0.3)" }}>{t("matches.finished")}</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:11, marginBottom:12 }}>
        {finished.map(m=><MatchCard key={m.id} match={m} onBet={onBet} onStats={setStatsMatch} />)}
      </div>
    </>}
    {statsMatch&&<MatchBetsModal match={statsMatch} onClose={()=>setStatsMatch(null)} onBet={(m)=>{setStatsMatch(null);onBet(m);}} session={session} profile={profile} />}
  </div>;
}
