import { useEffect } from "react";

export default function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 4500); return () => clearTimeout(t); }, []);
  const bg = { error:"#ef4444", warning:"#f59e0b", win:"linear-gradient(135deg,#fbbf24,#f59e0b)", success:"linear-gradient(135deg,#10b981,#059669)" }[type]||"linear-gradient(135deg,#10b981,#059669)";
  return <div style={{ position:"fixed", bottom:90, left:"50%", transform:"translateX(-50%)", background:bg, color:"#fff", fontWeight:700, padding:"13px 22px", borderRadius:14, zIndex:9999, fontSize:14, boxShadow:"0 20px 60px rgba(0,0,0,0.5)", whiteSpace:"nowrap", animation:type==="win"?"winPop 0.5s ease":"slideUp 0.4s ease" }}>{msg}</div>;
}
