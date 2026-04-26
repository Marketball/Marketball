import { useState } from "react";
import { compColor, compEmoji, compLabel } from "../lib/helpers.js";
import MatchCard from "../components/MatchCard.jsx";
import MatchBetsModal from "../components/MatchBetsModal.jsx";

const INTL_SLUGS = ["WC","EURO","NL","FR","WCQ_UEFA","AFCON","COPA","U21UEFA"];
const CLUB_SLUGS = ["PL","FL1","CL","PD","BL1","SA","PPL","EL","BSA","MLS","ERE","TSL"];

export default function MatchesPage({ matches, onBet, loading, session, profile }) {
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

  // Grouper les matchs à venir par jour
  const upcomingByDay=upcoming.reduce((acc,m)=>{
    const day=new Date(m.match_date).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});
    if(!acc[day]) acc[day]=[];
    acc[day].push(m);
    return acc;
  },{});

  return <div className="page-enter">
    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, letterSpacing:2, marginBottom:16 }}>MATCHS</div>

    {/* Tabs principaux */}
    <div style={{ display:"flex", gap:8, marginBottom:18 }}>
      {[{id:"clubs",label:"🏟️ Clubs",count:clubMatches.length},{id:"intl",label:"🌍 Internationaux",count:intlMatches.length}].map(t=>(
        <button key={t.id} onClick={()=>{setTab(t.id);setSubComp("Tous");}} className="btn-animated"
          style={{ flex:1, padding:"12px 0", borderRadius:14, border:`2px solid ${tab===t.id?"#10b981":"rgba(241,245,249,0.07)"}`, background:tab===t.id?"rgba(16,185,129,0.08)":"transparent", color:tab===t.id?"#10b981":"rgba(241,245,249,0.35)", fontWeight:700, fontSize:13, cursor:"pointer", transition:"all 0.2s" }}>
          {t.label} <span style={{ fontSize:11, opacity:0.6 }}>({t.count})</span>
        </button>
      ))}
    </div>

    {/* Sous-catégories */}
    <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>
      {subComps.map(c=>(
        <button key={c} onClick={()=>setSubComp(c)} style={{ padding:"5px 12px", borderRadius:20, border:`1px solid ${subComp===c?compColor(c):"rgba(241,245,249,0.07)"}`, background:subComp===c?`${compColor(c)}12`:"transparent", color:subComp===c?compColor(c):"rgba(241,245,249,0.35)", fontWeight:700, fontSize:11, cursor:"pointer", transition:"all 0.2s" }}>
          {c==="Tous"?"🔵 Tous":`${compEmoji(c)} ${compLabel(c)}`}
        </button>
      ))}
    </div>

    {loading&&<div style={{ textAlign:"center", padding:60, color:"rgba(241,245,249,0.25)", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:2, fontSize:16 }}>CHARGEMENT...</div>}

    {!loading&&live.length===0&&upcoming.length===0&&finished.length===0&&(
      <div style={{ textAlign:"center", padding:60 }}>
        <div style={{ fontSize:40, marginBottom:12 }}>📅</div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:"rgba(241,245,249,0.25)", letterSpacing:2 }}>AUCUN MATCH DISPONIBLE</div>
        <div style={{ fontSize:12, color:"rgba(241,245,249,0.15)", marginTop:6 }}>Reviens bientôt !</div>
      </div>
    )}

    {live.length>0&&<>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
        <div style={{ width:8, height:8, borderRadius:"50%", background:"#ef4444", animation:"pulse 1s infinite", boxShadow:"0 0 8px #ef4444" }} />
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, letterSpacing:2, color:"#ef4444" }}>EN DIRECT</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:11, marginBottom:24 }}>
        {live.map(m=><MatchCard key={m.id} match={m} onBet={onBet} onStats={setStatsMatch} />)}
      </div>
    </>}

    {upcoming.length>0&&<>
      <div style={{ marginBottom:12 }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, letterSpacing:2, color:"#10b981" }}>📅 À VENIR — {upcoming.length} match{upcoming.length>1?"s":""}</div>
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
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, letterSpacing:2, marginBottom:12, color:"rgba(241,245,249,0.3)" }}>MATCHS TERMINÉS</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:11, marginBottom:12 }}>
        {finished.map(m=><MatchCard key={m.id} match={m} onBet={onBet} onStats={setStatsMatch} />)}
      </div>
      <div style={{ textAlign:"center", padding:"16px 0 8px", color:"rgba(241,245,249,0.2)", fontSize:12 }}>📅 Les paris ouvrent dès les prochains matchs programmés</div>
    </>}
    {statsMatch&&<MatchBetsModal match={statsMatch} onClose={()=>setStatsMatch(null)} onBet={(m)=>{setStatsMatch(null);onBet(m);}} session={session} profile={profile} />}
  </div>;
}
