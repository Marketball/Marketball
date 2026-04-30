import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export default function Confetti({ onDone }) {
  const containerRef = useRef(null);
  const pieces = useRef(Array.from({ length: 48 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: ["#10b981","#3b82f6","#fbbf24","#f59e0b","#a78bfa","#ec4899","#34d399","#60a5fa","#f472b6"][Math.floor(Math.random()*9)],
    size: 5 + Math.random() * 9,
    shape: Math.random() > 0.4 ? "50%" : Math.random() > 0.5 ? "2px" : "30%",
  }))).current;

  useEffect(() => {
    const els = containerRef.current?.querySelectorAll(".cp");
    if (!els?.length) return;
    gsap.set(els, { y: -20, opacity: 1, scale: 1, rotation: 0 });
    gsap.to(els, {
      y: () => window.innerHeight + 80,
      x: () => (Math.random() - 0.5) * 280,
      rotation: () => Math.random() * 720 - 360,
      opacity: 0,
      scale: () => 0.4 + Math.random() * 0.9,
      duration: () => 2.2 + Math.random() * 1.4,
      delay: () => Math.random() * 0.7,
      ease: "power1.in",
    });
    const t = setTimeout(onDone, 3800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div ref={containerRef} style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:9998, overflow:"hidden" }}>
      {pieces.map(p => (
        <div key={p.id} className="cp" style={{
          position:"absolute", left:`${p.x}%`, top:0,
          width:p.size, height:p.size,
          borderRadius:p.shape,
          background:p.color,
          boxShadow:`0 0 6px ${p.color}99`,
        }} />
      ))}
    </div>
  );
}
