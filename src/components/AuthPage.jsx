import { useState } from "react";
import { authReq } from "../lib/supabase.js";
import { GLOBAL_CSS } from "../lib/constants.js";

export default function AuthPage({ onAuth }) {
  const [mode,setMode]=useState("login"),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[username,setUsername]=useState(""),[loading,setLoading]=useState(false),[error,setError]=useState("");
  const submit=async()=>{
    setError("");setLoading(true);
    try{
      if(mode==="signup"){
        if(!username.trim()){setError("Pseudo requis");setLoading(false);return;}
        if(password.length<6){setError("Mot de passe trop court");setLoading(false);return;}
        const d=await authReq("signup",{email,password,data:{username}});
        if(d.user){const ld=await authReq("token?grant_type=password",{email,password});onAuth(ld.access_token,ld.user);}
      }else{const d=await authReq("token?grant_type=password",{email,password});onAuth(d.access_token,d.user);}
    }catch(e){setError(e.message);}
    setLoading(false);
  };
  return <div style={{ minHeight:"100vh", background:"#030712", display:"flex", alignItems:"center", justifyContent:"center", padding:20, position:"relative", overflow:"hidden" }}>
    <style>{GLOBAL_CSS}</style>
    <div style={{ position:"fixed", top:"15%", left:"20%", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle,rgba(16,185,129,0.05),transparent 70%)", animation:"floatOrb 8s ease-in-out infinite", pointerEvents:"none" }} />
    <div style={{ position:"fixed", bottom:"10%", right:"15%", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(59,130,246,0.04),transparent 70%)", animation:"floatOrb 11s ease-in-out infinite reverse", pointerEvents:"none" }} />
    <div style={{ width:"100%", maxWidth:430, position:"relative", zIndex:1, animation:"fadeInUp 0.4s ease" }}>
      <div style={{ textAlign:"center", marginBottom:38 }}>
        <div style={{ width:68, height:68, background:"linear-gradient(135deg,#10b981,#3b82f6)", borderRadius:20, display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, margin:"0 auto 16px", boxShadow:"0 20px 50px rgba(16,185,129,0.25)" }}>⚽</div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:44, letterSpacing:4, color:"#f1f5f9" }}>MARKET<span style={{ color:"#10b981" }}>BALL</span></div>
        <div style={{ fontSize:13, color:"rgba(241,245,249,0.35)", marginTop:6 }}>Predictions football — 100% gratuit</div>
      </div>
      <div style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.07)", borderRadius:22, padding:"30px 26px", backdropFilter:"blur(20px)", boxShadow:"0 40px 80px rgba(0,0,0,0.4)" }}>
        <div style={{ display:"flex", background:"rgba(241,245,249,0.03)", borderRadius:13, padding:4, marginBottom:26 }}>
          {["login","signup"].map(m=><button key={m} onClick={()=>{setMode(m);setError("");}} style={{ flex:1, padding:"10px 0", borderRadius:10, border:"none", background:mode===m?"rgba(16,185,129,0.15)":"transparent", color:mode===m?"#10b981":"rgba(241,245,249,0.35)", fontWeight:700, fontSize:13, cursor:"pointer", transition:"all 0.2s" }}>{m==="login"?"Connexion":"Inscription"}</button>)}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {mode==="signup"&&<div><label style={{ fontSize:11, fontWeight:700, color:"rgba(241,245,249,0.4)", display:"block", marginBottom:7 }}>PSEUDO</label><input value={username} onChange={e=>setUsername(e.target.value)} placeholder="MonPseudo" style={{ width:"100%", padding:"12px 14px", background:"rgba(241,245,249,0.04)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:11, color:"#f1f5f9", fontSize:14, outline:"none", boxSizing:"border-box" }} /></div>}
          <div><label style={{ fontSize:11, fontWeight:700, color:"rgba(241,245,249,0.4)", display:"block", marginBottom:7 }}>EMAIL</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com" style={{ width:"100%", padding:"12px 14px", background:"rgba(241,245,249,0.04)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:11, color:"#f1f5f9", fontSize:14, outline:"none", boxSizing:"border-box" }} /></div>
          <div><label style={{ fontSize:11, fontWeight:700, color:"rgba(241,245,249,0.4)", display:"block", marginBottom:7 }}>MOT DE PASSE</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&submit()} style={{ width:"100%", padding:"12px 14px", background:"rgba(241,245,249,0.04)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:11, color:"#f1f5f9", fontSize:14, outline:"none", boxSizing:"border-box" }} /></div>
        </div>
        {error&&<div style={{ marginTop:14, padding:"11px 14px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.15)", borderRadius:10, color:"#f87171", fontSize:13 }}>⚠️ {error}</div>}
        <button onClick={submit} disabled={loading} style={{ width:"100%", marginTop:20, padding:"13px 0", borderRadius:12, border:"none", background:loading?"rgba(241,245,249,0.04)":"linear-gradient(135deg,#10b981,#059669)", color:loading?"rgba(241,245,249,0.2)":"#fff", fontWeight:800, fontSize:15, cursor:loading?"not-allowed":"pointer", transition:"all 0.2s", boxShadow:loading?"none":"0 8px 25px rgba(16,185,129,0.3)" }}>
          {loading?"...":mode==="login"?"SE CONNECTER":"CREER MON COMPTE"}
        </button>
      </div>
      <div style={{ marginTop:16, textAlign:"center", fontSize:13, color:"rgba(241,245,249,0.3)" }}>Demarrez avec <span style={{ color:"#fbbf24", fontWeight:700 }}>500 🪙 MC</span> gratuits !</div>
    </div>
  </div>;
}
