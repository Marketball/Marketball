import { useState, useEffect } from "react";
import { req } from "../lib/supabase.js";
import { BADGES } from "../lib/constants.js";
import { getLevel, getBadge, getSubPlan, fmt } from "../lib/helpers.js";
import BadgeTag from "../components/ui/BadgeTag.jsx";
import SubBadge from "../components/ui/SubBadge.jsx";
import Avatar from "../components/ui/Avatar.jsx";
import XPBar from "../components/ui/XPBar.jsx";

const WEEKLY_REWARDS = [
  { rank: 1, sc: 25, emoji: "🥇", color: "#fbbf24" },
  { rank: 2, sc: 20, emoji: "🥈", color: "#94a3b8" },
  { rank: 3, sc: 15, emoji: "🥉", color: "#cd7f32" },
  { rank: 4, sc: 5, emoji: "4️⃣", color: "#6b7280" },
  { rank: 5, sc: 5, emoji: "5️⃣", color: "#6b7280" },
];

export function useCountdown() {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const nextMonday = new Date(now);
      const day = now.getDay();
      const daysUntilMonday = day === 0 ? 1 : 8 - day;
      nextMonday.setDate(now.getDate() + daysUntilMonday);
      nextMonday.setHours(0, 0, 0, 0);
      const diff = nextMonday - now;
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${d}j ${String(h).padStart(2,"0")}h ${String(m).padStart(2,"0")}m ${String(s).padStart(2,"0")}s`);
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, []);
  return timeLeft;
}

export function PublicProfilePage({ username, onBack, leaderboard, session, profile: myProfile, showToast }) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState(null);
  const [addingFriend, setAddingFriend] = useState(false);

  const myId = myProfile?.id;
  const token = session?.token;

  useEffect(()=>{
    const load = async () => {
      try {
        const data = await req(`profiles?username=eq.${encodeURIComponent(username)}&select=*`);
        if(data?.[0]) {
          setProfileData(data[0]);
          if(myId && data[0].id !== myId) {
            const f = await req(`friendships?or=(and(requester_id.eq.${myId},recipient_id.eq.${data[0].id}),and(requester_id.eq.${data[0].id},recipient_id.eq.${myId}))&select=*`);
            if(f?.[0]) {
              if(f[0].status === "accepted") setFriendStatus("accepted");
              else if(f[0].requester_id === myId) setFriendStatus("pending");
              else setFriendStatus("incoming");
            }
          }
        }
      } catch {}
      setLoading(false);
    };
    load();
  },[username, myId]);

  const addFriend = async () => {
    if(!myId || !token) return;
    setAddingFriend(true);
    try {
      await req(`friendships`, { method:"POST", body:JSON.stringify({ requester_id:myId, recipient_id:profileData.id, status:"pending" }), _token:token });
      setFriendStatus("pending");
      showToast?.("Demande d'ami envoyée !");
    } catch(e) { showToast?.(e.message||"Erreur","error"); }
    setAddingFriend(false);
  };

  if(loading) return <div style={{ textAlign:"center", padding:60, color:"rgba(241,245,249,0.25)", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:2 }}>CHARGEMENT...</div>;
  if(!profileData) return <div style={{ textAlign:"center", padding:60 }}>
    <div style={{ fontSize:40, marginBottom:12 }}>👤</div>
    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:"rgba(241,245,249,0.25)" }}>PROFIL INTROUVABLE</div>
    <button onClick={onBack} style={{ marginTop:16, padding:"8px 20px", borderRadius:10, border:"1px solid rgba(241,245,249,0.1)", background:"transparent", color:"rgba(241,245,249,0.4)", cursor:"pointer", fontSize:13 }}>← Retour</button>
  </div>;

  const level=getLevel(profileData.xp||0), badge=getBadge(level);
  const wr=profileData.total_bets>0?Math.round((profileData.total_wins/profileData.total_bets)*100):0;
  const rank=leaderboard?.findIndex(p=>p.username===username);
  const rankDisplay=rank>=0?rank+1:null;
  const sub=getSubPlan(profileData);

  return <div className="page-enter">
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
      <button onClick={onBack} style={{ padding:"6px 14px", borderRadius:10, border:"1px solid rgba(241,245,249,0.08)", background:"transparent", color:"rgba(241,245,249,0.4)", cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", gap:6 }}>← Retour</button>
      {myId && profileData?.id !== myId && (
        friendStatus==="accepted" ? (
          <span style={{ fontSize:12, color:"#10b981", fontWeight:700 }}>✓ Ami</span>
        ) : friendStatus==="pending" ? (
          <span style={{ fontSize:12, color:"rgba(241,245,249,0.3)" }}>Demande envoyée</span>
        ) : friendStatus==="incoming" ? (
          <span style={{ fontSize:12, color:"#fbbf24" }}>Demande reçue</span>
        ) : (
          <button onClick={addFriend} disabled={addingFriend} style={{ padding:"7px 16px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>
            {addingFriend?"...":"+ Ajouter ami"}
          </button>
        )
      )}
    </div>
    <div style={{ background:`linear-gradient(135deg,${badge.glow},rgba(241,245,249,0.02))`, border:`1px solid ${badge.color}20`, borderRadius:20, padding:"24px", marginBottom:18, position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:-60, right:-60, width:200, height:200, borderRadius:"50%", background:`radial-gradient(circle,${badge.glow},transparent 70%)` }} />
      <div style={{ display:"flex", gap:16, alignItems:"center", marginBottom:14 }}>
        <div style={{ width:64, height:64, borderRadius:18, background:`linear-gradient(135deg,${badge.color},${badge.color}66)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, flexShrink:0, boxShadow:`0 8px 25px ${badge.glow}` }}>{badge.emoji}</div>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:1 }}>{profileData.username}</div>
          <div style={{ display:"flex", gap:6, marginTop:4, flexWrap:"wrap", alignItems:"center" }}>
            <BadgeTag level={level} />
            {sub!=="starter"&&<SubBadge profile={profileData} />}
            {rankDisplay&&<div style={{ fontSize:10, fontWeight:700, color:"#fbbf24", background:"rgba(251,191,36,0.1)", border:"1px solid rgba(251,191,36,0.2)", borderRadius:20, padding:"2px 8px" }}>🏆 #{rankDisplay} cette semaine</div>}
          </div>
          <div style={{ fontSize:12, color:"rgba(241,245,249,0.35)", marginTop:5 }}>Niveau {level} · {profileData.xp||0} XP</div>
        </div>
      </div>
      <XPBar xp={profileData.xp||0} />
    </div>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:18 }}>
      {[{label:"PARIS",val:profileData.total_bets||0,color:"#3b82f6"},{label:"WINS",val:profileData.total_wins||0,color:"#10b981"},{label:"PRÉCISION",val:`${wr}%`,color:"#a78bfa"}].map(s=>(
        <div key={s.label} style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.05)", borderRadius:12, padding:"16px 10px", textAlign:"center" }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:s.color, letterSpacing:1 }}>{s.val}</div>
          <div style={{ fontSize:9, color:"rgba(241,245,249,0.25)", fontWeight:700, letterSpacing:1.5, marginTop:3 }}>{s.label}</div>
        </div>
      ))}
    </div>
    <div style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.05)", borderRadius:14, padding:"16px 18px" }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:1, marginBottom:12 }}>PROGRESSION</div>
      {BADGES.map(b=>(
        <div key={b.id} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:9 }}>
          <span style={{ fontSize:11, fontWeight:700, color:b.color, background:`${b.color}12`, padding:"3px 9px", borderRadius:20, border:`1px solid ${b.color}25`, minWidth:90, textAlign:"center", boxShadow:level>=b.minLevel?`0 0 8px ${b.glow}`:"none" }}>{b.emoji} {b.label}</span>
          <span style={{ fontSize:11, color:"rgba(241,245,249,0.35)" }}>Niv. {b.minLevel}{b.maxLevel===999?"+":"–"+b.maxLevel}</span>
          {level>=b.minLevel&&<span style={{ fontSize:12, color:b.color }}>✓</span>}
        </div>
      ))}
    </div>
  </div>;
}

