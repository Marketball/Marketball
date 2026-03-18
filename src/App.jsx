import { useState, useEffect, useCallback } from "react";

// ============================================================
// SUPABASE CONFIG
// ============================================================
const SUPABASE_URL = "https://aiesvzdvlownkcjbkgjv.supabase.co";
const SUPABASE_KEY = "sb_publishable_Ipu5bJO_zD1ckygwQmpcuw_Tl5xWmyK";

const req = async (path, opts = {}) => {
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${opts._token || SUPABASE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
    ...opts.headers,
  };
  delete opts._token;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message || data?.error_description || JSON.stringify(data));
  return data;
};

const authReq = async (path, body) => {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || "Erreur auth");
  return data;
};

// ============================================================
// AMM LMSR
// ============================================================
const AMM = {
  b: 100,
  probYes: (qY, qN) => { const eY = Math.exp(qY / 100), eN = Math.exp(qN / 100); return eY / (eY + eN); },
  costToBuy: (qY, qN, shares, side) => {
    const b = 100;
    const before = b * Math.log(Math.exp(qY / b) + Math.exp(qN / b));
    const after = side === "yes" ? b * Math.log(Math.exp((qY + shares) / b) + Math.exp(qN / b)) : b * Math.log(Math.exp(qY / b) + Math.exp((qN + shares) / b));
    return Math.max(1, Math.round(after - before));
  },
};

// ============================================================
// SEED DATA — market_id sont maintenant des UUID valides
// ============================================================
const SEED_MARKETS = [
  { id: "00000000-0000-0000-0000-000000000001", title: "Mbappé rejoint Arsenal avant le 31 août ?", description: "Real Madrid envisagerait de vendre Mbappé suite aux désaccords internes.", q_yes: 320, q_no: 180, total_volume: 8400, participants: 142, closes_at: new Date(Date.now() + 12 * 86400000).toISOString(), category: "Transferts", source: "Fabrizio Romano", status: "open" },
  { id: "00000000-0000-0000-0000-000000000002", title: "Barcelona signe Lamine Yamal pro avant janvier ?", description: "Le prodige barcelonais est en négociation pour un contrat professionnel.", q_yes: 480, q_no: 120, total_volume: 12600, participants: 287, closes_at: new Date(Date.now() + 5 * 86400000).toISOString(), category: "Contrats", source: "Marca", status: "open" },
  { id: "00000000-0000-0000-0000-000000000003", title: "PSG remporte la Champions League cette saison ?", description: "Paris Saint-Germain est favori après un début de saison exceptionnel.", q_yes: 200, q_no: 400, total_volume: 31200, participants: 891, closes_at: new Date(Date.now() + 45 * 86400000).toISOString(), category: "Compétitions", source: "L'Équipe", status: "open" },
  { id: "00000000-0000-0000-0000-000000000004", title: "Erling Haaland quitte City cet été ?", description: "Real Madrid et Bayern auraient tous deux contacté l'entourage de Haaland.", q_yes: 150, q_no: 350, total_volume: 9800, participants: 203, closes_at: new Date(Date.now() + 28 * 86400000).toISOString(), category: "Transferts", source: "Sky Sports", status: "open" },
  { id: "00000000-0000-0000-0000-000000000005", title: "Vinicius Jr. Ballon d'Or 2025 ?", description: "Après son sacre manqué de 2024, Vinicius revient fort cette saison.", q_yes: 260, q_no: 240, total_volume: 19400, participants: 534, closes_at: new Date(Date.now() + 180 * 86400000).toISOString(), category: "Récompenses", source: "France Football", status: "open" },
  { id: "00000000-0000-0000-0000-000000000006", title: "Bellingham marque plus de 25 buts en PL ?", description: "Bellingham veut prouver sa forme cette saison.", q_yes: 190, q_no: 310, total_volume: 7200, participants: 168, closes_at: new Date(Date.now() + 60 * 86400000).toISOString(), category: "Performances", source: "BBC Sport", status: "open" },
];

const REWARD_STORE = [
  { id: "r1", name: "Carte cadeau Amazon", value: "10€", cost: 5000, icon: "🎁", stock: 12 },
  { id: "r2", name: "Maillot signé", value: "Replica", cost: 12000, icon: "👕", stock: 3 },
  { id: "r3", name: "Abonnement Canal+", value: "1 mois", cost: 8000, icon: "📺", stock: 20 },
  { id: "r4", name: "Pack FIFA Ultimate", value: "10 packs", cost: 3000, icon: "🎮", stock: 50 },
  { id: "r5", name: "Livre tactique", value: "Édition luxe", cost: 2000, icon: "📖", stock: 8 },
  { id: "r6", name: "Badge Oracle", value: "Exclusif", cost: 500, icon: "⚡", stock: 999 },
];

const SPIN_REWARDS = [10, 20, 10, 50, 20, 100, 10, 200];

