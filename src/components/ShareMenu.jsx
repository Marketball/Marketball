import { useState } from "react";

export default function ShareMenu({ market, onClose }) {
  const url = `https://market-ball.com`;
  const text = `🔮 "${market.title}" — Parie sur MarketBall, la bourse de prédiction foot ! `;
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url + "?m=" + market.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const shareTwitter = () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank");
  const shareWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`, "_blank");

  return <div onClick={e=>e.stopPropagation()} style={{ position:"absolute", bottom:"100%", right:0, marginBottom:6, background:"rgba(15,23,42,0.98)", border:"1px solid rgba(241,245,249,0.1)", borderRadius:14, padding:"8px", zIndex:100, display:"flex", gap:6, boxShadow:"0 8px 32px rgba(0,0,0,0.5)", animation:"fadeInUp 0.2s ease" }}>
    <button onClick={copyLink} style={{ padding:"8px 12px", borderRadius:10, border:"1px solid rgba(241,245,249,0.08)", background:copied?"rgba(16,185,129,0.12)":"rgba(241,245,249,0.04)", color:copied?"#10b981":"rgba(241,245,249,0.7)", fontWeight:700, fontSize:11, cursor:"pointer", whiteSpace:"nowrap", transition:"all 0.2s" }}>
      {copied?"✓ Copié !":"📋 Copier"}
    </button>
    <button onClick={shareTwitter} style={{ padding:"8px 12px", borderRadius:10, border:"1px solid rgba(29,161,242,0.2)", background:"rgba(29,161,242,0.08)", color:"#1da1f2", fontWeight:700, fontSize:11, cursor:"pointer" }}>
      𝕏 Twitter
    </button>
    <button onClick={shareWhatsApp} style={{ padding:"8px 12px", borderRadius:10, border:"1px solid rgba(37,211,102,0.2)", background:"rgba(37,211,102,0.08)", color:"#25d366", fontWeight:700, fontSize:11, cursor:"pointer" }}>
      💬 WhatsApp
    </button>
  </div>;
}
