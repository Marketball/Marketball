import { useState, useEffect } from "react";
import { req } from "../lib/supabase.js";
import { fmt } from "../lib/helpers.js";
import CommentsSection from "./ui/CommentsSection.jsx";

const BET_LABELS = { winner:"🏆 Vainqueur", exact_score:"🎯 Score exact", first_scorer:"⚽ 1er buteur", scorer:"🥅 Buteur", over_under:"📊 +/- buts" };

export default function MatchBetsModal({ match, onClose, onBet, session, profile }) {
  const [bets, setBets] = useState(null);
  const [tab, setTab] = useState("repartition");
  const matchTitle = `${match.home_team} vs ${match.away_team}`;

  useEffect(() => {
    req(`match_bets?match_title=eq.${encodeURIComponent(matchTitle)}&select=bet_type,prediction,cost,status,username&order=created_at.desc&limit=300`, session ? { _token: session.token } : undefined)
      .then(d => setBets(d || []))
      .catch(() => setBets([]));
  }, [matchTitle]);

  const totalBets = bets?.length || 0;
  const totalVolume = bets?.reduce((s,b) => s+(b.cost||0), 0) || 0;

  // Grouper par bet_type puis prediction
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

  const TYPE_COLORS = ["#10b981","#3b82f6","#f59e0b","#8b5cf6","#ef4444","#ec4899"];

  const TABS = [
    { id:"repartition", label:"📊 Répartition" },
    { id:"parieurs",    label:`👥 Parieurs (${totalBets})` },
    { id:"comments",   label:"💬 Commentaires" },
  ];

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(3,7,18,0.88)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(16px)", animation:"fadeIn 0.2s ease", padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"rgba(15,20,40,0.97)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:22, padding:24, width:430, maxWidth:"100%", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 50px 100px rgba(0,0,0,0.6)", animation:"fadeInUp 0.3s ease" }}>

        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:2, marginBottom:3 }}>STATISTIQUES</div>
        <div style={{ fontSize:12, color:"rgba(241,245,249,0.35)", marginBottom:16 }}>{matchTitle}</div>

        {/* Stats globales */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:16 }}>
          {[{label:"PARIS",val:fmt(totalBets)},{label:"VOLUME",val:`🪙 ${fmt(totalVolume)}`}].map(s=>(
            <div key={s.label} style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:10, padding:"9px 8px", textAlign:"center" }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:1 }}>{s.val}</div>
              <div style={{ fontSize:9, color:"rgba(241,245,249,0.3)", fontWeight:700, letterSpacing:1, marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:6, marginBottom:16, borderBottom:"1px solid rgba(241,245,249,0.06)", paddingBottom:12 }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{ flex:1, padding:"7px 4px", borderRadius:10, border:`1px solid ${tab===t.id?"#10b981":"rgba(241,245,249,0.07)"}`, background:tab===t.id?"rgba(16,185,129,0.08)":"transparent", color:tab===t.id?"#10b981":"rgba(241,245,249,0.35)", fontWeight:700, fontSize:10, cursor:"pointer", transition:"all 0.2s", whiteSpace:"nowrap" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab : Répartition */}
        {tab==="repartition"&&<>
          {bets === null ? (
            <div style={{ textAlign:"center", padding:20, color:"rgba(241,245,249,0.25)" }}>Chargement...</div>
          ) : totalBets === 0 ? (
            <div style={{ textAlign:"center", padding:24, color:"rgba(241,245,249,0.2)", fontSize:13 }}>Aucun pari pour l'instant</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              {Object.entries(groups).map(([betType, predictions], gi) => {
                const typeTotal = Object.values(predictions).reduce((s,v) => s+v.volume, 0);
                const sorted = Object.entries(predictions).sort((a,b) => b[1].volume-a[1].volume);
                return (
                  <div key={betType}>
                    <div style={{ fontSize:11, fontWeight:700, color:"rgba(241,245,249,0.35)", marginBottom:8, letterSpacing:0.5 }}>{BET_LABELS[betType]||betType}</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                      {sorted.slice(0,6).map(([pred, data], i) => {
                        const pct = typeTotal > 0 ? Math.round((data.volume / typeTotal) * 100) : 0;
                        const color = TYPE_COLORS[(gi + i) % TYPE_COLORS.length];
                        return (
                          <div key={pred}>
                            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                              <span style={{ fontSize:12, fontWeight:700 }}>{pred}</span>
                              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                                <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:13, color, letterSpacing:1 }}>{pct}%</span>
                                <span style={{ fontSize:10, color:"rgba(241,245,249,0.3)" }}>{data.count} pari{data.count>1?"s":""} · 🪙{fmt(data.volume)}</span>
                              </div>
                            </div>
                            <div style={{ height:6, background:"rgba(241,245,249,0.05)", borderRadius:99, overflow:"hidden" }}>
                              <div style={{ width:`${pct}%`, height:"100%", background:`linear-gradient(90deg,${color},${color}88)`, borderRadius:99, transition:"width 0.6s ease" }} />
                            </div>
                          </div>
                        );
                      })}
                      {sorted.length > 6 && <div style={{ fontSize:11, color:"rgba(241,245,249,0.2)", textAlign:"center" }}>+{sorted.length-6} autres</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>}

        {/* Tab : Parieurs */}
        {tab==="parieurs"&&<>
          {bets === null ? (
            <div style={{ textAlign:"center", padding:20, color:"rgba(241,245,249,0.25)" }}>Chargement...</div>
          ) : bets.length === 0 ? (
            <div style={{ textAlign:"center", padding:24, color:"rgba(241,245,249,0.2)", fontSize:13 }}>Aucun pari pour l'instant</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:340, overflowY:"auto" }}>
              {bets.map((b, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.05)", borderRadius:10 }}>
                  <div style={{ width:28, height:28, borderRadius:8, background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:"#10b981", flexShrink:0 }}>
                    {(b.username||"?").slice(0,2).toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:12, color:"#f1f5f9" }}>{b.username||"Joueur"}</div>
                    <div style={{ fontSize:10, color:"rgba(241,245,249,0.3)" }}>
                      <span style={{ color:"#60a5fa", fontWeight:700 }}>{BET_LABELS[b.bet_type]?.replace(/[🏆🎯⚽🥅📊]/u,"").trim()||b.bet_type}</span>
                      {" · "}<span style={{ color:"#f1f5f9" }}>{b.prediction}</span>
                      {" · "}{fmt(b.cost)} MC
                    </div>
                  </div>
                  <div style={{ fontSize:10, padding:"2px 7px", borderRadius:12, background:b.status==="won"?"rgba(16,185,129,0.12)":b.status==="lost"?"rgba(239,68,68,0.1)":"rgba(251,191,36,0.08)", color:b.status==="won"?"#10b981":b.status==="lost"?"#ef4444":"#fbbf24", fontWeight:700, flexShrink:0 }}>
                    {b.status==="won"?"✓":b.status==="lost"?"✗":"⏳"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>}

        {/* Tab : Commentaires */}
        {tab==="comments"&&(
          <CommentsSection refId={String(match.id)} refType="match" session={session} profile={profile} />
        )}

        <div style={{ display:"flex", gap:8, marginTop:16 }}>
          <button onClick={onClose} style={{ flex:1, padding:"11px 0", borderRadius:11, border:"1px solid rgba(241,245,249,0.1)", background:"transparent", color:"rgba(241,245,249,0.4)", fontWeight:700, fontSize:13, cursor:"pointer" }}>Fermer</button>
          <button onClick={()=>{onClose();onBet(match);}} style={{ flex:2, padding:"11px 0", borderRadius:11, border:"none", background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", fontWeight:800, fontSize:13, cursor:"pointer" }}>PARIER →</button>
        </div>
      </div>
    </div>
  );
}