// ============================================================
// HELPERS
// ============================================================
const fmt = (n) => (n ?? 0).toLocaleString("fr-FR");
const fmtPct = (n) => `${Math.round(n * 100)}%`;
const timeLeft = (date) => {
  const diff = new Date(date) - Date.now();
  if (diff < 0) return "Fermé";
  const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000);
  return d > 0 ? `${d}j ${h}h` : `${h}h`;
};
const catColor = (c) => ({ "Transferts": "#3b82f6", "Contrats": "#8b5cf6", "Compétitions": "#f59e0b", "Récompenses": "#ec4899", "Performances": "#10b981" })[c] || "#6b7280";

// ============================================================
// UI ATOMS
// ============================================================
function CoinBadge({ amount, size = "sm" }) {
  const s = size === "lg" ? { fontSize: 24, padding: "10px 18px", borderRadius: 14 } : { fontSize: 13, padding: "4px 10px", borderRadius: 8 };
  return <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)", color: "#fbbf24", fontWeight: 800, ...s }}>🪙 {fmt(amount)}</div>;
}

function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t); }, []);
  const bg = { error: "#ef4444", warning: "#f59e0b", success: "#10b981" }[type] || "#10b981";
  return <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", background: bg, color: "#fff", fontWeight: 700, padding: "12px 22px", borderRadius: 12, zIndex: 9999, fontSize: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", whiteSpace: "nowrap", animation: "slideUp 0.3s ease" }}>{msg}</div>;
}

function ProbBar({ qYes, qNo }) {
  const p = AMM.probYes(qYes, qNo), pct = Math.round(p * 100);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: "#10b981" }}>OUI {pct}%</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: "#ef4444" }}>NON {100 - pct}%</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: "rgba(239,68,68,0.2)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg,#10b981,#059669)", borderRadius: 99, transition: "width 0.5s" }} />
      </div>
    </div>
  );
}

// ============================================================
// AUTH PAGE
// ============================================================
function AuthPage({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = async () => {
    setError(""); setSuccess(""); setLoading(true);
    try {
      if (mode === "signup") {
        if (!username.trim()) { setError("Pseudo requis"); setLoading(false); return; }
        if (password.length < 6) { setError("Mot de passe trop court (6 min)"); setLoading(false); return; }
        const data = await authReq("signup", { email, password, data: { username } });
        if (data.user) {
          // FIX Bug 4 : message correct sans mention de vérification email
          const loginData = await authReq("token?grant_type=password", { email, password });
          onAuth(loginData.access_token, loginData.user);
        }
      } else {
        const data = await authReq("token?grant_type=password", { email, password });
        onAuth(data.access_token, data.user);
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const resetPassword = async () => {
    if (!email) { setError("Entrez votre email d'abord"); return; }
    setLoading(true);
    try {
      await authReq("recover", { email });
      setSuccess("Email de réinitialisation envoyé !");
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080c12", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif", padding: 20 }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "20%", left: "30%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(16,185,129,0.06),transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "10%", right: "20%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle,rgba(59,130,246,0.04),transparent 70%)" }} />
      </div>

      <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ width: 60, height: 60, background: "linear-gradient(135deg,#10b981,#3b82f6)", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 14px" }}>⚽</div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 36, letterSpacing: 3, color: "#fff" }}>MARKET<span style={{ color: "#10b981" }}>BALL</span></div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>Prédictions football — 100% gratuit</div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 22, padding: "32px 28px" }}>
          <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 4, marginBottom: 26 }}>
            {["login", "signup"].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); setSuccess(""); }}
                style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: "none", background: mode === m ? "rgba(16,185,129,0.15)" : "transparent", color: mode === m ? "#10b981" : "rgba(255,255,255,0.4)", fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.2s" }}>
                {m === "login" ? "Connexion" : "Inscription"}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {mode === "signup" && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>PSEUDO</label>
                <input value={username} onChange={e => setUsername(e.target.value)} placeholder="MonPseudo"
                  style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
            )}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>EMAIL</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com"
                style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>MOT DE PASSE</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                onKeyDown={e => e.key === "Enter" && submit()}
                style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>

          {error && <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 9, color: "#ef4444", fontSize: 13 }}>⚠️ {error}</div>}
          {success && <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 9, color: "#10b981", fontSize: 13 }}>✅ {success}</div>}

          <button onClick={submit} disabled={loading}
            style={{ width: "100%", marginTop: 20, padding: "13px 0", borderRadius: 11, border: "none", background: loading ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg,#10b981,#059669)", color: loading ? "rgba(255,255,255,0.3)" : "#fff", fontWeight: 900, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", letterSpacing: 0.5 }}>
            {loading ? "..." : mode === "login" ? "SE CONNECTER" : "CRÉER MON COMPTE"}
          </button>

          {mode === "login" && (
            <button onClick={resetPassword} style={{ width: "100%", marginTop: 10, padding: "8px 0", background: "transparent", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 12, cursor: "pointer" }}>
              Mot de passe oublié ?
            </button>
          )}

          {mode === "signup" && (
            <div style={{ marginTop: 16, fontSize: 11, color: "rgba(255,255,255,0.25)", textAlign: "center", lineHeight: 1.6 }}>
              En créant un compte, vous acceptez que les MarketCoins n'ont aucune valeur monétaire et ne peuvent pas être convertis.
            </div>
          )}
        </div>

        <div style={{ marginTop: 16, textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
          🎁 Vous démarrez avec <span style={{ color: "#fbbf24", fontWeight: 800 }}>5 000 MarketCoins</span> gratuits !
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700;800;900&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        input::placeholder { color:rgba(255,255,255,0.2); }
        input:focus { border-color:rgba(16,185,129,0.4) !important; }
        button { font-family:inherit; }
      `}</style>
    </div>
  );
}

// ============================================================
// MARKET CARD
// ============================================================
function MarketCard({ market, onBet, index }) {
  const [hover, setHover] = useState(false);
  const p = AMM.probYes(market.q_yes, market.q_no);
  const cc = catColor(market.category);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: hover ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: "20px 22px", transition: "all 0.2s", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${cc},transparent)` }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ flex: 1, paddingRight: 12 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: cc, background: `${cc}18`, padding: "2px 8px", borderRadius: 20, border: `1px solid ${cc}30` }}>{market.category}</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", padding: "2px 0" }}>⏱ {timeLeft(market.closes_at)}</span>
          </div>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#fff", lineHeight: 1.4, marginBottom: 3 }}>{market.title}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{market.source}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 34, lineHeight: 1, color: p > 0.5 ? "#10b981" : "#ef4444" }}>{Math.round(p * 100)}<span style={{ fontSize: 16 }}>%</span></div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>OUI</div>
        </div>
      </div>
      <ProbBar qYes={market.q_yes} qNo={market.q_no} />
      <div style={{ display: "flex", gap: 20, margin: "12px 0 14px" }}>
        <div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 2 }}>VOLUME</div><div style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24" }}>🪙 {fmt(market.total_volume)}</div></div>
        <div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 2 }}>PARTICIPANTS</div><div style={{ fontSize: 13, fontWeight: 700 }}>{fmt(market.participants)}</div></div>
      </div>
      <button onClick={() => onBet(market)}
        style={{ width: "100%", padding: "10px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: hover ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.2s" }}>
        PRÉDIRE →
      </button>
    </div>
  );
}

