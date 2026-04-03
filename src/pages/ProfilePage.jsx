import { BADGES } from "../lib/constants.js";
import { getSubPlan, getSubColor, getSubEmoji, getSubLabel, getMCBoost, getBadge, getLevel } from "../lib/helpers.js";
import MCBadge from "../components/ui/MCBadge.jsx";
import SCBadge from "../components/ui/SCBadge.jsx";
import BadgeTag from "../components/ui/BadgeTag.jsx";
import SubBadge from "../components/ui/SubBadge.jsx";
import XPBar from "../components/ui/XPBar.jsx";

export default function ProfilePage({ profile, username, onLogout, onNavigate }) {
  const level=getLevel(profile?.xp||0), badge=getBadge(level);
  const wr=profile?.total_bets>0?Math.round((profile.total_wins/profile.total_bets)*100):0;
  const sub=getSubPlan(profile);
  return <div className="page-enter">
    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, letterSpacing:2, marginBottom:20 }}>MON PROFIL</div>
    <div style={{ background:`linear-gradient(135deg,${badge.glow},rgba(241,245,249,0.02))`, border:`1px solid ${badge.color}20`, borderRadius:20, padding:"22px", marginBottom:18, position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:-60, right:-60, width:200, height:200, borderRadius:"50%", background:`radial-gradient(circle,${badge.glow},transparent 70%)` }} />
      <div style={{ display:"flex", gap:16, alignItems:"center", marginBottom:14 }}>
        <div style={{ width:64, height:64, borderRadius:18, background:`linear-gradient(135deg,${badge.color},${badge.color}66)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, flexShrink:0, boxShadow:`0 8px 25px ${badge.glow}` }}>{badge.emoji}</div>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, letterSpacing:1 }}>{username}</div>
          <div style={{ display:"flex", gap:6, marginTop:4, flexWrap:"wrap", alignItems:"center" }}>
            <BadgeTag level={level} />
            {sub!=="starter"&&<SubBadge profile={profile} />}
          </div>
          <div style={{ fontSize:12, color:"rgba(241,245,249,0.35)", marginTop:5 }}>Niveau {level} · {profile?.xp||0} XP total</div>
        </div>
      </div>
      <XPBar xp={profile?.xp||0} />
      <div style={{ display:"flex", gap:10, marginTop:14, flexWrap:"wrap" }}><MCBadge amount={profile?.coins||0} /><SCBadge amount={profile?.store_coins||0} /></div>
    </div>
    {/* Info abonnement */}
    <div style={{ background:`${getSubColor(sub)}0a`, border:`1px solid ${getSubColor(sub)}20`, borderRadius:14, padding:"14px 18px", marginBottom:18, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <div>
        <div style={{ fontSize:10, fontWeight:700, color:"rgba(241,245,249,0.35)", letterSpacing:1.5, marginBottom:4 }}>ABONNEMENT ACTUEL</div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:getSubColor(sub), letterSpacing:1 }}>{getSubEmoji(sub)} {getSubLabel(sub)}</span>
        </div>
        <div style={{ fontSize:11, color:"rgba(241,245,249,0.3)", marginTop:3 }}>{getMCBoost(sub)} MC chaque lundi</div>
      </div>
      {sub==="starter"&&<div style={{ fontSize:11, color:"#3b82f6", fontWeight:700, cursor:"pointer" }} onClick={()=>onNavigate("subscription")}>Passer Pro →</div>}
    </div>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:18 }}>
      {[{label:"PARIS",val:profile?.total_bets||0,color:"#3b82f6"},{label:"WINS",val:profile?.total_wins||0,color:"#10b981"},{label:"PRECISION",val:`${wr}%`,color:"#a78bfa"}].map(s=>(
        <div key={s.label} style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.05)", borderRadius:12, padding:"16px 10px", textAlign:"center" }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:s.color, letterSpacing:1 }}>{s.val}</div>
          <div style={{ fontSize:9, color:"rgba(241,245,249,0.25)", fontWeight:700, letterSpacing:1.5, marginTop:3 }}>{s.label}</div>
        </div>
      ))}
    </div>
    <div style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.05)", borderRadius:14, padding:"16px 18px", marginBottom:16 }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:1, marginBottom:12 }}>PROGRESSION DES BADGES</div>
      {BADGES.map(b=>(
        <div key={b.id} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:9 }}>
          <span style={{ fontSize:11, fontWeight:700, color:b.color, background:`${b.color}12`, padding:"3px 9px", borderRadius:20, border:`1px solid ${b.color}25`, minWidth:90, textAlign:"center", boxShadow:level>=b.minLevel?`0 0 8px ${b.glow}`:"none" }}>{b.emoji} {b.label}</span>
          <span style={{ fontSize:11, color:"rgba(241,245,249,0.35)" }}>Niv. {b.minLevel}{b.maxLevel===999?"+":"–"+b.maxLevel}</span>
          {level>=b.minLevel&&<span style={{ fontSize:12, color:b.color }}>✓</span>}
        </div>
      ))}
    </div>
    <div style={{ background:"rgba(239,68,68,0.04)", border:"1px solid rgba(239,68,68,0.08)", borderRadius:12, padding:"12px 16px", marginBottom:18, fontSize:12, color:"rgba(241,245,249,0.35)", lineHeight:1.6 }}>
      Les MarketCoins n'ont <strong style={{ color:"rgba(241,245,249,0.6)" }}>aucune valeur monetaire</strong>.
    </div>
    <button onClick={onLogout} style={{ width:"100%", padding:"13px 0", borderRadius:12, border:"1px solid rgba(239,68,68,0.15)", background:"rgba(239,68,68,0.04)", color:"#f87171", fontWeight:800, fontSize:14, cursor:"pointer" }}>Se deconnecter</button>
  </div>;
}
