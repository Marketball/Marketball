import { fmt } from "../../lib/helpers.js";

export default function MCBadge({ amount, size = "sm" }) {
  const lg = size === "lg";
  return <div style={{ display:"inline-flex", alignItems:"center", gap:5, background:"rgba(251,191,36,0.1)", border:"1px solid rgba(251,191,36,0.2)", borderRadius:lg?12:8, padding:lg?"8px 14px":"3px 9px" }}>
    <span style={{ fontSize:lg?18:12 }}>🪙</span>
    <span style={{ fontFamily:"'Bebas Neue',sans-serif", color:"#fbbf24", fontSize:lg?20:13, letterSpacing:1 }}>{fmt(amount)} MC</span>
  </div>;
}
