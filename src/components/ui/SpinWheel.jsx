import { useState, useRef } from "react";
import { gsap } from "gsap";
import { SPIN_SEGMENTS } from "../../lib/constants.js";

const GLOW = { cashout:"#f97316", sc:"#10b981", mc:"#f59e0b" };

// ── arc SVG ────────────────────────────────────────────────────────────────
function arc(cx, cy, r, startDeg, endDeg) {
  const rad = d => (d * Math.PI) / 180;
  const x1 = cx + r * Math.cos(rad(startDeg)), y1 = cy + r * Math.sin(rad(startDeg));
  const x2 = cx + r * Math.cos(rad(endDeg)),   y2 = cy + r * Math.sin(rad(endDeg));
  return `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${endDeg - startDeg > 180 ? 1 : 0} 1 ${x2},${y2} Z`;
}

// ── particules canvas ───────────────────────────────────────────────────────
function burst(canvas, color) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, cx = W / 2;
  const pts = Array.from({ length: 50 }, () => ({
    x: cx, y: cx,
    vx: (Math.random() - 0.5) * 9,
    vy: (Math.random() - 0.5) * 9 - 2,
    life: 1, r: Math.random() * 4 + 2,
    color: Math.random() > 0.4 ? color : "#ffffff",
  }));
  let id;
  const tick = () => {
    ctx.clearRect(0, 0, W, W);
    let alive = false;
    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.life -= 0.022;
      if (p.life > 0) {
        alive = true;
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI); ctx.fill();
      }
    });
    ctx.globalAlpha = 1;
    if (alive) id = requestAnimationFrame(tick);
  };
  id = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(id);
}

