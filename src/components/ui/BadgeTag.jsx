import { getDivision } from "../../lib/helpers.js";

export default function BadgeTag({ coins }) {
  const div = getDivision(coins || 0);
  const dots = { rookie:"○", bronze:"●", silver:"●", gold:"●", diamond:"◆" };
  const dot = dots[div.tier] || "●";
  return (
    <span style={{ fontSize:11, fontWeight:700, color:div.color, background:`${div.color}15`, padding:"3px 9px", borderRadius:20, border:`1px solid ${div.color}30`, display:"inline-flex", alignItems:"center", gap:4, whiteSpace:"nowrap" }}>
      <span style={{ fontSize:9 }}>{dot}</span>{div.name}
    </span>
  );
}