// ── Classement amis ──────────────────────────────────────────────
function FriendsLeaderboard({ profile, session, onViewProfile }) {
  const [friends, setFriends] = useState(null);
  const userId = profile?.id;
  const token = session?.token;

  useEffect(() => {
    if(!userId) return;
    const load = async () => {
      const accepted = await req(`friendships?or=(requester_id.eq.${userId},recipient_id.eq.${userId})&status=eq.accepted&select=*`, { _token: token }).catch(()=>[]);
      const friendIds = (accepted||[]).map(f => f.requester_id === userId ? f.recipient_id : f.requester_id);
      const allIds = [userId, ...friendIds];
      if(allIds.length) {
        const profiles = await req(`profiles?id=in.(${allIds.join(",")})&select=id,username,xp,total_bets,total_wins,weekly_profit&order=weekly_profit.desc`).catch(()=>[]);
        setFriends(profiles||[]);
      } else {
        setFriends([]);
      }
    };
    load();
  }, [userId]);

  const topColors = ["#fbbf24","#94a3b8","#cd7f32"];
  const medals = ["🥇","🥈","🥉"];

  if(!friends) return <div style={{ textAlign:"center", padding:40, color:"rgba(241,245,249,0.25)", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:2 }}>CHARGEMENT...</div>;
  if(friends.length <= 1) return <div style={{ textAlign:"center", padding:40 }}>
    <div style={{ fontSize:40, marginBottom:12 }}>👥</div>
    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:"rgba(241,245,249,0.25)", marginBottom:8 }}>AUCUN AMI ENCORE</div>
    <div style={{ fontSize:12, color:"rgba(241,245,249,0.2)" }}>Ajoute des amis depuis leur profil pour voir le classement ici</div>
  </div>;

  return <div>
    {friends.map((p, i) => {
      const isMe = p.id === userId;
      return <div key={p.id} style={{ background:isMe?"rgba(16,185,129,0.04)":"rgba(241,245,249,0.02)", border:`1px solid ${isMe?"rgba(16,185,129,0.12)":"rgba(241,245,249,0.04)"}`, borderRadius:12, padding:"12px 16px", marginBottom:6, display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ position:"relative", flexShrink:0 }}>
          <Avatar username={p.username} size={36} radius={10} />
          <div style={{ position:"absolute", bottom:-4, right:-4, width:18, height:18, borderRadius:6, background:i<3?`linear-gradient(135deg,${topColors[i]},${topColors[i]}99)`:"rgba(241,245,249,0.12)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:10, color:i<3?"#000":"rgba(241,245,249,0.5)", border:"1.5px solid #030712" }}>{i<3?medals[i]:i+1}</div>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
            <span onClick={()=>onViewProfile&&onViewProfile(p.username)} style={{ fontWeight:700, color:isMe?"#10b981":"#f1f5f9", fontSize:13, cursor:"pointer", textDecoration:"underline", textDecorationStyle:"dotted", textDecorationColor:"rgba(241,245,249,0.2)" }}>{p.username}</span>
            <BadgeTag level={getLevel(p.xp||0)} />
            {isMe&&<span style={{ fontSize:10, color:"#10b981" }}>(Vous)</span>}
          </div>
          <div style={{ fontSize:11, color:"rgba(241,245,249,0.25)" }}>{p.total_wins}/{p.total_bets} paris · Niv. {getLevel(p.xp||0)}</div>
        </div>
        <div style={{ textAlign:"right", flexShrink:0 }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, color:"#10b981", letterSpacing:1 }}>+{fmt(p.weekly_profit||0)}</div>
          <div style={{ fontSize:10, color:"rgba(241,245,249,0.25)" }}>cette semaine</div>
        </div>
      </div>;
    })}
  </div>;
}

