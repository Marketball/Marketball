import { useState, useEffect, useRef } from "react";
import { useLang } from "../lib/i18n.jsx";
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

function PollCard({ poll, session, profile, showToast, t }) {
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
        <span style={{ fontSize:10, fontWeight:700, color:"#60a5fa", background:"rgba(59,130,246,0.1)", padding:"2px 8px", borderRadius:20, border:"1px solid rgba(59,130,246,0.2)", flexShrink:0, marginLeft:8 }}>{t("polls.badge")}</span>
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
          {!session?t("polls.login_vote"):sending?"...":selected?t("polls.validate"):t("polls.select")}
        </button>
      )}
      <div style={{ fontSize:11, color:"rgba(241,245,249,0.25)" }}>
        {localTotal} {localTotal>1?t("polls.votes"):t("polls.vote")}
        {isExpired?` · ${t("polls.expired")}`:localVoted?` · ${t("polls.registered")}`:""}
      </div>
    </div>
  );
}

export default function CommunityPage({ session, profile, showToast, onViewProfile }) {
  const { t } = useLang();
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
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, letterSpacing:2, marginBottom:6 }}>{t("community.title")}</div>
      <div style={{ fontSize:13, color:"rgba(241,245,249,0.35)", marginBottom:20 }}>{t("community.subtitle")}</div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:12 }}>
        {[{id:"chat",label:t("community.chat")},{id:"polls",label:t("community.polls")},{id:"amis",label:t("community.friends")},{id:"defis",label:t("community.challenges")}].map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)}
            style={{ padding:"8px 18px", borderRadius:20, border:`1px solid ${tab===tb.id?"#10b981":"rgba(241,245,249,0.08)"}`, background:tab===tb.id?"rgba(16,185,129,0.1)":"transparent", color:tab===tb.id?"#10b981":"rgba(241,245,249,0.4)", fontWeight:700, fontSize:13, cursor:"pointer", transition:"all 0.2s" }}>
            {tb.label}
          </button>
        ))}
      </div>

      {/* Discord banner */}
      <a href="https://discord.gg/marketball" target="_blank" rel="noopener noreferrer"
        style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px", marginBottom:16, background:"rgba(88,101,242,0.08)", border:"1px solid rgba(88,101,242,0.25)", borderRadius:12, textDecoration:"none", transition:"all 0.2s" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#5865f2" style={{ flexShrink:0 }}><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:13, color:"#5865f2" }}>{t("community.discord_title")}</div>
          <div style={{ fontSize:11, color:"rgba(241,245,249,0.4)", marginTop:1 }}>{t("community.discord_sub")}</div>
        </div>
        <div style={{ fontSize:12, color:"#5865f2", fontWeight:700 }}>→</div>
      </a>

      {/* CHAT */}
      {tab === "chat" && <>
        <div style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:16, padding:"16px", marginBottom:12, minHeight:300, maxHeight:480, overflowY:"auto" }}>
          {loading ? (
            <div style={{ textAlign:"center", padding:40, color:"rgba(241,245,249,0.25)" }}>{t("community.loading")}</div>
          ) : posts.length === 0 ? (
            <div style={{ textAlign:"center", padding:40, color:"rgba(241,245,249,0.25)" }}>
              <div style={{ fontSize:32, marginBottom:8 }}>💬</div>
              {t("community.empty_chat")}
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
                placeholder={t("community.chat_placeholder")}
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
            {t("community.login_to_chat")}
          </div>
        )}
      </>}

      {/* SONDAGES */}
      {tab === "polls" && <>
        {polls.length === 0 ? (
          <div style={{ textAlign:"center", padding:60, color:"rgba(241,245,249,0.25)" }}>
            <div style={{ fontSize:32, marginBottom:8 }}>📊</div>
            {t("community.no_polls")}
          </div>
        ) : polls.map(poll => (
          <PollCard key={poll.id} poll={poll} session={session} profile={profile} showToast={showToast} t={t} />
        ))}
      </>}

      {tab === "amis" && <FriendsTab profile={profile} session={session} showToast={showToast} onViewProfile={onViewProfile} />}
      {tab === "defis" && <ChallengesTab profile={profile} session={session} showToast={showToast} />}
    </div>
  );
}

