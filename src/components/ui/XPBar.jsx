import { getDivision, getDivisionProgress, getDivisionNext } from "../../lib/helpers.js";
import { fmt } from "../../lib/helpers.js";

export default function XPBar({ coins }) {
  const div = getDivision(coins || 0);
  const pct = getDivisionProgress(coins || 0);
  const next = getDivisionNext(coins || 0);
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
        <span style={{ fontSize:10, fontWeight:700, color:"rgba(241,245,249,0.3)", letterSpacing:1.5 }}>
          {next ? `VERS ${next.name.toUpperCase()}` : "DIVISION MAX"}
        </span>
        {next
          ? <span style={{ fontSize:10, color:"rgba(241,245,249,0.4)", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:1 }}>
              {fmt(coins||0)} <span style={{ color:"rgba(241,245,249,0.2)" }}>/ {fmt(next.min)} MC</span>
            </span>
          : <span style={{ fontSize:10, color:div.color, fontWeight:700 }}>◆ MAX</span>
        }
      </div>
      <div style={{ height:6, borderRadius:99, background:"rgba(255,255,255,0.05)", overflow:"hidden", position:"relative" }}>
        <div style={{ width:`${pct}%`, height:"100%", background:`linear-gradient(90deg,${div.color}60,${div.color})`, borderRadius:99, transition:"width 0.8s ease", boxShadow:`0 0 8px ${div.color}80` }} />
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
        <span style={{ fontSize:9, color:"rgba(241,245,249,0.2)" }}>{pct}%</span>
        {next && <span style={{ fontSize:9, color:`${next.color}80` }}>→ {next.name}</span>}
      </div>
    </div>
  );
}
