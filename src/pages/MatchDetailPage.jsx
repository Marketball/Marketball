import { useState, useEffect } from "react";
import { req } from "../lib/supabase.js";
import { fmt, compColor, compEmoji, compLabel, formatMatchDate, getClubColor } from "../lib/helpers.js";
import CommentsSection from "../components/ui/CommentsSection.jsx";

const BET_LABELS = { winner:"🏆 Vainqueur", exact_score:"🎯 Score exact", first_scorer:"⚽ 1er buteur", scorer:"🥅 Buteur", over_under:"📊 +/- buts" };
const TYPE_COLORS = ["#10b981","#3b82f6","#f59e0b","#8b5cf6","#ef4444","#ec4899"];
const TABS = [
  { id:"repartition", label:"📊 Répartition" },
  { id:"parieurs",    label:"👥 Parieurs" },
  { id:"comments",   label:"💬 Commentaires" },
];

function Logo({ logo, name, side }) {
  const [err, setErr] = useState(false);
  const clubColor = getClubColor(name);
  if (logo && !err) return (
    <img src={logo} alt={name} onError={() => setErr(true)}
      style={{ width:52, height:52, objectFit:"contain", display:"block", margin:"0 auto 8px", filter:"drop-shadow(0 2px 12px rgba(0,0,0,0.6))" }} />
  );
  const init = name ? name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() : "?";
  return <div style={{ width:52, height:52, borderRadius:"50%", background:`${clubColor}20`, border:`2px solid ${clubColor}45`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 8px", fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:clubColor, letterSpacing:1 }}>{init}</div>;
}

export default function MatchDetailPage({ match, onBack, onBet, session, profile }) {
  const [bets, setBets] = useState(null);
  const [tab, setTab] = useState("repartition");
  const matchTitle = `${match.home_team} vs ${match.away_team}`;
  const isLive = match.status === "IN_PLAY" || match.status === "PAUSED";
  const isFinished = match.status === "FINISHED";
  const cc = compColor(match.competition);

  useEffect(() => {
    req(`match_bets?match_title=eq.${encodeURIComponent(matchTitle)}&select=bet_type,prediction,cost,status,username&order=created_at.desc&limit=300`,
      session ? { _token: session.token } : undefined)
      .then(d => setBets(d || []))
      .catch(() => setBets([]));
  }, [matchTitle]);

  const totalBets = bets?.length || 0;
  const totalVolume = bets?.reduce((s,b) => s+(b.cost||0), 0) || 0;

  const groups = {};
  if (bets) {
    bets.forEach(b => {
      const t = b.bet_type || "winner";
      if (!groups[t]) groups[t] = {};
      const p = b.prediction || "?";
      if (!groups[t][p]) groups[t][p] = { count:0, volume:0 };
      groups[t][p].count++;
      groups[t][p].volume += b.cost || 0;
    });
  }

  return (
    <div className="page-enter" style={{ maxWidth:540, margin:"0 auto", paddingBottom:40 }}>
      {/* Back */}
      <button onClick={onBack} style={{ display:"flex", alignItems:"center", gap:6, background:"transparent", border:"none", color:"rgba(241,245,249,0.45)", cursor:"pointer", padding:"0 0 16px", fontWeight:700, fontSize:13 }}>
        ← Retour aux matchs
      </button>

      {/* Match header */}
      <div style={{ background:"rgba(241,245,249,0.02)", border:`1px solid ${isLive?"rgba(239,68,68,0.3)":"rgba(241,245,249,0.08)"}`, borderRadius:18, padding:"24px 20px", marginBottom:20, position:"relative", overflow:"hidden", boxShadow:isLive?"0 0 40px rgba(239,68,68,0.08)":"none" }}>
        <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:isLive?"#ef4444":cc, opacity:0.7 }} />

        {/* Competition + status */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <span style={{ fontSize:10, fontWeight:800, color:cc, background:`${cc}12`, padding:"4px 10px", borderRadius:6, border:`1px solid ${cc}24`, letterSpacing:"1.5px", textTransform:"uppercase" }}>
            {compEmoji(match.competition)} {compLabel(match.competition)}
          </span>
          {isLive
            ? <span style={{ fontSize:10, fontWeight:800, color:"#ef4444", display:"flex", alignItems:"center", gap:5, letterSpacing:"1px" }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:"#ef4444", display:"inline-block", animation:"pulse 1s infinite", boxShadow:"0 0 6px #ef4444" }} />
                LIVE{match.elapsed && <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:12, letterSpacing:1 }}> {match.elapsed}'</span>}
              </span>
            : isFinished
              ? <span style={{ fontSize:10, color:"rgba(241,245,249,0.3)", fontWeight:700, letterSpacing:"1.5px" }}>TERMINÉ</span>
              : <span style={{ fontSize:11, color:"rgba(241,245,249,0.4)", fontWeight:600 }}>{formatMatchDate(match.match_date)}</span>
          }
        </div>

        {/* Teams + score */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ flex:1, textAlign:"center" }}>
            <Logo logo={match.home_logo} name={match.home_team} side="home" />
            <div style={{ fontSize:13, fontWeight:800, color:"#f1f5f9", lineHeight:1.3 }}>{match.home_team}</div>
          </div>
          <div style={{ textAlign:"center", padding:"0 16px", flexShrink:0 }}>
            {(isLive || isFinished)
              ? <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:48, color:"#f1f5f9", letterSpacing:4, lineHeight:1, textShadow:isLive?"0 0 24px rgba(239,68,68,0.4)":"none" }}>
                  {match.home_score ?? 0} — {match.away_score ?? 0}
                </div>
              : <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:"rgba(241,245,249,0.18)", letterSpacing:6 }}>VS</div>
            }
          </div>
          <div style={{ flex:1, textAlign:"center" }}>
            <Logo logo={match.away_logo} name={match.away_team} side="away" />
            <div style={{ fontSize:13, fontWeight:800, color:"#f1f5f9", lineHeight:1.3 }}>{match.away_team}</div>
          </div>
        </div>

        {/* Scorers if live */}
        {isLive && match.scorers?.length > 0 && (
          <div style={{ marginTop:16, padding:"10px 14px", background:"rgba(239,68,68,0.05)", borderRadius:10, border:"1px solid rgba(239,68,68,0.12)" }}>
            <div style={{ fontSize:10, color:"rgba(241,245,249,0.35)", letterSpacing:1, fontWeight:700, marginBottom:6 }}>⚽ BUTS</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {match.scorers.map((s,i) => (
                <span key={i} style={{ fontSize:11, color:"#f1f5f9", background:"rgba(241,245,249,0.05)", padding:"3px 8px", borderRadius:6 }}>
                  {s.name} <span style={{ color:"rgba(241,245,249,0.4)" }}>{s.minute}'</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stats globales */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
        {[{label:"PARIS",val:fmt(totalBets)},{label:"VOLUME",val:`🪙 ${fmt(totalVolume)}`}].map(s=>(
          <div key={s.label} style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:12, padding:"12px 10px", textAlign:"center" }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:1 }}>{s.val}</div>
            <div style={{ fontSize:9, color:"rgba(241,245,249,0.3)", fontWeight:700, letterSpacing:1, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:6, marginBottom:16 }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ flex:1, padding:"9px 6px", borderRadius:11, border:`1px solid ${tab===t.id?"#10b981":"rgba(241,245,249,0.07)"}`, background:tab===t.id?"rgba(16,185,129,0.08)":"transparent", color:tab===t.id?"#10b981":"rgba(241,245,249,0.35)", fontWeight:700, fontSize:11, cursor:"pointer", transition:"all 0.2s" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Répartition */}
      {tab==="repartition"&&(
        bets===null ? <div style={{ textAlign:"center", padding:30, color:"rgba(241,245,249,0.25)" }}>Chargement...</div>
        : totalBets===0 ? <div style={{ textAlign:"center", padding:40, color:"rgba(241,245,249,0.2)", fontSize:13 }}>Aucun pari pour l'instant</div>
        : <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
            {Object.entries(groups).map(([betType, predictions], gi) => {
              const typeTotal = Object.values(predictions).reduce((s,v)=>s+v.volume,0);
              const sorted = Object.entries(predictions).sort((a,b)=>b[1].volume-a[1].volume);
              return (
                <div key={betType} style={{ background:"rgba(241,245,249,0.01)", border:"1px solid rgba(241,245,249,0.05)", borderRadius:12, padding:"14px 16px" }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"rgba(241,245,249,0.45)", marginBottom:12, letterSpacing:0.5 }}>{BET_LABELS[betType]||betType}</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {sorted.slice(0,6).map(([pred,data],i)=>{
                      const pct = typeTotal>0?Math.round((data.volume/typeTotal)*100):0;
                      const color = TYPE_COLORS[(gi+i)%TYPE_COLORS.length];
                      return (
                        <div key={pred}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                            <span style={{ fontSize:13, fontWeight:700 }}>{pred}</span>
                            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14, color, letterSpacing:1 }}>{pct}%</span>
                              <span style={{ fontSize:10, color:"rgba(241,245,249,0.3)" }}>{data.count} pari{data.count>1?"s":""} · 🪙{fmt(data.volume)}</span>
                            </div>
                          </div>
                          <div style={{ height:6, background:"rgba(241,245,249,0.05)", borderRadius:99, overflow:"hidden" }}>
                            <div style={{ width:`${pct}%`, height:"100%", background:`linear-gradient(90deg,${color},${color}88)`, borderRadius:99, transition:"width 0.6s ease" }} />
                          </div>
                        </div>
                      );
                    })}
                    {sorted.length>6&&<div style={{ fontSize:11, color:"rgba(241,245,249,0.2)", textAlign:"center" }}>+{sorted.length-6} autres</div>}
                  </div>
                </div>
              );
            })}
          </div>
      )}

      {/* Tab: Parieurs */}
      {tab==="parieurs"&&(
        bets===null ? <div style={{ textAlign:"center", padding:30, color:"rgba(241,245,249,0.25)" }}>Chargement...</div>
        : bets.length===0 ? <div style={{ textAlign:"center", padding:40, color:"rgba(241,245,249,0.2)", fontSize:13 }}>Aucun pari pour l'instant</div>
        : <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {bets.map((b,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.05)", borderRadius:11 }}>
                <div style={{ width:32, height:32, borderRadius:9, background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:"#10b981", flexShrink:0 }}>
                  {(b.username||"?").slice(0,2).toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:"#f1f5f9" }}>{b.username||"Joueur"}</div>
                  <div style={{ fontSize:10, color:"rgba(241,245,249,0.3)" }}>
                    <span style={{ color:"#60a5fa", fontWeight:700 }}>{BET_LABELS[b.bet_type]?.replace(/[🏆🎯⚽🥅📊]/u,"").trim()||b.bet_type}</span>
                    {" · "}<span style={{ color:"#f1f5f9" }}>{b.prediction}</span>
                    {" · "}{fmt(b.cost)} MC
                  </div>
                </div>
                <div style={{ fontSize:10, padding:"3px 8px", borderRadius:12, background:b.status==="won"?"rgba(16,185,129,0.12)":b.status==="lost"?"rgba(239,68,68,0.1)":"rgba(251,191,36,0.08)", color:b.status==="won"?"#10b981":b.status==="lost"?"#ef4444":"#fbbf24", fontWeight:700, flexShrink:0 }}>
                  {b.status==="won"?"✓":b.status==="lost"?"✗":"⏳"}
                </div>
              </div>
            ))}
          </div>
      )}

      {/* Tab: Commentaires */}
      {tab==="comments"&&(
        <CommentsSection refId={String(match.id)} refType="match" session={session} profile={profile} />
      )}

      {/* CTA Parier */}
      {!isFinished&&(
        <div style={{ marginTop:28 }}>
          <button onClick={()=>onBet(match)} className="btn-animated"
            style={{ width:"100%", padding:"16px 0", borderRadius:14, border:"none", background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", fontWeight:800, fontSize:16, letterSpacing:"2px", cursor:"pointer", boxShadow:"0 10px 30px rgba(16,185,129,0.3)" }}>
            PARIER SUR CE MATCH →
          </button>
        </div>
      )}
    </div>
  );
}
