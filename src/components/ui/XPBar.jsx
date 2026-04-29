import { getLevel, getXPProgress, xpToNextLevel, getBadge } from "../../lib/helpers.js";

export default function XPBar({ xp }) {
  const level=getLevel(xp||0), progress=getXPProgress(xp||0), needed=xpToNextLevel(xp||0), b=getBadge(level);
  const pct=needed>0?Math.min(100,Math.round((progress/needed)*100)):100;
  return <div style={{ marginTop:8 }}>
    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
      <span style={{ fontSize:11, color:b.color, fontWeight:700 }}>{b.emoji} Niv. {level} — {b.label}</span>
      <span style={{ fontSize:11, color:"rgba(241,245,249,0.3)", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:1 }}>{progress}/{needed} XP</span>
    </div>
    <div style={{ height:4, borderRadius:99, background:"rgba(255,255,255,0.06)", overflow:"hidden" }}>
      <div style={{ width:`${pct}%`, height:"100%", background:`linear-gradient(90deg,${b.color}88,${b.color})`, borderRadius:99, transition:"width 0.8s ease", boxShadow:`0 0 6px ${b.color}` }} />
    </div>
  </div>;
}