export default function SpinWheel({ onSpin, canSpin, segments: segsProp }) {
  const segs     = segsProp || SPIN_SEGMENTS;
  const N        = segs.length;
  const segAngle = 360 / N;
  const CX = 115, CY = 115, R = 102;

  const [spinning, setSpinning]   = useState(false);
  const [result,   setResult]     = useState(null);
  const wheelRef   = useRef(null);
  const glowRef    = useRef(null);
  const resultRef  = useRef(null);
  const particleRef = useRef(null);
  const rotRef     = useRef(0);

  const doSpin = () => {
    if (!canSpin || spinning) return;
    setSpinning(true);
    setResult(null);

    const segIdx = Math.floor(Math.random() * N);
    // Calcul de la rotation cible : pointer à droite (0°), wheel part à -90°
    const targetAngle = (90 - segIdx * segAngle - segAngle / 2 + 3600) % 360;
    const curAngle    = rotRef.current % 360;
    const diff        = (targetAngle - curAngle + 360) % 360;
    const targetRot   = rotRef.current + 360 * 8 + diff;

    gsap.to(rotRef, {
      current: targetRot,
      duration: 5.2,
      ease: "power4.out",
      onUpdate: () => {
        if (wheelRef.current) wheelRef.current.style.transform = `rotate(${rotRef.current}deg)`;
      },
      onComplete: () => {
        const seg = segs[segIdx];
        setSpinning(false);
        setResult(seg);
        onSpin(seg);
        burst(particleRef.current, GLOW[seg.type] || "#f59e0b");
        // Glow ring burst
        if (glowRef.current) {
          gsap.fromTo(glowRef.current,
            { opacity:0.9, scale:1 },
            { opacity:0, scale:2, duration:1.4, ease:"power2.out" }
          );
        }
        // Result card spring
        if (resultRef.current) {
          gsap.fromTo(resultRef.current,
            { scale:0.5, opacity:0, y:8 },
            { scale:1, opacity:1, y:0, duration:0.55, ease:"back.out(2)" }
          );
        }
        // Wheel bounce
        gsap.fromTo(wheelRef.current,
          { scale:1.04 },
          { scale:1, duration:0.7, ease:"elastic.out(1,0.4)" }
        );
      },
    });
  };

  const glowColor = result ? GLOW[result.type] : "#10b981";

  return (
    <div style={{ textAlign:"center" }}>
      <style>{`
        @keyframes wGlow  { 0%,100%{filter:drop-shadow(0 0 10px rgba(16,185,129,0.25))} 50%{filter:drop-shadow(0 0 22px rgba(16,185,129,0.55))} }
        @keyframes pBlink { 0%,100%{opacity:1} 50%{opacity:0.55} }
        @keyframes ringPulse { 0%,100%{opacity:0.15} 50%{opacity:0.4} }
      `}</style>

      {/* ── Wheel container ── */}
      <div style={{ position:"relative", display:"inline-block", marginBottom:18 }}>

        {/* Glow burst (on win) */}
        <div ref={glowRef} style={{
          position:"absolute", inset:-30, borderRadius:"50%",
          background:`radial-gradient(circle, ${glowColor}55, transparent 70%)`,
          opacity:0, pointerEvents:"none", zIndex:0,
        }} />

        {/* Particle canvas */}
        <canvas ref={particleRef} width={230} height={230}
          style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:3 }} />

        {/* Outer decorative ring (static) */}
        <svg width={230} height={230} style={{ position:"absolute", inset:0, zIndex:1, pointerEvents:"none" }}>
          <circle cx={115} cy={115} r={112} fill="none"
            stroke="rgba(16,185,129,0.2)" strokeWidth={2}
            style={{ animation:"ringPulse 3s ease-in-out infinite" }} />
          <circle cx={115} cy={115} r={108} fill="none"
            stroke="rgba(241,245,249,0.04)" strokeWidth={1} />
          {/* Tick marks */}
          {Array.from({ length: 36 }, (_, i) => {
            const a = (i * 10 * Math.PI) / 180;
            const r1 = 109, r2 = i % 3 === 0 ? 113 : 111;
            return (
              <line key={i}
                x1={115 + r1 * Math.cos(a)} y1={115 + r1 * Math.sin(a)}
                x2={115 + r2 * Math.cos(a)} y2={115 + r2 * Math.sin(a)}
                stroke={`rgba(16,185,129,${i % 3 === 0 ? 0.4 : 0.15})`}
                strokeWidth={i % 3 === 0 ? 1.5 : 0.8} />
            );
          })}
        </svg>

        {/* ── Rotating wheel ── */}
        <svg ref={wheelRef} width={230} height={230}
          style={{
            display:"block", transformOrigin:"50% 50%", willChange:"transform",
            animation: canSpin && !spinning ? "wGlow 3s ease-in-out infinite" : "none",
            filter: canSpin ? "" : "grayscale(0.75) opacity(0.4)",
            position:"relative", zIndex:2,
          }}>
          <defs>
            {segs.map((seg, i) => (
              <radialGradient key={i} id={`wg${i}`} cx="35%" cy="30%" r="75%">
                <stop offset="0%"   stopColor={seg.color} stopOpacity="1" />
                <stop offset="100%" stopColor={seg.color} stopOpacity="0.55" />
              </radialGradient>
            ))}
            <radialGradient id="hubGrad" cx="40%" cy="35%">
              <stop offset="0%"   stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>
            <filter id="segShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="rgba(0,0,0,0.5)" />
            </filter>
          </defs>

          {/* Segments */}
          {segs.map((seg, i) => {
            const s = i * segAngle - 90, e = s + segAngle;
            const mid = ((s + e) / 2) * Math.PI / 180;
            const tr  = R * 0.62;
            return (
              <g key={i} filter="url(#segShadow)">
                <path d={arc(CX, CY, R, s, e)}
                  fill={`url(#wg${i})`}
                  stroke="rgba(3,7,18,0.55)" strokeWidth={2} />
                {/* Inner highlight stripe */}
                <path d={arc(CX, CY, R * 0.92, s + 1, e - 1)}
                  fill="rgba(255,255,255,0.06)" stroke="none" />
                {/* Label */}
                <text
                  x={CX + tr * Math.cos(mid)} y={CY + tr * Math.sin(mid)}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="white" fontSize={N > 5 ? 9 : 10} fontWeight="800"
                  fontFamily="'DM Sans',sans-serif"
                  style={{ filter:"drop-shadow(0 1px 3px rgba(0,0,0,0.9))" }}>
                  {seg.label}
                </text>
              </g>
            );
          })}

          {/* Center hub */}
          <circle cx={CX} cy={CY} r={24} fill="url(#hubGrad)"
            stroke="rgba(16,185,129,0.5)" strokeWidth={2} />
          <circle cx={CX} cy={CY} r={17} fill="#1e293b"
            stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          <circle cx={CX} cy={CY} r={9}  fill={spinning?"#f59e0b":"#10b981"} style={{ transition:"fill 0.3s" }} />
          <circle cx={CX} cy={CY} r={4}  fill="rgba(255,255,255,0.8)" />
          {/* Hub glint */}
          <ellipse cx={CX - 5} cy={CY - 7} rx={4} ry={2.5}
            fill="rgba(255,255,255,0.2)" transform={`rotate(-35,${CX},${CY})`} />
        </svg>

        {/* ── Pointer (static, outside wheel) ── */}
        <div style={{
          position:"absolute", right:-16, top:"50%",
          transform:"translateY(-50%)", zIndex:4,
          animation: canSpin && !spinning ? "pBlink 2s ease-in-out infinite" : "none",
        }}>
          <svg width={20} height={28} viewBox="0 0 20 28">
            <defs>
              <linearGradient id="ptrGrad" x1="100%" y1="0%" x2="0%" y2="0%">
                <stop offset="0%"   stopColor="#f1f5f9" />
                <stop offset="100%" stopColor="#94a3b8" />
              </linearGradient>
            </defs>
            <polygon points="20,14 0,2 0,26" fill="url(#ptrGrad)"
              style={{ filter:"drop-shadow(-3px 0 5px rgba(241,245,249,0.4))" }} />
            <polygon points="18,14 2,5 2,23" fill="rgba(255,255,255,0.2)" />
          </svg>
        </div>
      </div>

      {/* ── Result card ── */}
      {result && (
        <div ref={resultRef} style={{
          marginBottom:14, padding:"12px 28px", display:"inline-block",
          background:`${GLOW[result.type] || "#f59e0b"}14`,
          border:`1px solid ${GLOW[result.type] || "#f59e0b"}45`,
          borderRadius:14,
          boxShadow:`0 0 24px ${GLOW[result.type] || "#f59e0b"}20`,
        }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:2,
                        color:GLOW[result.type] || "#f59e0b" }}>
            {result.type==="cashout" ? "🔓 1 CASHOUT GRATUIT !"
             : result.type==="sc"    ? `+${result.value} 💎 SC`
             :                         `+${result.value} 🪙 MC`}
          </div>
        </div>
      )}

      {/* ── Button ── */}
      <button onClick={doSpin} disabled={!canSpin || spinning}
        style={{
          display:"block", width:"100%", padding:"13px 0", borderRadius:13, border:"none",
          background: canSpin && !spinning
            ? "linear-gradient(135deg,#f59e0b,#d97706)"
            : "rgba(255,255,255,0.04)",
          color: canSpin && !spinning ? "#fff" : "rgba(241,245,249,0.2)",
          fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:3,
          cursor: canSpin && !spinning ? "pointer" : "not-allowed",
          transition:"all 0.2s",
          boxShadow: canSpin && !spinning ? "0 6px 24px rgba(245,158,11,0.35)" : "none",
        }}
        onMouseEnter={e => { if (canSpin && !spinning) e.currentTarget.style.transform = "translateY(-1px)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "none"; }}>
        {spinning ? "···" : canSpin ? "TOURNER LA ROUE" : "REVIENS DEMAIN"}
      </button>
    </div>
  );
}
