import { useState, useEffect } from "react";
import { req } from "../../lib/supabase.js";

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m}min`;
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${d}j`;
}

export default function CommentsSection({ refId, refType = "market", session, profile }) {
  const [comments, setComments] = useState(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const MAX = 200;

  useEffect(() => {
    req(`comments?ref_id=eq.${encodeURIComponent(refId)}&ref_type=eq.${refType}&order=created_at.asc&limit=50`)
      .then(d => setComments(d || []))
      .catch(() => setComments([]));
  }, [refId]);

  const handlePost = async () => {
    if (!session || !input.trim() || sending) return;
    const content = input.trim().slice(0, MAX);
    setSending(true);
    try {
      const res = await req("comments", {
        method: "POST", _token: session.token,
        body: JSON.stringify({ ref_id: String(refId), ref_type: refType, user_id: session.user.id, username: profile?.username || "Anonyme", content }),
      });
      const nc = res?.[0] || { id: Date.now(), user_id: session.user.id, username: profile?.username || "Anonyme", content, created_at: new Date().toISOString() };
      setComments(p => [...p, nc]);
      setInput("");
    } catch {}
    setSending(false);
  };

  const handleDelete = async (id) => {
    if (!session) return;
    try {
      await req(`comments?id=eq.${id}`, { method: "DELETE", _token: session.token });
      setComments(p => p.filter(c => c.id !== id));
    } catch {}
  };

  if (comments === null) return <div style={{ textAlign:"center", padding:16, color:"rgba(241,245,249,0.25)", fontSize:12 }}>Chargement...</div>;

  return (
    <div>
      {comments.length === 0 ? (
        <div style={{ textAlign:"center", padding:"16px 0", color:"rgba(241,245,249,0.2)", fontSize:12 }}>Aucun commentaire — sois le premier !</div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:10, maxHeight:220, overflowY:"auto" }}>
          {comments.map(c => (
            <div key={c.id} style={{ background:"rgba(241,245,249,0.03)", border:"1px solid rgba(241,245,249,0.05)", borderRadius:10, padding:"8px 10px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                <span style={{ fontWeight:700, fontSize:11, color: c.user_id===session?.user?.id?"#10b981":"#f1f5f9" }}>{c.username}</span>
                <span style={{ fontSize:9, color:"rgba(241,245,249,0.2)" }}>{timeAgo(c.created_at)}</span>
                {c.user_id===session?.user?.id && (
                  <button onClick={() => handleDelete(c.id)} style={{ marginLeft:"auto", background:"none", border:"none", color:"rgba(241,245,249,0.2)", cursor:"pointer", fontSize:11, padding:0 }}>✕</button>
                )}
              </div>
              <div style={{ fontSize:12, color:"rgba(241,245,249,0.65)", lineHeight:1.5 }}>{c.content}</div>
            </div>
          ))}
        </div>
      )}
      {session ? (
        <div style={{ display:"flex", gap:6 }}>
          <input value={input} onChange={e => setInput(e.target.value.slice(0, MAX))}
            onKeyDown={e => { if(e.key==="Enter") { e.preventDefault(); handlePost(); }}}
            placeholder="Commenter..."
            style={{ flex:1, padding:"8px 12px", background:"rgba(241,245,249,0.04)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:10, color:"#f1f5f9", fontSize:13, outline:"none", fontFamily:"'DM Sans',sans-serif" }} />
          <button onClick={handlePost} disabled={!input.trim() || sending}
            style={{ padding:"8px 14px", borderRadius:10, border:"none", background:input.trim()&&!sending?"linear-gradient(135deg,#10b981,#059669)":"rgba(241,245,249,0.06)", color:input.trim()&&!sending?"#fff":"rgba(241,245,249,0.2)", fontWeight:800, fontSize:12, cursor:input.trim()&&!sending?"pointer":"not-allowed" }}>
            {sending?"...":"→"}
          </button>
        </div>
      ) : (
        <div style={{ textAlign:"center", fontSize:11, color:"rgba(241,245,249,0.3)", padding:"8px 0" }}>🔒 Connecte-toi pour commenter</div>
      )}
    </div>
  );
}
