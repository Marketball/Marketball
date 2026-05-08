import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);
import { useLang } from "../lib/i18n.jsx";
import { req } from "../lib/supabase.js";
import Avatar from "../components/ui/Avatar.jsx";
import { getDivision } from "../lib/helpers.js";

// ─── Design tokens ─────────────────────────────────────────────────────────
const G  = "#10b981";
const GA = "rgba(16,185,129,";
const AM = "#f59e0b";
const BL = "#3b82f6";
const LIGHT = "#f1f5f9";
const MONO = "'Barlow Condensed','IBM Plex Mono','Courier New',monospace";

// ─── CSS keyframes injection ────────────────────────────────────────────────
function injectStyles() {
  if (document.getElementById("community-ultras-styles")) return;
  const s = document.createElement("style");
  s.id = "community-ultras-styles";
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;500;600;700;800;900&display=swap');

    @keyframes cpulse {
      0%,100% { opacity:1; transform:scale(1); }
      50%      { opacity:0.35; transform:scale(1.6); }
    }
    @keyframes cslideUp {
      from { opacity:0; transform:translateY(10px); }
      to   { opacity:1; transform:none; }
    }
    @keyframes cbar {
      from { width:0; }
    }
    @keyframes cglow {
      0%,100% { box-shadow:0 0 0 0 rgba(16,185,129,0); }
      50%      { box-shadow:0 0 20px 4px rgba(16,185,129,0.2); }
    }
    @keyframes cscan {
      from { transform:scaleX(0); transform-origin:left; }
      to   { transform:scaleX(1); transform-origin:left; }
    }
    @keyframes cdrift {
      0%,100% { transform:translate(0,0) scale(1); }
      33%      { transform:translate(30px,-20px) scale(1.05); }
      66%      { transform:translate(-20px,15px) scale(0.97); }
    }
    @keyframes cticker {
      from { transform:translateX(0); }
      to   { transform:translateX(-50%); }
    }
    .c-msg-enter { animation: cslideUp 0.3s ease both; }
    .c-tab-btn:hover { opacity:1 !important; }
    .c-poll-opt:hover { border-color:rgba(241,245,249,0.25) !important; }
    .c-friend-card:hover { border-color:rgba(16,185,129,0.2) !important; background:rgba(16,185,129,0.03) !important; }
    .c-challenge-card:hover { border-color:rgba(245,158,11,0.2) !important; }
    .c-discord:hover { border-color:rgba(88,101,242,0.5) !important; transform:translateY(-1px); }
    .c-send-btn:not(:disabled):hover { filter:brightness(1.15); }
  `;
  document.head.appendChild(s);
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1)  return "à l'instant";
  if (m < 60) return `${m}min`;
  if (h < 24) return `${h}h`;
  return `${d}j`;
}

// ─── PollCard ────────────────────────────────────────────────────────────────
function PollCard({ poll, session, profile, showToast, t }) {
  const options     = Array.isArray(poll.options) ? poll.options : [];
  const rawVotes    = poll.votes || {};
  const counts      = {};
  options.forEach(opt => { counts[opt] = rawVotes[opt] || 0; });
  const totalVotes  = options.reduce((s, opt) => s + counts[opt], 0);
  const userKey     = profile?.id ? `user_${profile.id}` : null;
  const alreadyVoted = userKey ? (rawVotes[userKey] || null) : null;

  const [selected, setSelected]       = useState(null);
  const [localVoted, setLocalVoted]   = useState(alreadyVoted);
  const [localCounts, setLocalCounts] = useState(counts);
  const [localTotal, setLocalTotal]   = useState(totalVotes);
  const [sending, setSending]         = useState(false);
  const isExpired  = poll.expires_at && new Date(poll.expires_at) < new Date();
  const showResults = !!localVoted || isExpired;

  const handleVote = async () => {
    if (!session || !selected || localVoted || isExpired || sending) return;
    setSending(true);
    const newCounts = { ...localCounts, [selected]: (localCounts[selected] || 0) + 1 };
    const newVotes  = { ...rawVotes, ...newCounts, [userKey]: selected };
    setLocalCounts(newCounts);
    setLocalTotal(localTotal + 1);
    setLocalVoted(selected);
    try {
      await req(`community_polls?id=eq.${poll.id}`, {
        method:"PATCH", _token:session.token,
        body:JSON.stringify({ votes:newVotes }),
      });
    } catch { showToast?.("Erreur lors du vote", "error"); }
    setSending(false);
  };

  const topOpt  = options.reduce((a,b) => (localCounts[a]||0) >= (localCounts[b]||0) ? a : b, options[0]);

  return (
    <div style={{ background:"rgba(59,130,246,0.03)", border:"1px solid rgba(59,130,246,0.12)", borderRadius:18, padding:"22px 22px 18px", marginBottom:14, position:"relative", overflow:"hidden" }}>
      {/* Category stripe */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:"linear-gradient(90deg,#3b82f6,rgba(59,130,246,0))" }} />

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
        <div style={{ fontFamily:MONO, fontSize:17, fontWeight:800, color:LIGHT, lineHeight:1.3, flex:1, letterSpacing:"0.02em" }}>
          {poll.question}
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4, marginLeft:12, flexShrink:0 }}>
          <span style={{ fontSize:9, fontWeight:800, color:"#60a5fa", background:"rgba(59,130,246,0.12)", padding:"3px 9px", borderRadius:20, border:"1px solid rgba(59,130,246,0.25)", letterSpacing:2 }}>
            {t("polls.badge")}
          </span>
          {isExpired && <span style={{ fontSize:9, color:"rgba(241,245,249,0.3)", letterSpacing:1 }}>TERMINÉ</span>}
        </div>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:14 }}>
        {options.map(opt => {
          const pct     = localTotal > 0 ? Math.round((localCounts[opt] / localTotal) * 100) : 0;
          const isChosen = localVoted === opt;
          const isPicked = selected === opt && !localVoted;
          const isTop    = opt === topOpt && showResults && localTotal > 0;
          return (
            <div key={opt}
              className="c-poll-opt"
              onClick={() => !localVoted && !isExpired && setSelected(opt)}
              style={{
                padding:"11px 14px", borderRadius:11,
                border:`1.5px solid ${isChosen?"#3b82f6":isPicked?"rgba(59,130,246,0.45)":"rgba(241,245,249,0.07)"}`,
                background:isChosen?"rgba(59,130,246,0.1)":isPicked?"rgba(59,130,246,0.04)":"rgba(241,245,249,0.015)",
                cursor:localVoted||isExpired?"default":"pointer",
                position:"relative", overflow:"hidden", transition:"border-color 0.2s, background 0.2s",
              }}>
              {showResults && (
                <div style={{
                  position:"absolute", left:0, top:0, bottom:0, width:`${pct}%`,
                  background:isChosen?"rgba(59,130,246,0.12)":isTop?"rgba(241,245,249,0.04)":"rgba(241,245,249,0.02)",
                  animation:"cbar 0.7s cubic-bezier(0.4,0,0.2,1) both",
                  transition:"width 0.7s cubic-bezier(0.4,0,0.2,1)",
                }} />
              )}
              <div style={{ position:"relative", display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, flex:1, minWidth:0 }}>
                  {isChosen && <span style={{ color:"#3b82f6", fontWeight:900, fontSize:14 }}>✓</span>}
                  {isPicked && <span style={{ color:"#93c5fd", fontSize:10 }}>●</span>}
                  <span style={{ fontFamily:MONO, fontSize:13, fontWeight:isChosen||isPicked?800:500, color:isChosen?"#93c5fd":isPicked?"#bfdbfe":"rgba(241,245,249,0.7)", letterSpacing:"0.01em" }}>
                    {opt}
                  </span>
                </div>
                {showResults && (
                  <span style={{ fontFamily:MONO, fontSize:16, fontWeight:800, color:isChosen?"#60a5fa":isTop?"rgba(241,245,249,0.5)":"rgba(241,245,249,0.25)", letterSpacing:1, flexShrink:0 }}>
                    {pct}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!localVoted && !isExpired && (
        <button onClick={handleVote}
          disabled={!selected || sending || !session}
          style={{
            width:"100%", padding:"11px 0", borderRadius:11, border:"none",
            background:selected&&session&&!sending?"linear-gradient(135deg,#3b82f6,#2563eb)":"rgba(241,245,249,0.05)",
            color:selected&&session&&!sending?"#fff":"rgba(241,245,249,0.2)",
            fontFamily:MONO, fontWeight:900, fontSize:13, letterSpacing:2,
            cursor:selected&&session&&!sending?"pointer":"not-allowed", transition:"all 0.2s", marginBottom:8,
          }}>
          {!session ? t("polls.login_vote") : sending ? "···" : selected ? t("polls.validate").toUpperCase() : t("polls.select").toUpperCase()}
        </button>
      )}
      <div style={{ fontFamily:MONO, fontSize:11, color:"rgba(241,245,249,0.2)", letterSpacing:1 }}>
        {localTotal} {localTotal > 1 ? t("polls.votes") : t("polls.vote")}
        {isExpired ? ` · ${t("polls.expired")}` : localVoted ? ` · ${t("polls.registered")}` : ""}
      </div>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────
export default function CommunityPage({ session, profile, showToast, onViewProfile }) {
  const { t } = useLang();
  const [posts, setPosts]   = useState([]);
  const [polls, setPolls]   = useState([]);
  const [postCoins, setPostCoins] = useState({});
  const [input, setInput]   = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [tab, setTab]       = useState("chat");
  const bottomRef           = useRef(null);
  const MAX                 = 280;

  // Refs for GSAP
  const pageRef  = useRef(null);
  const scanRef  = useRef(null);
  const titleRef = useRef(null);
  const subRef   = useRef(null);
  const orbRef   = useRef(null);

  injectStyles();

  // ── Data ──
  const loadData = async () => {
    try {
      const [p, po] = await Promise.all([
        req("community_posts?order=created_at.desc&limit=50").catch(() => []),
        req("community_polls?order=created_at.desc&limit=20").catch(()  => []),
      ]);
      const posts = (p || []).reverse();
      setPosts(posts);
      setPolls(po  || []);
      const ids = [...new Set(posts.map(x => x.user_id).filter(Boolean))];
      if (ids.length) {
        const profiles = await req(`profiles?id=in.(${ids.join(",")})&select=id,coins`).catch(() => []);
        const map = {};
        (profiles || []).forEach(x => { map[x.id] = x.coins || 0; });
        setPostCoins(map);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    if (tab === "chat") bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [posts, tab]);
  useEffect(() => {
    const id = setInterval(() => loadData(), 15000);
    return () => clearInterval(id);
  }, []);

  // ── GSAP entrance ──
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(scanRef.current,
        { scaleX:0 },
        { scaleX:1, duration:1.1, ease:"power4.inOut", delay:0.05 }
      );
      gsap.fromTo(titleRef.current,
        { y:40, opacity:0, filter:"blur(8px)" },
        { y:0, opacity:1, filter:"blur(0px)", duration:0.85, ease:"power3.out", delay:0.3 }
      );
      gsap.fromTo(subRef.current,
        { y:16, opacity:0 },
        { y:0, opacity:1, duration:0.6, ease:"power2.out", delay:0.65 }
      );
      gsap.to(orbRef.current, {
        duration:8, ease:"none", repeat:-1,
        motionPath:false,
        keyframes:[
          { x:0, y:0, scale:1 },
          { x:40, y:-30, scale:1.08 },
          { x:-30, y:20, scale:0.95 },
          { x:0, y:0, scale:1 },
        ],
      });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  // ── Post actions ──
  const handlePost = async () => {
    if (!session || !input.trim() || sending) return;
    const content = input.trim().slice(0, MAX);
    setSending(true);
    try {
      const res = await req("community_posts", {
        method:"POST", _token:session.token,
        body:JSON.stringify({ user_id:session.user.id, username:profile?.username||"Anonyme", content }),
      });
      const newPost = res?.[0] || { id:Date.now(), user_id:session.user.id, username:profile?.username, content, created_at:new Date().toISOString() };
      setPosts(prev => [...prev, newPost]);
      setPostCoins(prev => ({ ...prev, [session.user.id]: profile?.coins || 0 }));
      setInput("");
    } catch(e) { showToast("Erreur : " + e.message, "error"); }
    setSending(false);
  };

  const handleDelete = async (id) => {
    if (!session) return;
    try {
      await req(`community_posts?id=eq.${id}`, { method:"DELETE", _token:session.token });
      setPosts(prev => prev.filter(p => p.id !== id));
    } catch {}
  };

  // ── Tabs config ──
  const TABS = [
    { id:"chat",   label:t("community.chat"),       icon:"◎" },
    { id:"polls",  label:t("community.polls"),      icon:"▦" },
    { id:"amis",   label:t("community.friends"),    icon:"◈" },
    { id:"defis",  label:t("community.challenges"), icon:"⚔" },
  ];

  return (
    <div ref={pageRef} className="page-enter" style={{ position:"relative" }}>
      {/* ── Atmospheric orb ── */}
      <div ref={orbRef} style={{
        position:"fixed", top:"-10vh", left:"-5vw", width:400, height:400,
        borderRadius:"50%",
        background:`radial-gradient(circle, ${GA}0.07) 0%, transparent 70%)`,
        filter:"blur(60px)", pointerEvents:"none", zIndex:0,
      }} />

      {/* ── Hero header ── */}
      <div style={{ position:"relative", marginBottom:28, paddingBottom:20 }}>
        {/* Scanner line */}
        <div ref={scanRef} style={{
          height:1, background:`linear-gradient(90deg, transparent, ${G}, rgba(16,185,129,0.2), transparent)`,
          marginBottom:18, transformOrigin:"left",
        }} />

        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
          <div ref={titleRef}>
            {/* Live badge */}
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:G, animation:"cpulse 2s ease-in-out infinite" }} />
              <span style={{ fontFamily:MONO, fontSize:10, fontWeight:700, color:G, letterSpacing:3 }}>LIVE</span>
            </div>

            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:52, lineHeight:0.9, letterSpacing:3, color:LIGHT }}>
              COMMU<br />
              <span style={{ color:G }}>NAUTÉ</span>
            </div>
          </div>

          {/* Right accent */}
          <div ref={subRef} style={{ textAlign:"right", paddingTop:8 }}>
            <div style={{ fontFamily:MONO, fontSize:9, fontWeight:700, color:"rgba(241,245,249,0.2)", letterSpacing:3, marginBottom:6 }}>
              MARKETBALL
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:3, alignItems:"flex-end" }}>
              {["FORUM","SONDAGES","DUELS"].map(l => (
                <div key={l} style={{ fontFamily:MONO, fontSize:9, fontWeight:600, color:"rgba(241,245,249,0.15)", letterSpacing:2 }}>{l}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Discord banner ── */}
      <a href="https://discord.gg/marketball" target="_blank" rel="noopener noreferrer"
        className="c-discord"
        style={{
          display:"flex", alignItems:"center", gap:14, padding:"14px 18px",
          marginBottom:20,
          background:"rgba(88,101,242,0.05)",
          border:"1px solid rgba(88,101,242,0.2)",
          borderRadius:14, textDecoration:"none",
          transition:"border-color 0.2s, transform 0.2s",
          position:"relative", overflow:"hidden",
        }}>
        {/* Left stripe */}
        <div style={{ position:"absolute", left:0, top:0, bottom:0, width:3, background:"#5865f2" }} />
        <svg width="22" height="22" viewBox="0 0 24 24" fill="#5865f2" style={{ flexShrink:0 }}>
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
        </svg>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:MONO, fontSize:13, fontWeight:800, color:"#7c86f8", letterSpacing:1 }}>
            {t("community.discord_title")}
          </div>
          <div style={{ fontSize:11, color:"rgba(241,245,249,0.35)", marginTop:2, fontFamily:"'DM Sans',sans-serif" }}>
            {t("community.discord_sub")}
          </div>
        </div>
        <div style={{ fontFamily:MONO, fontWeight:900, color:"#5865f2", fontSize:16 }}>→</div>
      </a>

      {/* ── Tab navigation ── */}
      <div style={{ display:"flex", gap:6, marginBottom:20, background:"rgba(241,245,249,0.03)", borderRadius:14, padding:5, border:"1px solid rgba(241,245,249,0.06)" }}>
        {TABS.map(tb => (
          <button key={tb.id}
            className="c-tab-btn"
            onClick={() => setTab(tb.id)}
            style={{
              flex:1, padding:"9px 6px", borderRadius:10,
              border:`1px solid ${tab===tb.id ? G : "transparent"}`,
              background:tab===tb.id ? GA+"0.1)" : "transparent",
              color:tab===tb.id ? G : "rgba(241,245,249,0.3)",
              fontFamily:MONO, fontWeight:800, fontSize:11, letterSpacing:1.5,
              cursor:"pointer", transition:"all 0.2s",
              opacity:tab===tb.id ? 1 : 0.7,
            }}>
            <div style={{ fontSize:13, marginBottom:2 }}>{tb.icon}</div>
            {tb.label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* ── CHAT ── */}
      {tab === "chat" && <ChatTab posts={posts} loading={loading} session={session} profile={profile} input={input} setInput={setInput} sending={sending} handlePost={handlePost} handleDelete={handleDelete} bottomRef={bottomRef} onViewProfile={onViewProfile} MAX={MAX} t={t} />}

      {/* ── POLLS ── */}
      {tab === "polls" && (polls.length === 0
        ? <EmptyState icon="▦" label={t("community.no_polls")} />
        : <div>{polls.map(poll => <PollCard key={poll.id} poll={poll} session={session} profile={profile} showToast={showToast} t={t} />)}</div>
      )}

      {/* ── AMIS / DÉFIS ── */}
      {tab === "amis"  && <FriendsTab    profile={profile} session={session} showToast={showToast} onViewProfile={onViewProfile} />}
      {tab === "defis" && <ChallengesTab profile={profile} session={session} showToast={showToast} />}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ icon, label }) {
  return (
    <div style={{ textAlign:"center", padding:"60px 20px" }}>
      <div style={{ fontFamily:MONO, fontSize:40, color:"rgba(241,245,249,0.1)", marginBottom:12, letterSpacing:4 }}>{icon}</div>
      <div style={{ fontFamily:MONO, fontSize:13, color:"rgba(241,245,249,0.2)", letterSpacing:2 }}>{label}</div>
    </div>
  );
}

// ─── Chat tab ─────────────────────────────────────────────────────────────────
function ChatTab({ posts, loading, session, profile, input, setInput, sending, handlePost, handleDelete, bottomRef, onViewProfile, MAX, t }) {
  return (
    <>
      {/* Chat feed */}
      <div style={{
        background:"rgba(3,7,18,0.6)", border:`1px solid rgba(241,245,249,0.06)`,
        borderTop:`2px solid ${G}`,
        borderRadius:14, padding:"14px 14px 10px", marginBottom:10,
        minHeight:300, maxHeight:460, overflowY:"auto",
        backdropFilter:"blur(4px)",
      }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:14, paddingBottom:10, borderBottom:"1px solid rgba(241,245,249,0.04)" }}>
          <div style={{ width:6, height:6, borderRadius:"50%", background:G, animation:"cpulse 2s ease-in-out infinite" }} />
          <span style={{ fontFamily:MONO, fontSize:10, fontWeight:700, color:G, letterSpacing:3 }}>LIVE CHAT</span>
          <span style={{ fontFamily:MONO, fontSize:10, color:"rgba(241,245,249,0.2)", marginLeft:"auto", letterSpacing:1 }}>
            {posts.length} MSG
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign:"center", padding:40, fontFamily:MONO, color:"rgba(241,245,249,0.15)", letterSpacing:3, fontSize:11 }}>
            CHARGEMENT···
          </div>
        ) : posts.length === 0 ? (
          <EmptyState icon="◎" label={t("community.empty_chat")} />
        ) : (
          posts.map((post, i) => {
            const isSelf = post.user_id === session?.user?.id;
            return (
              <div key={post.id}
                className="c-msg-enter"
                style={{ display:"flex", gap:10, marginBottom:12, alignItems:"flex-start", animationDelay:`${Math.min(i, 8) * 0.03}s` }}>
                <Avatar username={post.username} size={30} radius={8} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                    <span style={{ fontSize:13, lineHeight:1 }}>{getDivision(postCoins[post.user_id]||0).icon}</span>
                    <span
                      onClick={() => onViewProfile?.(post.username)}
                      style={{ fontFamily:MONO, fontWeight:800, fontSize:12, letterSpacing:1,
                               color:isSelf ? G : "rgba(241,245,249,0.8)",
                               cursor:"pointer", textDecoration:"underline",
                               textDecorationColor:"rgba(241,245,249,0.15)",
                               textDecorationStyle:"dotted" }}>
                      {post.username.toUpperCase()}
                    </span>
                    <span style={{ fontFamily:MONO, fontSize:9, color:"rgba(241,245,249,0.2)", letterSpacing:1 }}>
                      {timeAgo(post.created_at)}
                    </span>
                    {isSelf && (
                      <button onClick={() => handleDelete(post.id)}
                        style={{ marginLeft:"auto", padding:"1px 6px", borderRadius:5, border:"none",
                                 background:"transparent", color:"rgba(241,245,249,0.15)",
                                 cursor:"pointer", fontSize:10, transition:"color 0.2s" }}
                        onMouseEnter={e => e.currentTarget.style.color="rgba(239,68,68,0.5)"}
                        onMouseLeave={e => e.currentTarget.style.color="rgba(241,245,249,0.15)"}>
                        ✕
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize:13, color:"rgba(241,245,249,0.72)", lineHeight:1.55, wordBreak:"break-word",
                                background:isSelf ? GA+"0.04)" : "transparent",
                                padding:isSelf ? "6px 10px" : 0,
                                borderRadius:isSelf ? "4px 10px 10px 10px" : 0,
                                border:isSelf ? `1px solid ${GA}0.08)` : "none" }}>
                    {post.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {session ? (
        <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
          <div style={{ flex:1 }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value.slice(0, MAX))}
              onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); handlePost(); }}}
              placeholder={t("community.chat_placeholder")}
              rows={2}
              style={{
                width:"100%", padding:"11px 14px",
                background:"rgba(241,245,249,0.03)",
                border:"1px solid rgba(241,245,249,0.08)",
                borderRadius:12, color:LIGHT, fontSize:13, outline:"none",
                resize:"none", fontFamily:"'DM Sans',sans-serif",
                boxSizing:"border-box", lineHeight:1.55,
                transition:"border-color 0.2s",
              }}
              onFocus={e => e.currentTarget.style.borderColor = GA+"0.35)"}
              onBlur={e  => e.currentTarget.style.borderColor = "rgba(241,245,249,0.08)"}
            />
            <div style={{ fontFamily:MONO, fontSize:9, color:"rgba(241,245,249,0.15)", textAlign:"right", marginTop:3, letterSpacing:1 }}>
              {input.length}/{MAX}
            </div>
          </div>
          <button onClick={handlePost}
            disabled={!input.trim() || sending}
            className="c-send-btn"
            style={{
              padding:"10px 18px", borderRadius:12, border:"none",
              background:input.trim()&&!sending ? `linear-gradient(135deg,${G},#059669)` : "rgba(241,245,249,0.05)",
              color:input.trim()&&!sending ? "#fff" : "rgba(241,245,249,0.15)",
              fontFamily:MONO, fontWeight:900, fontSize:18,
              cursor:input.trim()&&!sending ? "pointer" : "not-allowed",
              marginBottom:22, transition:"all 0.2s",
            }}>
            {sending ? "·" : "→"}
          </button>
        </div>
      ) : (
        <div style={{
          textAlign:"center", padding:"14px 18px",
          background:"rgba(241,245,249,0.02)",
          border:"1px solid rgba(241,245,249,0.06)",
          borderRadius:12, fontFamily:MONO, fontSize:11,
          color:"rgba(241,245,249,0.25)", letterSpacing:1,
        }}>
          {t("community.login_to_chat")}
        </div>
      )}
    </>
  );
}

