import { useState } from "react";
import { catColor } from "../lib/helpers.js";

export default function ProposeMarketModal({ profile, onClose, onSubmit }) {
  const [title,setTitle]=useState("");
  const [category,setCategory]=useState("Transferts");
  const [loading,setLoading]=useState(false);
  const cats=["Transferts","Contrats","Competitions","Performances","Rumeurs"];
  const canSubmit=title.trim().length>=10;
  const submit=async()=>{
    if(!canSubmit) return;
    setLoading(true);
    await onSubmit({title:title.trim(),category,proposed_by:profile?.username||"Elite"});
    setLoading(false);
    onClose();
  };
  return <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(3,7,18,0.88)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(16px)",padding:16,animation:"fadeIn 0.2s ease" }}>
    <div onClick={e=>e.stopPropagation()} style={{ background:"rgba(241,245,249,0.03)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:22,padding:28,width:420,maxWidth:"95vw",boxShadow:"0 50px 100px rgba(0,0,0,0.6)",backdropFilter:"blur(20px)",animation:"fadeInUp 0.3s ease" }}>
      <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:6 }}>
        <div style={{ width:36,height:36,borderRadius:10,background:"rgba(245,158,11,0.15)",border:"1px solid rgba(245,158,11,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>👑</div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:2 }}>PROPOSER UN MARCHÉ</div>
      </div>
      <div style={{ fontSize:12,color:"rgba(241,245,249,0.35)",marginBottom:20 }}>Tu proposes, l'admin valide. Si accepté, tu gagnes +50 XP et 2 SC !</div>
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:11,fontWeight:700,color:"rgba(241,245,249,0.4)",marginBottom:8,letterSpacing:1 }}>QUESTION DE PRÉDICTION</div>
        <textarea value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ex: Mbappé signera à Arsenal avant le 31 août ?" rows={3}
          style={{ width:"100%",padding:"12px 14px",background:"rgba(241,245,249,0.04)",border:`1px solid ${canSubmit?"rgba(245,158,11,0.3)":"rgba(241,245,249,0.08)"}`,borderRadius:11,color:"#f1f5f9",fontSize:13,outline:"none",resize:"none",boxSizing:"border-box",fontFamily:"'DM Sans',sans-serif",lineHeight:1.5 }} />
        <div style={{ fontSize:11,color:"rgba(241,245,249,0.25)",marginTop:4 }}>{title.length}/200 · minimum 10 caractères</div>
      </div>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11,fontWeight:700,color:"rgba(241,245,249,0.4)",marginBottom:8,letterSpacing:1 }}>CATÉGORIE</div>
        <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
          {cats.map(c=><button key={c} onClick={()=>setCategory(c)} style={{ padding:"6px 12px",borderRadius:20,border:`1px solid ${category===c?catColor(c):"rgba(241,245,249,0.07)"}`,background:category===c?`${catColor(c)}12`:"transparent",color:category===c?catColor(c):"rgba(241,245,249,0.35)",fontWeight:700,fontSize:11,cursor:"pointer" }}>{c}</button>)}
        </div>
      </div>
      <button className="btn-animated" onClick={submit} disabled={!canSubmit||loading}
        style={{ width:"100%",padding:"13px 0",borderRadius:12,border:"none",background:canSubmit?"linear-gradient(135deg,#f59e0b,#d97706)":"rgba(241,245,249,0.04)",color:canSubmit?"#fff":"rgba(241,245,249,0.2)",fontWeight:800,fontSize:14,cursor:canSubmit?"pointer":"not-allowed",boxShadow:canSubmit?"0 8px 25px rgba(245,158,11,0.3)":"none" }}>
        {loading?"...":"SOUMETTRE MA PROPOSITION →"}
      </button>
    </div>
  </div>;
}
