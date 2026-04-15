import { useState, useEffect } from "react";
import { req } from "../lib/supabase.js";
import { BADGES } from "../lib/constants.js";
import { getLevel, getBadge, getSubPlan, fmt } from "../lib/helpers.js";
import BadgeTag from "../components/ui/BadgeTag.jsx";
import SubBadge from "../components/ui/SubBadge.jsx";
import Avatar from "../components/ui/Avatar.jsx";
import XPBar from "../components/ui/XPBar.jsx";

const WEEKLY_REWARDS = [
  { rank: 1, sc: 25, emoji: "🥇", color: "#fbbf24" },
  { rank: 2, sc: 20, emoji: "🥈", color: "#94a3b8" },
  { rank: 3, sc: 15, emoji: "🥉", color: "#cd7f32" },
  { rank: 4, sc: 5, emoji: "4️⃣", color: "#6b7280" },
  { rank: 5, sc: 5, emoji: "5️⃣", color: "#6b7280" },
];

export function useCountdown() {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const nextMonday = new Date(now);
      const day = now.getDay();
      const daysUntilMonday = day === 0 ? 1 : 8 - day;
      nextMonday.setDate(now.getDate() + daysUntilMonday);
      nextMonday.setHours(0, 0, 0, 0);
      const diff = nextMonday - now;
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${d}j ${String(h).padStart(2,"0")}h ${String(m).padStart(2,"0")}m ${String(s).padStart(2,"0")}s`);
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, []);
  return timeLeft;
}

export function PublicProfilePage({ username, onBack, leaderboard }) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    const load = async () => {
      try {
        const data = await req(`profiles?username=eq.${encodeURIComponent(username)}&select=*`);
        if(data?.[0]) setProfileData(data[0]);
      } catch {}
      setLoading(false);
    };
    load();
  },[username]);

  if(loading) return <div style={{ textAlign:"center", padding:60, color:"rgba(241,245,249,0.25)", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:2 }}>CHARGEMENT...</div>;
  if(!profileData) return <div style={{ textAlign:"center", padding:60 }}>
    <div style={{ fontSize:40, marginBottom:12 }}>👤</div>
    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:"rgba(241,245,249,0.25)" }}>PROFIL INTROUVABLE</div>
    <button onClick={onBack} style={{ marginTop:16, padding:"8px 20px", borderRadius:10, border:"1px solid rgba(241,245,249,0.1)", background:"transparent", color:"rgba(241,245,249,0.4)", cursor:"pointer", fontSize:13 }}>← Retour</button>
  </div>;

  const level=getLevel(profileData.xp||0), badge=getBadge(level);
  const wr=profileData.total_bets>0?Math.round((profileData.total_wins/profileData.total_bets)*100):0;
  const rank=leaderboard?.findIndex(p=>p.username===username);
  const rankDisplay=rank>=0?rank+1:null;
  const sub=getSubPlan(profileData);

  return <div className="page-enter">
    <button onClick={onBack} style={{ marginBottom:16, padding:"6px 14px", borderRadius:10, border:"1px solid rgba(241,245,249,0.08)", background:"transparent", color:"rgba(241,245,249,0.4)", cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", gap:6 }}>← Retour</button>
    <div style={{ background:`linear-gradient(135deg,${badge.glow},rgba(241,245,249,0.02))`, border:`1px solid ${badge.color}20`, borderRadius:20, padding:"24px", marginBottom:18, position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:-60, right:-60, width:200, height:200, borderRadius:"50%", background:`radial-gradient(circle,${badge.glow},transparent 70%)` }} />
      <div style={{ display:"flex", gap:16, alignItems:"center", marginBottom:14 }}>
        <div style={{ width:64, height:64, borderRadius:18, background:`linear-gradient(135deg,${badge.color},${badge.color}66)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, flexShrink:0, boxShadow:`0 8px 25px ${badge.glow}` }}>{badge.emoji}</div>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:1 }}>{profileData.username}</div>
          <div style={{ display:"flex", gap:6, marginTop:4, flexWrap:"wrap", alignItems:"center" }}>
            <BadgeTag level={level} />
            {sub!=="starter"&&<SubBadge profile={profileData} />}
            {rankDisplay&&<div style={{ fontSize:10, fontWeight:700, color:"#fbbf24", background:"rgba(251,191,36,0.1)", border:"1px solid rgba(251,191,36,0.2)", borderRadius:20, padding:"2px 8px" }}>🏆 #{rankDisplay} cette semaine</div>}
          </div>
          <div style={{ fontSize:12, color:"rgba(241,245,249,0.35)", marginTop:5 }}>Niveau {level} · {profileData.xp||0} XP</div>
        </div>
      </div>
      <XPBar xp={profileData.xp||0} />
    </div>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:18 }}>
      {[{label:"PARIS",val:profileData.total_bets||0,color:"#3b82f6"},{label:"WINS",val:profileData.total_wins||0,color:"#10b981"},{label:"PRÉCISION",val:`${wr}%`,color:"#a78bfa"}].map(s=>(
        <div key={s.label} style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.05)", borderRadius:12, padding:"16px 10px", textAlign:"center" }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:s.color, letterSpacing:1 }}>{s.val}</div>
          <div style={{ fontSize:9, color:"rgba(241,245,249,0.25)", fontWeight:700, letterSpacing:1.5, marginTop:3 }}>{s.label}</div>
        </div>
      ))}
    </div>
    <div style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.05)", borderRadius:14, padding:"16px 18px" }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:1, marginBottom:12 }}>PROGRESSION</div>
      {BADGES.map(b=>(
        <div key={b.id} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:9 }}>
          <span style={{ fontSize:11, fontWeight:700, color:b.color, background:`${b.color}12`, padding:"3px 9px", borderRadius:20, border:`1px solid ${b.color}25`, minWidth:90, textAlign:"center", boxShadow:level>=b.minLevel?`0 0 8px ${b.glow}`:"none" }}>{b.emoji} {b.label}</span>
          <span style={{ fontSize:11, color:"rgba(241,245,249,0.35)" }}>Niv. {b.minLevel}{b.maxLevel===999?"+":"–"+b.maxLevel}</span>
          {level>=b.minLevel&&<span style={{ fontSize:12, color:b.color }}>✓</span>}
        </div>
      ))}
    </div>
  </div>;
}

