import { useState, useEffect } from "react";
import { BADGES } from "../lib/constants.js";
import { getSubPlan, getSubColor, getSubEmoji, getSubLabel, getMCBoost, getBadge, getLevel } from "../lib/helpers.js";
import MCBadge from "../components/ui/MCBadge.jsx";
import Avatar from "../components/ui/Avatar.jsx";
import SCBadge from "../components/ui/SCBadge.jsx";
import BadgeTag from "../components/ui/BadgeTag.jsx";
import SubBadge from "../components/ui/SubBadge.jsx";
import XPBar from "../components/ui/XPBar.jsx";
import { req } from "../lib/supabase.js";
import { useLang } from "../lib/i18n.jsx";

// Génère un code déterministe depuis l'id (toujours le même pour le même user)
function makeRefCode(id, name) {
  const base = (name||id||"USER").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6).padEnd(3,"X");
  const suffix = (id||"XXXX").replace(/-/g,"").slice(0,4).toUpperCase();
  return `${base}-${suffix}`;
}

export default function ProfilePage({ profile, username, onLogout, onNavigate, session }) {
  const [friendCount, setFriendCount] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [referralCount, setReferralCount] = useState(null);
  const [codeCopied, setCodeCopied] = useState(false);
  // Code généré immédiatement, sans attendre Supabase
  const refCode = profile?.referral_code || makeRefCode(profile?.id, username);

  useEffect(() => {
    if(!profile?.id) return;
    req(`friendships?or=(requester_id.eq.${profile.id},recipient_id.eq.${profile.id})&status=eq.accepted&select=id`)
      .then(d => setFriendCount((d||[]).length)).catch(()=>{});
    req(`friendships?recipient_id=eq.${profile.id}&status=eq.pending&select=id`, { _token: session?.token })
      .then(d => setPendingCount((d||[]).length)).catch(()=>{});
    // Sauvegarder le code en arrière-plan si pas encore en DB (seulement referral_code)
    if(!profile?.referral_code && session?.token) {
      req(`profiles?id=eq.${profile.id}`, { method:"PATCH", _token:session.token, body:JSON.stringify({referral_code:refCode, updated_at:new Date().toISOString()}) }).catch(()=>{});
    }
    // Compter les filleuls
    req(`profiles?referred_by=eq.${refCode}&select=id`).then(r=>setReferralCount((r||[]).length)).catch(()=>{});
  }, [profile?.id]);
  const level=getLevel(profile?.xp||0), badge=getBadge(level);
  const wr=profile?.total_bets>0?Math.round((profile.total_wins/profile.total_bets)*100):0;
  const sub=getSubPlan(profile);
  const { t } = useLang();
  return <div className="page-enter">
    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, letterSpacing:2, marginBottom:20 }}>{t("profile.title")}</div>
    <div style={{ background:`linear-gradient(135deg,${badge.glow},rgba(241,245,249,0.02))`, border:`1px solid ${badge.color}20`, borderRadius:20, padding:"22px", marginBottom:18, position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:-60, right:-60, width:200, height:200, borderRadius:"50%", background:`radial-gradient(circle,${badge.glow},transparent 70%)` }} />
      <div style={{ display:"flex", gap:16, alignItems:"center", marginBottom:14 }}>
        <div style={{ position:"relative", flexShrink:0 }}>
          <Avatar username={username} size={64} radius={18} fontSize={22} />
          <div style={{ position:"absolute", bottom:-6, right:-6, width:26, height:26, borderRadius:8, background:`linear-gradient(135deg,${badge.color},${badge.color}99)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, boxShadow:`0 4px 10px ${badge.glow}`, border:"2px solid #030712" }}>{badge.emoji}</div>
        </div>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, letterSpacing:1 }}>{username}</div>
          <div style={{ display:"flex", gap:6, marginTop:4, flexWrap:"wrap", alignItems:"center" }}>
            <BadgeTag level={level} />
            {sub!=="starter"&&<SubBadge profile={profile} />}
          </div>
          <div style={{ fontSize:12, color:"rgba(241,245,249,0.35)", marginTop:5 }}>Niveau {level} · {profile?.xp||0} XP total</div>
        </div>
      </div>
      <XPBar xp={profile?.xp||0} />
      <div style={{ display:"flex", gap:10, marginTop:14, flexWrap:"wrap" }}><MCBadge amount={profile?.coins||0} /><SCBadge amount={profile?.store_coins||0} /></div>
    </div>
    {/* Info abonnement */}
    <div style={{ background:`${getSubColor(sub)}0a`, border:`1px solid ${getSubColor(sub)}20`, borderRadius:14, padding:"14px 18px", marginBottom:18, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <div>
        <div style={{ fontSize:10, fontWeight:700, color:"rgba(241,245,249,0.35)", letterSpacing:1.5, marginBottom:4 }}>{t("profile.current_sub")}</div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:getSubColor(sub), letterSpacing:1 }}>{getSubEmoji(sub)} {getSubLabel(sub)}</span>
        </div>
        <div style={{ fontSize:11, color:"rgba(241,245,249,0.3)", marginTop:3 }}>{getMCBoost(sub)} {t("profile.mc_monday")}</div>
      </div>
      {sub==="starter"&&<div style={{ fontSize:11, color:"#3b82f6", fontWeight:700, cursor:"pointer" }} onClick={()=>onNavigate("subscription")}>{t("profile.go_pro")}</div>}
    </div>
    {/* Club favori */}
    {profile?.favorite_club&&(
      <div style={{ background:"rgba(16,185,129,0.04)", border:"1px solid rgba(16,185,129,0.1)", borderRadius:14, padding:"12px 18px", marginBottom:18, display:"flex", alignItems:"center", gap:12 }}>
        <span style={{ fontSize:26 }}>⚽</span>
        <div>
          <div style={{ fontSize:10, fontWeight:700, color:"rgba(241,245,249,0.35)", letterSpacing:1.5, marginBottom:3 }}>{t("profile.fav_club")}</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:1, color:"#10b981" }}>{profile.favorite_club}</div>
        </div>
      </div>
    )}
    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:18 }}>
      {[{label:t("profile.bets_stat"),val:profile?.total_bets||0,color:"#3b82f6"},{label:"WINS",val:profile?.total_wins||0,color:"#10b981"},{label:t("profile.accuracy"),val:`${wr}%`,color:"#a78bfa"}].map(s=>(
        <div key={s.label} style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.05)", borderRadius:12, padding:"16px 10px", textAlign:"center" }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:s.color, letterSpacing:1 }}>{s.val}</div>
          <div style={{ fontSize:9, color:"rgba(241,245,249,0.25)", fontWeight:700, letterSpacing:1.5, marginTop:3 }}>{s.label}</div>
        </div>
      ))}
    </div>
    <div style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.05)", borderRadius:14, padding:"16px 18px", marginBottom:16 }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:1, marginBottom:12 }}>{t("profile.badges_progress")}</div>
      {BADGES.map(b=>(
        <div key={b.id} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:9 }}>
          <span style={{ fontSize:11, fontWeight:700, color:b.color, background:`${b.color}12`, padding:"3px 9px", borderRadius:20, border:`1px solid ${b.color}25`, minWidth:90, textAlign:"center", boxShadow:level>=b.minLevel?`0 0 8px ${b.glow}`:"none" }}>{b.emoji} {b.label}</span>
          <span style={{ fontSize:11, color:"rgba(241,245,249,0.35)" }}>{t("profile.lv_short")} {b.minLevel}{b.maxLevel===999?"+":"–"+b.maxLevel}</span>
          {level>=b.minLevel&&<span style={{ fontSize:12, color:b.color }}>✓</span>}
        </div>
      ))}
    </div>
    <div style={{ background:"rgba(239,68,68,0.04)", border:"1px solid rgba(239,68,68,0.08)", borderRadius:12, padding:"12px 16px", marginBottom:18, fontSize:12, color:"rgba(241,245,249,0.35)", lineHeight:1.6 }}>
      {t("profile.no_monetary")} <strong style={{ color:"rgba(241,245,249,0.6)" }}>{t("profile.no_monetary_strong")}</strong>.
    </div>
    {/* Section Amis */}
    <div onClick={()=>onNavigate("leaderboard")} style={{ background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:14, padding:"14px 16px", marginBottom:16, cursor:"pointer", display:"flex", alignItems:"center", gap:14 }}>
      <div style={{ width:42, height:42, borderRadius:12, background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>👥</div>
      <div style={{ flex:1 }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, letterSpacing:1 }}>{t("profile.my_friends")}</div>
        <div style={{ fontSize:12, color:"rgba(241,245,249,0.35)", marginTop:2 }}>
          {friendCount===null?"...":friendCount} {friendCount!==1?t("profile.friend_count_pl"):t("profile.friend_count")}
          {pendingCount>0&&<span style={{ marginLeft:8, color:"#fbbf24", fontWeight:700 }}>· {pendingCount} {pendingCount>1?t("profile.requests_pending"):t("profile.request_pending")}</span>}
        </div>
      </div>
      <div style={{ fontSize:18, color:"rgba(241,245,249,0.3)" }}>›</div>
    </div>
    {/* Section Parrainage */}
    <div style={{ background:"rgba(245,158,11,0.04)", border:"1px solid rgba(245,158,11,0.15)", borderRadius:14, padding:"16px 18px", marginBottom:16 }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:1, marginBottom:12, color:"#f59e0b" }}>{t("profile.referral_section")}</div>
      <div style={{ fontSize:11, color:"rgba(241,245,249,0.4)", marginBottom:12, lineHeight:1.6 }}>
        {t("profile.referral_desc")}<br/>
        <span style={{ color:"#10b981" }}>5 SC</span> filleul Free · <span style={{ color:"#3b82f6" }}>10 SC</span> Standard · <span style={{ color:"#a78bfa" }}>20 SC</span> Premium
      </div>
      {refCode?(
        <>
          <div style={{ display:"flex", gap:8, marginBottom:12, alignItems:"center" }}>
            <div style={{ flex:1, background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:10, padding:"10px 14px", fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:3, color:"#f59e0b", textAlign:"center" }}>
              {refCode}
            </div>
            <button onClick={()=>{navigator.clipboard.writeText(refCode);setCodeCopied(true);setTimeout(()=>setCodeCopied(false),2000);}}
              style={{ padding:"10px 14px", borderRadius:10, border:"1px solid rgba(245,158,11,0.3)", background:codeCopied?"rgba(245,158,11,0.15)":"transparent", color:codeCopied?"#f59e0b":"rgba(241,245,249,0.5)", fontWeight:700, fontSize:12, cursor:"pointer", whiteSpace:"nowrap" }}>
              {codeCopied?t("profile.copied_btn"):t("profile.copy_btn")}
            </button>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <div style={{ flex:1, background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:10, padding:"10px", textAlign:"center" }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:"#f59e0b", letterSpacing:1 }}>{referralCount===null?"...":referralCount}</div>
              <div style={{ fontSize:9, color:"rgba(241,245,249,0.3)", fontWeight:700, letterSpacing:1.5, marginTop:2 }}>{t("profile.filleuls")}</div>
            </div>
            <div style={{ flex:1, background:"rgba(241,245,249,0.02)", border:"1px solid rgba(241,245,249,0.06)", borderRadius:10, padding:"10px", textAlign:"center" }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:"#10b981", letterSpacing:1 }}>{profile?.referral_sc_earned||0} SC</div>
              <div style={{ fontSize:9, color:"rgba(241,245,249,0.3)", fontWeight:700, letterSpacing:1.5, marginTop:2 }}>{t("profile.earned_label")}</div>
            </div>
          </div>
        </>
      ):(
        <div style={{ fontSize:12, color:"rgba(241,245,249,0.25)", textAlign:"center", padding:"12px 0" }}>{t("profile.code_generating")}</div>
      )}
    </div>
    <button onClick={onLogout} style={{ width:"100%", padding:"13px 0", borderRadius:12, border:"1px solid rgba(239,68,68,0.15)", background:"rgba(239,68,68,0.04)", color:"#f87171", fontWeight:800, fontSize:14, cursor:"pointer" }}>{t("profile.logout_btn")}</button>
  </div>;
}
