import { getDivision } from "../../lib/helpers.js";

export default function BadgeTag({ coins }) {
  const div = getDivision(coins || 0);
  return (
    <span style={{ fontSize:11, fontWeight:700, color:div.color, background:`${div.color}15`, padding:"3px 10px 3px 7px", borderRadius:20, border:`1px solid ${div.color}35`, display:"inline-flex", alignItems:"center", gap:5, whiteSpace:"nowrap" }}>
      <span style={{ fontSize:13, lineHeight:1 }}>{div.icon}</span>
      <span style={{ letterSpacing:0.5 }}>{div.name}</span>
    </span>
  );
}
