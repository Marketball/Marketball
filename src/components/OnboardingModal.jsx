import { useState } from "react";

const STEPS = [
  {
    emoji: "⚽",
    title: null, // remplacé dynamiquement
    desc: "La plateforme de prédictions football. Tu paries des MarketCoins (MC) virtuels sur des événements sportifs — sans risque réel.",
    detail: "Tu reçois des MC gratuits chaque semaine, via la roue quotidienne et les pubs récompensées.",
    color: "#10b981",
  },
  {
    emoji: "📊",
    title: "COMMENT PARIER ?",
    desc: "2 façons de jouer : les marchés de prédiction (transferts, rumeurs) et les matchs en direct (vainqueur, score, buteurs).",
    detail: "Plus tu paries tôt, meilleures sont les cotes. Si tu as raison, tu multiplies ta mise !",
    color: "#3b82f6",
  },
  {
    emoji: "🏆",
    title: "GAGNE DES RÉCOMPENSES",
    desc: "Tes gains font monter ton classement. Les meilleurs joueurs chaque semaine reçoivent des StoreCoins (SC).",
    detail: "Les SC s'échangent contre de vraies récompenses : cartes cadeaux Amazon, maillots, places VIP...",
    color: "#f59e0b",
  },
];

export default function OnboardingModal({ username, onClose }) {
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const title = step === 0 ? `SALUT ${(username || "JOUEUR").toUpperCase()} !` : s.title;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(3,7,18,0.93)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(20px)", padding:20, animation:"fadeIn 0.3s ease" }}>
      <div style={{ background:"rgba(15,20,40,0.98)", border:`1px solid ${s.color}30`, borderRadius:24, padding:"36px 28px 28px", width:380, maxWidth:"100%", textAlign:"center", boxShadow:`0 50px 100px rgba(0,0,0,0.6), 0 0 80px ${s.color}08`, animation:"fadeInUp 0.3s ease" }}>

        {/* Icône */}
        <div style={{ width:80, height:80, borderRadius:24, background:`${s.color}12`, border:`1px solid ${s.color}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:38, margin:"0 auto 22px", boxShadow:`0 12px 30px ${s.color}20` }}>
          {s.emoji}
        </div>

        {/* Titre */}
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:1.5, marginBottom:14, color:"#f1f5f9" }}>
          {title}
        </div>

        {/* Description */}
        <div style={{ fontSize:14, color:"rgba(241,245,249,0.55)", lineHeight:1.7, marginBottom:14 }}>
          {s.desc}
        </div>

        {/* Detail card */}
        <div style={{ fontSize:12, color:`${s.color}cc`, background:`${s.color}08`, border:`1px solid ${s.color}15`, borderRadius:10, padding:"11px 14px", lineHeight:1.65, textAlign:"left" }}>
          💡 {s.detail}
        </div>

        {/* Dots progression */}
        <div style={{ display:"flex", justifyContent:"center", gap:8, margin:"24px 0 20px" }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ width:i===step?22:6, height:6, borderRadius:99, background:i===step?s.color:"rgba(241,245,249,0.1)", transition:"all 0.3s ease" }} />
          ))}
        </div>

        {/* Bouton principal */}
        <button onClick={isLast ? onClose : () => setStep(s => s + 1)}
          style={{ width:"100%", padding:"14px 0", borderRadius:12, border:"none", background:`linear-gradient(135deg,${s.color},${s.color}aa)`, color:"#fff", fontWeight:800, fontSize:14, cursor:"pointer", boxShadow:`0 8px 25px ${s.color}30`, transition:"all 0.3s", fontFamily:"'DM Sans',sans-serif", letterSpacing:0.3 }}>
          {isLast ? "C'est parti ! 🚀" : "Suivant →"}
        </button>

        {/* Passer */}
        {!isLast && (
          <button onClick={onClose} style={{ marginTop:12, background:"none", border:"none", color:"rgba(241,245,249,0.2)", fontSize:12, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
            Passer l'intro
          </button>
        )}
      </div>
    </div>
  );
}
