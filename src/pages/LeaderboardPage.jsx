import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);
import { req } from "../lib/supabase.js";
import { DIVISIONS } from "../lib/constants.js";
import { getDivision, getSubPlan, fmt } from "../lib/helpers.js";
import BadgeTag from "../components/ui/BadgeTag.jsx";
import SubBadge from "../components/ui/SubBadge.jsx";
import Avatar from "../components/ui/Avatar.jsx";
import { useLang } from "../lib/i18n.jsx";

// ── Countdown lundi ───────────────────────────────────────────────
export function useCountdown() {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const next = new Date(now);
      const day = now.getDay();
      next.setDate(now.getDate() + (day === 0 ? 1 : 8 - day));
      next.setHours(0,0,0,0);
      const diff = next - now;
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

// ── Profil public ─────────────────────────────────────────────────
export function PublicProfilePage({ username, onBack, session, profile: myProfile, showToast }) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState(null);
  const [addingFriend, setAddingFriend] = useState(false);
  const [recentBets, setRecentBets] = useState([]);
  const myId = myProfile?.id;
  const token = session?.token;
  const { t } = useLang();

  useEffect(() => {
    const load = async () => {
      try {
        const data = await req(`profiles?username=eq.${encodeURIComponent(username)}&select=*`);
        if (data?.[0]) {
          setProfileData(data[0]);
          if (myId && data[0].id !== myId) {
            const f = await req(`friendships?or=(and(requester_id.eq.${myId},recipient_id.eq.${data[0].id}),and(requester_id.eq.${data[0].id},recipient_id.eq.${myId}))&select=*`);
            if (f?.[0]) setFriendStatus(f[0].status === "accepted" ? "accepted" : f[0].requester_id === myId ? "pending" : "incoming");
          }
          const [mb, ub] = await Promise.all([
            req(`match_bets?user_id=eq.${data[0].id}&select=match_title,prediction,cost,potential_gain,status,created_at,bet_type&order=created_at.desc&limit=5`).catch(() => []),
            req(`user_bets?user_id=eq.${data[0].id}&select=market_title,side,cost,potential_gain,status,created_at&order=created_at.desc&limit=5`).catch(() => []),
          ]);
          setRecentBets([...(mb||[]).map(b=>({...b,_type:"match"})), ...(ub||[]).map(b=>({...b,_type:"market"}))].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,5));
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, [username, myId]);

  const addFriend = async () => {
    if (!myId || !token) return;
    setAddingFriend(true);
    try {
      await req(`friendships`, { method:"POST", body:JSON.stringify({ requester_id:myId, recipient_id:profileData.id, status:"pending" }), _token:token });
      setFriendStatus("pending");
      showToast?.("Demande d'ami envoyée !");
    } catch(e) { showToast?.(e.message||"Erreur","error"); }
    setAddingFriend(false);
  };

  if (loading) return <div style={{ textAlign:"center", padding:60, color:"rgba(241,245,249,0.25)", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:2 }}>CHARGEMENT...</div>;
  if (!profileData) return <div style={{ textAlign:"center", padding:60 }}>
    <div style={{ fontSize:40, marginBottom:12 }}>👤</div>
    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:"rgba(241,245,249,0.25)" }}>Joueur introuvable</div>
    <button onClick={onBack} style={{ marginTop:16, padding:"8px 20px", borderRadius:10, border:"1px solid rgba(241,245,249,0.1)", background:"transparent", color:"rgba(241,245,249,0.4)", cursor:"pointer", fontSize:13 }}>← Retour</button>
  </div>;

  const div = getDivision(profileData.coins || 0);
  const wr = profileData.total_bets > 0 ? Math.round((profileData.total_wins / profileData.total_bets) * 100) : 0;
  const sub = getSubPlan(profileData);

  return <div className="page-enter">
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
      <button onClick={onBack} style={{ padding:"6px 14px", borderRadius:10, border:"1px solid rgba(241,245,249,0.08)", background:"transparent", color:"rgba(241,245,249,0.4)", cursor:"pointer", fontSize:13 }}>← Retour</button>
      {myId && profileData?.id !== myId && (
        friendStatus==="accepted" ? <span style={{ fontSize:12, color:"#10b981", fontWeight:700 }}>Ami ✓</span>
        : friendStatus==="pending" ? <span style={{ fontSize:12, color:"rgba(241,245,249,0.3)" }}>Demande envoyée</span>
        : friendStatus==="incoming" ? <span style={{ fontSize:12, color:"#fbbf24" }}>Demande reçue</span>
        : <button onClick={addFriend} disabled={addingFriend} style={{ padding:"7px 16px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>{addingFriend?"...":"+ Ami"}</button>
      )}
    </div>

    <div style={{ background:`linear-gradient(135deg,${div.color}18,rgba(3,7,18,0.95))`, border:`1px solid ${div.color}30`, borderRadius:20, padding:"24px", marginBottom:18, position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:-60, right:-60, width:200, height:200, borderRadius:"50%", background:`radial-gradient(circle,${div.color}20,transparent 70%)`, pointerEvents:"none" }} />
      <div style={{ display:"flex", gap:16, alignItems:"center", marginBottom:12 }}>
        <div style={{ width:64, height:64, borderRadius:18, background:`${div.color}20`, border:`2px solid ${div.color}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, flexShrink:0, boxShadow:`0 8px 25px ${div.color}30`, fontFamily:"'Bebas Neue',sans-serif", color:div.color, letterSpacing:1 }}>
          {div.tier==="diamond"?"◆":div.tier==="gold"?"●":div.tier==="silver"?"●":div.tier==="bronze"?"●":"○"}
        </div>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:1 }}>{profileData.username}</div>
          <div style={{ display:"flex", gap:6, marginTop:4, flexWrap:"wrap", alignItems:"center" }}>
            <BadgeTag coins={profileData.coins||0} />
            {sub!=="starter"&&<SubBadge profile={profileData} />}
          </div>
          <div style={{ fontSize:12, color:"rgba(241,245,249,0.35)", marginTop:5 }}>{fmt(profileData.coins||0)} MC · {div.name}</div>
        </div>
      </div>
    </div>

    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:18 }}>
      {[{label:"PARIS",val:profileData.total_bets||0,color:"#3b82f6"},{label:"WINS",val:profileData.total_wins||0,color:"#10b981"},{label:"PRÉCISION",val:`${wr}%`,color:"#a78bfa"}].map(s=>(
        <div key={s.label} style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.05)", borderRadius:12, padding:"16px 10px", textAlign:"center" }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:s.color, letterSpacing:1 }}>{s.val}</div>
          <div style={{ fontSize:9, color:"rgba(241,245,249,0.25)", fontWeight:700, letterSpacing:1.5, marginTop:3 }}>{s.label}</div>
        </div>
      ))}
    </div>

    <div style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.05)", borderRadius:14, padding:"16px 18px", marginBottom:18 }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:1, marginBottom:12 }}>TOUTES LES DIVISIONS</div>
      {DIVISIONS.map(d => (
        <div key={d.id} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
          <span style={{ fontSize:11, fontWeight:700, color:d.color, background:`${d.color}12`, padding:"3px 9px", borderRadius:20, border:`1px solid ${d.color}25`, minWidth:100, textAlign:"center" }}>{d.name}</span>
          <span style={{ fontSize:11, color:"rgba(241,245,249,0.35)" }}>{fmt(d.min)} – {isFinite(d.max)?fmt(d.max):"∞"} MC</span>
          {d.id === div.id && <span style={{ fontSize:12, color:d.color }}>✓</span>}
        </div>
      ))}
    </div>

    {recentBets.length>0&&<div style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.05)", borderRadius:14, padding:"16px 18px" }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:1, marginBottom:12 }}>PARIS RÉCENTS</div>
      {recentBets.map((b,i) => {
        const won=b.status==="won", lost=b.status==="lost";
        return <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:i<recentBets.length-1?"1px solid rgba(241,245,249,0.04)":"none" }}>
          <div style={{ flex:1, minWidth:0, marginRight:10 }}>
            <div style={{ fontSize:11, color:"rgba(241,245,249,0.35)", marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{b.match_title||b.market_title||"Paris"}</div>
            <div style={{ fontSize:12, fontWeight:700, color:"rgba(241,245,249,0.7)" }}>{b.prediction||b.side||"—"} <span style={{ fontSize:10, color:"rgba(241,245,249,0.3)", fontWeight:400 }}>· {b.cost} MC</span></div>
          </div>
          <div style={{ flexShrink:0, textAlign:"right" }}>
            {won&&<span style={{ fontSize:11, fontWeight:800, color:"#10b981" }}>+{b.potential_gain} 🏆</span>}
            {lost&&<span style={{ fontSize:11, fontWeight:800, color:"#ef4444" }}>Perdu</span>}
            {b.status==="pending"&&<span style={{ fontSize:10, fontWeight:700, color:"#fbbf24", background:"rgba(251,191,36,0.1)", padding:"2px 7px", borderRadius:20 }}>En cours</span>}
            {b.status==="cashed_out"&&<span style={{ fontSize:11, fontWeight:700, color:"#3b82f6" }}>Cashout</span>}
          </div>
        </div>;
      })}
    </div>}
  </div>;
}

// ── Ligues privées ────────────────────────────────────────────────
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
    if (!userId) return;
    const memberships = await req(`league_members?user_id=eq.${userId}&select=league_id`, { _token:token }).catch(()=>[]);
    if (memberships?.length) {
      const ids = memberships.map(m => m.league_id).join(",");
      setMyLeagues(await req(`leagues?id=in.(${ids})&select=*`).catch(()=>[]));
    } else setMyLeagues([]);
  };
  useEffect(() => { loadMyLeagues(); }, [userId]);

  const loadLeagueMembers = async (league) => {
    setSelectedLeague(league); setLoadingMembers(true);
    const members = await req(`league_members?league_id=eq.${league.id}&select=user_id`).catch(()=>[]);
    const ids = (members||[]).map(m => m.user_id).join(",");
    if (ids) {
      const profiles = await req(`profiles?id=in.(${ids})&select=id,username,coins,total_bets,total_wins,weekly_profit`).catch(()=>[]);
      setMembersProfiles((profiles||[]).sort((a,b)=>(b.weekly_profit||0)-(a.weekly_profit||0)));
    } else setMembersProfiles([]);
    setLoadingMembers(false);
  };

  const createLeague = async () => {
    if (!newLeagueName.trim()) return; setCreating(true);
    try {
      const code = Math.random().toString(36).substring(2,8).toUpperCase();
      const res = await req(`leagues`, { method:"POST", body:JSON.stringify({ name:newLeagueName.trim(), invite_code:code, created_by:userId }), _token:token, headers:{ Prefer:"return=representation" } });
      const league = Array.isArray(res) ? res[0] : res;
      if (league?.id) {
        await req(`league_members`, { method:"POST", body:JSON.stringify({ league_id:league.id, user_id:userId }), _token:token });
        showToast?.(`Ligue créée ! Code : ${code}`);
        setNewLeagueName(""); setTab("mes-ligues"); loadMyLeagues();
      }
    } catch(e) { showToast?.(e.message||"Erreur","error"); }
    setCreating(false);
  };

  const joinLeague = async () => {
    if (!joinCode.trim()) return; setJoining(true);
    try {
      const leagues = await req(`leagues?invite_code=eq.${joinCode.trim().toUpperCase()}&select=*`);
      if (!leagues?.length) { showToast?.("Code invalide","error"); setJoining(false); return; }
      const league = leagues[0];
      const existing = await req(`league_members?league_id=eq.${league.id}&user_id=eq.${userId}&select=league_id`, { _token:token });
      if (existing?.length) { showToast?.("Tu es déjà dans cette ligue","error"); setJoining(false); return; }
      await req(`league_members`, { method:"POST", body:JSON.stringify({ league_id:league.id, user_id:userId }), _token:token });
      showToast?.(`Tu as rejoint "${league.name}" !`);
      setJoinCode(""); setTab("mes-ligues"); loadMyLeagues();
    } catch(e) { showToast?.(e.message||"Erreur","error"); }
    setJoining(false);
  };

  const leaveLeague = async (leagueId) => {
    await req(`league_members?league_id=eq.${leagueId}&user_id=eq.${userId}`, { method:"DELETE", _token:token }).catch(()=>{});
    showToast?.("Tu as quitté la ligue"); setSelectedLeague(null); loadMyLeagues();
  };

  const topColors = ["#fbbf24","#94a3b8","#cd7f32"];
  const medals = ["🥇","🥈","🥉"];

  if (selectedLeague) return <div>
    <button onClick={()=>setSelectedLeague(null)} style={{ marginBottom:16, padding:"6px 14px", borderRadius:10, border:"1px solid rgba(241,245,249,0.08)", background:"transparent", color:"rgba(241,245,249,0.4)", cursor:"pointer", fontSize:13 }}>← Ligues</button>
    <div style={{ background:"linear-gradient(135deg,rgba(16,185,129,0.08),rgba(16,185,129,0.02))", border:"1px solid rgba(16,185,129,0.15)", borderRadius:16, padding:"14px 16px", marginBottom:16 }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:2 }}>{selectedLeague.name}</div>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6 }}>
        <span style={{ fontSize:11, color:"rgba(241,245,249,0.4)" }}>Code :</span>
        <span onClick={()=>{ navigator.clipboard?.writeText(selectedLeague.invite_code); showToast?.("Code copié !"); }} style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:"#10b981", letterSpacing:3, background:"rgba(16,185,129,0.1)", padding:"3px 12px", borderRadius:8, cursor:"pointer" }}>{selectedLeague.invite_code}</span>
      </div>
    </div>
    {loadingMembers ? <div style={{ textAlign:"center", padding:30, color:"rgba(241,245,249,0.25)" }}>Chargement...</div>
    : membersProfiles.map((m,i) => {
      const isMe = m.id === userId;
      return <div key={m.id} style={{ display:"flex", alignItems:"center", gap:12, background:isMe?"rgba(16,185,129,0.04)":"rgba(241,245,249,0.02)", border:`1px solid ${isMe?"rgba(16,185,129,0.12)":"rgba(241,245,249,0.05)"}`, borderRadius:12, padding:"12px 14px", marginBottom:6 }}>
        <div style={{ width:24, textAlign:"center", fontSize:i<3?18:13, fontFamily:"'Bebas Neue',sans-serif", color:i<3?topColors[i]:"rgba(241,245,249,0.4)" }}>{i<3?medals[i]:i+1}</div>
        <Avatar username={m.username} size={34} radius={9} />
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontWeight:700, fontSize:13, color:isMe?"#10b981":"#f1f5f9" }}>{m.username}</span>
            <BadgeTag coins={m.coins||0} />
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

  return <div>
    <div style={{ display:"flex", gap:6, marginBottom:16 }}>
      {[{id:"mes-ligues",label:"🏆 Mes ligues"},{id:"creer",label:"➕ Créer"},{id:"rejoindre",label:"🔗 Rejoindre"}].map(s=>(
        <button key={s.id} onClick={()=>setTab(s.id)} style={{ flex:1, padding:"8px 4px", borderRadius:10, border:`1px solid ${tab===s.id?"#10b981":"rgba(241,245,249,0.07)"}`, background:tab===s.id?"rgba(16,185,129,0.08)":"transparent", color:tab===s.id?"#10b981":"rgba(241,245,249,0.35)", fontWeight:700, fontSize:10, cursor:"pointer" }}>{s.label}</button>
      ))}
    </div>
    {tab==="mes-ligues"&&(myLeagues===null?<div style={{ textAlign:"center", padding:30, color:"rgba(241,245,249,0.25)" }}>Chargement...</div>:myLeagues.length===0?<div style={{ textAlign:"center", padding:40 }}><div style={{ fontSize:36, marginBottom:10 }}>🏆</div><div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:"rgba(241,245,249,0.25)", marginBottom:6 }}>AUCUNE LIGUE</div></div>:myLeagues.map(l=>(
      <div key={l.id} onClick={()=>loadLeagueMembers(l)} style={{ display:"flex", alignItems:"center", gap:12, background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:14, padding:"14px 16px", marginBottom:8, cursor:"pointer" }}>
        <div style={{ width:40, height:40, borderRadius:11, background:"linear-gradient(135deg,rgba(16,185,129,0.2),rgba(16,185,129,0.05))", border:"1px solid rgba(16,185,129,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>🏆</div>
        <div style={{ flex:1 }}><div style={{ fontWeight:700, fontSize:13 }}>{l.name}</div><div style={{ fontSize:11, color:"rgba(241,245,249,0.35)", marginTop:2 }}>Code : <span style={{ color:"#10b981", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:1 }}>{l.invite_code}</span></div></div>
        <div style={{ fontSize:18, color:"rgba(241,245,249,0.3)" }}>›</div>
      </div>
    )))}
    {tab==="creer"&&<div style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:14, padding:20 }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, letterSpacing:1, marginBottom:14 }}>NOUVELLE LIGUE</div>
      <input value={newLeagueName} onChange={e=>setNewLeagueName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&createLeague()} placeholder="Ex: Les Loosers FC" style={{ width:"100%", padding:"12px 14px", background:"rgba(241,245,249,0.04)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:11, color:"#f1f5f9", fontSize:14, outline:"none", boxSizing:"border-box", marginBottom:12 }} />
      <button onClick={createLeague} disabled={creating||!newLeagueName.trim()} style={{ width:"100%", padding:"12px 0", borderRadius:11, border:"none", background:creating||!newLeagueName.trim()?"rgba(241,245,249,0.04)":"linear-gradient(135deg,#10b981,#059669)", color:creating||!newLeagueName.trim()?"rgba(241,245,249,0.2)":"#fff", fontWeight:800, fontSize:14, cursor:creating||!newLeagueName.trim()?"not-allowed":"pointer" }}>{creating?"...":"CRÉER →"}</button>
    </div>}
    {tab==="rejoindre"&&<div style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:14, padding:20 }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, letterSpacing:1, marginBottom:14 }}>REJOINDRE UNE LIGUE</div>
      <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} onKeyDown={e=>e.key==="Enter"&&joinLeague()} placeholder="Code d'invitation" style={{ width:"100%", padding:"12px 14px", background:"rgba(241,245,249,0.04)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:11, color:"#f1f5f9", fontSize:18, outline:"none", boxSizing:"border-box", marginBottom:14, fontFamily:"'Bebas Neue',sans-serif", letterSpacing:4, textAlign:"center" }} />
      <button onClick={joinLeague} disabled={joining||!joinCode.trim()} style={{ width:"100%", padding:"12px 0", borderRadius:11, border:"none", background:joining||!joinCode.trim()?"rgba(241,245,249,0.04)":"linear-gradient(135deg,#10b981,#059669)", color:joining||!joinCode.trim()?"rgba(241,245,249,0.2)":"#fff", fontWeight:800, fontSize:14, cursor:joining||!joinCode.trim()?"not-allowed":"pointer" }}>{joining?"...":"REJOINDRE →"}</button>
    </div>}
  </div>;
}

// ── Classement d'une division ─────────────────────────────────────
function DivisionLeaderboard({ division, username, onViewProfile, session }) {
  const [players, setPlayers] = useState(null);
  const listRef = useRef(null);

  useEffect(() => {
    setPlayers(null);
    const load = async () => {
      try {
        const maxFilter = isFinite(division.max) ? `&coins=lte.${division.max}` : "";
        const data = await req(
          `profiles?select=id,username,coins,store_coins,weekly_profit,total_bets,total_wins,subscription&coins=gte.${division.min}${maxFilter}&order=weekly_profit.desc&limit=100`,
          { _token: session?.token }
        );
        setPlayers(data || []);
      } catch { setPlayers([]); }
    };
    load();
  }, [division.id]);

  useEffect(() => {
    if (!listRef.current || !players?.length) return;
    const rows = Array.from(listRef.current.children);
    rows.forEach((row, i) => {
      gsap.fromTo(row, { opacity:0, y:20 }, { opacity:1, y:0, duration:0.3, ease:"power3.out", delay:i*0.03, scrollTrigger:{ trigger:row, start:"top 95%", once:true } });
    });
  }, [players]);

  if (!players) return <div style={{ textAlign:"center", padding:40, color:"rgba(241,245,249,0.25)", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:2 }}>CHARGEMENT...</div>;
  if (!players.length) return <div style={{ textAlign:"center", padding:40 }}>
    <div style={{ fontSize:36, marginBottom:10 }}>🏆</div>
    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:"rgba(241,245,249,0.25)" }}>AUCUN JOUEUR DANS CETTE DIVISION</div>
  </div>;

  const topColors = ["#94a3b8","#fbbf24","#cd7f32"];
  const medals = ["🥈","🥇","🥉"];
  const bonusBoundary = players.length > 3 ? 3 + Math.ceil((players.length - 3) * 0.3) : 3;

  const rewardFor = (i) => {
    if (i === 0) return { sc: division.top1, color: "#fbbf24" };
    if (i === 1) return { sc: division.top2, color: "#94a3b8" };
    if (i === 2) return { sc: division.top3, color: "#cd7f32" };
    if (i < bonusBoundary) return { sc: division.bonus, color: "#10b981" };
    return null;
  };

  const podium = [players[1], players[0], players[2]];

  return <div>
    {/* Récompenses */}
    <div style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:14, padding:"14px 16px", marginBottom:16 }}>
      <div style={{ fontSize:10, fontWeight:700, color:"rgba(241,245,249,0.3)", letterSpacing:2, marginBottom:10 }}>RÉCOMPENSES LUNDI</div>
      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
        {[{label:"🥇 Top 1",sc:division.top1,color:"#fbbf24"},{label:"🥈 Top 2",sc:division.top2,color:"#94a3b8"},{label:"🥉 Top 3",sc:division.top3,color:"#cd7f32"},{label:`🎯 Top ${Math.round(players.length*0.3)||"30%"}`,sc:division.bonus,color:"#10b981"}].map(r=>(
          <div key={r.label} style={{ flex:"1 1 70px", background:`${r.color}10`, border:`1px solid ${r.color}25`, borderRadius:10, padding:"8px 6px", textAlign:"center" }}>
            <div style={{ fontSize:10, color:"rgba(241,245,249,0.4)", marginBottom:3 }}>{r.label}</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14, color:r.color, letterSpacing:1 }}>+{r.sc} SC</div>
          </div>
        ))}
      </div>
    </div>

    {/* Podium top 3 */}
    {players.length >= 2 && <div style={{ display:"flex", gap:10, marginBottom:20, alignItems:"flex-end" }}>
      {podium.map((p, vi) => {
        if (!p) return <div key={vi} style={{ flex:1 }} />;
        const heights = [150, 175, 150];
        const div2 = getDivision(p.coins || 0);
        return <div key={p.username} style={{ flex:1, background:`${topColors[vi]}0d`, border:`1px solid ${topColors[vi]}25`, borderRadius:16, padding:"14px 10px", textAlign:"center", height:heights[vi], display:"flex", flexDirection:"column", justifyContent:"flex-end", alignItems:"center", gap:6 }}>
          <div style={{ position:"relative", marginBottom:10 }}>
            <Avatar username={p.username} size={36} radius={10} />
            <div style={{ position:"absolute", bottom:-8, left:"50%", transform:"translateX(-50%)", fontSize:13 }}>{medals[vi]}</div>
          </div>
          <BadgeTag coins={p.coins||0} />
          <div onClick={()=>onViewProfile&&onViewProfile(p.username)} style={{ fontWeight:700, fontSize:12, color:"#f1f5f9", cursor:"pointer" }}>{p.username}</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, color:topColors[vi], letterSpacing:1 }}>+{fmt(p.weekly_profit||0)}</div>
        </div>;
      })}
    </div>}

    {/* Liste */}
    <div ref={listRef}>
      {players.map((p, i) => {
        const isMe = p.username === username;
        const reward = rewardFor(i);
        const isBonusLine = i === bonusBoundary && i > 3;
        return <div key={p.username}>
          {isBonusLine && <div style={{ display:"flex", alignItems:"center", gap:8, margin:"8px 0", opacity:0.4 }}>
            <div style={{ flex:1, height:1, background:"rgba(241,245,249,0.1)" }} />
            <span style={{ fontSize:10, color:"rgba(241,245,249,0.3)", fontWeight:700, whiteSpace:"nowrap" }}>Hors récompenses</span>
            <div style={{ flex:1, height:1, background:"rgba(241,245,249,0.1)" }} />
          </div>}
          <div style={{ background:isMe?"rgba(16,185,129,0.04)":"rgba(241,245,249,0.02)", border:`1px solid ${isMe?"rgba(16,185,129,0.12)":"rgba(241,245,249,0.04)"}`, borderRadius:12, padding:"12px 14px", marginBottom:5, display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:22, textAlign:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:13, color:i<3?topColors[i]:"rgba(241,245,249,0.3)", flexShrink:0 }}>{i+1}</div>
            <Avatar username={p.username} size={34} radius={9} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:2, flexWrap:"wrap" }}>
                <span onClick={()=>onViewProfile&&onViewProfile(p.username)} style={{ fontWeight:700, color:isMe?"#10b981":"#f1f5f9", fontSize:13, cursor:"pointer" }}>{p.username}</span>
                {p.subscription&&p.subscription!=="starter"&&<SubBadge profile={p} />}
                {isMe&&<span style={{ fontSize:10, color:"#10b981" }}>● Vous</span>}
              </div>
              <div style={{ fontSize:10, color:"rgba(241,245,249,0.25)" }}>{p.total_wins||0}/{p.total_bets||0} paris · {fmt(p.coins||0)} MC</div>
            </div>
            <div style={{ textAlign:"right", flexShrink:0 }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14, color:"#10b981", letterSpacing:1 }}>+{fmt(p.weekly_profit||0)}</div>
              {reward && <div style={{ fontSize:10, color:reward.color, fontWeight:700, marginTop:2 }}>+{reward.sc} SC lundi</div>}
            </div>
          </div>
        </div>;
      })}
    </div>
  </div>;
}

// ── Page principale ───────────────────────────────────────────────
export default function LeaderboardPage({ username, onViewProfile, profile, session, showToast }) {
  const myDivision = getDivision(profile?.coins || 0);
  const [tab, setTab] = useState("divisions");
  const [selectedDivId, setSelectedDivId] = useState(myDivision.id);
  const countdown = useCountdown();
  const isLoggedIn = !!profile?.id;
  const divScrollRef = useRef(null);
  const selectedDiv = DIVISIONS.find(d => d.id === selectedDivId) || DIVISIONS[0];

  // Auto-scroll le sélecteur sur la division de l'utilisateur
  useEffect(() => {
    if (!divScrollRef.current) return;
    const idx = DIVISIONS.findIndex(d => d.id === selectedDivId);
    const btn = divScrollRef.current.children[idx];
    if (btn) btn.scrollIntoView({ behavior:"smooth", inline:"center", block:"nearest" });
  }, [selectedDivId]);

  const TABS = [
    { id:"divisions", label:"🏆 Divisions" },
    { id:"ligues", label:"👥 Ligues privées", locked:!isLoggedIn },
  ];

  return <div className="page-enter">
    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, letterSpacing:2, marginBottom:6 }}>CLASSEMENT</div>
    <div style={{ fontSize:13, color:"rgba(241,245,249,0.35)", marginBottom:16 }}>Classement hebdomadaire par division</div>

    {/* Onglets */}
    <div style={{ display:"flex", gap:6, marginBottom:20 }}>
      {TABS.map(t => (
        <button key={t.id} onClick={()=>!t.locked&&setTab(t.id)}
          style={{ flex:1, padding:"9px 6px", borderRadius:10, border:`1px solid ${tab===t.id?"#10b981":"rgba(241,245,249,0.07)"}`, background:tab===t.id?"rgba(16,185,129,0.08)":"transparent", color:tab===t.id?"#10b981":t.locked?"rgba(241,245,249,0.2)":"rgba(241,245,249,0.45)", fontWeight:700, fontSize:11, cursor:t.locked?"not-allowed":"pointer", opacity:t.locked?0.5:1 }}>
          {t.label}{t.locked?" 🔒":""}
        </button>
      ))}
    </div>

    {tab==="divisions"&&<>
      {/* Countdown */}
      <div style={{ background:"linear-gradient(135deg,rgba(251,191,36,0.08),rgba(251,191,36,0.02))", border:"1px solid rgba(251,191,36,0.12)", borderRadius:14, padding:"14px 16px", marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:11, letterSpacing:2, color:"#fbbf24", marginBottom:4 }}>RESET DU CLASSEMENT</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, letterSpacing:2 }}>{countdown}</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:10, color:"rgba(241,245,249,0.3)" }}>Chaque lundi</div>
          <div style={{ fontSize:11, color:"#10b981", fontWeight:700, marginTop:4 }}>SC distribués aux tops</div>
        </div>
      </div>

      {/* Ma division */}
      {isLoggedIn && <div style={{ background:`${myDivision.color}10`, border:`1px solid ${myDivision.color}30`, borderRadius:12, padding:"10px 14px", marginBottom:14, display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ fontSize:10, color:"rgba(241,245,249,0.4)", fontWeight:700, letterSpacing:1 }}>MA DIVISION :</div>
        <BadgeTag coins={profile?.coins||0} />
        <div style={{ fontSize:12, color:"rgba(241,245,249,0.4)" }}>{fmt(profile?.coins||0)} MC</div>
        <button onClick={()=>setSelectedDivId(myDivision.id)} style={{ marginLeft:"auto", fontSize:10, padding:"4px 10px", borderRadius:8, border:`1px solid ${myDivision.color}40`, background:`${myDivision.color}15`, color:myDivision.color, cursor:"pointer", fontWeight:700 }}>Voir</button>
      </div>}

      {/* Sélecteur de divisions */}
      <div ref={divScrollRef} style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:8, marginBottom:18, scrollbarWidth:"none" }}>
        {DIVISIONS.map(d => (
          <button key={d.id} onClick={()=>setSelectedDivId(d.id)}
            style={{ flexShrink:0, padding:"6px 12px", borderRadius:20, border:`1px solid ${selectedDivId===d.id?d.color:"rgba(241,245,249,0.07)"}`, background:selectedDivId===d.id?`${d.color}18`:"transparent", color:selectedDivId===d.id?d.color:"rgba(241,245,249,0.35)", fontWeight:700, fontSize:11, cursor:"pointer", whiteSpace:"nowrap", transition:"all 0.2s" }}>
            {d.name}
          </button>
        ))}
      </div>

      {/* Header division sélectionnée */}
      <div style={{ background:`linear-gradient(135deg,${selectedDiv.color}12,rgba(3,7,18,0.95))`, border:`1px solid ${selectedDiv.color}25`, borderRadius:16, padding:"16px 18px", marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:3, color:selectedDiv.color }}>{selectedDiv.name.toUpperCase()}</div>
            <div style={{ fontSize:12, color:"rgba(241,245,249,0.4)", marginTop:4 }}>{fmt(selectedDiv.min)} – {isFinite(selectedDiv.max)?fmt(selectedDiv.max):"∞"} MC</div>
          </div>
          <div style={{ fontSize:32, opacity:0.6 }}>{selectedDiv.tier==="diamond"?"◆":selectedDiv.tier==="gold"?"●":selectedDiv.tier==="silver"?"●":selectedDiv.tier==="bronze"?"●":"○"}</div>
        </div>
      </div>

      <DivisionLeaderboard key={selectedDivId} division={selectedDiv} username={username} onViewProfile={onViewProfile} session={session} />
    </>}

    {tab==="ligues"&&<PrivateLeagues profile={profile} session={session} showToast={showToast} />}
  </div>;
}