// ============================================================
// BET MODAL
// ============================================================
function BetModal({ market, onClose, onConfirm, coins }) {
  const [side, setSide] = useState("yes");
  const [amount, setAmount] = useState(50);
  const pYes = AMM.probYes(market.q_yes, market.q_no);
  const cost = AMM.costToBuy(market.q_yes, market.q_no, amount, side);
  const gain = side === "yes" ? Math.round(amount / pYes) : Math.round(amount / (1 - pYes));
  const canBet = cost >= 1 && cost <= coins;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(12px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#0f1623", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 22, padding: 28, width: 380, maxWidth: "95vw", boxShadow: "0 40px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: 1, marginBottom: 4 }}>PLACER UNE PRÉDICTION</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 20, lineHeight: 1.4 }}>{market.title}</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {["yes", "no"].map(s => (
            <button key={s} onClick={() => setSide(s)}
              style={{ flex: 1, padding: "12px 0", borderRadius: 11, border: `2px solid ${side === s ? (s === "yes" ? "#10b981" : "#ef4444") : "rgba(255,255,255,0.07)"}`, background: side === s ? (s === "yes" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)") : "transparent", color: side === s ? (s === "yes" ? "#10b981" : "#ef4444") : "rgba(255,255,255,0.3)", fontWeight: 900, fontSize: 14, cursor: "pointer" }}>
              {s === "yes" ? `✓ OUI ${fmtPct(pYes)}` : `✗ NON ${fmtPct(1 - pYes)}`}
            </button>
          ))}
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 7, fontWeight: 700, letterSpacing: 0.5 }}>PARTS À ACHETER</div>
          <input type="number" value={amount} min={1} max={1000} onChange={e => setAmount(Math.max(1, Math.min(1000, +e.target.value || 1)))}
            style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff", fontSize: 20, fontWeight: 800, outline: "none", boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {[10, 50, 100, 200].map(v => <button key={v} onClick={() => setAmount(v)} style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: amount === v ? "rgba(255,255,255,0.1)" : "transparent", color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{v}</button>)}
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 11, padding: "13px 15px", marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Coût</span>
            <CoinBadge amount={cost} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Gain potentiel</span>
            <span style={{ fontWeight: 900, fontSize: 17, color: "#fbbf24" }}>🪙 +{fmt(gain)}</span>
          </div>
        </div>
        <button onClick={() => canBet && onConfirm(side, amount, cost, gain)} disabled={!canBet}
          style={{ width: "100%", padding: "13px 0", borderRadius: 11, border: "none", background: canBet ? "linear-gradient(135deg,#10b981,#059669)" : "rgba(255,255,255,0.05)", color: canBet ? "#fff" : "rgba(255,255,255,0.2)", fontWeight: 900, fontSize: 15, cursor: canBet ? "pointer" : "not-allowed" }}>
          {!canBet && coins < cost ? "Pas assez de coins" : "CONFIRMER →"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// PAGES
// ============================================================
function HomePage({ markets, coins, username, onBet, onNavigate }) {
  return (
    <div>
      <div style={{ background: "linear-gradient(135deg,rgba(16,185,129,0.07),rgba(59,130,246,0.04))", border: "1px solid rgba(16,185,129,0.1)", borderRadius: 22, padding: "32px 28px", marginBottom: 24, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -60, right: -60, width: 250, height: 250, borderRadius: "50%", background: "radial-gradient(circle,rgba(16,185,129,0.09),transparent 70%)", pointerEvents: "none" }} />
        <div style={{ fontSize: 11, fontWeight: 800, color: "#10b981", letterSpacing: 3, marginBottom: 10 }}>BIENVENUE, {username?.toUpperCase()}</div>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 38, lineHeight: 1.05, color: "#fff", marginBottom: 8 }}>PRÉDICTE.<br />GAGNE.<br />DOMINE.</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 22 }}>Utilise tes MarketCoins pour prédire les transferts, résultats et rumeurs du football mondial.</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.18)", borderRadius: 10, padding: "10px 16px" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 3 }}>TON SOLDE</div>
            <CoinBadge amount={coins} size="lg" />
          </div>
          <div style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.14)", borderRadius: 10, padding: "10px 16px" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 3 }}>MARCHÉS ACTIFS</div>
            <div style={{ fontWeight: 900, fontSize: 22, color: "#3b82f6" }}>{markets.length}</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 26 }}>
        {[{ label: "HEBDO", val: "+120/sem", icon: "📅", color: "#10b981" }, { label: "PUB", val: "+20 coins", icon: "📺", color: "#3b82f6" }, { label: "ROUE", val: "Jusqu'à 200", icon: "🎡", color: "#f59e0b" }].map(s => (
          <div key={s.label} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 13, padding: "14px 12px" }}>
            <div style={{ fontSize: 20, marginBottom: 5 }}>{s.icon}</div>
            <div style={{ fontWeight: 900, fontSize: 14, color: s.color, marginBottom: 1 }}>{s.val}</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontWeight: 800, letterSpacing: 0.5 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: 1, marginBottom: 14 }}>MARCHÉS EN VEDETTE</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 11 }}>
        {markets.slice(0, 4).map((m, i) => <MarketCard key={m.id} market={m} onBet={onBet} index={i} />)}
      </div>
      <button onClick={() => onNavigate("markets")} style={{ width: "100%", marginTop: 14, padding: "11px 0", borderRadius: 11, border: "1px solid rgba(255,255,255,0.07)", background: "transparent", color: "rgba(255,255,255,0.4)", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Voir tous les marchés →</button>
    </div>
  );
}

