import { getSubPlan, getSubColor, getSubEmoji, getSubLabel } from "../../lib/helpers.js";

export default function SubBadge({ profile, size = "sm" }) {
  const sub = getSubPlan(profile);
  if (sub === "starter") return null;
  const color = getSubColor(sub);
  const lg = size === "lg";
  return <div style={{ display:"inline-flex", alignItems:"center", gap:4, background:`${color}15`, border:`1px solid ${color}30`, borderRadius:lg?12:8, padding:lg?"6px 12px":"2px 8px", boxShadow:`0 0 8px ${color}30` }}>
    <span style={{ fontSize:lg?16:11 }}>{getSubEmoji(sub)}</span>
    <span style={{ fontFamily:"'Bebas Neue',sans-serif", color, fontSize:lg?16:11, letterSpacing:1 }}>{getSubLabel(sub)}</span>
  </div>;
}
