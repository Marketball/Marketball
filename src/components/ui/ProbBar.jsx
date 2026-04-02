import { AMM } from "../../lib/amm.js";

export default function ProbBar({ qYes, qNo }) {
  const p=AMM.probYes(qYes,qNo), pct=Math.round(p*100);
  return <div>
    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
      <span style={{ fontSize:11, fontWeight:800, color:"#10b981" }}>OUI {pct}%</span>
      <span style={{ fontSize:11, fontWeight:800, color:"#ef4444" }}>NON {100-pct}%</span>
    </div>
    <div style={{ height:4, borderRadius:99, background:"rgba(239,68,68,0.15)", overflow:"hidden" }}>
      <div style={{ width:`${pct}%`, height:"100%", background:"linear-gradient(90deg,#10b981,#34d399)", borderRadius:99, transition:"width 0.5s ease", boxShadow:"0 0 6px rgba(16,185,129,0.5)" }} />
    </div>
  </div>;
}
