import { useState } from "react";
import { authReq, SUPABASE_URL } from "../lib/supabase.js";
import { GLOBAL_CSS, POPULAR_CLUBS, ALL_CLUBS } from "../lib/constants.js";
import { useLang } from "../lib/i18n.jsx";

export default function AuthPage({ onAuth, onClose, modal }) {
  const [mode,setMode]=useState("login");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [username,setUsername]=useState("");
  const [favoriteClub,setFavoriteClub]=useState("");
  const [clubSearch,setClubSearch]=useState("");
  const [referralCode,setReferralCode]=useState("");
  const [phone,setPhone]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  const filteredClubs=clubSearch.trim()
    ? ALL_CLUBS.filter(c=>c.name.toLowerCase().includes(clubSearch.toLowerCase()))
    : POPULAR_CLUBS;
  const { t } = useLang();

  const loginWithGoogle=()=>{
    const redirectTo=encodeURIComponent(window.location.origin);
    window.location.href=`${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${redirectTo}`;
  };

  const submit=async()=>{
    setError("");setLoading(true);
    try{
      if(mode==="signup"){
        if(!username.trim()){setError(t("auth.err_pseudo"));setLoading(false);return;}
        if(password.length<6){setError(t("auth.err_password"));setLoading(false);return;}
        const cleanPhone=phone.trim().replace(/\s+/g,"").replace(/-/g,"");
        if(!cleanPhone||cleanPhone.length<8){setError("Numéro de téléphone invalide (min. 8 chiffres)");setLoading(false);return;}
        // Vérifier unicité du numéro
        try{
          const pr=await fetch("/api/check-phone",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone:cleanPhone})});
          const pd=await pr.json();
          if(pd.exists){setError("Ce numéro est déjà associé à un compte MarketBall");setLoading(false);return;}
        }catch{}
        const d=await authReq("signup",{email,password,data:{username,favorite_club:favoriteClub||null}});
        if(d.user){
          const ld=await authReq("token?grant_type=password",{email,password});
          onAuth(ld.access_token,ld.user,ld.refresh_token,referralCode.trim().toUpperCase()||null,cleanPhone);
        }
      }else{
        const d=await authReq("token?grant_type=password",{email,password});
        onAuth(d.access_token,d.user,d.refresh_token);
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
          <div style={{ fontSize:12, color:"rgba(241,245,249,0.35)", marginTop:4 }}>{t("auth.tagline")}</div>
        </div>
        <div style={{ display:"flex", background:"rgba(241,245,249,0.03)", borderRadius:13, padding:4, marginBottom:20 }}>
          {["login","signup"].map(m=>(
            <button key={m} onClick={()=>{setMode(m);setError("");setFavoriteClub("");setClubSearch("");}}
              style={{ flex:1, padding:"10px 0", borderRadius:10, border:"none", background:mode===m?"rgba(16,185,129,0.15)":"transparent", color:mode===m?"#10b981":"rgba(241,245,249,0.35)", fontWeight:700, fontSize:13, cursor:"pointer", transition:"all 0.2s" }}>
              {m==="login"?t("auth.tab_login"):t("auth.tab_signup")}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {mode==="signup"&&<div><label style={labelStyle}>{t("auth.label_pseudo")}</label><input value={username} onChange={e=>setUsername(e.target.value)} placeholder="MonPseudo" style={inputStyle} /></div>}
          <div><label style={labelStyle}>{t("auth.label_email")}</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com" style={inputStyle} /></div>
          <div><label style={labelStyle}>{t("auth.label_password")}</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&submit()} style={inputStyle} /></div>
          {mode==="signup"&&<div><label style={labelStyle}>📱 TÉLÉPHONE <span style={{ color:"rgba(239,68,68,0.7)", fontWeight:700 }}>*</span> <span style={{ color:"rgba(241,245,249,0.25)", fontWeight:400 }}>(1 compte par numéro)</span></label><input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+33 6 12 34 56 78" style={inputStyle} /></div>}
          {mode==="signup"&&<div><label style={labelStyle}>{t("auth.label_referral")} <span style={{ color:"rgba(241,245,249,0.25)", fontWeight:400 }}>{t("auth.label_referral_opt")}</span></label><input value={referralCode} onChange={e=>setReferralCode(e.target.value.toUpperCase())} placeholder="Ex: MARTIN-4X2B" style={{ ...inputStyle, letterSpacing:2, textTransform:"uppercase" }} /></div>}
        </div>
        {error&&<div style={{ marginTop:14, padding:"11px 14px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.15)", borderRadius:10, color:"#f87171", fontSize:13 }}>⚠️ {error}</div>}
        <button onClick={submit} disabled={loading} style={{ width:"100%", marginTop:20, padding:"13px 0", borderRadius:12, border:"none", background:loading?"rgba(241,245,249,0.04)":"linear-gradient(135deg,#10b981,#059669)", color:loading?"rgba(241,245,249,0.2)":"#fff", fontWeight:800, fontSize:15, cursor:loading?"not-allowed":"pointer", transition:"all 0.2s", boxShadow:loading?"none":"0 8px 25px rgba(16,185,129,0.3)" }}>
          {loading?"...":mode==="login"?t("auth.btn_login"):t("auth.btn_signup")}
        </button>
        <div style={{ display:"flex", alignItems:"center", gap:10, margin:"16px 0 4px" }}>
          <div style={{ flex:1, height:1, background:"rgba(241,245,249,0.07)" }} />
          <span style={{ fontSize:11, color:"rgba(241,245,249,0.25)", fontWeight:600 }}>{t("common.or").toUpperCase()}</span>
          <div style={{ flex:1, height:1, background:"rgba(241,245,249,0.07)" }} />
        </div>
        <button onClick={loginWithGoogle} style={{ width:"100%", padding:"12px 0", borderRadius:12, border:"1px solid rgba(241,245,249,0.1)", background:"rgba(241,245,249,0.03)", color:"#f1f5f9", fontWeight:700, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, transition:"all 0.2s" }}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          {t("auth.google_btn")}
        </button>
        <div style={{ marginTop:14, textAlign:"center", fontSize:12, color:"rgba(241,245,249,0.3)" }}>{t("auth.free_coins")} <span style={{ color:"#fbbf24", fontWeight:700 }}>3000 🪙 MC</span> {t("auth.free_coins2")}</div>
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
        <div style={{ fontSize:13, color:"rgba(241,245,249,0.35)", marginTop:5 }}>{t("auth.tagline2")}</div>
      </div>

      <div style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.07)", borderRadius:22, padding:"28px 24px", backdropFilter:"blur(20px)", boxShadow:"0 40px 80px rgba(0,0,0,0.4)" }}>
        {/* Tabs */}
        <div style={{ display:"flex", background:"rgba(241,245,249,0.03)", borderRadius:13, padding:4, marginBottom:24 }}>
          {["login","signup"].map(m=>(
            <button key={m} onClick={()=>{setMode(m);setError("");setFavoriteClub("");setClubSearch("");}}
              style={{ flex:1, padding:"10px 0", borderRadius:10, border:"none", background:mode===m?"rgba(16,185,129,0.15)":"transparent", color:mode===m?"#10b981":"rgba(241,245,249,0.35)", fontWeight:700, fontSize:13, cursor:"pointer", transition:"all 0.2s" }}>
              {m==="login"?t("auth.tab_login"):t("auth.tab_signup")}
            </button>
          ))}
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {/* Pseudo (inscription seulement) */}
          {mode==="signup"&&(
            <div>
              <label style={labelStyle}>{t("auth.label_pseudo")}</label>
              <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="MonPseudo" style={inputStyle} />
            </div>
          )}

          {/* Email */}
          <div>
            <label style={labelStyle}>{t("auth.label_email")}</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com" style={inputStyle} />
          </div>

          {/* Mot de passe */}
          <div>
            <label style={labelStyle}>{t("auth.label_password")}</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&!favoriteClub&&submit()} style={inputStyle} />
          </div>

          {/* Téléphone (inscription seulement) */}
          {mode==="signup"&&(
            <div>
              <label style={labelStyle}>📱 TÉLÉPHONE <span style={{ color:"rgba(239,68,68,0.7)", fontWeight:700 }}>*</span> <span style={{ color:"rgba(241,245,249,0.25)", fontWeight:400 }}>(1 compte par numéro)</span></label>
              <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+33 6 12 34 56 78" style={inputStyle} />
            </div>
          )}
          {/* Code parrain (inscription seulement) */}
          {mode==="signup"&&(
            <div>
              <label style={labelStyle}>{t("auth.label_referral")} <span style={{ color:"rgba(241,245,249,0.25)", fontWeight:400 }}>{t("auth.label_referral_opt")}</span></label>
              <input value={referralCode} onChange={e=>setReferralCode(e.target.value.toUpperCase())} placeholder="Ex: MARTIN-4X2B" style={{ ...inputStyle, letterSpacing:2, textTransform:"uppercase" }} />
            </div>
          )}
          {/* Club favori (inscription seulement) */}
          {mode==="signup"&&(
            <div>
              <label style={labelStyle}>{t("auth.label_club")} <span style={{ color:"rgba(241,245,249,0.25)", fontWeight:400 }}>{t("auth.label_referral_opt")}</span></label>

              {/* Recherche */}
              <input
                value={clubSearch}
                onChange={e=>setClubSearch(e.target.value)}
                placeholder={t("auth.club_search")}
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
                {filteredClubs.length===0&&<div style={{ gridColumn:"1/-1", textAlign:"center", padding:"16px 0", color:"rgba(241,245,249,0.25)", fontSize:12 }}>{t("auth.club_none")}</div>}
              </div>
            </div>
          )}
        </div>

        {/* Erreur */}
        {error&&<div style={{ marginTop:14, padding:"11px 14px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.15)", borderRadius:10, color:"#f87171", fontSize:13 }}>⚠️ {error}</div>}

        {/* Bouton email */}
        <button onClick={submit} disabled={loading}
          style={{ width:"100%", marginTop:20, padding:"13px 0", borderRadius:12, border:"none", background:loading?"rgba(241,245,249,0.04)":"linear-gradient(135deg,#10b981,#059669)", color:loading?"rgba(241,245,249,0.2)":"#fff", fontWeight:800, fontSize:15, cursor:loading?"not-allowed":"pointer", transition:"all 0.2s", boxShadow:loading?"none":"0 8px 25px rgba(16,185,129,0.3)" }}>
          {loading?"...":mode==="login"?t("auth.btn_login"):t("auth.btn_signup")}
        </button>

        {/* Séparateur */}
        <div style={{ display:"flex", alignItems:"center", gap:10, margin:"16px 0 4px" }}>
          <div style={{ flex:1, height:1, background:"rgba(241,245,249,0.07)" }} />
          <span style={{ fontSize:11, color:"rgba(241,245,249,0.25)", fontWeight:600 }}>{t("common.or").toUpperCase()}</span>
          <div style={{ flex:1, height:1, background:"rgba(241,245,249,0.07)" }} />
        </div>

        {/* Bouton Google */}
        <button onClick={loginWithGoogle} style={{ width:"100%", padding:"12px 0", borderRadius:12, border:"1px solid rgba(241,245,249,0.1)", background:"rgba(241,245,249,0.03)", color:"#f1f5f9", fontWeight:700, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, transition:"all 0.2s" }}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          {t("auth.google_btn")}
        </button>
      </div>

      <div style={{ marginTop:16, textAlign:"center", fontSize:13, color:"rgba(241,245,249,0.3)" }}>
        {t("auth.free_coins")} <span style={{ color:"#fbbf24", fontWeight:700 }}>3000 🪙 MC</span> {t("auth.free_coins2")}
      </div>
    </div>
  </div>;
}
