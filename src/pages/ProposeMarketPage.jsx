import { useState } from "react";
import { req } from "../lib/supabase.js";
import { catColor } from "../lib/helpers.js";

const cats = ["Transferts","Contrats","Competitions","Performances","Rumeurs"];

export default function ProposeMarketPage({ profile, session, showToast, onBack }) {
  const [title, setTitle] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [category, setCategory] = useState("Transferts");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const canSubmit = title.trim().length >= 10;

  const submit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await req("proposed_markets", {
        method: "POST", _token: session?.token,
        body: JSON.stringify({
          title: title.trim(), title_en: titleEn.trim() || null,
          category, proposed_by: profile?.username || "Elite",
          proposer_id: session?.user?.id,
          status: "pending", created_at: new Date().toISOString()
        })
      });
      showToast("✅ Proposition envoyée ! L'admin va l'examiner.");
      setSent(true);
    } catch (e) { showToast("Erreur : " + e.message, "error"); }
    setLoading(false);
  };

  return (
    <div className="page-enter" style={{ maxWidth: 520, margin: "0 auto", padding: "0 0 40px" }}>
      {/* Back */}
      <button onClick={onBack} style={{ display:"flex", alignItems:"center", gap:6, background:"transparent", border:"none", color:"rgba(241,245,249,0.45)", cursor:"pointer", padding:"0 0 18px", fontWeight:700, fontSize:13 }}>
        ← Retour aux marchés
      </button>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
        <div style={{ width:44, height:44, borderRadius:12, background:"rgba(245,158,11,0.15)", border:"1px solid rgba(245,158,11,0.25)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>👑</div>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:2 }}>PROPOSER UN MARCHÉ</div>
          <div style={{ fontSize:12, color:"rgba(241,245,249,0.35)" }}>Tu proposes, l'admin valide. Si accepté, tu gagnes <span style={{ color:"#fbbf24", fontWeight:700 }}>+2 SC</span> !</div>
        </div>
      </div>

      {sent ? (
        <div style={{ marginTop:40, textAlign:"center", padding:"40px 20px", background:"rgba(16,185,129,0.05)", border:"1px solid rgba(16,185,129,0.15)", borderRadius:18 }}>
          <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:2, color:"#10b981", marginBottom:8 }}>PROPOSITION ENVOYÉE</div>
          <div style={{ fontSize:13, color:"rgba(241,245,249,0.45)", marginBottom:24 }}>L'admin va examiner ta proposition. Si elle est acceptée, tu recevras +2 SC.</div>
          <button onClick={()=>{ setTitle(""); setTitleEn(""); setCategory("Transferts"); setSent(false); }} className="btn-animated"
            style={{ padding:"12px 28px", borderRadius:12, border:"1px solid rgba(245,158,11,0.3)", background:"transparent", color:"#f59e0b", fontWeight:700, fontSize:13, cursor:"pointer" }}>
            Proposer un autre marché
          </button>
        </div>
      ) : (
        <div style={{ marginTop:24, display:"flex", flexDirection:"column", gap:18 }}>
          {/* FR */}
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:"rgba(241,245,249,0.4)", marginBottom:8, letterSpacing:1 }}>🇫🇷 QUESTION EN FRANÇAIS</div>
            <textarea value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ex: Mbappé signera à Arsenal avant le 31 août ?" rows={3}
              style={{ width:"100%", padding:"12px 14px", background:"rgba(241,245,249,0.04)", border:`1px solid ${canSubmit?"rgba(245,158,11,0.3)":"rgba(241,245,249,0.08)"}`, borderRadius:12, color:"#f1f5f9", fontSize:14, outline:"none", resize:"none", boxSizing:"border-box", fontFamily:"'DM Sans',sans-serif", lineHeight:1.5 }} />
            <div style={{ fontSize:11, color:"rgba(241,245,249,0.25)", marginTop:4 }}>{title.length}/200 · minimum 10 caractères</div>
          </div>

          {/* EN */}
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:"rgba(241,245,249,0.4)", marginBottom:8, letterSpacing:1 }}>🇬🇧 QUESTION EN ANGLAIS <span style={{ fontWeight:400, opacity:0.6 }}>(optionnel)</span></div>
            <textarea value={titleEn} onChange={e=>setTitleEn(e.target.value)} placeholder="Ex: Will Mbappé sign for Arsenal before Aug 31?" rows={3}
              style={{ width:"100%", padding:"12px 14px", background:"rgba(241,245,249,0.04)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:12, color:"#f1f5f9", fontSize:14, outline:"none", resize:"none", boxSizing:"border-box", fontFamily:"'DM Sans',sans-serif", lineHeight:1.5 }} />
          </div>

          {/* Catégorie */}
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:"rgba(241,245,249,0.4)", marginBottom:10, letterSpacing:1 }}>CATÉGORIE</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {cats.map(c => (
                <button key={c} onClick={() => setCategory(c)}
                  style={{ padding:"8px 16px", borderRadius:20, border:`1px solid ${category===c?catColor(c):"rgba(241,245,249,0.07)"}`, background:category===c?`${catColor(c)}12`:"transparent", color:category===c?catColor(c):"rgba(241,245,249,0.35)", fontWeight:700, fontSize:12, cursor:"pointer", transition:"all 0.2s" }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button className="btn-animated" onClick={submit} disabled={!canSubmit || loading}
            style={{ padding:"15px 0", borderRadius:12, border:"none", background:canSubmit?"linear-gradient(135deg,#f59e0b,#d97706)":"rgba(241,245,249,0.04)", color:canSubmit?"#fff":"rgba(241,245,249,0.2)", fontWeight:800, fontSize:15, cursor:canSubmit?"pointer":"not-allowed", boxShadow:canSubmit?"0 8px 25px rgba(245,158,11,0.3)":"none", marginTop:4 }}>
            {loading ? "Envoi en cours..." : "SOUMETTRE MA PROPOSITION →"}
          </button>
        </div>
      )}
    </div>
  );
}