function FriendsTab({ profile, session, showToast, onViewProfile }) {
  const { t } = useLang();
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

  if(!userId) return <div style={{ textAlign:"center", padding:40, color:"rgba(241,245,249,0.25)", fontSize:13 }}>{t("friends.login")}</div>;

  const SUBTABS = [
    { id:"friends", label:`${t("friends.tab_friends")} (${friends.length})` },
    { id:"requests", label:`${t("friends.tab_requests")}${pending.length?` (${pending.length})`:""}` },
    { id:"search", label:t("friends.tab_search") },
  ];

  return <div>
    <div style={{ display:"flex", gap:6, marginBottom:16 }}>
      {SUBTABS.map(t => (
        <button key={t.id} onClick={() => setSubtab(t.id)} style={{ flex:1, padding:"7px 4px", borderRadius:10, border:`1px solid ${subtab===t.id?"#10b981":"rgba(241,245,249,0.07)"}`, background:subtab===t.id?"rgba(16,185,129,0.08)":"transparent", color:subtab===t.id?"#10b981":"rgba(241,245,249,0.35)", fontWeight:700, fontSize:10, cursor:"pointer" }}>{t.label}</button>
      ))}
    </div>

    {subtab==="friends" && (loading ? <div style={{ textAlign:"center", padding:30, color:"rgba(241,245,249,0.25)" }}>{t("friends.loading")}</div>
      : friends.length===0 ? <div style={{ textAlign:"center", padding:40 }}>
          <div style={{ fontSize:36, marginBottom:10 }}>👥</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:"rgba(241,245,249,0.25)" }}>{t("friends.no_friends")}</div>
          <div style={{ fontSize:12, color:"rgba(241,245,249,0.2)", marginTop:6 }}>{t("friends.no_friends_sub")}</div>
        </div>
      : friends.map(f => (
          <div key={f.id} style={{ display:"flex", alignItems:"center", gap:12, background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:12, padding:"12px 14px", marginBottom:8 }}>
            <Avatar username={f.username} size={36} radius={10} />
            <div style={{ flex:1 }}>
              <div onClick={()=>onViewProfile?.(f.username)} style={{ fontWeight:700, fontSize:13, cursor:"pointer", textDecoration:"underline", textDecorationStyle:"dotted", textDecorationColor:"rgba(241,245,249,0.2)" }}>{f.username}</div>
              <div style={{ fontSize:11, color:"rgba(241,245,249,0.3)", marginTop:2 }}>{f.total_wins||0}/{f.total_bets||0} paris</div>
            </div>
            <button onClick={() => removeFriend(f.friendship?.id)} style={{ padding:"5px 10px", borderRadius:8, border:"1px solid rgba(239,68,68,0.2)", background:"transparent", color:"rgba(239,68,68,0.5)", fontSize:11, cursor:"pointer", fontWeight:700 }}>{t("friends.remove")}</button>
          </div>
        ))
    )}

    {subtab==="requests" && (pending.length===0
      ? <div style={{ textAlign:"center", padding:40, color:"rgba(241,245,249,0.2)", fontSize:13 }}>{t("friends.no_requests")}</div>
      : pending.map(f => (
          <div key={f.id} style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:12, padding:"12px 14px", marginBottom:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
              <Avatar username={f.profile?.username||"?"} size={36} radius={10} />
              <div>
                <div style={{ fontWeight:700, fontSize:13 }}>{f.profile?.username||"Joueur"}</div>
                <div style={{ fontSize:11, color:"rgba(241,245,249,0.3)", marginTop:2 }}>{t("friends.wants_friend")}</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => acceptRequest(f.id)} style={{ flex:1, padding:"9px 0", borderRadius:9, border:"none", background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", fontSize:13, cursor:"pointer", fontWeight:800 }}>{t("friends.accept")}</button>
              <button onClick={() => declineRequest(f.id)} style={{ flex:1, padding:"9px 0", borderRadius:9, border:"1px solid rgba(241,245,249,0.1)", background:"transparent", color:"rgba(241,245,249,0.4)", fontSize:13, cursor:"pointer", fontWeight:700 }}>{t("friends.decline")}</button>
            </div>
          </div>
        ))
    )}

    {subtab==="search" && <div>
      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchUsers()} placeholder={t("friends.search_ph")} style={{ flex:1, padding:"11px 14px", background:"rgba(241,245,249,0.04)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:11, color:"#f1f5f9", fontSize:14, outline:"none" }} />
        <button onClick={searchUsers} disabled={searching} style={{ padding:"11px 16px", borderRadius:11, border:"none", background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", fontWeight:800, fontSize:13, cursor:"pointer" }}>{searching?"...":"Go"}</button>
      </div>
      {searchResults.map(r => (
        <div key={r.id} style={{ display:"flex", alignItems:"center", gap:12, background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:12, padding:"12px 14px", marginBottom:8 }}>
          <Avatar username={r.username} size={36} radius={10} />
          <div style={{ flex:1 }}><div onClick={()=>onViewProfile?.(r.username)} style={{ fontWeight:700, fontSize:13, cursor:"pointer", textDecoration:"underline", textDecorationStyle:"dotted", textDecorationColor:"rgba(241,245,249,0.2)" }}>{r.username}</div></div>
          {friends.some(f=>f.id===r.id) ? <span style={{ fontSize:11, color:"#10b981", fontWeight:700 }}>{t("friends.is_friend")}</span>
          : sent.some(f=>f.recipient_id===r.id) ? <span style={{ fontSize:11, color:"rgba(241,245,249,0.3)" }}>{t("friends.sent")}</span>
          : <button onClick={() => sendRequest(r.id)} style={{ padding:"6px 14px", borderRadius:8, border:"none", background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", fontSize:11, cursor:"pointer", fontWeight:700 }}>{t("friends.add")}</button>}
        </div>
      ))}
    </div>}
  </div>;
}

function ChallengesTab({ profile, session, showToast }) {
  const { t } = useLang();
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subtab, setSubtab] = useState("recus");

  const userId = profile?.id;
  const token = session?.token;

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    const data = await req(
      `friend_challenges?or=(challenger_id.eq.${userId},challenged_id.eq.${userId})&order=created_at.desc&limit=50`,
      { _token: token }
    ).catch(() => []);
    setChallenges(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId]);

  const accept = async (c) => {
    if ((profile?.coins || 0) < c.amount) { showToast("Pas assez de MC", "error"); return; }
    try {
      await req(`friend_challenges?id=eq.${c.id}`, { method: "PATCH", body: JSON.stringify({ status: "accepted" }), _token: token });
      await req(`profiles?id=eq.${userId}`, { method: "PATCH", body: JSON.stringify({ coins: (profile?.coins || 0) - c.amount }), _token: token });
      showToast("Défi accepté ! ⚔️");
      load();
    } catch (e) { showToast(e.message || "Erreur", "error"); }
  };

  const decline = async (c) => {
    try {
      // Rembourser le challenger
      await req(`profiles?id=eq.${c.challenger_id}`, { method: "PATCH", body: JSON.stringify({ coins: 0 }), _token: token });
      // On fait un GET d'abord pour avoir les coins actuels
      const [p] = await req(`profiles?id=eq.${c.challenger_id}&select=coins`);
      await req(`profiles?id=eq.${c.challenger_id}`, { method: "PATCH", body: JSON.stringify({ coins: (p?.coins || 0) + c.amount }), _token: token });
      await req(`friend_challenges?id=eq.${c.id}`, { method: "PATCH", body: JSON.stringify({ status: "declined" }), _token: token });
      showToast("Défi refusé");
      load();
    } catch (e) { showToast(e.message || "Erreur", "error"); }
  };

  const cancel = async (c) => {
    try {
      const [p] = await req(`profiles?id=eq.${userId}&select=coins`, { _token: token });
      await req(`profiles?id=eq.${userId}`, { method: "PATCH", body: JSON.stringify({ coins: (p?.coins || 0) + c.amount }), _token: token });
      await req(`friend_challenges?id=eq.${c.id}`, { method: "PATCH", body: JSON.stringify({ status: "cancelled" }), _token: token });
      showToast("Défi annulé, MC remboursés");
      load();
    } catch (e) { showToast(e.message || "Erreur", "error"); }
  };

  if (!userId) return <div style={{ textAlign: "center", padding: 40, color: "rgba(241,245,249,0.25)", fontSize: 13 }}>{t("challenges.login")}</div>;

  const received = challenges.filter(c => c.challenged_id === userId && c.status === "pending");
  const inProgress = challenges.filter(c => c.status === "accepted");
  const sent = challenges.filter(c => c.challenger_id === userId && c.status === "pending");
  const history = challenges.filter(c => ["resolved", "declined", "cancelled"].includes(c.status));

  const SUBTABS = [
    { id: "recus", label: `${t("challenges.tab_received")}${received.length ? ` (${received.length})` : ""}` },
    { id: "encours", label: `${t("challenges.tab_ongoing")}${inProgress.length ? ` (${inProgress.length})` : ""}` },
    { id: "envoyes", label: `${t("challenges.tab_sent")}${sent.length ? ` (${sent.length})` : ""}` },
    { id: "historique", label: t("challenges.tab_history") },
  ];

  const statusColor = { pending: "#fbbf24", accepted: "#3b82f6", resolved: "#10b981", declined: "#ef4444", cancelled: "#6b7280" };
  const statusLabel = { pending: t("challenges.status_pending"), accepted: t("challenges.status_accepted"), resolved: t("challenges.status_resolved"), declined: t("challenges.status_declined"), cancelled: t("challenges.status_cancelled") };

  const ChallengeCard = ({ c, showActions }) => (
    <div style={{ background: "rgba(241,245,249,0.02)", border: "1px solid rgba(241,245,249,0.06)", borderRadius: 14, padding: "14px 16px", marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, lineHeight: 1.4 }}>{c.market_title}</div>
          <div style={{ fontSize: 11, color: "rgba(241,245,249,0.4)" }}>
            <span style={{ color: "#f59e0b", fontWeight: 700 }}>{c.challenger_username}</span>
            {" "}vs{" "}
            <span style={{ color: "#3b82f6", fontWeight: 700 }}>{c.challenged_username}</span>
          </div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: statusColor[c.status], background: `${statusColor[c.status]}15`, padding: "2px 8px", borderRadius: 20, border: `1px solid ${statusColor[c.status]}25`, flexShrink: 0, marginLeft: 8 }}>
          {statusLabel[c.status]}
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: showActions ? 12 : 0 }}>
        <div style={{ flex: 1, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 9, padding: "8px 10px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "rgba(241,245,249,0.35)", marginBottom: 3 }}>{c.challenger_username}</div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, color: "#f59e0b", letterSpacing: 1 }}>{c.challenger_side.toUpperCase()}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, color: "#10b981", letterSpacing: 1 }}>🪙 {c.amount * 2}</div>
            <div style={{ fontSize: 9, color: "rgba(241,245,249,0.3)" }}>pot</div>
          </div>
        </div>
        <div style={{ flex: 1, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 9, padding: "8px 10px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "rgba(241,245,249,0.35)", marginBottom: 3 }}>{c.challenged_username}</div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, color: "#3b82f6", letterSpacing: 1 }}>{c.challenged_side.toUpperCase()}</div>
        </div>
      </div>
      {showActions === "accept" && (
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => decline(c)} style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: "1px solid rgba(239,68,68,0.2)", background: "transparent", color: "rgba(239,68,68,0.6)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{t("challenges.decline_btn")}</button>
          <button onClick={() => accept(c)} style={{ flex: 2, padding: "9px 0", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>{t("challenges.accept_btn")} — {c.amount} MC</button>
        </div>
      )}
      {showActions === "cancel" && c.status === "pending" && (
        <button onClick={() => cancel(c)} style={{ width: "100%", padding: "8px 0", borderRadius: 9, border: "1px solid rgba(241,245,249,0.08)", background: "transparent", color: "rgba(241,245,249,0.3)", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>{t("challenges.cancel_btn")}</button>
      )}
    </div>
  );

  return <div>
    <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
      {SUBTABS.map(t => (
        <button key={t.id} onClick={() => setSubtab(t.id)} style={{ flex: 1, padding: "7px 4px", borderRadius: 10, border: `1px solid ${subtab === t.id ? "#f59e0b" : "rgba(241,245,249,0.07)"}`, background: subtab === t.id ? "rgba(245,158,11,0.08)" : "transparent", color: subtab === t.id ? "#f59e0b" : "rgba(241,245,249,0.35)", fontWeight: 700, fontSize: 10, cursor: "pointer" }}>{t.label}</button>
      ))}
    </div>

    {loading ? <div style={{ textAlign: "center", padding: 30, color: "rgba(241,245,249,0.25)" }}>{t("challenges.loading")}</div> : <>
      {subtab === "recus" && (received.length === 0
        ? <div style={{ textAlign: "center", padding: 40 }}><div style={{ fontSize: 36, marginBottom: 10 }}>⚔️</div><div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, color: "rgba(241,245,249,0.25)" }}>{t("challenges.no_received")}</div></div>
        : received.map(c => <ChallengeCard key={c.id} c={c} showActions="accept" />)
      )}
      {subtab === "encours" && (inProgress.length === 0
        ? <div style={{ textAlign: "center", padding: 40 }}><div style={{ fontSize: 36, marginBottom: 10 }}>⚔️</div><div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, color: "rgba(241,245,249,0.25)" }}>{t("challenges.no_ongoing")}</div></div>
        : inProgress.map(c => <ChallengeCard key={c.id} c={c} showActions={null} />)
      )}
      {subtab === "envoyes" && (sent.length === 0
        ? <div style={{ textAlign: "center", padding: 40 }}><div style={{ fontSize: 36, marginBottom: 10 }}>📤</div><div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, color: "rgba(241,245,249,0.25)" }}>{t("challenges.no_sent")}</div></div>
        : sent.map(c => <ChallengeCard key={c.id} c={c} showActions="cancel" />)
      )}
      {subtab === "historique" && (history.length === 0
        ? <div style={{ textAlign: "center", padding: 40, color: "rgba(241,245,249,0.25)", fontSize: 13 }}>{t("challenges.no_history")}</div>
        : history.map(c => {
            const iWon = c.winner_id === userId;
            const iWasInvolved = c.status === "resolved";
            return <div key={c.id}>
              {iWasInvolved && <div style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: iWon ? "#10b981" : "#ef4444", marginBottom: 4 }}>{iWon ? `🏆 +${c.amount} MC remportés` : `💸 -${c.amount} MC perdus`}</div>}
              <ChallengeCard c={c} showActions={null} />
            </div>;
          })
      )}
    </>}
  </div>;
}