function MarketsPage({ markets, onBet }) {
  const [cat, setCat] = useState("Tous");
  const cats = ["Tous", ...new Set(markets.map(m => m.category))];
  const filtered = cat === "Tous" ? markets : markets.filter(m => m.category === cat);
  return (
    <div>
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, letterSpacing: 1, marginBottom: 5 }}>MARCHÉS DE PRÉDICTION</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 20 }}>{markets.length} marchés · AMM en temps réel</div>
      <div style={{ display: "flex", gap: 7, marginBottom: 22, flexWrap: "wrap" }}>
        {cats.map(c => <button key={c} onClick={() => setCat(c)} style={{ padding: "6px 13px", borderRadius: 20, border: `1px solid ${cat === c ? catColor(c) : "rgba(255,255,255,0.07)"}`, background: cat === c ? `${catColor(c)}18` : "transparent", color: cat === c ? catColor(c) : "rgba(255,255,255,0.4)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{c}</button>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 11 }}>
        {filtered.map((m, i) => <MarketCard key={m.id} market={m} onBet={onBet} index={i} />)}
      </div>
    </div>
  );
}

function WalletPage({ coins, bets, profile, onSpin, onWatchAd }) {
  const [spinning, setSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState(null);

  // FIX Bug 5 : vérification correcte de last_spin
  const lastSpin = profile?.last_spin ? new Date(profile.last_spin).getTime() : 0;
  const canSpin = Date.now() - lastSpin > 86400000;
  const today = new Date().toISOString().split("T")[0];
  const adsToday = profile?.ads_reset_date === today ? (profile?.ads_watched_today || 0) : 0;
  const canAd = adsToday < 3;

  const doSpin = async () => {
    if (!canSpin || spinning) return;
    setSpinning(true);
    await new Promise(r => setTimeout(r, 1200));
    const reward = SPIN_REWARDS[Math.floor(Math.random() * SPIN_REWARDS.length)];
    setSpinResult(reward);
    onSpin(reward);
    setSpinning(false);
  };

  return (
    <div>
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, letterSpacing: 1, marginBottom: 20 }}>WALLET</div>
      <div style={{ background: "linear-gradient(135deg,rgba(251,191,36,0.07),rgba(251,191,36,0.02))", border: "1px solid rgba(251,191,36,0.14)", borderRadius: 20, padding: "28px", marginBottom: 18, textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>SOLDE MARKETCOINS</div>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 56, color: "#fbbf24", marginBottom: 4 }}>{fmt(coins)}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>Aucune valeur monétaire · Non convertibles</div>
      </div>

      <div style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.1)", borderRadius: 13, padding: "15px 18px", marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 800, color: "#10b981", marginBottom: 2 }}>📅 Distribution hebdomadaire</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>+120 coins automatiquement chaque lundi</div>
        </div>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: "#10b981" }}>+120</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11, marginBottom: 24 }}>
        <div style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.12)", borderRadius: 15, padding: "20px", textAlign: "center" }}>
          <div style={{ fontSize: 34, marginBottom: 7, display: "inline-block", transition: "transform 1.5s", transform: spinning ? "rotate(720deg)" : "none" }}>🎡</div>
          <div style={{ fontWeight: 800, marginBottom: 3 }}>Roue quotidienne</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 12 }}>Jusqu'à 200 coins</div>
          {spinResult && <div style={{ fontSize: 18, fontWeight: 900, color: "#f59e0b", marginBottom: 8 }}>+{spinResult} 🪙</div>}
          <button onClick={doSpin} disabled={!canSpin || spinning}
            style={{ width: "100%", padding: "8px 0", borderRadius: 9, border: "none", background: canSpin && !spinning ? "linear-gradient(135deg,#f59e0b,#d97706)" : "rgba(255,255,255,0.05)", color: canSpin && !spinning ? "#fff" : "rgba(255,255,255,0.25)", fontWeight: 800, cursor: canSpin && !spinning ? "pointer" : "not-allowed", fontSize: 13 }}>
            {spinning ? "..." : canSpin ? "TOURNER" : "Demain ✓"}
          </button>
        </div>
        <div style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.12)", borderRadius: 15, padding: "20px", textAlign: "center" }}>
          <div style={{ fontSize: 34, marginBottom: 7 }}>📺</div>
          <div style={{ fontWeight: 800, marginBottom: 3 }}>Pub récompensée</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>+20 coins · {adsToday}/3 aujourd'hui</div>
          <div style={{ height: 4, background: "rgba(59,130,246,0.15)", borderRadius: 99, marginBottom: 12, overflow: "hidden" }}>
            <div style={{ width: `${(adsToday / 3) * 100}%`, height: "100%", background: "#3b82f6", borderRadius: 99 }} />
          </div>
          <button onClick={() => canAd && onWatchAd()} disabled={!canAd}
            style={{ width: "100%", padding: "8px 0", borderRadius: 9, border: "none", background: canAd ? "linear-gradient(135deg,#3b82f6,#2563eb)" : "rgba(255,255,255,0.05)", color: canAd ? "#fff" : "rgba(255,255,255,0.25)", fontWeight: 800, cursor: canAd ? "pointer" : "not-allowed", fontSize: 13 }}>
            {canAd ? "REGARDER" : "Limite ✓"}
          </button>
        </div>
      </div>

      {bets.length > 0 && (
        <>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: 1, marginBottom: 12 }}>MES PRÉDICTIONS</div>
          {bets.map((b, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: "13px 16px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{b.market_title}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
                  <span style={{ color: b.side === "yes" ? "#10b981" : "#ef4444", fontWeight: 700 }}>{b.side === "yes" ? "OUI" : "NON"}</span>
                  {" · "}{fmt(b.cost)} coins
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(251,191,36,0.12)", color: "#fbbf24", fontWeight: 700, marginBottom: 3 }}>⏳ EN COURS</div>
                <div style={{ fontWeight: 900, color: "#10b981", fontSize: 14 }}>+{fmt(b.potential_gain)} 🪙</div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function LeaderboardPage({ leaderboard, username }) {
  const topColors = ["#c0c0c0", "#ffd700", "#cd7f32"];
  return (
    <div>
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, letterSpacing: 1, marginBottom: 5 }}>CLASSEMENT</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 22 }}>Top oracles de MarketBall</div>
      <div style={{ display: "flex", gap: 10, marginBottom: 22, alignItems: "flex-end" }}>
        {[leaderboard[1], leaderboard[0], leaderboard[2]].map((p, vi) => {
          if (!p) return null;
          const hs = [130, 160, 110], cs = topColors;
          return (
            <div key={p.username} style={{ flex: 1, background: `${cs[vi]}0d`, border: `1px solid ${cs[vi]}22`, borderRadius: 14, padding: "14px 10px", textAlign: "center", height: hs[vi], display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <div style={{ fontWeight: 800, fontSize: 12, color: "#fff", marginBottom: 1 }}>{p.username}</div>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: cs[vi] }}>{fmt(p.coins)}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{p.win_rate}%</div>
            </div>
          );
        })}
      </div>
      {leaderboard.map((p, i) => (
        <div key={p.username} style={{ background: p.username === username ? "rgba(16,185,129,0.05)" : "rgba(255,255,255,0.018)", border: `1px solid ${p.username === username ? "rgba(16,185,129,0.14)" : "rgba(255,255,255,0.04)"}`, borderRadius: 11, padding: "12px 16px", marginBottom: 6, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: i < 3 ? `linear-gradient(135deg,${topColors[i]},${topColors[i]}88)` : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 12, flexShrink: 0, color: i < 3 ? "#000" : "rgba(255,255,255,0.4)" }}>{p.rank || i + 1}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: p.username === username ? "#10b981" : "#fff", fontSize: 13 }}>{p.username} {p.username === username && "(Vous)"}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{p.total_wins}/{p.total_bets} · {p.win_rate}%</div>
          </div>
          <CoinBadge amount={p.coins} />
        </div>
      ))}
    </div>
  );
}

