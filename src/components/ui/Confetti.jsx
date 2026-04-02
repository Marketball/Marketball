import { useEffect } from "react";

export default function Confetti({ onDone }) {
  const pieces = Array.from({length: 32}, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.8,
    duration: 1.8 + Math.random() * 1.2,
    color: ["#10b981","#3b82f6","#fbbf24","#f59e0b","#a78bfa","#ec4899","#34d399"][Math.floor(Math.random()*7)],
    size: 6 + Math.random() * 8,
    shape: Math.random() > 0.5 ? "50%" : "2px",
  }));
  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t); }, []);
  return <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:9998, overflow:"hidden" }}>
    {pieces.map(p => (
      <div key={p.id} style={{
        position:"absolute", left:`${p.x}%`, top:"-20px",
        width:p.size, height:p.size,
        borderRadius:p.shape,
        background:p.color,
        animation:`confetti-fall ${p.duration}s ${p.delay}s ease-in forwards`,
        boxShadow:`0 0 4px ${p.color}88`,
      }} />
    ))}
  </div>;
}
