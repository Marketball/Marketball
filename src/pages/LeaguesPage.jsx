import { useState, useEffect } from "react";
import { req } from "../lib/supabase.js";
import BadgeTag from "../components/ui/BadgeTag.jsx";
import Avatar from "../components/ui/Avatar.jsx";
import { fmt } from "../lib/helpers.js";

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function LeaguesPage({ profile, session, showToast }) {
  const [tab, setTab] = useState("mes-ligues");
  const [myLeagues, setMyLeagues] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [leagueMembers, setLeagueMembers] = useState([]);
  const [membersProfiles, setMembersProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [newLeagueName, setNewLeagueName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const userId = profile?.id;
  const token = session?.token;

  const loadMyLeagues = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const memberships = await req(`league_members?user_id=eq.${userId}&select=league_id`, { _token: token });
      if (memberships?.length) {
        const ids = memberships.map(m => m.league_id).join(",");
        const leagues = await req(`leagues?id=in.(${ids})&select=*`);
        setMyLeagues(leagues || []);
      } else {
        setMyLeagues([]);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadMyLeagues(); }, [userId]);

  const loadLeagueMembers = async (league) => {
    setSelectedLeague(league);
    setLoadingMembers(true);
    try {
      const members = await req(`league_members?league_id=eq.${league.id}&select=user_id`);
      const ids = (members || []).map(m => m.user_id).join(",");
      if (ids) {
        const profiles = await req(`profiles?id=in.(${ids})&select=id,username,xp,total_bets,total_wins,total_profit,weekly_profit`);
        setMembersProfiles((profiles || []).sort((a, b) => (b.weekly_profit || 0) - (a.weekly_profit || 0)));
      } else {
        setMembersProfiles([]);
      }
      setLeagueMembers(members || []);
    } catch {}
    setLoadingMembers(false);
  };

  const createLeague = async () => {
    if (!newLeagueName.trim()) return;
    setCreating(true);
    try {
      const code = generateCode();
      const [league] = await req(`leagues`, {
        method: "POST",
        body: JSON.stringify({ name: newLeagueName.trim(), invite_code: code, created_by: userId }),
        _token: token,
        headers: { Prefer: "return=representation" }
      });
      if (league?.id) {
        await req(`league_members`, {
          method: "POST",
          body: JSON.stringify({ league_id: league.id, user_id: userId }),
          _token: token
        });
        showToast(`Ligue "${league.name}" créée ! Code : ${code}`);
        setNewLeagueName("");
        setTab("mes-ligues");
        loadMyLeagues();
      }
    } catch (e) {
      showToast(e.message || "Erreur", "error");
    }
    setCreating(false);
  };

  const joinLeague = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      const leagues = await req(`leagues?invite_code=eq.${joinCode.trim().toUpperCase()}&select=*`);
      if (!leagues?.length) { showToast("Code invalide", "error"); setJoining(false); return; }
      const league = leagues[0];
      // Vérifier si déjà membre
      const existing = await req(`league_members?league_id=eq.${league.id}&user_id=eq.${userId}&select=league_id`, { _token: token });
      if (existing?.length) { showToast("Tu es déjà dans cette ligue", "error"); setJoining(false); return; }
      await req(`league_members`, {
        method: "POST",
        body: JSON.stringify({ league_id: league.id, user_id: userId }),
        _token: token
      });
      showToast(`Tu as rejoint "${league.name}" !`);
      setJoinCode("");
      setTab("mes-ligues");
      loadMyLeagues();
    } catch (e) {
      showToast(e.message || "Erreur", "error");
    }
    setJoining(false);
  };

  const leaveLeague = async (leagueId) => {
    try {
      await req(`league_members?league_id=eq.${leagueId}&user_id=eq.${userId}`, { method: "DELETE", _token: token });
      showToast("Tu as quitté la ligue");
      if (selectedLeague?.id === leagueId) setSelectedLeague(null);
      loadMyLeagues();
    } catch {}
  };

  const TABS = [
    { id: "mes-ligues", label: "🏆 Mes ligues" },
    { id: "creer", label: "➕ Créer" },
    { id: "rejoindre", label: "🔗 Rejoindre" },
  ];

  // Vue classement d'une ligue
  if (selectedLeague) {
    return (
      <div className="page-enter">
        <button onClick={() => setSelectedLeague(null)} style={{ marginBottom: 16, padding: "6px 14px", borderRadius: 10, border: "1px solid rgba(241,245,249,0.08)", background: "transparent", color: "rgba(241,245,249,0.4)", cursor: "pointer", fontSize: 13 }}>← Retour</button>
        <div style={{ background: "linear-gradient(135deg,rgba(16,185,129,0.08),rgba(16,185,129,0.02))", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 16, padding: "16px 18px", marginBottom: 20 }}>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, letterSpacing: 2 }}>{selectedLeague.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <span style={{ fontSize: 11, color: "rgba(241,245,249,0.4)" }}>Code d'invitation :</span>
            <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, color: "#10b981", letterSpacing: 3, background: "rgba(16,185,129,0.1)", padding: "3px 12px", borderRadius: 8, cursor: "pointer" }}
              onClick={() => { navigator.clipboard?.writeText(selectedLeague.invite_code); showToast("Code copié !"); }}>
              {selectedLeague.invite_code}
            </span>
            <span style={{ fontSize: 10, color: "rgba(241,245,249,0.25)" }}>Tap pour copier</span>
          </div>
        </div>

        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, letterSpacing: 1, marginBottom: 12, color: "rgba(241,245,249,0.6)" }}>CLASSEMENT CETTE SEMAINE</div>

        {loadingMembers ? (
          <div style={{ textAlign: "center", padding: 40, color: "rgba(241,245,249,0.25)", fontFamily: "'Bebas Neue',sans-serif", letterSpacing: 2 }}>CHARGEMENT...</div>
        ) : membersProfiles.length === 0 ? (
          <div style={{ textAlign: "center", padding: 30, color: "rgba(241,245,249,0.2)", fontSize: 13 }}>Aucun membre</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {membersProfiles.map((m, i) => {
              const medals = ["🥇", "🥈", "🥉"];
              const isMe = m.id === userId;
              return (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, background: isMe ? "rgba(16,185,129,0.04)" : "rgba(241,245,249,0.02)", border: `1px solid ${isMe ? "rgba(16,185,129,0.12)" : "rgba(241,245,249,0.05)"}`, borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ width: 24, textAlign: "center", fontSize: i < 3 ? 18 : 13, fontFamily: "'Bebas Neue',sans-serif", color: "rgba(241,245,249,0.4)" }}>
                    {i < 3 ? medals[i] : i + 1}
                  </div>
                  <Avatar username={m.username} size={34} radius={9} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: isMe ? "#10b981" : "#f1f5f9" }}>{m.username}</span>
                      <BadgeTag coins={m.coins || 0} />
                      {isMe && <span style={{ fontSize: 10, color: "#10b981" }}>(Vous)</span>}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(241,245,249,0.25)", marginTop: 2 }}>{m.total_wins || 0}/{m.total_bets || 0} paris</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 15, color: "#10b981", letterSpacing: 1 }}>+{fmt(m.weekly_profit || 0)}</div>
                    <div style={{ fontSize: 10, color: "rgba(241,245,249,0.25)" }}>cette semaine</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button onClick={() => leaveLeague(selectedLeague.id)} style={{ width: "100%", marginTop: 20, padding: "11px 0", borderRadius: 11, border: "1px solid rgba(239,68,68,0.2)", background: "transparent", color: "rgba(239,68,68,0.5)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          Quitter la ligue
        </button>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 30, letterSpacing: 2, marginBottom: 6 }}>LIGUES AMIS</div>
      <div style={{ fontSize: 13, color: "rgba(241,245,249,0.35)", marginBottom: 20 }}>Classement privé entre potes</div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: "9px 6px", borderRadius: 10, border: `1px solid ${tab === t.id ? "#10b981" : "rgba(241,245,249,0.07)"}`, background: tab === t.id ? "rgba(16,185,129,0.08)" : "transparent", color: tab === t.id ? "#10b981" : "rgba(241,245,249,0.35)", fontWeight: 700, fontSize: 10, cursor: "pointer", whiteSpace: "nowrap" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Mes ligues */}
      {tab === "mes-ligues" && (
        loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "rgba(241,245,249,0.25)", fontFamily: "'Bebas Neue',sans-serif", letterSpacing: 2 }}>CHARGEMENT...</div>
        ) : myLeagues.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, color: "rgba(241,245,249,0.25)", marginBottom: 8 }}>AUCUNE LIGUE</div>
            <div style={{ fontSize: 12, color: "rgba(241,245,249,0.2)" }}>Crée ou rejoins une ligue avec tes amis</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {myLeagues.map(l => (
              <div key={l.id} onClick={() => loadLeagueMembers(l)}
                style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(241,245,249,0.02)", border: "1px solid rgba(241,245,249,0.06)", borderRadius: 14, padding: "14px 16px", cursor: "pointer", transition: "all 0.2s" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,rgba(16,185,129,0.2),rgba(16,185,129,0.05))", border: "1px solid rgba(16,185,129,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🏆</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{l.name}</div>
                  <div style={{ fontSize: 11, color: "rgba(241,245,249,0.35)", marginTop: 3 }}>Code : <span style={{ color: "#10b981", fontFamily: "'Bebas Neue',sans-serif", letterSpacing: 1 }}>{l.invite_code}</span></div>
                </div>
                <div style={{ fontSize: 18, color: "rgba(241,245,249,0.3)" }}>›</div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Créer */}
      {tab === "creer" && (
        <div>
          <div style={{ background: "rgba(241,245,249,0.02)", border: "1px solid rgba(241,245,249,0.06)", borderRadius: 14, padding: "20px" }}>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, letterSpacing: 1, marginBottom: 16 }}>NOUVELLE LIGUE</div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(241,245,249,0.4)", display: "block", marginBottom: 7 }}>NOM DE LA LIGUE</label>
            <input
              value={newLeagueName}
              onChange={e => setNewLeagueName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && createLeague()}
              placeholder="Ex: Les Loosers FC"
              style={{ width: "100%", padding: "12px 14px", background: "rgba(241,245,249,0.04)", border: "1px solid rgba(241,245,249,0.08)", borderRadius: 11, color: "#f1f5f9", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 16 }}
            />
            <div style={{ fontSize: 12, color: "rgba(241,245,249,0.3)", marginBottom: 16 }}>Un code d'invitation unique sera généré automatiquement. Partage-le à tes amis pour qu'ils rejoignent ta ligue.</div>
            <button onClick={createLeague} disabled={creating || !newLeagueName.trim()}
              style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: "none", background: creating || !newLeagueName.trim() ? "rgba(241,245,249,0.04)" : "linear-gradient(135deg,#10b981,#059669)", color: creating || !newLeagueName.trim() ? "rgba(241,245,249,0.2)" : "#fff", fontWeight: 800, fontSize: 15, cursor: creating || !newLeagueName.trim() ? "not-allowed" : "pointer" }}>
              {creating ? "..." : "CRÉER LA LIGUE →"}
            </button>
          </div>
        </div>
      )}

      {/* Rejoindre */}
      {tab === "rejoindre" && (
        <div>
          <div style={{ background: "rgba(241,245,249,0.02)", border: "1px solid rgba(241,245,249,0.06)", borderRadius: 14, padding: "20px" }}>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, letterSpacing: 1, marginBottom: 16 }}>REJOINDRE UNE LIGUE</div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(241,245,249,0.4)", display: "block", marginBottom: 7 }}>CODE D'INVITATION</label>
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && joinLeague()}
              placeholder="Ex: ABC123"
              style={{ width: "100%", padding: "12px 14px", background: "rgba(241,245,249,0.04)", border: "1px solid rgba(241,245,249,0.08)", borderRadius: 11, color: "#f1f5f9", fontSize: 16, outline: "none", boxSizing: "border-box", marginBottom: 16, fontFamily: "'Bebas Neue',sans-serif", letterSpacing: 3 }}
            />
            <button onClick={joinLeague} disabled={joining || !joinCode.trim()}
              style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: "none", background: joining || !joinCode.trim() ? "rgba(241,245,249,0.04)" : "linear-gradient(135deg,#10b981,#059669)", color: joining || !joinCode.trim() ? "rgba(241,245,249,0.2)" : "#fff", fontWeight: 800, fontSize: 15, cursor: joining || !joinCode.trim() ? "not-allowed" : "pointer" }}>
              {joining ? "..." : "REJOINDRE →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
