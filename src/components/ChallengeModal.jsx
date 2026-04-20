import { useState, useEffect } from "react";
import { req } from "../lib/supabase.js";
import { fmt } from "../lib/helpers.js";
import Avatar from "./ui/Avatar.jsx";

export default function ChallengeModal({ market, profile, session, onClose, showToast }) {
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [mySide, setMySide] = useState("yes");
  const [amount, setAmount] = useState(50);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const userId = profile?.id;
  const coins = profile?.coins || 0;
  const token = session?.token;

  // sides selon le type de marché
  const isMulti = market.market_type === "multi";
  const sides = isMulti
    ? (market.options || []).map(o => ({ key: o.label, label: o.label }))
    : [{ key: "yes", label: "✅ OUI" }, { key: "no", label: "❌ NON" }];

  const opponentSide = isMulti
    ? sides.find(s => s.key !== mySide)?.key || sides[0]?.key
    : mySide === "yes" ? "no" : "yes";

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      const accepted = await req(`friendships?or=(requester_id.eq.${userId},recipient_id.eq.${userId})&status=eq.accepted&select=*`, { _token: token }).catch(() => []);
      const ids = (accepted || []).map(f => f.requester_id === userId ? f.recipient_id : f.requester_id);
      if (ids.length) {
        const profiles = await req(`profiles?id=in.(${ids.join(",")})&select=id,username,coins`).catch(() => []);
        setFriends(profiles || []);
      }
      setLoading(false);
    };
    load();
  }, [userId]);

  const send = async () => {
    if (!selectedFriend) { showToast("Choisis un ami", "error"); return; }
    if (amount < 10) { showToast("Minimum 10 MC", "error"); return; }
    if (amount > coins) { showToast("Pas assez de MC", "error"); return; }
    setSending(true);
    try {
      await req(`friend_challenges`, {
        method: "POST",
        body: JSON.stringify({
          challenger_id: userId,
          challenged_id: selectedFriend.id,
          challenger_username: profile.username,
          challenged_username: selectedFriend.username,
          market_id: String(market.id),
          market_title: market.title,
          challenger_side: mySide,
          challenged_side: opponentSide,
          amount,
          status: "pending",
        }),
        _token: token,
      });
      // Déduire les coins du challenger immédiatement
      await req(`profiles?id=eq.${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ coins: coins - amount }),
        _token: token,
      });
      showToast(`Défi envoyé à ${selectedFriend.username} ! 🤺`);
      onClose();
    } catch (e) {
      showToast(e.message || "Erreur", "error");
    }
    setSending(false);
  };

  const opponentSideLabel = isMulti
    ? opponentSide
    : opponentSide === "yes" ? "✅ OUI" : "❌ NON";

  return (
    <div onClick={onClose} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(3,7,18,0.88)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(16px)", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "rgba(15,20,40,0.97)", border: "1px solid rgba(241,245,249,0.08)", borderRadius: 22, padding: 24, width: 420, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 50px 100px rgba(0,0,0,0.6)", animation: "fadeInUp 0.3s ease" }}>

        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: 2, marginBottom: 4 }}>⚔️ DÉFIER UN AMI</div>
        <div style={{ fontSize: 12, color: "rgba(241,245,249,0.35)", marginBottom: 18 }}>{market.title}</div>

        {/* Mon camp */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(241,245,249,0.4)", letterSpacing: 1, marginBottom: 10 }}>TON CAMP</div>
          <div style={{ display: "flex", gap: 8 }}>
            {sides.map(s => (
              <button key={s.key} onClick={() => setMySide(s.key)}
                style={{ flex: 1, padding: "10px 0", borderRadius: 11, border: `1px solid ${mySide === s.key ? "#10b981" : "rgba(241,245,249,0.08)"}`, background: mySide === s.key ? "rgba(16,185,129,0.1)" : "transparent", color: mySide === s.key ? "#10b981" : "rgba(241,245,249,0.4)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                {s.label}
              </button>
            ))}
          </div>
          {!isMulti && <div style={{ fontSize: 11, color: "rgba(241,245,249,0.3)", marginTop: 8, textAlign: "center" }}>Ton ami jouera automatiquement {opponentSideLabel}</div>}
        </div>

        {/* Montant */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(241,245,249,0.4)", letterSpacing: 1, marginBottom: 10 }}>MISE (MC) — Tu as {fmt(coins)} MC</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            {[25, 50, 100, 200].map(v => (
              <button key={v} onClick={() => setAmount(v)}
                style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: `1px solid ${amount === v ? "#fbbf24" : "rgba(241,245,249,0.08)"}`, background: amount === v ? "rgba(251,191,36,0.08)" : "transparent", color: amount === v ? "#fbbf24" : "rgba(241,245,249,0.4)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                {v}
              </button>
            ))}
          </div>
          <input
            type="number" value={amount} min={10} max={coins}
            onChange={e => setAmount(Math.max(10, Math.min(coins, parseInt(e.target.value) || 10)))}
            style={{ width: "100%", padding: "11px 14px", background: "rgba(241,245,249,0.04)", border: "1px solid rgba(241,245,249,0.08)", borderRadius: 11, color: "#fbbf24", fontSize: 18, outline: "none", boxSizing: "border-box", fontFamily: "'Bebas Neue',sans-serif", letterSpacing: 2, textAlign: "center" }}
          />
          <div style={{ fontSize: 11, color: "rgba(241,245,249,0.3)", textAlign: "center", marginTop: 8 }}>
            Pot total : <span style={{ color: "#10b981", fontWeight: 700 }}>🪙 {fmt(amount * 2)} MC</span> pour le gagnant
          </div>
        </div>

        {/* Choisir ami */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(241,245,249,0.4)", letterSpacing: 1, marginBottom: 10 }}>CHOISIR L'AMI</div>
          {loading ? (
            <div style={{ textAlign: "center", padding: 20, color: "rgba(241,245,249,0.25)" }}>Chargement...</div>
          ) : friends.length === 0 ? (
            <div style={{ textAlign: "center", padding: 20, color: "rgba(241,245,249,0.25)", fontSize: 12 }}>Aucun ami — ajoutes-en dans Communauté</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
              {friends.map(f => (
                <div key={f.id} onClick={() => setSelectedFriend(selectedFriend?.id === f.id ? null : f)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, border: `1px solid ${selectedFriend?.id === f.id ? "#10b981" : "rgba(241,245,249,0.06)"}`, background: selectedFriend?.id === f.id ? "rgba(16,185,129,0.06)" : "rgba(241,245,249,0.02)", cursor: "pointer" }}>
                  <Avatar username={f.username} size={32} radius={9} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: selectedFriend?.id === f.id ? "#10b981" : "#f1f5f9" }}>{f.username}</div>
                    <div style={{ fontSize: 11, color: "rgba(241,245,249,0.3)" }}>🪙 {fmt(f.coins || 0)} MC</div>
                  </div>
                  {selectedFriend?.id === f.id && <span style={{ color: "#10b981", fontSize: 16 }}>✓</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px 0", borderRadius: 11, border: "1px solid rgba(241,245,249,0.1)", background: "transparent", color: "rgba(241,245,249,0.4)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Annuler</button>
          <button onClick={send} disabled={sending || !selectedFriend || amount > coins}
            style={{ flex: 2, padding: "12px 0", borderRadius: 11, border: "none", background: sending || !selectedFriend || amount > coins ? "rgba(241,245,249,0.04)" : "linear-gradient(135deg,#f59e0b,#d97706)", color: sending || !selectedFriend || amount > coins ? "rgba(241,245,249,0.2)" : "#fff", fontWeight: 800, fontSize: 14, cursor: sending || !selectedFriend || amount > coins ? "not-allowed" : "pointer" }}>
            {sending ? "..." : `⚔️ ENVOYER LE DÉFI → ${fmt(amount)} MC`}
          </button>
        </div>
      </div>
    </div>
  );
}