// ─── Friends tab ──────────────────────────────────────────────────────────────
function FriendsTab({ profile, session, showToast, onViewProfile }) {
  const { t } = useLang();
  const [subtab, setSubtab]       = useState("friends");
  const [friends, setFriends]     = useState([]);
  const [pending, setPending]     = useState([]);
  const [search, setSearch]       = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [sent, setSent]           = useState([]);

  const userId = profile?.id;
  const token  = session?.token;

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    const [accepted, pendingIn, pendingOut] = await Promise.all([
      req(`friendships?or=(requester_id.eq.${userId},recipient_id.eq.${userId})&status=eq.accepted&select=*`, { _token:token }).catch(()=>[]),
      req(`friendships?recipient_id=eq.${userId}&status=eq.pending&select=*`,   { _token:token }).catch(()=>[]),
      req(`friendships?requester_id=eq.${userId}&status=eq.pending&select=*`,   { _token:token }).catch(()=>[]),
    ]);
    const friendIds    = (accepted||[]).map(f => f.requester_id===userId ? f.recipient_id : f.requester_id);
    const requesterIds = (pendingIn||[]).map(f => f.requester_id);
    const [fp, rp] = await Promise.all([
      friendIds.length    ? req(`profiles?id=in.(${friendIds.join(",")})&select=id,username,coins,total_bets,total_wins`) : Promise.resolve([]),
      requesterIds.length ? req(`profiles?id=in.(${requesterIds.join(",")})&select=id,username,coins`)                   : Promise.resolve([]),
    ]);
    setFriends((fp||[]).map(p => ({ ...p, friendship:accepted.find(f => f.requester_id===p.id||f.recipient_id===p.id) })));
    setPending((pendingIn||[]).map(f => ({ ...f, profile:rp?.find(p => p.id===f.requester_id) })));
    setSent(pendingOut||[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId]);

  const searchUsers = async () => {
    if (!search.trim()) return;
    setSearching(true);
    const results = await req(`profiles?username=ilike.*${encodeURIComponent(search.trim())}*&select=id,username,coins&limit=10`).catch(()=>[]);
    setSearchResults((results||[]).filter(r => r.id !== userId));
    setSearching(false);
  };

  const sendRequest = async (recipientId) => {
    await req("friendships", { method:"POST", body:JSON.stringify({ requester_id:userId, recipient_id:recipientId, status:"pending" }), _token:token });
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

  if (!userId) return (
    <div style={{ textAlign:"center", padding:40, fontFamily:MONO, color:"rgba(241,245,249,0.2)", letterSpacing:2, fontSize:11 }}>
      {t("friends.login")}
    </div>
  );

  const SUBTABS = [
    { id:"friends",  label:`${t("friends.tab_friends")} (${friends.length})` },
    { id:"requests", label:`${t("friends.tab_requests")}${pending.length ? ` (${pending.length})` : ""}` },
    { id:"search",   label:t("friends.tab_search") },
  ];

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display:"flex", gap:6, marginBottom:16 }}>
        {SUBTABS.map(st => (
          <button key={st.id} onClick={() => setSubtab(st.id)}
            style={{
              flex:1, padding:"8px 4px", borderRadius:10,
              border:`1px solid ${subtab===st.id ? G : "rgba(241,245,249,0.07)"}`,
              background:subtab===st.id ? GA+"0.08)" : "transparent",
              color:subtab===st.id ? G : "rgba(241,245,249,0.3)",
              fontFamily:MONO, fontWeight:800, fontSize:10, letterSpacing:1.5,
              cursor:"pointer", transition:"all 0.2s",
            }}>
            {st.label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Friends list */}
      {subtab === "friends" && (loading
        ? <div style={{ textAlign:"center", padding:30, fontFamily:MONO, color:"rgba(241,245,249,0.2)", letterSpacing:2, fontSize:11 }}>{t("friends.loading")}</div>
        : friends.length === 0
          ? <EmptyState icon="◈" label={t("friends.no_friends")} />
          : friends.map(f => (
              <div key={f.id}
                className="c-friend-card"
                style={{
                  display:"flex", alignItems:"center", gap:12,
                  background:"rgba(241,245,249,0.02)",
                  border:"1px solid rgba(241,245,249,0.06)",
                  borderRadius:13, padding:"13px 15px", marginBottom:8,
                  transition:"border-color 0.2s, background 0.2s",
                }}>
                <Avatar username={f.username} size={36} radius={10} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:14 }}>{getDivision(f.coins||0).icon}</span>
                    <span onClick={() => onViewProfile?.(f.username)}
                      style={{ fontFamily:MONO, fontWeight:800, fontSize:13, letterSpacing:1,
                               cursor:"pointer", textDecoration:"underline",
                               textDecorationStyle:"dotted", textDecorationColor:"rgba(241,245,249,0.2)" }}>
                      {f.username.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontFamily:MONO, fontSize:10, color:"rgba(241,245,249,0.25)", marginTop:3, letterSpacing:1 }}>
                    {getDivision(f.coins||0).name} · {f.total_wins||0}W / {f.total_bets||0} PARIS
                  </div>
                </div>
                <button onClick={() => removeFriend(f.friendship?.id)}
                  style={{
                    padding:"5px 11px", borderRadius:8,
                    border:"1px solid rgba(239,68,68,0.2)",
                    background:"transparent", color:"rgba(239,68,68,0.45)",
                    fontFamily:MONO, fontSize:10, cursor:"pointer", fontWeight:800,
                    letterSpacing:1, transition:"border-color 0.2s, color 0.2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(239,68,68,0.5)"; e.currentTarget.style.color="rgba(239,68,68,0.8)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(239,68,68,0.2)"; e.currentTarget.style.color="rgba(239,68,68,0.45)"; }}>
                  {t("friends.remove")}
                </button>
              </div>
            ))
      )}

      {/* Requests */}
      {subtab === "requests" && (pending.length === 0
        ? <EmptyState icon="◎" label={t("friends.no_requests")} />
        : pending.map(f => (
            <div key={f.id} style={{
              background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)",
              borderRadius:13, padding:"14px 15px", marginBottom:8,
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                <Avatar username={f.profile?.username||"?"} size={36} radius={10} />
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:14 }}>{getDivision(f.profile?.coins||0).icon}</span>
                    <span style={{ fontFamily:MONO, fontWeight:800, fontSize:13, letterSpacing:1 }}>
                      {(f.profile?.username||"Joueur").toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontFamily:MONO, fontSize:10, color:"rgba(241,245,249,0.3)", marginTop:2, letterSpacing:1 }}>
                    {getDivision(f.profile?.coins||0).name} · {t("friends.wants_friend")}
                  </div>
                </div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => declineRequest(f.id)}
                  style={{ flex:1, padding:"9px 0", borderRadius:9, border:"1px solid rgba(239,68,68,0.2)", background:"transparent", color:"rgba(239,68,68,0.5)", fontFamily:MONO, fontSize:11, cursor:"pointer", fontWeight:800, letterSpacing:1 }}>
                  {t("friends.decline").toUpperCase()}
                </button>
                <button onClick={() => acceptRequest(f.id)}
                  style={{ flex:2, padding:"9px 0", borderRadius:9, border:"none", background:`linear-gradient(135deg,${G},#059669)`, color:"#fff", fontFamily:MONO, fontSize:12, cursor:"pointer", fontWeight:900, letterSpacing:1 }}>
                  {t("friends.accept").toUpperCase()}
                </button>
              </div>
            </div>
          ))
      )}

      {/* Search */}
      {subtab === "search" && (
        <div>
          <div style={{ display:"flex", gap:8, marginBottom:16 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key==="Enter" && searchUsers()}
              placeholder={t("friends.search_ph")}
              style={{ flex:1, padding:"11px 15px", background:"rgba(241,245,249,0.03)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:11, color:LIGHT, fontSize:13, outline:"none", fontFamily:"'DM Sans',sans-serif", transition:"border-color 0.2s" }}
              onFocus={e => e.currentTarget.style.borderColor = GA+"0.35)"}
              onBlur={e  => e.currentTarget.style.borderColor = "rgba(241,245,249,0.08)"} />
            <button onClick={searchUsers} disabled={searching}
              style={{ padding:"11px 18px", borderRadius:11, border:"none", background:`linear-gradient(135deg,${G},#059669)`, color:"#fff", fontFamily:MONO, fontWeight:900, fontSize:12, cursor:"pointer", letterSpacing:2 }}>
              {searching ? "···" : "GO"}
            </button>
          </div>
          {searchResults.map(r => (
            <div key={r.id}
              className="c-friend-card"
              style={{
                display:"flex", alignItems:"center", gap:12,
                background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)",
                borderRadius:13, padding:"13px 15px", marginBottom:8,
                transition:"border-color 0.2s, background 0.2s",
              }}>
              <Avatar username={r.username} size={36} radius={10} />
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:14 }}>{getDivision(r.coins||0).icon}</span>
                  <span onClick={() => onViewProfile?.(r.username)}
                    style={{ fontFamily:MONO, fontWeight:800, fontSize:13, letterSpacing:1, cursor:"pointer",
                             textDecoration:"underline", textDecorationStyle:"dotted", textDecorationColor:"rgba(241,245,249,0.2)" }}>
                    {r.username.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontFamily:MONO, fontSize:10, color:"rgba(241,245,249,0.25)", marginTop:3, letterSpacing:1 }}>
                  {getDivision(r.coins||0).name}
                </div>
              </div>
              {friends.some(f => f.id===r.id)
                ? <span style={{ fontFamily:MONO, fontSize:10, color:G, fontWeight:700, letterSpacing:1 }}>{t("friends.is_friend")}</span>
                : sent.some(f  => f.recipient_id===r.id)
                  ? <span style={{ fontFamily:MONO, fontSize:10, color:"rgba(241,245,249,0.25)", letterSpacing:1 }}>{t("friends.sent")}</span>
                  : <button onClick={() => sendRequest(r.id)}
                      style={{ padding:"7px 14px", borderRadius:8, border:"none", background:`linear-gradient(135deg,${G},#059669)`, color:"#fff", fontFamily:MONO, fontSize:10, cursor:"pointer", fontWeight:900, letterSpacing:1 }}>
                      {t("friends.add").toUpperCase()}
                    </button>
              }
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Challenges tab ───────────────────────────────────────────────────────────
function ChallengesTab({ profile, session, showToast }) {
  const { t } = useLang();
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [subtab, setSubtab]         = useState("recus");

  const userId = profile?.id;
  const token  = session?.token;

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    const data = await req(
      `friend_challenges?or=(challenger_id.eq.${userId},challenged_id.eq.${userId})&order=created_at.desc&limit=50`,
      { _token:token }
    ).catch(() => []);
    setChallenges(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId]);

  const accept = async (c) => {
    if ((profile?.coins||0) < c.amount) { showToast("Pas assez de MC", "error"); return; }
    try {
      await req(`friend_challenges?id=eq.${c.id}`, { method:"PATCH", body:JSON.stringify({ status:"accepted" }), _token:token });
      await req(`profiles?id=eq.${userId}`,         { method:"PATCH", body:JSON.stringify({ coins:(profile?.coins||0)-c.amount }), _token:token });
      showToast("Défi accepté ! ⚔️");
      load();
    } catch(e) { showToast(e.message||"Erreur", "error"); }
  };

  const decline = async (c) => {
    try {
      const [p] = await req(`profiles?id=eq.${c.challenger_id}&select=coins`);
      await req(`profiles?id=eq.${c.challenger_id}`,  { method:"PATCH", body:JSON.stringify({ coins:(p?.coins||0)+c.amount }), _token:token });
      await req(`friend_challenges?id=eq.${c.id}`,    { method:"PATCH", body:JSON.stringify({ status:"declined" }), _token:token });
      showToast("Défi refusé");
      load();
    } catch(e) { showToast(e.message||"Erreur", "error"); }
  };

  const cancel = async (c) => {
    try {
      const [p] = await req(`profiles?id=eq.${userId}&select=coins`, { _token:token });
      await req(`profiles?id=eq.${userId}`,          { method:"PATCH", body:JSON.stringify({ coins:(p?.coins||0)+c.amount }), _token:token });
      await req(`friend_challenges?id=eq.${c.id}`,   { method:"PATCH", body:JSON.stringify({ status:"cancelled" }), _token:token });
      showToast("Défi annulé, MC remboursés");
      load();
    } catch(e) { showToast(e.message||"Erreur", "error"); }
  };

  if (!userId) return (
    <div style={{ textAlign:"center", padding:40, fontFamily:MONO, color:"rgba(241,245,249,0.2)", letterSpacing:2, fontSize:11 }}>
      {t("challenges.login")}
    </div>
  );

  const received   = challenges.filter(c => c.challenged_id===userId && c.status==="pending");
  const inProgress = challenges.filter(c => c.status==="accepted");
  const sentC      = challenges.filter(c => c.challenger_id===userId && c.status==="pending");
  const history    = challenges.filter(c => ["resolved","declined","cancelled"].includes(c.status));

  const SUBTABS = [
    { id:"recus",      label:`${t("challenges.tab_received")}${received.length?` (${received.length})`:""}` },
    { id:"encours",    label:`${t("challenges.tab_ongoing")}${inProgress.length?` (${inProgress.length})`:""}` },
    { id:"envoyes",    label:`${t("challenges.tab_sent")}${sentC.length?` (${sentC.length})`:""}` },
    { id:"historique", label:t("challenges.tab_history") },
  ];

  const STATUS_COLOR = { pending:"#f59e0b", accepted:"#3b82f6", resolved:"#10b981", declined:"#ef4444", cancelled:"#6b7280" };
  const STATUS_LABEL = {
    pending:   t("challenges.status_pending"),
    accepted:  t("challenges.status_accepted"),
    resolved:  t("challenges.status_resolved"),
    declined:  t("challenges.status_declined"),
    cancelled: t("challenges.status_cancelled"),
  };

  const ChallengeCard = ({ c, showActions }) => (
    <div className="c-challenge-card"
      style={{
        background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.07)",
        borderRadius:15, padding:"16px 16px 14px", marginBottom:12,
        transition:"border-color 0.2s", position:"relative", overflow:"hidden",
      }}>
      {/* Top stripe color */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${STATUS_COLOR[c.status]},transparent)` }} />

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
        <div style={{ flex:1, fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:13, lineHeight:1.4, color:LIGHT, marginRight:10 }}>
          {c.market_title}
        </div>
        <span style={{
          fontFamily:MONO, fontSize:9, fontWeight:800, letterSpacing:1.5,
          color:STATUS_COLOR[c.status], background:`${STATUS_COLOR[c.status]}18`,
          padding:"3px 9px", borderRadius:20, border:`1px solid ${STATUS_COLOR[c.status]}30`,
          flexShrink:0,
        }}>
          {STATUS_LABEL[c.status]?.toUpperCase()}
        </span>
      </div>

      {/* Duel grid */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:8, marginBottom:showActions?14:0 }}>
        {/* Challenger */}
        <div style={{ background:"rgba(245,158,11,0.06)", border:"1px solid rgba(245,158,11,0.15)", borderRadius:10, padding:"10px 10px", textAlign:"center" }}>
          <div style={{ fontFamily:MONO, fontSize:9, color:"rgba(241,245,249,0.3)", marginBottom:4, letterSpacing:1 }}>
            {c.challenger_username?.toUpperCase()}
          </div>
          <div style={{ fontFamily:MONO, fontSize:14, fontWeight:900, color:AM, letterSpacing:2 }}>
            {c.challenger_side?.toUpperCase()}
          </div>
        </div>

        {/* VS / Pot */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"0 4px" }}>
          <div style={{ fontFamily:MONO, fontSize:11, fontWeight:900, color:G, letterSpacing:1, textAlign:"center" }}>
            🪙 {c.amount * 2}
          </div>
          <div style={{ fontFamily:MONO, fontSize:8, color:"rgba(241,245,249,0.2)", letterSpacing:1 }}>POT</div>
        </div>

        {/* Challenged */}
        <div style={{ background:"rgba(59,130,246,0.06)", border:"1px solid rgba(59,130,246,0.15)", borderRadius:10, padding:"10px 10px", textAlign:"center" }}>
          <div style={{ fontFamily:MONO, fontSize:9, color:"rgba(241,245,249,0.3)", marginBottom:4, letterSpacing:1 }}>
            {c.challenged_username?.toUpperCase()}
          </div>
          <div style={{ fontFamily:MONO, fontSize:14, fontWeight:900, color:BL, letterSpacing:2 }}>
            {c.challenged_side?.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Actions */}
      {showActions === "accept" && (
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={() => decline(c)}
            style={{ flex:1, padding:"9px 0", borderRadius:9, border:"1px solid rgba(239,68,68,0.2)", background:"transparent", color:"rgba(239,68,68,0.55)", fontFamily:MONO, fontWeight:800, fontSize:11, cursor:"pointer", letterSpacing:1 }}>
            {t("challenges.decline_btn").toUpperCase()}
          </button>
          <button onClick={() => accept(c)}
            style={{ flex:2, padding:"9px 0", borderRadius:9, border:"none", background:`linear-gradient(135deg,${AM},#d97706)`, color:"#fff", fontFamily:MONO, fontWeight:900, fontSize:12, cursor:"pointer", letterSpacing:1 }}>
            {t("challenges.accept_btn").toUpperCase()} — {c.amount} MC
          </button>
        </div>
      )}
      {showActions === "cancel" && c.status==="pending" && (
        <button onClick={() => cancel(c)}
          style={{ width:"100%", padding:"8px 0", borderRadius:9, border:"1px solid rgba(241,245,249,0.08)", background:"transparent", color:"rgba(241,245,249,0.25)", fontFamily:MONO, fontWeight:700, fontSize:11, cursor:"pointer", letterSpacing:1 }}>
          {t("challenges.cancel_btn").toUpperCase()}
        </button>
      )}
    </div>
  );

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display:"flex", gap:6, marginBottom:16 }}>
        {SUBTABS.map(st => (
          <button key={st.id} onClick={() => setSubtab(st.id)}
            style={{
              flex:1, padding:"7px 3px", borderRadius:10,
              border:`1px solid ${subtab===st.id ? AM : "rgba(241,245,249,0.07)"}`,
              background:subtab===st.id ? "rgba(245,158,11,0.08)" : "transparent",
              color:subtab===st.id ? AM : "rgba(241,245,249,0.3)",
              fontFamily:MONO, fontWeight:800, fontSize:9, cursor:"pointer", letterSpacing:1,
            }}>
            {st.label.toUpperCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:30, fontFamily:MONO, color:"rgba(241,245,249,0.2)", letterSpacing:2, fontSize:11 }}>
          {t("challenges.loading")}
        </div>
      ) : (
        <>
          {subtab==="recus"      && (received.length===0    ? <EmptyState icon="⚔" label={t("challenges.no_received")} /> : received.map(c    => <ChallengeCard key={c.id} c={c} showActions="accept" />))}
          {subtab==="encours"    && (inProgress.length===0  ? <EmptyState icon="⚔" label={t("challenges.no_ongoing")} /> : inProgress.map(c  => <ChallengeCard key={c.id} c={c} showActions={null} />))}
          {subtab==="envoyes"    && (sentC.length===0        ? <EmptyState icon="📤" label={t("challenges.no_sent")} />    : sentC.map(c       => <ChallengeCard key={c.id} c={c} showActions="cancel" />))}
          {subtab==="historique" && (history.length===0      ? <EmptyState icon="◎" label={t("challenges.no_history")} /> : history.map(c => (
            <div key={c.id}>
              {c.status==="resolved" && (
                <div style={{ textAlign:"center", fontFamily:MONO, fontSize:11, fontWeight:800, letterSpacing:2,
                              color:c.winner_id===userId ? G : "#ef4444", marginBottom:4 }}>
                  {c.winner_id===userId ? `VICTOIRE +${c.amount} MC` : `DÉFAITE -${c.amount} MC`}
                </div>
              )}
              <ChallengeCard c={c} showActions={null} />
            </div>
          )))}
        </>
      )}
    </div>
  );
}
