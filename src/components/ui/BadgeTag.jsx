import { getBadge } from "../../lib/helpers.js";

export default function BadgeTag({ level }) {
  const b = getBadge(level||1);
  return <span style={{ fontSize:11, fontWeight:700, color:b.color, background:`${b.color}15`, padding:"3px 9px", borderRadius:20, border:`1px solid ${b.color}30`, boxShadow:`0 0 10px ${b.glow}` }}>{b.emoji} {b.label}</span>;
}
