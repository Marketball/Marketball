import { getDivision, getDivisionProgress, getDivisionNext } from "../../lib/helpers.js";
import { fmt } from "../../lib/helpers.js";

export default function XPBar({ coins }) {
  const div = getDivision(coins || 0);
  const pct = getDivisionProgress(coins || 0);
  const next = getDivisionNext(coins || 0);
  return (
    <div style={{ marginTop:8 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
        <span style={{ fontSize:11, color:div.color, fontWeight:700 }}>● {div.name}</span>
        {next
          ? <span style={{ fontSize:11, color:"rgba(241,245,249,0.3)", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:1 }}>{fmt(coins||0)} / {fmt(next.min)} MC</span>
          : <span style={{ fontSize:11, color:div.color, fontWeight:700 }}>MAX</span>
        }
      </div>
      <div style={{ height:4, borderRadius:99, background:"rgba(255,255,255,0.06)", overflow:"hidden" }}>
        <div style={{ width:`${pct}%`, height:"100%", background:`linear-gradient(90deg,${div.color}88,${div.color})`, borderRadius:99, transition:"width 0.8s ease", boxShadow:`0 0 6px ${div.color}` }} />
      </div>
      {next && <div style={{ fontSize:10, color:"rgba(241,245,249,0.2)", marginTop:4, textAlign:"right" }}>→ {next.name} à {fmt(next.min)} MC</div>}
    </div>
  );
}
