import { useState, useEffect, useRef } from "react";

const STEPS = [
  {
    id: "welcome",
    color: "#10b981",
    bg: "rgba(16,185,129,0.06)",
    border: "rgba(16,185,129,0.15)",
  },
  {
    id: "bet",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.06)",
    border: "rgba(59,130,246,0.15)",
  },
  {
    id: "rewards",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.06)",
    border: "rgba(245,158,11,0.15)",
  },
  {
    id: "go",
    color: "#10b981",
    bg: "rgba(16,185,129,0.06)",
    border: "rgba(16,185,129,0.15)",
  },
];

// Pièces animées pour l'étape de bienvenue
function CoinRain() {
  const coins = Array.from({ length: 12 }, (_, i) => i);
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {coins.map(i => (
        <div key={i} style={{
          position: "absolute",
          left: `${8 + (i * 8)}%`,
          top: "-10%",
          fontSize: `${14 + (i % 3) * 6}px`,
          animation: `coinFall ${1.5 + (i % 4) * 0.4}s ease-in ${i * 0.12}s both`,
          opacity: 0.7,
        }}>🪙</div>
      ))}
      <style>{`
        @keyframes coinFall {
          from { transform: translateY(0) rotate(0deg); opacity:0.8; }
          to   { transform: translateY(400px) rotate(${Math.random()>0.5?'':'- '}360deg); opacity:0; }
        }
      `}</style>
    </div>
  );
}

// Mini marché interactif pour l'étape 2
function MiniMarket() {
  const [picked, setPicked] = useState(null);
  const [voted, setVoted] = useState(false);

  const vote = (side) => {
    if (voted) return;
    setPicked(side);
    setTimeout(() => setVoted(true), 300);
  };

  return (
    <div style={{ background: "rgba(241,245,249,0.03)", border: "1px solid rgba(241,245,249,0.08)", borderRadius: 14, padding: "14px 16px", marginBottom: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(241,245,249,0.6)", marginBottom: 10, lineHeight: 1.4 }}>
        Mbappé signe au Real Madrid cet été ?
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: voted ? 10 : 0 }}>
        {["OUI", "NON"].map(side => {
          const isYes = side === "OUI";
          const col = isYes ? "#10b981" : "#ef4444";
          const isChosen = picked === side;
          return (
            <button key={side} onClick={() => vote(side)}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 10, border: `1.5px solid ${isChosen ? col : "rgba(241,245,249,0.1)"}`,
                background: isChosen ? `${col}18` : "transparent",
                color: isChosen ? col : "rgba(241,245,249,0.4)",
                fontWeight: 800, fontSize: 13, cursor: voted ? "default" : "pointer",
                transition: "all 0.25s",
              }}>
              {side}
            </button>
          );
        })}
      </div>
      {voted && (
        <div style={{ textAlign: "center", fontSize: 12, color: "#10b981", fontWeight: 700, animation: "fadeInUp 0.3s ease" }}>
          ✓ Pari enregistré — tu gagnes si tu as raison !
        </div>
      )}
      {!voted && (
        <div style={{ textAlign: "center", fontSize: 11, color: "rgba(241,245,249,0.2)", marginTop: 4 }}>
          Clique pour simuler un pari →
        </div>
      )}
    </div>
  );
}

