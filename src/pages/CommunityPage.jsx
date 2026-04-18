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

export default function CommunityPage({ session, profile, showToast }) {
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
        {[{id:"chat",label:"💬 Chat"},{id:"polls",label:"📊 Sondages"}].map(t => (
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
                  <span style={{ fontWeight:700, fontSize:13, color: post.user_id===session?.user?.id?"#10b981":"#f1f5f9" }}>{post.username}</span>
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
    </div>
  );
}
