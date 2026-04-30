import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { req } from "../lib/supabase.js";
import { isElite, catColor } from "../lib/helpers.js";
import MarketCard from "../components/MarketCard.jsx";
import ProposeMarketModal from "../components/ProposeMarketModal.jsx";
import { useLang } from "../lib/i18n.jsx";

export default function MarketsPage({ markets, onBet, profile, session, showToast }) {
  const [cat,setCat]=useState("Tous");
  const [search,setSearch]=useState("");
  const [showPropose,setShowPropose]=useState(false);
  const userIsElite=isElite(profile);
  const openMarkets=markets.filter(m=>m.status==="open"&&(!m.elite_only||userIsElite));
  const cats=["Tous",...new Set(openMarkets.map(m=>m.category).filter(Boolean))];
  const base=cat==="Tous"?openMarkets:openMarkets.filter(m=>m.category===cat);
  const filtered=search?base.filter(m=>m.title.toLowerCase().includes(search.toLowerCase())):base;
  const trendingId=openMarkets.length>0?openMarkets.reduce((best,m)=>m.total_volume>best.total_volume?m:best,openMarkets[0]).id:null;
  const { t, lang } = useLang();
  const gridRef = useRef(null);
  useEffect(() => {
    if (!gridRef.current) return;
    const cards = gridRef.current.querySelectorAll(".card-hover");
    if (!cards.length) return;
    gsap.fromTo(cards, { opacity:0, y:55, scale:0.91 }, { opacity:1, y:0, scale:1, duration:0.5, stagger:0.07, ease:"power3.out", clearProps:"transform,scale" });
  }, [cat, search]);

  const handlePropose=async({title,title_en,category,proposed_by})=>{
    try{
      await req("proposed_markets",{method:"POST",_token:session?.token,body:JSON.stringify({
        title,title_en:title_en||null,category,proposed_by,
        proposer_id:session?.user?.id,
        status:"pending",
        created_at:new Date().toISOString()
      })});
      showToast(t("markets.propose_sent"));
    }catch(e){showToast("Erreur : "+e.message,"error");}
  };

  return <div className="page-enter">
    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20 }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:30,letterSpacing:2 }}>{t("markets.title")}</div>
    </div>

    {/* Section proposer un marché */}
    {userIsElite?(
      <div onClick={()=>setShowPropose(true)} className="card-hover" style={{ background:"linear-gradient(135deg,rgba(245,158,11,0.08),rgba(245,158,11,0.03))",border:"1px solid rgba(245,158,11,0.2)",borderRadius:16,padding:"16px 20px",marginBottom:20,cursor:"pointer",display:"flex",alignItems:"center",gap:14,position:"relative",overflow:"hidden" }}>
        <div style={{ position:"absolute",top:-20,right:-20,width:100,height:100,borderRadius:"50%",background:"radial-gradient(circle,rgba(245,158,11,0.1),transparent 70%)" }} />
        <div style={{ width:44,height:44,borderRadius:12,background:"rgba(245,158,11,0.15)",border:"1px solid rgba(245,158,11,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>👑</div>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:1,color:"#f59e0b",marginBottom:2 }}>{t("markets.propose_market")}</div>
          <div style={{ fontSize:12,color:"rgba(241,245,249,0.4)" }}>{t("markets.propose_desc")}</div>
        </div>
        <div style={{ marginLeft:"auto",fontSize:18,color:"rgba(245,158,11,0.5)" }}>→</div>
      </div>
    ):(
      <div style={{ background:"rgba(241,245,249,0.02)",border:"1px solid rgba(241,245,249,0.06)",borderRadius:16,padding:"16px 20px",marginBottom:20,display:"flex",alignItems:"center",gap:14,position:"relative",overflow:"hidden" }}>
        <div style={{ position:"absolute",inset:0,backdropFilter:"blur(1px)",background:"rgba(3,7,18,0.4)",borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center",zIndex:2 }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:24,marginBottom:4 }}>🔒</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:13,color:"#f59e0b",letterSpacing:1 }}>{t("markets.elite_required")}</div>
            <div style={{ fontSize:11,color:"rgba(241,245,249,0.4)",marginTop:2 }}>{t("markets.elite_desc")}</div>
          </div>
        </div>
        <div style={{ width:44,height:44,borderRadius:12,background:"rgba(241,245,249,0.05)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>👑</div>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:1,color:"rgba(241,245,249,0.3)",marginBottom:2 }}>{t("markets.propose_market")}</div>
          <div style={{ fontSize:12,color:"rgba(241,245,249,0.25)" }}>{t("markets.propose_desc")}</div>
        </div>
      </div>
    )}

    <div style={{ position:"relative",marginBottom:12 }}>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("markets.search_ph")}
        style={{ width:"100%",padding:"10px 36px 10px 36px",background:"rgba(241,245,249,0.04)",border:"1px solid rgba(241,245,249,0.08)",borderRadius:12,color:"#f1f5f9",fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif",boxSizing:"border-box" }} />
      <span style={{ position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"rgba(241,245,249,0.25)",fontSize:14,pointerEvents:"none" }}>🔍</span>
      {search&&<button onClick={()=>setSearch("")} style={{ position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"rgba(241,245,249,0.35)",cursor:"pointer",fontSize:18,padding:"0 4px",lineHeight:1 }}>×</button>}
    </div>
    <div style={{ display:"flex",gap:7,marginBottom:22,flexWrap:"wrap" }}>{cats.map(c=><button key={c} onClick={()=>setCat(c)} style={{ padding:"6px 13px",borderRadius:20,border:`1px solid ${cat===c?catColor(c):"rgba(241,245,249,0.07)"}`,background:cat===c?`${catColor(c)}12`:"transparent",color:cat===c?catColor(c):"rgba(241,245,249,0.35)",fontWeight:700,fontSize:12,cursor:"pointer",transition:"all 0.2s" }}>{c==="Tous"?t("markets.all"):c}</button>)}</div>
    {filtered.length===0&&<div style={{ textAlign:"center",padding:60,color:"rgba(241,245,249,0.25)" }}>{search?t("markets.no_results"):t("markets.none_open")}</div>}
    <div ref={gridRef} style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:11 }}>{filtered.map(m=><MarketCard key={m.id} market={m} onBet={onBet} isNew={m.created_at&&Date.now()-new Date(m.created_at).getTime()<86400000} isTrending={m.id===trendingId&&m.total_volume>0} session={session} profile={profile} showToast={showToast} />)}</div>
    {showPropose&&<ProposeMarketModal profile={profile} onClose={()=>setShowPropose(false)} onSubmit={handlePropose} />}
  </div>;
}
