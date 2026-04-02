import { fmt } from "../../lib/helpers.js";

export default function SCBadge({ amount, size = "sm" }) {
  const lg = size === "lg";
  return <div style={{ display:"inline-flex", alignItems:"center", gap:5, background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.2)", borderRadius:lg?12:8, padding:lg?"8px 14px":"3px 9px" }}>
    <span style={{ fontSize:lg?18:12 }}>💎</span>
    <span style={{ fontFamily:"'Bebas Neue',sans-serif", color:"#10b981", fontSize:lg?20:13, letterSpacing:1 }}>{fmt(amount)} SC</span>
  </div>;
}
