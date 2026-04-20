import { useState, useEffect, useRef } from "react";
import { req } from "../lib/supabase.js";
import Avatar from "../components/ui/Avatar.jsx";

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m}min`;
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${d}j`;
}

function PollCard({ poll, session, profile, showToast }) {
  const options = Array.isArray(poll.options) ? poll.options : [];
  const rawVotes = poll.votes || {};
  // Compter uniquement les votes par option (pas les clés user_xxx)
  const counts = {};
  options.forEach(opt => { counts[opt] = rawVotes[opt] || 0; });
  const totalVotes = options.reduce((s, opt) => s + counts[opt], 0);

  const userKey = profile?.id ? `user_${profile.id}` : null;
  const alreadyVoted = userKey ? (rawVotes[userKey] || null) : null;

  const [selected, setSelected] = useState(null);
  const [localVoted, setLocalVoted] = useState(alreadyVoted);
  const [localCounts, setLocalCounts] = useState(counts);
  const [localTotal, setLocalTotal] = useState(totalVotes);
  const [sending, setSending] = useState(false);
  const isExpired = poll.expires_at && new Date(poll.expires_at) < new Date();
  const showResults = !!localVoted || isExpired;

  const handleVote = async () => {
    if (!session || !selected || localVoted || isExpired || sending) return;
    setSending(true);
    const newCounts = { ...localCounts, [selected]: (localCounts[selected] || 0) + 1 };
    const newVotes = { ...rawVotes, ...newCounts, [userKey]: selected };
    setLocalCounts(newCounts);
    setLocalTotal(localTotal + 1);
    setLocalVoted(selected);
    try {
      await req(`community_polls?id=eq.${poll.id}`, {
        method: "PATCH", _token: session.token,
        body: JSON.stringify({ votes: newVotes }),
      });
    } catch { showToast?.("Erreur lors du vote", "error"); }
    setSending(false);
  };

  return (
    <div style={{ background:"rgba(59,130,246,0.04)", border:"1px solid rgba(59,130,246,0.12)", borderRadius:16, padding:"18px 20px", marginBottom:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
        <div style={{ fontWeight:800, fontSize:15, color:"#f1f5f9", lineHeight:1.4, flex:1 }}>{poll.question}</div>
        <span style={{ fontSize:10, fontWeight:700, color:"#60a5fa", background:"rgba(59,130,246,0.1)", padding:"2px 8px", borderRadius:20, border:"1px solid rgba(59,130,246,0.2)", flexShrink:0, marginLeft:8 }}>📊 SONDAGE</span>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:12 }}>
        {options.map(opt => {
          const pct = localTotal > 0 ? Math.round((localCounts[opt] / localTotal) * 100) : 0;
          const isChosen = localVoted === opt;
          const isPicked = selected === opt && !localVoted;
          return (
            <div key={opt} onClick={() => !localVoted && !isExpired && setSelected(opt)}
              style={{ padding:"10px 14px", borderRadius:10, border:`1.5px solid ${isChosen?"#3b82f6":isPicked?"rgba(59,130,246,0.4)":"rgba(241,245,249,0.08)"}`, background:isChosen?"rgba(59,130,246,0.12)":isPicked?"rgba(59,130,246,0.05)":"rgba(241,245,249,0.02)", cursor:localVoted||isExpired?"default":"pointer", position:"relative", overflow:"hidden", transition:"all 0.2s" }}>
              {showResults && <div style={{ position:"absolute", left:0, top:0, bottom:0, width:`${pct}%`, background:isChosen?"rgba(59,130,246,0.15)":"rgba(241,245,249,0.04)", transition:"width 0.6s ease" }} />}
              <div style={{ position:"relative", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:13, fontWeight:isChosen||isPicked?800:500, color:isChosen?"#60a5fa":isPicked?"#93c5fd":"rgba(241,245,249,0.75)" }}>
                  {isChosen?"✓ ":isPicked?"● ":""}{opt}
                </span>
                {showResults && <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14, color:isChosen?"#60a5fa":"rgba(241,245,249,0.35)", letterSpacing:1 }}>{pct}%</span>}
              </div>
            </div>
          );
        })}
      </div>
      {!localVoted && !isExpired && (
        <button onClick={handleVote} disabled={!selected || sending || !session}
          style={{ width:"100%", padding:"10px 0", borderRadius:10, border:"none", background:selected&&session&&!sending?"linear-gradient(135deg,#3b82f6,#2563eb)":"rgba(241,245,249,0.06)", color:selected&&session&&!sending?"#fff":"rgba(241,245,249,0.25)", fontWeight:800, fontSize:13, cursor:selected&&session&&!sending?"pointer":"not-allowed", transition:"all 0.2s", marginBottom:8 }}>
          {!session?"Connecte-toi pour voter":sending?"...":selected?"VALIDER MON VOTE →":"Sélectionne une option"}
        </button>
      )}
      <div style={{ fontSize:11, color:"rgba(241,245,249,0.25)" }}>
        {localTotal} vote{localTotal>1?"s":""}
        {isExpired?" · Terminé":localVoted?" · Vote enregistré ✓":""}
      </div>
    </div>
  );
}

