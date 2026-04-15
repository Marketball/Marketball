import { useState, useEffect, useCallback, useRef } from "react";
import { SPIN_SEGMENTS } from "../../lib/constants.js";

export default function SpinWheel({ onSpin, canSpin }) {
  const canvasRef = useRef(null);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const rotRef = useRef(0);
  const animRef = useRef(null);

  const drawWheel = useCallback((rot) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, cx = W/2, r = W/2-6;
    const segAngle = (2*Math.PI)/SPIN_SEGMENTS.length;
    ctx.clearRect(0,0,W,W);
    SPIN_SEGMENTS.forEach((seg,i) => {
      const s=rot+i*segAngle, e=s+segAngle;
      ctx.beginPath(); ctx.moveTo(cx,cx); ctx.arc(cx,cx,r,s,e); ctx.closePath();
      const grad=ctx.createRadialGradient(cx,cx,0,cx,cx,r);
      grad.addColorStop(0,seg.color+"99"); grad.addColorStop(1,seg.color);
      ctx.fillStyle=grad; ctx.fill();
      ctx.strokeStyle="rgba(3,7,18,0.5)"; ctx.lineWidth=2; ctx.stroke();
      ctx.save(); ctx.translate(cx,cx); ctx.rotate(s+segAngle/2);
      ctx.textAlign="right"; ctx.fillStyle="#fff"; ctx.font="bold 10px 'DM Sans',sans-serif";
      ctx.shadowColor="rgba(0,0,0,0.5)"; ctx.shadowBlur=3;
      ctx.fillText(seg.label,r-10,4); ctx.restore();
    });
    const cg=ctx.createRadialGradient(cx,cx,0,cx,cx,18);
    cg.addColorStop(0,"#1e293b"); cg.addColorStop(1,"#0f172a");
    ctx.beginPath(); ctx.arc(cx,cx,18,0,2*Math.PI);
    ctx.fillStyle=cg; ctx.shadowColor="rgba(16,185,129,0.3)"; ctx.shadowBlur=8; ctx.fill();
    ctx.strokeStyle="rgba(16,185,129,0.25)"; ctx.lineWidth=2; ctx.stroke();
    ctx.shadowBlur=0;
    ctx.beginPath(); ctx.moveTo(W-5,cx-9); ctx.lineTo(W+12,cx); ctx.lineTo(W-5,cx+9);
    ctx.closePath(); ctx.fillStyle="#f1f5f9"; ctx.fill();
  }, []);

  useEffect(() => { drawWheel(rotRef.current); }, [drawWheel]);

  const doSpin = () => {
    if (!canSpin||spinning) return;
    setSpinning(true); setResult(null);
    const segIdx=Math.floor(Math.random()*SPIN_SEGMENTS.length);
    const segAngle=(2*Math.PI)/SPIN_SEGMENTS.length;
    const targetAngle=2*Math.PI*8+(2*Math.PI-segIdx*segAngle-segAngle/2);
    const startRot=rotRef.current, startTime=performance.now(), duration=4500;
    const animate=(now)=>{
      const progress=Math.min((now-startTime)/duration,1);
      const ease=1-Math.pow(1-progress,4);
      rotRef.current=startRot+targetAngle*ease;
      drawWheel(rotRef.current);
      if (progress<1){animRef.current=requestAnimationFrame(animate);}
      else{setSpinning(false);setResult(SPIN_SEGMENTS[segIdx]);onSpin(SPIN_SEGMENTS[segIdx]);}
    };
    animRef.current=requestAnimationFrame(animate);
  };
  useEffect(()=>()=>{if(animRef.current)cancelAnimationFrame(animRef.current);},[]);

  return <div style={{ textAlign:"center" }}>
    <div style={{ position:"relative", display:"inline-block", marginBottom:14 }}>
      <canvas ref={canvasRef} width={210} height={210} style={{ display:"block", filter:canSpin?"drop-shadow(0 0 15px rgba(16,185,129,0.2))":"grayscale(0.7) opacity(0.5)" }} />
    </div>
    {result && <div style={{ marginBottom:12, padding:"9px 18px", background:result.type==="cashout"?"rgba(249,115,22,0.12)":result.type==="sc"?"rgba(16,185,129,0.12)":"rgba(251,191,36,0.12)", border:`1px solid ${result.type==="cashout"?"rgba(249,115,22,0.3)":result.type==="sc"?"rgba(16,185,129,0.25)":"rgba(251,191,36,0.25)"}`, borderRadius:10, display:"inline-block", animation:"winPop 0.4s ease" }}>
      <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:1, color:result.type==="cashout"?"#f97316":result.type==="sc"?"#10b981":"#fbbf24" }}>
        {result.type==="cashout"?"🔓 1 CASHOUT GRATUIT !":result.type==="sc"?`+${result.value} 💎 SC`:`+${result.value} 🪙 MC`}
      </span>
    </div>}
    <button onClick={doSpin} disabled={!canSpin||spinning}
      style={{ display:"block", width:"100%", padding:"11px 0", borderRadius:11, border:"none", background:canSpin&&!spinning?"linear-gradient(135deg,#f59e0b,#d97706)":"rgba(255,255,255,0.04)", color:canSpin&&!spinning?"#fff":"rgba(241,245,249,0.2)", fontWeight:800, cursor:canSpin&&!spinning?"pointer":"not-allowed", fontSize:14, transition:"all 0.2s", boxShadow:canSpin&&!spinning?"0 4px 20px rgba(245,158,11,0.3)":"none" }}>
      {spinning?"...":canSpin?"TOURNER LA ROUE":"Reviens demain"}
    </button>
  </div>;
}
