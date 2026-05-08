import { useState, useEffect } from "react";
import { req } from "../lib/supabase.js";
import Avatar from "../components/ui/Avatar.jsx";
import { getDivision } from "../lib/helpers.js";

export default function FriendsPage({ profile, session, onViewProfile, showToast }) {
  const [tab, setTab] = useState("friends");
  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState([]);
  const [sent, setSent] = useState([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  const userId = profile?.id;
  const token = session?.token;

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [accepted, pendingIn, pendingOut] = await Promise.all([
        req(`friendships?or=(requester_id.eq.${userId},recipient_id.eq.${userId})&status=eq.accepted&select=*`, { _token: token }),
        req(`friendships?recipient_id=eq.${userId}&status=eq.pending&select=*`, { _token: token }),
        req(`friendships?requester_id=eq.${userId}&status=eq.pending&select=*`, { _token: token }),
      ]);

      // Récupérer les profils des amis
      const friendIds = (accepted || []).map(f => f.requester_id === userId ? f.recipient_id : f.requester_id);
      const requesterIds = (pendingIn || []).map(f => f.requester_id);

      const [friendProfiles, requesterProfiles] = await Promise.all([
        friendIds.length ? req(`profiles?id=in.(${friendIds.join(",")})&select=id,username,coins,total_bets,total_wins`) : Promise.resolve([]),
        requesterIds.length ? req(`profiles?id=in.(${requesterIds.join(",")})&select=id,username,coins`) : Promise.resolve([]),
      ]);

      setFriends((friendProfiles || []).map(p => ({
        ...p,
        friendship: accepted.find(f => f.requester_id === p.id || f.recipient_id === p.id)
      })));
      setPending((pendingIn || []).map(f => ({
        ...f,
        profile: requesterProfiles?.find(p => p.id === f.requester_id)
      })));
      setSent(pendingOut || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId]);

  const searchUsers = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const results = await req(`profiles?username=ilike.*${encodeURIComponent(search.trim())}*&select=id,username,coins&limit=10`);
      setSearchResults((results || []).filter(r => r.id !== userId));
    } catch {}
    setSearching(false);
  };

  const sendRequest = async (recipientId) => {
    try {
      await req(`friendships`, { method: "POST", body: JSON.stringify({ requester_id: userId, recipient_id: recipientId, status: "pending" }), _token: token });
      showToast("Demande envoyée !");
      setSearchResults(prev => prev.filter(r => r.id !== recipientId));
      load();
    } catch (e) {
      showToast(e.message || "Erreur", "error");
    }
  };

  const acceptRequest = async (friendshipId) => {
    try {
      await req(`friendships?id=eq.${friendshipId}`, { method: "PATCH", body: JSON.stringify({ status: "accepted" }), _token: token });
      showToast("Ami ajouté !");
      load();
    } catch {}
  };

  const declineRequest = async (friendshipId) => {
    try {
      await req(`friendships?id=eq.${friendshipId}`, { method: "DELETE", _token: token });
      load();
    } catch {}
  };

  const removeFriend = async (friendshipId) => {
    try {
      await req(`friendships?id=eq.${friendshipId}`, { method: "DELETE", _token: token });
      showToast("Ami retiré");
      load();
    } catch {}
  };

  const isFriend = (id) => friends.some(f => f.id === id);
  const hasSentRequest = (id) => sent.some(f => f.recipient_id === id);

  const TABS = [
    { id: "friends", label: `👥 Amis (${friends.length})` },
    { id: "requests", label: `📬 Demandes${pending.length ? ` (${pending.length})` : ""}` },
    { id: "search", label: "🔍 Rechercher" },
  ];

  return (
    <div className="page-enter">
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 30, letterSpacing: 2, marginBottom: 6 }}>AMIS</div>
      <div style={{ fontSize: 13, color: "rgba(241,245,249,0.35)", marginBottom: 20 }}>Tes potes sur MarketBall</div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: "9px 6px", borderRadius: 10, border: `1px solid ${tab === t.id ? "#10b981" : "rgba(241,245,249,0.07)"}`, background: tab === t.id ? "rgba(16,185,129,0.08)" : "transparent", color: tab === t.id ? "#10b981" : "rgba(241,245,249,0.35)", fontWeight: 700, fontSize: 10, cursor: "pointer", whiteSpace: "nowrap" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Amis */}
      {tab === "friends" && (
        loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "rgba(241,245,249,0.25)", fontFamily: "'Bebas Neue',sans-serif", letterSpacing: 2 }}>CHARGEMENT...</div>
        ) : friends.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, color: "rgba(241,245,249,0.25)", marginBottom: 8 }}>AUCUN AMI POUR L'INSTANT</div>
            <div style={{ fontSize: 12, color: "rgba(241,245,249,0.2)" }}>Recherche des joueurs dans l'onglet Rechercher</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {friends.map(f => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(241,245,249,0.02)", border: "1px solid rgba(241,245,249,0.06)", borderRadius: 12, padding: "12px 14px" }}>
                <Avatar username={f.username} size={38} radius={10} />
                <div style={{ flex: 1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <span style={{ fontSize:14 }}>{getDivision(f.coins||0).icon}</span>
                    <span onClick={() => onViewProfile?.(f.username)} style={{ fontWeight: 700, fontSize: 13, cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dotted", textDecorationColor: "rgba(241,245,249,0.2)" }}>{f.username}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(241,245,249,0.3)", marginTop: 2 }}>{getDivision(f.coins||0).name} · {f.total_wins || 0}/{f.total_bets || 0} paris</div>
                </div>
                <button onClick={() => removeFriend(f.friendship?.id)} style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)", background: "transparent", color: "rgba(239,68,68,0.5)", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>Retirer</button>
              </div>
            ))}
          </div>
        )
      )}

      {/* Tab Demandes */}
      {tab === "requests" && (
        <div>
          {pending.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "rgba(241,245,249,0.2)", fontSize: 13 }}>Aucune demande en attente</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pending.map(f => (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(241,245,249,0.02)", border: "1px solid rgba(241,245,249,0.06)", borderRadius: 12, padding: "12px 14px" }}>
                  <Avatar username={f.profile?.username || "?"} size={38} radius={10} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <span style={{ fontSize:14 }}>{getDivision(f.profile?.coins||0).icon}</span>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{f.profile?.username || "Joueur inconnu"}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(241,245,249,0.3)", marginTop: 2 }}>{getDivision(f.profile?.coins||0).name} · veut être ton ami</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => acceptRequest(f.id)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>✓</button>
                    <button onClick={() => declineRequest(f.id)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(241,245,249,0.1)", background: "transparent", color: "rgba(241,245,249,0.4)", fontSize: 11, cursor: "pointer" }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Recherche */}
      {tab === "search" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === "Enter" && searchUsers()}
              placeholder="Chercher un pseudo..."
              style={{ flex: 1, padding: "11px 14px", background: "rgba(241,245,249,0.04)", border: "1px solid rgba(241,245,249,0.08)", borderRadius: 11, color: "#f1f5f9", fontSize: 14, outline: "none" }}
            />
            <button onClick={searchUsers} disabled={searching}
              style={{ padding: "11px 18px", borderRadius: 11, border: "none", background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
              {searching ? "..." : "Chercher"}
            </button>
          </div>
          {searchResults.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {searchResults.map(r => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(241,245,249,0.02)", border: "1px solid rgba(241,245,249,0.06)", borderRadius: 12, padding: "12px 14px" }}>
                  <Avatar username={r.username} size={38} radius={10} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <span style={{ fontSize:14 }}>{getDivision(r.coins||0).icon}</span>
                      <span onClick={() => onViewProfile?.(r.username)} style={{ fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{r.username}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(241,245,249,0.3)", marginTop: 2 }}>{getDivision(r.coins||0).name}</div>
                  </div>
                  {isFriend(r.id) ? (
                    <span style={{ fontSize: 11, color: "#10b981", fontWeight: 700 }}>✓ Ami</span>
                  ) : hasSentRequest(r.id) ? (
                    <span style={{ fontSize: 11, color: "rgba(241,245,249,0.3)" }}>Envoyée</span>
                  ) : (
                    <button onClick={() => sendRequest(r.id)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>+ Ajouter</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
