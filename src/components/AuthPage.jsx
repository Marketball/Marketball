import { useState } from "react";
import { authReq } from "../lib/supabase.js";
import { GLOBAL_CSS, POPULAR_CLUBS } from "../lib/constants.js";

export default function AuthPage({ onAuth, onClose, modal }) {
  const [mode,setMode]=useState("login");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [username,setUsername]=useState("");
  const [favoriteClub,setFavoriteClub]=useState("");
  const [clubSearch,setClubSearch]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  const filteredClubs=clubSearch.trim()
    ? POPULAR_CLUBS.filter(c=>c.name.toLowerCase().includes(clubSearch.toLowerCase()))
    : POPULAR_CLUBS;

  const submit=async()=>{
    setError("");setLoading(true);
    try{
      if(mode==="signup"){
        if(!username.trim()){setError("Pseudo requis");setLoading(false);return;}
        if(password.length<6){setError("Mot de passe trop court (6 car. min)");setLoading(false);return;}
        const d=await authReq("signup",{email,password,data:{username,favorite_club:favoriteClub||null}});
        if(d.user){
          const ld=await authReq("token?grant_type=password",{email,password});
          onAuth(ld.access_token,ld.user);
        }
      }else{
        const d=await authReq("token?grant_type=password",{email,password});
        onAuth(d.access_token,d.user);
      }
    }catch(e){setError(e.message);}
    setLoading(false);
  };

  const inputStyle={ width:"100%", padding:"12px 14px", background:"rgba(241,245,249,0.04)", border:"1px solid rgba(241,245,249,0.08)", borderRadius:11, color:"#f1f5f9", fontSize:14, outline:"none", boxSizing:"border-box" };
  const labelStyle={ fontSize:11, fontWeight:700, color:"rgba(241,245,249,0.4)", display:"block", marginBottom:7 };

  if(modal) return <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(3,7,18,0.92)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={e=>e.target===e.currentTarget&&onClose?.()}>
    <div style={{ width:"100%", maxWidth:430, position:"relative", zIndex:1, animation:"fadeInUp 0.3s ease" }}>
      <button onClick={onClose} style={{ position:"absolute", top:-12, right:-12, width:32, height:32, borderRadius:"50%", border:"1px solid rgba(241,245,249,0.1)", background:"rgba(241,245,249,0.05)", color:"rgba(241,245,249,0.5)", fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", zIndex:2 }}>✕</button>
      <div style={{ background:"rgba(10,14,28,0.98)", border:"1px solid rgba(241,245,249,0.1)", borderRadius:22, padding:"28px 24px", boxShadow:"0 40px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:32, letterSpacing:4 }}>MARKET<span style={{ color:"#10b981" }}>BALL</span></div>
          <div style={{ fontSize:12, color:"rgba(241,245,249,0.35)", marginTop:4 }}>Parie sur les transferts et matchs — 100% gratuit</div>
        </div>
        <div style={{ display:"flex", background:"rgba(241,245,249,0.03)", borderRadius:13, padding:4, marginBottom:20 }}>
          {["login","signup"].map(m=>(
            <button key={m} onClick={()=>{setMode(m);setError("");setFavoriteClub("");setClubSearch("");}}
              style={{ flex:1, padding:"10px 0", borderRadius:10, border:"none", background:mode===m?"rgba(16,185,129,0.15)":"transparent", color:mode===m?"#10b981":"rgba(241,245,249,0.35)", fontWeight:700, fontSize:13, cursor:"pointer", transition:"all 0.2s" }}>
              {m==="login"?"Connexion":"Inscription"}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {mode==="signup"&&<div><label style={labelStyle}>PSEUDO</label><input value={username} onChange={e=>setUsername(e.target.value)} placeholder="MonPseudo" style={inputStyle} /></div>}
          <div><label style={labelStyle}>EMAIL</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com" style={inputStyle} /></div>
          <div><label style={labelStyle}>MOT DE PASSE</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&submit()} style={inputStyle} /></div>
        </div>
        {error&&<div style={{ marginTop:14, padding:"11px 14px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.15)", borderRadius:10, color:"#f87171", fontSize:13 }}>⚠️ {error}</div>}
        <button onClick={submit} disabled={loading} style={{ width:"100%", marginTop:20, padding:"13px 0", borderRadius:12, border:"none", background:loading?"rgba(241,245,249,0.04)":"linear-gradient(135deg,#10b981,#059669)", color:loading?"rgba(241,245,249,0.2)":"#fff", fontWeight:800, fontSize:15, cursor:loading?"not-allowed":"pointer", transition:"all 0.2s", boxShadow:loading?"none":"0 8px 25px rgba(16,185,129,0.3)" }}>
          {loading?"...":mode==="login"?"SE CONNECTER":"CRÉER MON COMPTE →"}
        </button>
        <div style={{ marginTop:14, textAlign:"center", fontSize:12, color:"rgba(241,245,249,0.3)" }}>Démarre avec <span style={{ color:"#fbbf24", fontWeight:700 }}>500 🪙 MC</span> gratuits !</div>
      </div>
    </div>
  </div>;

  return <div style={{ minHeight:"100vh", background:"#030712", display:"flex", alignItems:"center", justifyContent:"center", padding:20, position:"relative", overflow:"hidden" }}>
    <style>{GLOBAL_CSS}</style>
    <div style={{ position:"fixed", top:"15%", left:"20%", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle,rgba(16,185,129,0.05),transparent 70%)", animation:"floatOrb 8s ease-in-out infinite", pointerEvents:"none" }} />
    <div style={{ position:"fixed", bottom:"10%", right:"15%", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(59,130,246,0.04),transparent 70%)", animation:"floatOrb 11s ease-in-out infinite reverse", pointerEvents:"none" }} />

    <div style={{ width:"100%", maxWidth:430, position:"relative", zIndex:1, animation:"fadeInUp 0.4s ease" }}>
      {/* Logo */}
      <div style={{ textAlign:"center", marginBottom:32 }}>
        <img src="/favicon.png" alt="MB" style={{ width:64, height:64, borderRadius:20, objectFit:"cover", margin:"0 auto 14px", display:"block", boxShadow:"0 20px 50px rgba(16,185,129,0.25)" }} />
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:42, letterSpacing:4, color:"#f1f5f9" }}>MARKET<span style={{ color:"#10b981" }}>BALL</span></div>
        <div style={{ fontSize:13, color:"rgba(241,245,249,0.35)", marginTop:5 }}>Prédictions football — 100% gratuit</div>
      </div>

      <div style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.07)", borderRadius:22, padding:"28px 24px", backdropFilter:"blur(20px)", boxShadow:"0 40px 80px rgba(0,0,0,0.4)" }}>
        {/* Tabs */}
        <div style={{ display:"flex", background:"rgba(241,245,249,0.03)", borderRadius:13, padding:4, marginBottom:24 }}>
          {["login","signup"].map(m=>(
            <button key={m} onClick={()=>{setMode(m);setError("");setFavoriteClub("");setClubSearch("");}}
              style={{ flex:1, padding:"10px 0", borderRadius:10, border:"none", background:mode===m?"rgba(16,185,129,0.15)":"transparent", color:mode===m?"#10b981":"rgba(241,245,249,0.35)", fontWeight:700, fontSize:13, cursor:"pointer", transition:"all 0.2s" }}>
              {m==="login"?"Connexion":"Inscription"}
            </button>
          ))}
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {/* Pseudo (inscription seulement) */}
          {mode==="signup"&&(
            <div>
              <label style={labelStyle}>PSEUDO</label>
              <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="MonPseudo" style={inputStyle} />
            </div>
          )}

          {/* Email */}
          <div>
            <label style={labelStyle}>EMAIL</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com" style={inputStyle} />
          </div>

          {/* Mot de passe */}
          <div>
            <label style={labelStyle}>MOT DE PASSE</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&!favoriteClub&&submit()} style={inputStyle} />
          </div>

          {/* Club favori (inscription seulement) */}
          {mode==="signup"&&(
            <div>
              <label style={labelStyle}>TON CLUB FAVORI <span style={{ color:"rgba(241,245,249,0.25)", fontWeight:400 }}>(optionnel)</span></label>

              {/* Recherche */}
              <input
                value={clubSearch}
                onChange={e=>setClubSearch(e.target.value)}
                placeholder="🔍  Chercher un club..."
                style={{ ...inputStyle, marginBottom:10, fontSize:13 }}
              />

              {/* Club sélectionné */}
              {favoriteClub&&(
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, padding:"8px 12px", background:"rgba(16,185,129,0.08)", border:"1px solid rgba(16,185,129,0.25)", borderRadius:10 }}>
                  <span style={{ fontSize:18 }}>⚽</span>
                  <span style={{ fontWeight:700, fontSize:13, color:"#10b981", flex:1 }}>{favoriteClub}</span>
                  <button onClick={()=>setFavoriteClub("")} style={{ border:"none", background:"transparent", color:"rgba(241,245,249,0.3)", cursor:"pointer", fontSize:16, padding:0 }}>✕</button>
                </div>
              )}

              {/* Grille de clubs */}
              <div style={{ maxHeight:180, overflowY:"auto", display:"grid", gridTemplateColumns:"1fr 1fr", gap:5 }}>
                {filteredClubs.map(c=>(
                  <button key={c.name} onClick={()=>{setFavoriteClub(c.name);setClubSearch("");}}
                    style={{ padding:"7px 10px", borderRadius:9, border:`1px solid ${favoriteClub===c.name?"rgba(16,185,129,0.4)":"rgba(241,245,249,0.07)"}`, background:favoriteClub===c.name?"rgba(16,185,129,0.1)":"rgba(241,245,249,0.02)", color:favoriteClub===c.name?"#10b981":"rgba(241,245,249,0.55)", fontSize:11, fontWeight:600, cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:6, transition:"all 0.15s" }}>
                    <span style={{ fontSize:13 }}>{c.flag}</span>
                    <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.name}</span>
                  </button>
                ))}
                {filteredClubs.length===0&&<div style={{ gridColumn:"1/-1", textAlign:"center", padding:"16px 0", color:"rgba(241,245,249,0.25)", fontSize:12 }}>Aucun club trouvé</div>}
              </div>
            </div>
          )}
        </div>

        {/* Erreur */}
        {error&&<div style={{ marginTop:14, padding:"11px 14px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.15)", borderRadius:10, color:"#f87171", fontSize:13 }}>⚠️ {error}</div>}

        {/* Bouton */}
        <button onClick={submit} disabled={loading}
          style={{ width:"100%", marginTop:20, padding:"13px 0", borderRadius:12, border:"none", background:loading?"rgba(241,245,249,0.04)":"linear-gradient(135deg,#10b981,#059669)", color:loading?"rgba(241,245,249,0.2)":"#fff", fontWeight:800, fontSize:15, cursor:loading?"not-allowed":"pointer", transition:"all 0.2s", boxShadow:loading?"none":"0 8px 25px rgba(16,185,129,0.3)" }}>
          {loading?"...":mode==="login"?"SE CONNECTER":"CRÉER MON COMPTE →"}
        </button>
      </div>

      <div style={{ marginTop:16, textAlign:"center", fontSize:13, color:"rgba(241,245,249,0.3)" }}>
        Démarre avec <span style={{ color:"#fbbf24", fontWeight:700 }}>500 🪙 MC</span> gratuits !
      </div>
    </div>
  </div>;
}