export default function OnboardingModal({ username, onClose, onNavigate }) {
  const [step, setStep] = useState(0);
  const [animating, setAnimating] = useState(false);
  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const next = () => {
    if (animating) return;
    if (isLast) {
      onClose();
      onNavigate?.("markets");
      return;
    }
    setAnimating(true);
    setTimeout(() => { setStep(s => s + 1); setAnimating(false); }, 220);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(3,7,18,0.96)",
      backdropFilter: "blur(24px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
      animation: "fadeIn 0.35s ease",
    }}>
      <style>{`
        @keyframes obSlideUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:none; } }
        @keyframes obPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
        @keyframes obSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes obBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
      `}</style>

      <div style={{
        width: "100%", maxWidth: 400,
        background: "rgba(8,14,30,0.98)",
        border: `1px solid ${s.border}`,
        borderRadius: 24,
        overflow: "hidden",
        boxShadow: `0 60px 120px rgba(0,0,0,0.7), 0 0 60px ${s.color}10`,
        animation: "obSlideUp 0.35s ease",
        position: "relative",
      }}>
        {/* Barre de progression en haut */}
        <div style={{ display: "flex", gap: 3, padding: "14px 14px 0" }}>
          {STEPS.map((st, i) => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 99,
              background: i <= step ? st.color : "rgba(241,245,249,0.07)",
              transition: "background 0.4s ease",
            }} />
          ))}
        </div>

        {/* Contenu */}
        <div style={{
          padding: "28px 28px 24px",
          opacity: animating ? 0 : 1,
          transform: animating ? "translateY(8px)" : "none",
          transition: "opacity 0.2s, transform 0.2s",
        }}>

          {/* ── Étape 1 : Bienvenue ── */}
          {step === 0 && (
            <div style={{ position: "relative", textAlign: "center" }}>
              <CoinRain />
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{
                  width: 90, height: 90, borderRadius: "50%",
                  background: "rgba(16,185,129,0.1)",
                  border: "2px solid rgba(16,185,129,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 42, margin: "0 auto 20px",
                  animation: "obBounce 2s ease-in-out infinite",
                }}>⚽</div>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 34, letterSpacing: 2, color: "#f1f5f9", marginBottom: 4, lineHeight: 1 }}>
                  SALUT {(username || "JOUEUR").toUpperCase()} !
                </div>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 34, letterSpacing: 2, color: "#10b981", marginBottom: 20, lineHeight: 1 }}>
                  BIENVENUE 🎉
                </div>
                <div style={{ fontSize: 14, color: "rgba(241,245,249,0.5)", lineHeight: 1.7, marginBottom: 20 }}>
                  MarketBall, c'est la bourse de prédictions football.<br />Tu paries des <strong style={{ color: "#fbbf24" }}>MarketCoins (MC)</strong> virtuels — sans risque réel.
                </div>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)",
                  borderRadius: 12, padding: "10px 18px",
                }}>
                  <span style={{ fontSize: 22 }}>🪙</span>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: "#fbbf24", letterSpacing: 1 }}>3 000 MC</div>
                    <div style={{ fontSize: 11, color: "rgba(241,245,249,0.3)" }}>offerts pour démarrer</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Étape 2 : Comment parier ── */}
          {step === 1 && (
            <div>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{
                  width: 70, height: 70, borderRadius: 20,
                  background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 32, margin: "0 auto 14px",
                }}>📊</div>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, letterSpacing: 2, color: "#f1f5f9", marginBottom: 6 }}>
                  COMMENT PARIER ?
                </div>
                <div style={{ fontSize: 13, color: "rgba(241,245,249,0.45)", lineHeight: 1.65, marginBottom: 18 }}>
                  Choisis un marché, mise sur <strong style={{ color: "#10b981" }}>OUI</strong> ou <strong style={{ color: "#ef4444" }}>NON</strong>.<br />
                  Plus tu paries tôt, meilleures sont les cotes !
                </div>
              </div>
              <MiniMarket />
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                {[["🏟️", "Marchés transferts"], ["⚽", "Paris sur matchs"], ["💸", "Cashout en direct"]].map(([ic, lb]) => (
                  <div key={lb} style={{ flex: 1, textAlign: "center", background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.1)", borderRadius: 10, padding: "8px 4px" }}>
                    <div style={{ fontSize: 18, marginBottom: 3 }}>{ic}</div>
                    <div style={{ fontSize: 9, color: "rgba(241,245,249,0.35)", fontWeight: 700 }}>{lb}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Étape 3 : Récompenses ── */}
          {step === 2 && (
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 70, height: 70, borderRadius: 20,
                background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 32, margin: "0 auto 14px",
                animation: "obBounce 2s ease-in-out infinite",
              }}>🏆</div>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, letterSpacing: 2, color: "#f1f5f9", marginBottom: 6 }}>
                GAGNE DES RÉCOMPENSES
              </div>
              <div style={{ fontSize: 13, color: "rgba(241,245,249,0.45)", lineHeight: 1.65, marginBottom: 18 }}>
                Tes profits font monter ton classement.<br />
                Les meilleurs reçoivent des <strong style={{ color: "#10b981" }}>StoreCoins (SC)</strong>.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { icon: "🎁", label: "Carte cadeau Amazon", sc: "50 SC" },
                  { icon: "👕", label: "Maillot officiel", sc: "120 SC" },
                  { icon: "🎟️", label: "Place VIP match", sc: "200 SC" },
                ].map(item => (
                  <div key={item.label} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.12)",
                    borderRadius: 12, padding: "10px 14px",
                  }}>
                    <span style={{ fontSize: 24 }}>{item.icon}</span>
                    <span style={{ flex: 1, fontSize: 13, color: "rgba(241,245,249,0.7)", textAlign: "left" }}>{item.label}</span>
                    <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, color: "#10b981", letterSpacing: 1 }}>{item.sc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Étape 4 : C'est parti ── */}
          {step === 3 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 72, marginBottom: 16, animation: "obBounce 1.5s ease-in-out infinite" }}>🚀</div>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 32, letterSpacing: 2, color: "#f1f5f9", marginBottom: 4 }}>
                TOUT EST PRÊT !
              </div>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, letterSpacing: 2, color: "#10b981", marginBottom: 20 }}>
                FAIS TON PREMIER PARI
              </div>
              <div style={{ fontSize: 13, color: "rgba(241,245,249,0.4)", lineHeight: 1.7, marginBottom: 24 }}>
                Les marchés t'attendent.<br />
                Commence avec quelques MC pour apprendre les cotes.
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 8 }}>
                {[["🎯", "Suis les missions"], ["📈", "Monte dans le classement"], ["💎", "Gagne des SC"]].map(([ic, lb]) => (
                  <div key={lb} style={{ fontSize: 11, color: "rgba(241,245,249,0.35)", display: "flex", alignItems: "center", gap: 4 }}>
                    <span>{ic}</span>{lb}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{ marginTop: 24 }}>
            <button onClick={next}
              style={{
                width: "100%", padding: "14px 0", borderRadius: 13, border: "none",
                background: `linear-gradient(135deg,${s.color},${s.color}bb)`,
                color: "#fff", fontWeight: 800, fontSize: 15,
                cursor: "pointer",
                boxShadow: `0 8px 28px ${s.color}35`,
                transition: "transform 0.15s, box-shadow 0.15s",
                fontFamily: "'DM Sans',sans-serif",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 12px 32px ${s.color}45`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `0 8px 28px ${s.color}35`; }}>
              {isLast ? "VOIR LES MARCHÉS →" : step === 1 ? "J\'AI COMPRIS →" : "SUIVANT →"}
            </button>
            {!isLast && (
              <button onClick={onClose}
                style={{ marginTop: 10, width: "100%", background: "none", border: "none", color: "rgba(241,245,249,0.18)", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                Passer l'intro
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