// ── Ligues privées ───────────────────────────────────────────────
function PrivateLeagues({ profile, session, showToast }) {
  const [tab, setTab] = useState("mes-ligues");
  const [myLeagues, setMyLeagues] = useState(null);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [membersProfiles, setMembersProfiles] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [newLeagueName, setNewLeagueName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const userId = profile?.id;
  const token = session?.token;

  const loadMyLeagues = async () => {
    if(!userId) return;
    const memberships = await req(`league_members?user_id=eq.${userId}&select=league_id`, { _token: token }).catch(()=>[]);
    if(memberships?.length) {
      const ids = memberships.map(m => m.league_id).join(",");
      const leagues = await req(`leagues?id=in.(${ids})&select=*`).catch(()=>[]);
      setMyLeagues(leagues||[]);
    } else { setMyLeagues([]); }
  };

  useEffect(() => { loadMyLeagues(); }, [userId]);

  const loadLeagueMembers = async (league) => {
    setSelectedLeague(league);
    setLoadingMembers(true);
    const members = await req(`league_members?league_id=eq.${league.id}&select=user_id`).catch(()=>[]);
    const ids = (members||[]).map(m => m.user_id).join(",");
    if(ids) {
      const profiles = await req(`profiles?id=in.(${ids})&select=id,username,xp,total_bets,total_wins,weekly_profit`).catch(()=>[]);
      setMembersProfiles((profiles||[]).sort((a,b)=>(b.weekly_profit||0)-(a.weekly_profit||0)));
    } else { setMembersProfiles([]); }
    setLoadingMembers(false);
  };

  const createLeague = async () => {
    if(!newLeagueName.trim()) return;
    setCreating(true);
    try {
      const code = Math.random().toString(36).substring(2,8).toUpperCase();
      const res = await req(`leagues`, { method:"POST", body:JSON.stringify({ name:newLeagueName.trim(), invite_code:code, created_by:userId }), _token:token, headers:{ Prefer:"return=representation" } });
      const league = Array.isArray(res) ? res[0] : res;
      if(league?.id) {
        await req(`league_members`, { method:"POST", body:JSON.stringify({ league_id:league.id, user_id:userId }), _token:token });
        showToast?.(`Ligue créée ! Code : ${code}`);
        setNewLeagueName(""); setTab("mes-ligues"); loadMyLeagues();
      }
    } catch(e) { showToast?.(e.message||"Erreur","error"); }
    setCreating(false);
  };

  const joinLeague = async () => {
    if(!joinCode.trim()) return;
    setJoining(true);
    try {
      const leagues = await req(`leagues?invite_code=eq.${joinCode.trim().toUpperCase()}&select=*`);
      if(!leagues?.length) { showToast?.("Code invalide","error"); setJoining(false); return; }
      const league = leagues[0];
      const existing = await req(`league_members?league_id=eq.${league.id}&user_id=eq.${userId}&select=league_id`, { _token:token });
      if(existing?.length) { showToast?.("Tu es déjà dans cette ligue","error"); setJoining(false); return; }
      await req(`league_members`, { method:"POST", body:JSON.stringify({ league_id:league.id, user_id:userId }), _token:token });
      showToast?.(`Tu as rejoint "${league.name}" !`);
      setJoinCode(""); setTab("mes-ligues"); loadMyLeagues();
    } catch(e) { showToast?.(e.message||"Erreur","error"); }
    setJoining(false);
  };

  const leaveLeague = async (leagueId) => {
    await req(`league_members?league_id=eq.${leagueId}&user_id=eq.${userId}`, { method:"DELETE", _token:token }).catch(()=>{});
    showToast?.("Tu as quitté la ligue");
    setSelectedLeague(null); loadMyLeagues();
  };

  const topColors = ["#fbbf24","#94a3b8","#cd7f32"];
  const medals = ["🥇","🥈","🥉"];

  if(selectedLeague) return <div>
    <button onClick={()=>setSelectedLeague(null)} style={{ marginBottom:16, padding:"6px 14px", borderRadius:10, border:"1px solid rgba(241,245,249,0.08)", background:"transparent", color:"rgba(241,245,249,0.4)", cursor:"pointer", fontSize:13 }}>← Ligues</button>
    <div style={{ background:"linear-gradient(135deg,rgba(16,185,129,0.08),rgba(16,185,129,0.02))", border:"1px solid rgba(16,185,129,0.15)", borderRadius:16, padding:"14px 16px", marginBottom:16 }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:2 }}>{selectedLeague.name}</div>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6 }}>
        <span style={{ fontSize:11, color:"rgba(241,245,249,0.4)" }}>Code :</span>
        <span onClick={()=>{ navigator.clipboard?.writeText(selectedLeague.invite_code); showToast?.("Code copié !"); }} style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:"#10b981", letterSpacing:3, background:"rgba(16,185,129,0.1)", padding:"3px 12px", borderRadius:8, cursor:"pointer" }}>{selectedLeague.invite_code}</span>
        <span style={{ fontSize:10, color:"rgba(241,245,249,0.25)" }}>tap pour copier</span>
      </div>
    </div>
    {loadingMembers ? <div style={{ textAlign:"center", padding:30, color:"rgba(241,245,249,0.25)" }}>Chargement...</div> : membersProfiles.map((m,i) => {
      const isMe = m.id === userId;
      return <div key={m.id} style={{ display:"flex", alignItems:"center", gap:12, background:isMe?"rgba(16,185,129,0.04)":"rgba(241,245,249,0.02)", border:`1px solid ${isMe?"rgba(16,185,129,0.12)":"rgba(241,245,249,0.05)"}`, borderRadius:12, padding:"12px 14px", marginBottom:6 }}>
        <div style={{ width:24, textAlign:"center", fontSize:i<3?18:13, fontFamily:"'Bebas Neue',sans-serif", color:i<3?topColors[i]:"rgba(241,245,249,0.4)" }}>{i<3?medals[i]:i+1}</div>
        <Avatar username={m.username} size={34} radius={9} />
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontWeight:700, fontSize:13, color:isMe?"#10b981":"#f1f5f9" }}>{m.username}</span>
            <BadgeTag level={getLevel(m.xp||0)} />
            {isMe&&<span style={{ fontSize:10, color:"#10b981" }}>(Vous)</span>}
          </div>
          <div style={{ fontSize:11, color:"rgba(241,245,249,0.25)", marginTop:2 }}>{m.total_wins||0}/{m.total_bets||0} paris</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, color:"#10b981", letterSpacing:1 }}>+{fmt(m.weekly_profit||0)}</div>
          <div style={{ fontSize:10, color:"rgba(241,245,249,0.25)" }}>cette semaine</div>
        </div>
      </div>;
    })}
    <button onClick={()=>leaveLeague(selectedLeague.id)} style={{ width:"100%", marginTop:16, padding:"11px 0", borderRadius:11, border:"1px solid rgba(239,68,68,0.2)", background:"transparent", color:"rgba(239,68,68,0.5)", fontWeight:700, fontSize:13, cursor:"pointer" }}>Quitter la ligue</button>
  </div>;

  const SUBTABS = [
    { id:"mes-ligues", label:"🏆 Mes ligues" },
    { id:"creer", label:"➕ Créer" },
    { id:"rejoindre", label:"🔗 Rejoindre" },
  ];

  return <div>
    <div style={{ display:"flex", gap:6, marginBottom:16 }}>
      {SUBTABS.map(t=>(
        <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, padding:"8px 4px", borderRadius:10, border:`1px solid ${tab===t.id?"#10b981":"rgba(241,245,249,0.07)"}`, background:tab===t.id?"rgba(16,185,129,0.08)":"transparent", color:tab===t.id?"#10b981":"rgba(241,245,249,0.35)", fontWeight:700, fontSize:10, cursor:"pointer" }}>{t.label}</button>
      ))}
    </div>

    {tab==="mes-ligues"&&(
      myLeagues===null ? <div style={{ textAlign:"center", padding:30, color:"rgba(241,245,249,0.25)" }}>Chargement...</div>
      : myLeagues.length===0 ? <div style={{ textAlign:"center", padding:40 }}>
          <div style={{ fontSize:36, marginBottom:10 }}>🏆</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:"rgba(241,245,249,0.25)", marginBottom:6 }}>AUCUNE LIGUE</div>
          <div style={{ fontSize:12, color:"rgba(241,245,249,0.2)" }}>Crée ou rejoins une ligue avec tes amis</div>
        </div>
      : myLeagues.map(l=>(
          <div key={l.id} onClick={()=>loadLeagueMembers(l)} style={{ display:"flex", alignItems:"center", gap:12, background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:14, padding:"14px 16px", marginBottom:8, cursor:"pointer" }}>
            <div style={{ width:40, height:40, borderRadius:11, background:"linear-gradient(135deg,rgba(16,185,129,0.2),rgba(16,185,129,0.05))", border:"1px solid rgba(16,185,129,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>🏆</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:13 }}>{l.name}</div>
              <div style={{ fontSize:11, color:"rgba(241,245,249,0.35)", marginTop:2 }}>Code : <span style={{ color:"#10b981", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:1 }}>{l.invite_code}</span></div>
            </div>
            <div style={{ fontSize:18, color:"rgba(241,245,249,0.3)" }}>›</div>
          </div>
        ))
    )}

    {tab==="creer"&&(
      <div style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:14, padding:20 }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, letterSpacing:1, marginBottom:14 }}>NOUVELLE LIGUE</div>
        <input value={newLeagueName} onChange={e=>setNewLeagueName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&createLeague()} placeholder="Nom de la ligue..." style={{ width:"100%", padding:"12px 14px", background:"rgba(241,245,249,0.04)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:11, color:"#f1f5f9", fontSize:14, outline:"none", boxSizing:"border-box", marginBottom:12 }} />
        <div style={{ fontSize:12, color:"rgba(241,245,249,0.3)", marginBottom:14 }}>Un code d'invitation unique sera généré automatiquement.</div>
        <button onClick={createLeague} disabled={creating||!newLeagueName.trim()} style={{ width:"100%", padding:"12px 0", borderRadius:11, border:"none", background:creating||!newLeagueName.trim()?"rgba(241,245,249,0.04)":"linear-gradient(135deg,#10b981,#059669)", color:creating||!newLeagueName.trim()?"rgba(241,245,249,0.2)":"#fff", fontWeight:800, fontSize:14, cursor:creating||!newLeagueName.trim()?"not-allowed":"pointer" }}>{creating?"...":"CRÉER →"}</button>
      </div>
    )}

    {tab==="rejoindre"&&(
      <div style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:14, padding:20 }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, letterSpacing:1, marginBottom:14 }}>REJOINDRE UNE LIGUE</div>
        <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} onKeyDown={e=>e.key==="Enter"&&joinLeague()} placeholder="CODE D'INVITATION" style={{ width:"100%", padding:"12px 14px", background:"rgba(241,245,249,0.04)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:11, color:"#f1f5f9", fontSize:18, outline:"none", boxSizing:"border-box", marginBottom:14, fontFamily:"'Bebas Neue',sans-serif", letterSpacing:4, textAlign:"center" }} />
        <button onClick={joinLeague} disabled={joining||!joinCode.trim()} style={{ width:"100%", padding:"12px 0", borderRadius:11, border:"none", background:joining||!joinCode.trim()?"rgba(241,245,249,0.04)":"linear-gradient(135deg,#10b981,#059669)", color:joining||!joinCode.trim()?"rgba(241,245,249,0.2)":"#fff", fontWeight:800, fontSize:14, cursor:joining||!joinCode.trim()?"not-allowed":"pointer" }}>{joining?"...":"REJOINDRE →"}</button>
      </div>
    )}
  </div>;
}