export default function LeaderboardPage({ leaderboard, username, onViewProfile }) {
  const [showAll,setShowAll]=useState(false);
  const topColors=["#94a3b8","#fbbf24","#cd7f32"];
  const medals=["🥈","🥇","🥉"];
  const countdown = useCountdown();
  const visibleList=showAll?leaderboard:leaderboard.slice(0,10);
  return <div className="page-enter">
    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, letterSpacing:2, marginBottom:6 }}>CLASSEMENT</div>
    <div style={{ fontSize:13, color:"rgba(241,245,249,0.35)", marginBottom:16 }}>Classe par gains MC des paris uniquement</div>

    {/* Compte a rebours */}
    <div style={{ background:"linear-gradient(135deg,rgba(251,191,36,0.08),rgba(251,191,36,0.03))", border:"1px solid rgba(251,191,36,0.15)", borderRadius:16, padding:"16px 18px", marginBottom:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:1, color:"#fbbf24", marginBottom:2 }}>⏰ REINITIALISATION DANS</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, letterSpacing:2, color:"#f1f5f9" }}>{countdown}</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:10, color:"rgba(241,245,249,0.35)", marginBottom:4 }}>Chaque lundi à 00h00</div>
          <div style={{ fontSize:11, color:"#10b981", fontWeight:700 }}>Classement remis à zéro</div>
        </div>
      </div>
      {/* Récompenses */}
      <div style={{ borderTop:"1px solid rgba(251,191,36,0.1)", paddingTop:12 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"rgba(241,245,249,0.4)", letterSpacing:1, marginBottom:8 }}>RECOMPENSES DE FIN DE SEMAINE</div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {WEEKLY_REWARDS.map(r=>(
            <div key={r.rank} style={{ flex:"1 1 80px", background:`${r.color}10`, border:`1px solid ${r.color}25`, borderRadius:10, padding:"8px 6px", textAlign:"center" }}>
              <div style={{ fontSize:16, marginBottom:3 }}>{r.emoji}</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14, color:r.color, letterSpacing:1 }}>{r.sc} SC</div>
            </div>
          ))}
        </div>
      </div>
    </div>

    <div style={{ background:"rgba(16,185,129,0.04)", border:"1px solid rgba(16,185,129,0.1)", borderRadius:10, padding:"10px 14px", marginBottom:22, fontSize:12, color:"rgba(241,245,249,0.35)" }}>
      Roue et pubs ne comptent pas — seuls tes paris font la difference !
    </div>
    <div style={{ display:"flex", gap:10, marginBottom:24, alignItems:"flex-end" }}>
      {[leaderboard[1],leaderboard[0],leaderboard[2]].map((p,vi)=>{
        if(!p) return <div key={vi} style={{ flex:1 }} />;
        const hs=[130,155,130];
        return <div key={p.username} style={{ flex:1, background:`${topColors[vi]}0d`, border:`1px solid ${topColors[vi]}20`, borderRadius:16, padding:"14px 10px", textAlign:"center", height:hs[vi], display:"flex", flexDirection:"column", justifyContent:"flex-end", position:"relative" }}>
          <div style={{ position:"absolute", top:8, left:"50%", transform:"translateX(-50%)", fontSize:20 }}>{medals[vi]}</div>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:6 }}><Avatar username={p.username} size={38} radius={11} /></div>
          <BadgeTag level={getLevel(p.xp||0)} />
          <div onClick={()=>onViewProfile&&onViewProfile(p.username)} style={{ fontWeight:700, fontSize:12, color:"#f1f5f9", marginBottom:2, marginTop:4, cursor:"pointer" }}>{p.username}</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:topColors[vi], letterSpacing:1 }}>+{fmt(p.total_profit||0)}</div>
        </div>;
      })}
    </div>
    {visibleList.map((p,i)=>(
      <div key={p.username} style={{ background:p.username===username?"rgba(16,185,129,0.04)":"rgba(241,245,249,0.02)", border:`1px solid ${p.username===username?"rgba(16,185,129,0.12)":"rgba(241,245,249,0.04)"}`, borderRadius:12, padding:"12px 16px", marginBottom:6, display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ position:"relative", flexShrink:0 }}>
          <Avatar username={p.username} size={36} radius={10} />
          <div style={{ position:"absolute", bottom:-4, right:-4, width:18, height:18, borderRadius:6, background:i<3?`linear-gradient(135deg,${topColors[i]},${topColors[i]}99)`:"rgba(241,245,249,0.12)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:10, color:i<3?"#000":"rgba(241,245,249,0.5)", border:"1.5px solid #030712" }}>{i+1}</div>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2, flexWrap:"wrap" }}>
            <span onClick={()=>onViewProfile&&onViewProfile(p.username)} style={{ fontWeight:700, color:p.username===username?"#10b981":"#f1f5f9", fontSize:13, cursor:"pointer", textDecoration:"underline", textDecorationStyle:"dotted", textDecorationColor:"rgba(241,245,249,0.2)" }}>{p.username}</span>
            <BadgeTag level={getLevel(p.xp||0)} />
            {p.subscription&&p.subscription!=="starter"&&<SubBadge profile={p} />}
            {p.username===username&&<span style={{ fontSize:10, color:"#10b981" }}>(Vous)</span>}
          </div>
          <div style={{ fontSize:11, color:"rgba(241,245,249,0.25)" }}>{p.total_wins}/{p.total_bets} paris · Niv. {getLevel(p.xp||0)}</div>
        </div>
        <div style={{ textAlign:"right", flexShrink:0 }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, color:"#10b981", letterSpacing:1 }}>+{fmt(p.total_profit||0)}</div>
          <div style={{ fontSize:10, color:"rgba(241,245,249,0.25)" }}>gain total</div>
          {i<5&&<div style={{ fontSize:10, color:WEEKLY_REWARDS[i]?.color||"#6b7280", fontWeight:700 }}>+{WEEKLY_REWARDS[i]?.sc} SC lundi</div>}
        </div>
      </div>
    ))}
    {!showAll&&leaderboard.length>10&&(
      <button onClick={()=>setShowAll(true)} className="btn-animated" style={{ width:"100%", marginTop:8, padding:"12px 0", borderRadius:12, border:"1px solid rgba(241,245,249,0.07)", background:"transparent", color:"rgba(241,245,249,0.4)", fontWeight:700, fontSize:13, cursor:"pointer" }}>
        Voir les {leaderboard.length-10} autres joueurs →
      </button>
    )}
  </div>;
}