export default function CommunityPage({ session, profile, showToast, onViewProfile }) {
  const [posts, setPosts] = useState([]);
  const [polls, setPolls] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState("chat");
  const bottomRef = useRef(null);
  const MAX = 280;

  const loadData = async () => {
    try {
      const [p, po] = await Promise.all([
        req("community_posts?order=created_at.desc&limit=50").catch(() => []),
        req("community_polls?order=created_at.desc&limit=20").catch(() => []),
      ]);
      setPosts((p || []).reverse());
      setPolls(po || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (tab === "chat") bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [posts, tab]);

  // Rafraîchit le chat toutes les 15s
  useEffect(() => {
    const t = setInterval(() => loadData(), 15000);
    return () => clearInterval(t);
  }, []);

  const handlePost = async () => {
    if (!session || !input.trim() || sending) return;
    const content = input.trim().slice(0, MAX);
    setSending(true);
    try {
      const res = await req("community_posts", {
        method: "POST", _token: session.token,
        body: JSON.stringify({ user_id: session.user.id, username: profile?.username || "Anonyme", content }),
      });
      const newPost = res?.[0] || { id: Date.now(), user_id: session.user.id, username: profile?.username, content, created_at: new Date().toISOString() };
      setPosts(prev => [...prev, newPost]);
      setInput("");
    } catch(e) { showToast("Erreur : " + e.message, "error"); }
    setSending(false);
  };

  const handleDelete = async (id) => {
    if (!session) return;
    try {
      await req(`community_posts?id=eq.${id}`, { method: "DELETE", _token: session.token });
      setPosts(prev => prev.filter(p => p.id !== id));
    } catch {}
  };

  return (
    <div className="page-enter">
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, letterSpacing:2, marginBottom:6 }}>COMMUNAUTÉ</div>
      <div style={{ fontSize:13, color:"rgba(241,245,249,0.35)", marginBottom:20 }}>Discute, partage, vote avec les autres joueurs</div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        {[{id:"chat",label:"💬 Chat"},{id:"polls",label:"📊 Sondages"},{id:"amis",label:"👥 Amis"}].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding:"8px 18px", borderRadius:20, border:`1px solid ${tab===t.id?"#10b981":"rgba(241,245,249,0.08)"}`, background:tab===t.id?"rgba(16,185,129,0.1)":"transparent", color:tab===t.id?"#10b981":"rgba(241,245,249,0.4)", fontWeight:700, fontSize:13, cursor:"pointer", transition:"all 0.2s" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* CHAT */}
      {tab === "chat" && <>
        <div style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:16, padding:"16px", marginBottom:12, minHeight:300, maxHeight:480, overflowY:"auto" }}>
          {loading ? (
            <div style={{ textAlign:"center", padding:40, color:"rgba(241,245,249,0.25)" }}>Chargement...</div>
          ) : posts.length === 0 ? (
            <div style={{ textAlign:"center", padding:40, color:"rgba(241,245,249,0.25)" }}>
              <div style={{ fontSize:32, marginBottom:8 }}>💬</div>
              Sois le premier à écrire !
            </div>
          ) : posts.map(post => (
            <div key={post.id} style={{ display:"flex", gap:10, marginBottom:14, alignItems:"flex-start" }}>
              <Avatar username={post.username} size={32} radius={9} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                  <span onClick={()=>onViewProfile?.(post.username)} style={{ fontWeight:700, fontSize:13, color: post.user_id===session?.user?.id?"#10b981":"#f1f5f9", cursor:"pointer", textDecoration:"underline", textDecorationStyle:"dotted", textDecorationColor:"rgba(241,245,249,0.2)" }}>{post.username}</span>
                  <span style={{ fontSize:10, color:"rgba(241,245,249,0.25)" }}>{timeAgo(post.created_at)}</span>
                  {post.user_id===session?.user?.id && (
                    <button onClick={() => handleDelete(post.id)} style={{ marginLeft:"auto", padding:"1px 6px", borderRadius:6, border:"none", background:"transparent", color:"rgba(241,245,249,0.2)", cursor:"pointer", fontSize:11 }}>✕</button>
                  )}
                </div>
                <div style={{ fontSize:13, color:"rgba(241,245,249,0.75)", lineHeight:1.5, wordBreak:"break-word" }}>{post.content}</div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {session ? (
          <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
            <div style={{ flex:1 }}>
              <textarea value={input} onChange={e => setInput(e.target.value.slice(0, MAX))}
                onKeyDown={e => { if(e.key==="Enter" && !e.shiftKey) { e.preventDefault(); handlePost(); }}}
                placeholder="Écris un message... (Entrée pour envoyer)"
                rows={2}
                style={{ width:"100%", padding:"10px 14px", background:"rgba(241,245,249,0.04)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:12, color:"#f1f5f9", fontSize:13, outline:"none", resize:"none", fontFamily:"'DM Sans',sans-serif", boxSizing:"border-box", lineHeight:1.5 }} />
              <div style={{ fontSize:10, color:"rgba(241,245,249,0.2)", textAlign:"right", marginTop:2 }}>{input.length}/{MAX}</div>
            </div>
            <button onClick={handlePost} disabled={!input.trim() || sending}
              style={{ padding:"10px 16px", borderRadius:12, border:"none", background:input.trim()&&!sending?"linear-gradient(135deg,#10b981,#059669)":"rgba(241,245,249,0.06)", color:input.trim()&&!sending?"#fff":"rgba(241,245,249,0.2)", fontWeight:800, fontSize:13, cursor:input.trim()&&!sending?"pointer":"not-allowed", marginBottom:22 }}>
              {sending?"...":"→"}
            </button>
          </div>
        ) : (
          <div style={{ textAlign:"center", padding:"14px", background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:12, fontSize:13, color:"rgba(241,245,249,0.35)" }}>
            🔒 Connecte-toi pour participer au chat
          </div>
        )}
      </>}

      {/* SONDAGES */}
      {tab === "polls" && <>
        {polls.length === 0 ? (
          <div style={{ textAlign:"center", padding:60, color:"rgba(241,245,249,0.25)" }}>
            <div style={{ fontSize:32, marginBottom:8 }}>📊</div>
            Aucun sondage actif pour l'instant
          </div>
        ) : polls.map(poll => (
          <PollCard key={poll.id} poll={poll} session={session} profile={profile} showToast={showToast} />
        ))}
      </>}

      {tab === "amis" && <FriendsTab profile={profile} session={session} showToast={showToast} onViewProfile={onViewProfile} />}
    </div>
  );
}

function FriendsTab({ profile, session, showToast, onViewProfile }) {
  const [subtab, setSubtab] = useState("friends");
  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sent, setSent] = useState([]);

  const userId = profile?.id;
  const token = session?.token;

  const load = async () => {
    if(!userId) return;
    setLoading(true);
    const [accepted, pendingIn, pendingOut] = await Promise.all([
      req(`friendships?or=(requester_id.eq.${userId},recipient_id.eq.${userId})&status=eq.accepted&select=*`, { _token:token }).catch(()=>[]),
      req(`friendships?recipient_id=eq.${userId}&status=eq.pending&select=*`, { _token:token }).catch(()=>[]),
      req(`friendships?requester_id=eq.${userId}&status=eq.pending&select=*`, { _token:token }).catch(()=>[]),
    ]);
    const friendIds = (accepted||[]).map(f => f.requester_id===userId ? f.recipient_id : f.requester_id);
    const requesterIds = (pendingIn||[]).map(f => f.requester_id);
    const [fp, rp] = await Promise.all([
      friendIds.length ? req(`profiles?id=in.(${friendIds.join(",")})&select=id,username,xp,total_bets,total_wins`) : Promise.resolve([]),
      requesterIds.length ? req(`profiles?id=in.(${requesterIds.join(",")})&select=id,username,xp`) : Promise.resolve([]),
    ]);
    setFriends((fp||[]).map(p => ({ ...p, friendship: accepted.find(f => f.requester_id===p.id||f.recipient_id===p.id) })));
    setPending((pendingIn||[]).map(f => ({ ...f, profile: rp?.find(p => p.id===f.requester_id) })));
    setSent(pendingOut||[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId]);

  const searchUsers = async () => {
    if(!search.trim()) return;
    setSearching(true);
    const results = await req(`profiles?username=ilike.*${encodeURIComponent(search.trim())}*&select=id,username,xp&limit=10`).catch(()=>[]);
    setSearchResults((results||[]).filter(r => r.id !== userId));
    setSearching(false);
  };

  const sendRequest = async (recipientId) => {
    await req(`friendships`, { method:"POST", body:JSON.stringify({ requester_id:userId, recipient_id:recipientId, status:"pending" }), _token:token });
    showToast?.("Demande envoyée !");
    setSearchResults(prev => prev.filter(r => r.id !== recipientId));
    load();
  };

  const acceptRequest = async (id) => {
    await req(`friendships?id=eq.${id}`, { method:"PATCH", body:JSON.stringify({ status:"accepted" }), _token:token });
    showToast?.("Ami ajouté !");
    load();
  };

  const declineRequest = async (id) => {
    await req(`friendships?id=eq.${id}`, { method:"DELETE", _token:token });
    load();
  };

  const removeFriend = async (id) => {
    await req(`friendships?id=eq.${id}`, { method:"DELETE", _token:token });
    showToast?.("Ami retiré");
    load();
  };

  if(!userId) return <div style={{ textAlign:"center", padding:40, color:"rgba(241,245,249,0.25)", fontSize:13 }}>Connecte-toi pour gérer tes amis</div>;

  const SUBTABS = [
    { id:"friends", label:`Amis (${friends.length})` },
    { id:"requests", label:`Demandes${pending.length?` (${pending.length})`:""}` },
    { id:"search", label:"🔍 Chercher" },
  ];

  return <div>
    <div style={{ display:"flex", gap:6, marginBottom:16 }}>
      {SUBTABS.map(t => (
        <button key={t.id} onClick={() => setSubtab(t.id)} style={{ flex:1, padding:"7px 4px", borderRadius:10, border:`1px solid ${subtab===t.id?"#10b981":"rgba(241,245,249,0.07)"}`, background:subtab===t.id?"rgba(16,185,129,0.08)":"transparent", color:subtab===t.id?"#10b981":"rgba(241,245,249,0.35)", fontWeight:700, fontSize:10, cursor:"pointer" }}>{t.label}</button>
      ))}
    </div>

    {subtab==="friends" && (loading ? <div style={{ textAlign:"center", padding:30, color:"rgba(241,245,249,0.25)" }}>Chargement...</div>
      : friends.length===0 ? <div style={{ textAlign:"center", padding:40 }}>
          <div style={{ fontSize:36, marginBottom:10 }}>👥</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:"rgba(241,245,249,0.25)" }}>AUCUN AMI</div>
          <div style={{ fontSize:12, color:"rgba(241,245,249,0.2)", marginTop:6 }}>Cherche des joueurs dans l'onglet Chercher</div>
        </div>
      : friends.map(f => (
          <div key={f.id} style={{ display:"flex", alignItems:"center", gap:12, background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:12, padding:"12px 14px", marginBottom:8 }}>
            <Avatar username={f.username} size={36} radius={10} />
            <div style={{ flex:1 }}>
              <div onClick={()=>onViewProfile?.(f.username)} style={{ fontWeight:700, fontSize:13, cursor:"pointer", textDecoration:"underline", textDecorationStyle:"dotted", textDecorationColor:"rgba(241,245,249,0.2)" }}>{f.username}</div>
              <div style={{ fontSize:11, color:"rgba(241,245,249,0.3)", marginTop:2 }}>{f.total_wins||0}/{f.total_bets||0} paris</div>
            </div>
            <button onClick={() => removeFriend(f.friendship?.id)} style={{ padding:"5px 10px", borderRadius:8, border:"1px solid rgba(239,68,68,0.2)", background:"transparent", color:"rgba(239,68,68,0.5)", fontSize:11, cursor:"pointer", fontWeight:700 }}>Retirer</button>
          </div>
        ))
    )}

    {subtab==="requests" && (pending.length===0
      ? <div style={{ textAlign:"center", padding:40, color:"rgba(241,245,249,0.2)", fontSize:13 }}>Aucune demande en attente</div>
      : pending.map(f => (
          <div key={f.id} style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:12, padding:"12px 14px", marginBottom:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
              <Avatar username={f.profile?.username||"?"} size={36} radius={10} />
              <div>
                <div style={{ fontWeight:700, fontSize:13 }}>{f.profile?.username||"Joueur"}</div>
                <div style={{ fontSize:11, color:"rgba(241,245,249,0.3)", marginTop:2 }}>veut être ton ami</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => acceptRequest(f.id)} style={{ flex:1, padding:"9px 0", borderRadius:9, border:"none", background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", fontSize:13, cursor:"pointer", fontWeight:800 }}>✓ Accepter</button>
              <button onClick={() => declineRequest(f.id)} style={{ flex:1, padding:"9px 0", borderRadius:9, border:"1px solid rgba(241,245,249,0.1)", background:"transparent", color:"rgba(241,245,249,0.4)", fontSize:13, cursor:"pointer", fontWeight:700 }}>✕ Refuser</button>
            </div>
          </div>
        ))
    )}

    {subtab==="search" && <div>
      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchUsers()} placeholder="Chercher un pseudo..." style={{ flex:1, padding:"11px 14px", background:"rgba(241,245,249,0.04)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:11, color:"#f1f5f9", fontSize:14, outline:"none" }} />
        <button onClick={searchUsers} disabled={searching} style={{ padding:"11px 16px", borderRadius:11, border:"none", background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", fontWeight:800, fontSize:13, cursor:"pointer" }}>{searching?"...":"Go"}</button>
      </div>
      {searchResults.map(r => (
        <div key={r.id} style={{ display:"flex", alignItems:"center", gap:12, background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:12, padding:"12px 14px", marginBottom:8 }}>
          <Avatar username={r.username} size={36} radius={10} />
          <div style={{ flex:1 }}><div onClick={()=>onViewProfile?.(r.username)} style={{ fontWeight:700, fontSize:13, cursor:"pointer", textDecoration:"underline", textDecorationStyle:"dotted", textDecorationColor:"rgba(241,245,249,0.2)" }}>{r.username}</div></div>
          {friends.some(f=>f.id===r.id) ? <span style={{ fontSize:11, color:"#10b981", fontWeight:700 }}>✓ Ami</span>
          : sent.some(f=>f.recipient_id===r.id) ? <span style={{ fontSize:11, color:"rgba(241,245,249,0.3)" }}>Envoyée</span>
          : <button onClick={() => sendRequest(r.id)} style={{ padding:"6px 14px", borderRadius:8, border:"none", background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", fontSize:11, cursor:"pointer", fontWeight:700 }}>+ Ajouter</button>}
        </div>
      ))}
    </div>}
  </div>;
}