// ── Page principale Classement ───────────────────────────────────
export default function LeaderboardPage({ leaderboard, username, onViewProfile, profile, session, showToast }) {
  const [tab, setTab] = useState("global");
  const [showAll, setShowAll] = useState(false);
  const topColors = ["#94a3b8","#fbbf24","#cd7f32"];
  const medals = ["🥈","🥇","🥉"];
  const countdown = useCountdown();
  const visibleList = showAll ? leaderboard : leaderboard.slice(0,10);

  const isLoggedIn = !!profile?.id;

  const TABS = [
    { id:"global", label:"🌍 Global" },
    { id:"amis", label:"👥 Amis", locked:!isLoggedIn },
    { id:"ligues", label:"🏅 Ligues", locked:!isLoggedIn },
  ];

  return <div className="page-enter">
    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, letterSpacing:2, marginBottom:6 }}>CLASSEMENT</div>
    <div style={{ fontSize:13, color:"rgba(241,245,249,0.35)", marginBottom:16 }}>Classé par gains MC des paris uniquement</div>

    {/* Onglets */}
    <div style={{ display:"flex", gap:6, marginBottom:20 }}>
      {TABS.map(t=>(
        <button key={t.id} onClick={()=>!t.locked&&setTab(t.id)}
          style={{ flex:1, padding:"9px 6px", borderRadius:10, border:`1px solid ${tab===t.id?"#10b981":"rgba(241,245,249,0.07)"}`, background:tab===t.id?"rgba(16,185,129,0.08)":"transparent", color:tab===t.id?"#10b981":t.locked?"rgba(241,245,249,0.2)":"rgba(241,245,249,0.45)", fontWeight:700, fontSize:11, cursor:t.locked?"not-allowed":"pointer", opacity:t.locked?0.5:1 }}>
          {t.label}{t.locked?" 🔒":""}
        </button>
      ))}
    </div>

    {/* Tab Global */}
    {tab==="global"&&<>
      {/* Compte à rebours */}
      <div style={{ background:"linear-gradient(135deg,rgba(251,191,36,0.08),rgba(251,191,36,0.03))", border:"1px solid rgba(251,191,36,0.15)", borderRadius:16, padding:"16px 18px", marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:1, color:"#fbbf24", marginBottom:2 }}>⏰ REINITIALISATION DANS</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, letterSpacing:2, color:"#f1f5f9" }}>{countdown}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:10, color:"rgba(241,245,249,0.35)", marginBottom:4 }}>Chaque lundi à 00h00</div>
            <div style={{ fontSize:11, color:"#10b981", fontWeight:700 }}>Classement remis à zéro</div>
          </div>
        </div>
        <div style={{ borderTop:"1px solid rgba(251,191,36,0.1)", paddingTop:12 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"rgba(241,245,249,0.4)", letterSpacing:1, marginBottom:8 }}>RECOMPENSES DE FIN DE SEMAINE</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {WEEKLY_REWARDS.map(r=>(
              <div key={r.rank} style={{ flex:"1 1 80px", background:`${r.color}10`, border:`1px solid ${r.color}25`, borderRadius:10, padding:"8px 6px", textAlign:"center" }}>
                <div style={{ fontSize:16, marginBottom:3 }}>{r.emoji}</div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14, color:r.color, letterSpacing:1 }}>{r.sc} SC</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background:"rgba(16,185,129,0.04)", border:"1px solid rgba(16,185,129,0.1)", borderRadius:10, padding:"10px 14px", marginBottom:22, fontSize:12, color:"rgba(241,245,249,0.35)" }}>
        Roue et pubs ne comptent pas — seuls tes paris font la différence !
      </div>

      {/* Podium */}
      <div style={{ display:"flex", gap:10, marginBottom:24, alignItems:"flex-end" }}>
        {[leaderboard[1],leaderboard[0],leaderboard[2]].map((p,vi)=>{
          if(!p) return <div key={vi} style={{ flex:1 }} />;
          const hs=[150,175,150];
          return <div key={p.username} style={{ flex:1, background:`${topColors[vi]}0d`, border:`1px solid ${topColors[vi]}20`, borderRadius:16, padding:"14px 10px", textAlign:"center", height:hs[vi], display:"flex", flexDirection:"column", justifyContent:"flex-end", alignItems:"center", position:"relative", gap:6 }}>
            <div style={{ display:"flex", justifyContent:"center", position:"relative", marginBottom:10 }}>
              <Avatar username={p.username} size={36} radius={10} />
              <div style={{ position:"absolute", bottom:-8, left:"50%", transform:"translateX(-50%)", fontSize:13, lineHeight:1 }}>{medals[vi]}</div>
            </div>
            <BadgeTag level={getLevel(p.xp||0)} />
            <div onClick={()=>onViewProfile&&onViewProfile(p.username)} style={{ fontWeight:700, fontSize:12, color:"#f1f5f9", cursor:"pointer" }}>{p.username}</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:topColors[vi], letterSpacing:1 }}>+{fmt(p.total_profit||0)}</div>
          </div>;
        })}
      </div>

      {/* Liste */}
      {visibleList.map((p,i)=>(
        <div key={p.username} style={{ background:p.username===username?"rgba(16,185,129,0.04)":"rgba(241,245,249,0.02)", border:`1px solid ${p.username===username?"rgba(16,185,129,0.12)":"rgba(241,245,249,0.04)"}`, borderRadius:12, padding:"12px 16px", marginBottom:6, display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ position:"relative", flexShrink:0 }}>
            <Avatar username={p.username} size={36} radius={10} />
            <div style={{ position:"absolute", bottom:-4, right:-4, width:18, height:18, borderRadius:6, background:i<3?`linear-gradient(135deg,${topColors[i]},${topColors[i]}99)`:"rgba(241,245,249,0.12)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:10, color:i<3?"#000":"rgba(241,245,249,0.5)", border:"1.5px solid #030712" }}>{i+1}</div>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2, flexWrap:"wrap" }}>
              <span onClick={()=>onViewProfile&&onViewProfile(p.username)} style={{ fontWeight:700, color:p.username===username?"#10b981":"#f1f5f9", fontSize:13, cursor:"pointer", textDecoration:"underline", textDecorationStyle:"dotted", textDecorationColor:"rgba(241,245,249,0.2)" }}>{p.username}</span>
              <BadgeTag level={getLevel(p.xp||0)} />
              {p.subscription&&p.subscription!=="starter"&&<SubBadge profile={p} />}
              {p.username===username&&<span style={{ fontSize:10, color:"#10b981" }}>(Vous)</span>}
            </div>
            <div style={{ fontSize:11, color:"rgba(241,245,249,0.25)" }}>{p.total_wins}/{p.total_bets} paris · Niv. {getLevel(p.xp||0)}</div>
          </div>
          <div style={{ textAlign:"right", flexShrink:0 }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, color:"#10b981", letterSpacing:1 }}>+{fmt(p.total_profit||0)}</div>
            <div style={{ fontSize:10, color:"rgba(241,245,249,0.25)" }}>gain total</div>
            {i<5&&<div style={{ fontSize:10, color:WEEKLY_REWARDS[i]?.color||"#6b7280", fontWeight:700 }}>+{WEEKLY_REWARDS[i]?.sc} SC lundi</div>}
          </div>
        </div>
      ))}
      {!showAll&&leaderboard.length>10&&(
        <button onClick={()=>setShowAll(true)} className="btn-animated" style={{ width:"100%", marginTop:8, padding:"12px 0", borderRadius:12, border:"1px solid rgba(241,245,249,0.07)", background:"transparent", color:"rgba(241,245,249,0.4)", fontWeight:700, fontSize:13, cursor:"pointer" }}>
          Voir les {leaderboard.length-10} autres joueurs →
        </button>
      )}
    </>}

    {/* Tab Amis */}
    {tab==="amis"&&<FriendsLeaderboard profile={profile} session={session} onViewProfile={onViewProfile} />}

    {/* Tab Ligues */}
    {tab==="ligues"&&<PrivateLeagues profile={profile} session={session} showToast={showToast} />}
  </div>;
}