function StorePage({ coins, onRedeem }) {
  return (
    <div>
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, letterSpacing: 1, marginBottom: 5 }}>REWARD STORE</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 5 }}>Échange tes coins contre de vraies récompenses</div>
      <div style={{ marginBottom: 22 }}><CoinBadge amount={coins} size="lg" /></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 12 }}>
        {REWARD_STORE.map(r => {
          const ok = coins >= r.cost;
          return (
            <div key={r.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 17, padding: "20px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 34 }}>{r.icon}</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 2 }}>{r.name}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{r.value} · {r.stock} restants</div>
              </div>
              <div style={{ flex: 1 }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <CoinBadge amount={r.cost} />
                <button onClick={() => ok && onRedeem(r)} style={{ padding: "8px 14px", borderRadius: 9, border: "none", background: ok ? "linear-gradient(135deg,#10b981,#059669)" : "rgba(255,255,255,0.05)", color: ok ? "#fff" : "rgba(255,255,255,0.2)", fontWeight: 700, fontSize: 12, cursor: ok ? "pointer" : "not-allowed" }}>
                  {ok ? "OBTENIR" : "Insuffisant"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProfilePage({ profile, username, onLogout }) {
  const wr = profile?.total_bets > 0 ? Math.round((profile.total_wins / profile.total_bets) * 100) : 0;
  return (
    <div>
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, letterSpacing: 1, marginBottom: 20 }}>MON PROFIL</div>
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: "24px", marginBottom: 18, display: "flex", gap: 18, alignItems: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#10b981,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>{username?.[0]?.toUpperCase()}</div>
        <div>
          <div style={{ fontWeight: 900, fontSize: 20 }}>{username}</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>Membre MarketBall</div>
          <CoinBadge amount={profile?.coins || 0} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 18 }}>
        {[{ label: "PARIS", val: profile?.total_bets || 0, color: "#3b82f6" }, { label: "WINS", val: profile?.total_wins || 0, color: "#10b981" }, { label: "PRÉCISION", val: `${wr}%`, color: "#8b5cf6" }].map(s => (
          <div key={s.label} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: "16px 10px", textAlign: "center" }}>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontWeight: 800, letterSpacing: 1, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.1)", borderRadius: 12, padding: "13px 16px", marginBottom: 20, fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
        ⚠️ Les MarketCoins n'ont <strong style={{ color: "rgba(255,255,255,0.7)" }}>aucune valeur monétaire</strong> et ne peuvent pas être achetés ni convertis en argent.
      </div>
      <button onClick={onLogout} style={{ width: "100%", padding: "12px 0", borderRadius: 11, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.05)", color: "#ef4444", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
        Se déconnecter
      </button>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [page, setPage] = useState("home");
  const [markets, setMarkets] = useState(SEED_MARKETS);
  const [leaderboard, setLeaderboard] = useState([]);
  const [bets, setBets] = useState([]);
  const [betModal, setBetModal] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => setToast({ msg, type });

  const loadMarkets = useCallback(async () => {
    try {
      const data = await req("rumors?select=*&status=eq.open&order=created_at.desc");
      if (data?.length) {
        const mapped = data.map(r => ({
          id: r.rumor_id,
          title: r.event_question || `${r.player_name} → ${r.to_club} ?`,
          description: r.summary_fr || "",
          q_yes: 100, q_no: 100,
          total_volume: Math.floor(Math.random() * 10000) + 500,
          participants: Math.floor(Math.random() * 200) + 10,
          closes_at: r.expires_at || new Date(Date.now() + 14 * 86400000).toISOString(),
          category: "Transferts",
          source: r.source_name || r.source_handle || "Source",
          status: "open",
        }));
        setMarkets([...mapped, ...SEED_MARKETS]);
      }
    } catch {}
  }, []);

  const loadLeaderboard = useCallback(async (token) => {
    try {
      const data = await req("leaderboard?select=*&limit=10", { _token: token });
      if (data?.length) setLeaderboard(data);
    } catch {}
  }, []);

  const loadProfile = useCallback(async (token, userId) => {
    try {
      const data = await req(`profiles?id=eq.${userId}&select=*`, { _token: token });
      if (data?.[0]) {
        setProfile(data[0]);
      } else {
        // FIX Bug 2 : si le profil n'existe pas, on le crée manuellement
        const newProfile = {
          id: userId,
          coins: 5000,
          total_bets: 0,
          total_wins: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        try {
          await req("profiles", { method: "POST", _token: token, body: JSON.stringify(newProfile) });
        } catch {}
        setProfile(newProfile);
      }
    } catch {}
  }, []);

  const loadBets = useCallback(async (token, userId) => {
    try {
      const data = await req(`user_bets?user_id=eq.${userId}&select=*&order=created_at.desc&limit=20`, { _token: token });
      if (data) setBets(data);
    } catch {}
  }, []);

  useEffect(() => { loadMarkets(); }, []);

  const handleAuth = async (token, user) => {
    setSession({ token, user });
    await loadProfile(token, user.id);
    await loadBets(token, user.id);
    await loadLeaderboard(token);
  };

  const updateCoins = async (newCoins, token, userId) => {
    try {
      await req(`profiles?id=eq.${userId}`, {
        method: "PATCH", _token: token,
        body: JSON.stringify({ coins: newCoins, updated_at: new Date().toISOString() }),
      });
    } catch {}
    setProfile(p => ({ ...p, coins: newCoins }));
  };

  // FIX Bug 1 : market_id est maintenant un vrai UUID
  const handleBetConfirm = async (side, amount, cost, gain) => {
    if (!session) return;
    const newCoins = (profile?.coins || 0) - cost;
    if (newCoins < 0) { showToast("Pas assez de coins !", "error"); return; }
    try {
      await req("user_bets", {
        method: "POST", _token: session.token,
        body: JSON.stringify({
          user_id: session.user.id,
          market_id: betModal.id,
          market_title: betModal.title,
          side,
          amount,
          cost,
          potential_gain: gain,
          status: "pending",
        }),
      });
      await updateCoins(newCoins, session.token, session.user.id);
      setBets(prev => [{ market_id: betModal.id, market_title: betModal.title, side, amount, cost, potential_gain: gain, status: "pending" }, ...prev]);
      setMarkets(prev => prev.map(m => m.id === betModal.id ? {
        ...m,
        q_yes: side === "yes" ? m.q_yes + amount : m.q_yes,
        q_no: side === "no" ? m.q_no + amount : m.q_no,
        total_volume: m.total_volume + cost,
        participants: m.participants + 1,
      } : m));
      setBetModal(null);
      showToast(`✅ Prédiction placée ! Gain potentiel : +${gain.toLocaleString()} 🪙`);
      await loadProfile(session.token, session.user.id);
      await loadLeaderboard(session.token);
    } catch (e) {
      showToast(`Erreur : ${e.message}`, "error");
    }
  };

  // FIX Bug 5 : sauvegarde last_spin dans Supabase
  const handleSpin = async (reward) => {
    if (!session) return;
    const newCoins = (profile?.coins || 0) + reward;
    try {
      await req(`profiles?id=eq.${session.user.id}`, {
        method: "PATCH", _token: session.token,
        body: JSON.stringify({ coins: newCoins, last_spin: new Date().toISOString(), updated_at: new Date().toISOString() }),
      });
    } catch {}
    setProfile(p => ({ ...p, coins: newCoins, last_spin: new Date().toISOString() }));
    showToast(`🎡 +${reward} MarketCoins gagnés !`);
  };

  const handleWatchAd = async () => {
    if (!session) return;
    const newCoins = (profile?.coins || 0) + 20;
    const today = new Date().toISOString().split("T")[0];
    const adsToday = profile?.ads_reset_date === today ? (profile?.ads_watched_today || 0) + 1 : 1;
    try {
      await req(`profiles?id=eq.${session.user.id}`, {
        method: "PATCH", _token: session.token,
        body: JSON.stringify({ coins: newCoins, ads_watched_today: adsToday, ads_reset_date: today, updated_at: new Date().toISOString() }),
      });
    } catch {}
    setProfile(p => ({ ...p, coins: newCoins, ads_watched_today: adsToday, ads_reset_date: today }));
    showToast("📺 +20 MarketCoins gagnés !");
  };

  const handleRedeem = async (reward) => {
    if (!session) return;
    const newCoins = (profile?.coins || 0) - reward.cost;
    await updateCoins(newCoins, session.token, session.user.id);
    showToast(`🎁 ${reward.name} obtenu !`);
  };

  const handleLogout = async () => {
    try { await authReq("logout", {}); } catch {}
    setSession(null); setProfile(null); setBets([]);
  };

  const coins = profile?.coins ?? 5000;
  const username = profile?.username || session?.user?.user_metadata?.username || session?.user?.email?.split("@")[0] || "Joueur";

  const NAV = [
    { id: "home", icon: "⚡", label: "Accueil" },
    { id: "markets", icon: "📊", label: "Marchés" },
    { id: "wallet", icon: "🪙", label: "Wallet" },
    { id: "leaderboard", icon: "🏆", label: "Classement" },
    { id: "store", icon: "🛍", label: "Store" },
    { id: "profile", icon: "👤", label: "Profil" },
  ];

  if (!session) return <AuthPage onAuth={handleAuth} />;

  return (
    <div style={{ minHeight: "100vh", background: "#080c12", fontFamily: "'DM Sans',sans-serif", color: "#fff" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: -200, left: "25%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle,rgba(16,185,129,0.04),transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: -200, right: "10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(59,130,246,0.03),transparent 70%)" }} />
      </div>

      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 200, background: "rgba(8,12,18,0.92)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 54 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 30, height: 30, background: "linear-gradient(135deg,#10b981,#3b82f6)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⚽</div>
            <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, letterSpacing: 2 }}>MARKET<span style={{ color: "#10b981" }}>BALL</span></span>
          </div>
          <nav style={{ display: "flex", gap: 2 }}>
            {NAV.slice(0, 4).map(n => (
              <button key={n.id} onClick={() => setPage(n.id)} style={{ padding: "5px 11px", borderRadius: 7, border: "none", background: page === n.id ? "rgba(16,185,129,0.12)" : "transparent", color: page === n.id ? "#10b981" : "rgba(255,255,255,0.4)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                {n.icon} {n.label}
              </button>
            ))}
          </nav>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button onClick={() => setPage("store")} style={{ padding: "5px 10px", borderRadius: 7, border: "none", background: page === "store" ? "rgba(16,185,129,0.12)" : "transparent", color: page === "store" ? "#10b981" : "rgba(255,255,255,0.35)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>🛍</button>
            <button onClick={() => setPage("profile")} style={{ padding: "5px 10px", borderRadius: 7, border: "none", background: page === "profile" ? "rgba(16,185,129,0.12)" : "transparent", color: page === "profile" ? "#10b981" : "rgba(255,255,255,0.35)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>👤 {username}</button>
            <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.18)", borderRadius: 7, padding: "4px 10px", display: "flex", gap: 4, alignItems: "center" }}>
              <span style={{ fontSize: 11 }}>🪙</span><span style={{ fontWeight: 800, color: "#fbbf24", fontSize: 12 }}>{fmt(coins)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 20px 90px", position: "relative", zIndex: 1 }}>
        {page === "home" && <HomePage markets={markets} coins={coins} username={username} onBet={setBetModal} onNavigate={setPage} />}
        {page === "markets" && <MarketsPage markets={markets} onBet={setBetModal} />}
        {page === "wallet" && <WalletPage coins={coins} bets={bets} profile={profile} onSpin={handleSpin} onWatchAd={handleWatchAd} />}
        {page === "leaderboard" && <LeaderboardPage leaderboard={leaderboard.length ? leaderboard : [{ rank: 1, username, coins, total_wins: profile?.total_wins || 0, total_bets: profile?.total_bets || 0, win_rate: 0 }]} username={username} />}
        {page === "store" && <StorePage coins={coins} onRedeem={handleRedeem} />}
        {page === "profile" && <ProfilePage profile={profile} username={username} onLogout={handleLogout} />}
      </div>

      {/* Bottom nav */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(8,12,18,0.95)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", zIndex: 200 }}>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setPage(n.id)} style={{ flex: 1, padding: "8px 0", background: "transparent", border: "none", color: page === n.id ? "#10b981" : "rgba(255,255,255,0.3)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: 17 }}>{n.icon}</span>
            <span style={{ fontSize: 9, fontWeight: 700 }}>{n.label}</span>
          </button>
        ))}
      </div>

      {betModal && <BetModal market={betModal} coins={coins} onClose={() => setBetModal(null)} onConfirm={handleBetConfirm} />}
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700;800;900&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        input::placeholder { color:rgba(255,255,255,0.2); }
        input:focus { border-color:rgba(16,185,129,0.4) !important; }
        button { font-family:inherit; }
        @keyframes slideUp { from{transform:translateX(-50%) translateY(16px);opacity:0} to{transform:translateX(-50%) translateY(0);opacity:1} }
        ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:99px; }
      `}</style>
    </div>
  );
}
