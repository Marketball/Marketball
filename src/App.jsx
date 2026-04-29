import { useState, useEffect, useCallback, useRef } from "react";

// Lib
import { LanguageProvider, useLang } from "./lib/i18n.jsx";
import { req, authReq } from "./lib/supabase.js";
import { resolveBet } from "./lib/amm.js";
import { GLOBAL_CSS, COMPETITIONS, SUBSCRIPTION_PLANS, WEEKLY_MC_LIMIT, MC_TO_SC_RATE } from "./lib/constants.js";
import { getLevel, getMCBoost, isPro, fmt, getWeekKey, loadSavedOdds, saveOdds, calcLevelUpRewards } from "./lib/helpers.js";

// UI components
import SubBadge from "./components/ui/SubBadge.jsx";
import Avatar from "./components/ui/Avatar.jsx";
import Toast from "./components/ui/Toast.jsx";
import Confetti from "./components/ui/Confetti.jsx";

// Feature components
import AuthPage from "./components/AuthPage.jsx";
import BetModal from "./components/BetModal.jsx";
import MultiBetModal from "./components/MultiBetModal.jsx";
import MatchBetModal from "./components/MatchBetModal.jsx";

// Pages
import HomePage from "./pages/HomePage.jsx";
import MatchesPage from "./pages/MatchesPage.jsx";
import MarketsPage from "./pages/MarketsPage.jsx";
import WalletPage from "./pages/WalletPage.jsx";
import LeaderboardPage from "./pages/LeaderboardPage.jsx";
import StorePage from "./pages/StorePage.jsx";
import SubscriptionPage from "./pages/SubscriptionPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import HowItWorksPage from "./pages/HowItWorksPage.jsx";
import CommunityPage from "./pages/CommunityPage.jsx";
import OnboardingModal from "./components/OnboardingModal.jsx";
import FriendsPage from "./pages/FriendsPage.jsx";
import LeaguesPage from "./pages/LeaguesPage.jsx";

// PublicProfilePage est dans LeaderboardPage
import { PublicProfilePage } from "./pages/LeaderboardPage.jsx";

export default function App() {
  return <LanguageProvider><AppInner /></LanguageProvider>;
}

function AppInner() {
  const { lang, setLang, t } = useLang();
  const [session,setSession]=useState(null);
  const [profile,setProfile]=useState(null);
  const [page,setPage]=useState("home");
  const navigateTo=(p)=>{setPage(p);if(p==="community")setPendingFriendCount(0);};
  const [markets,setMarkets]=useState([]);
  const [matches,setMatches]=useState([]);
  const [matchesLoading,setMatchesLoading]=useState(false);
  const [leaderboard,setLeaderboard]=useState([]);
  const [bets,setBets]=useState([]);
  const [matchBets,setMatchBets]=useState([]);
  // Refs pour stocker les intervals et pouvoir les nettoyer au logout
  const intervalsRef=useRef([]);
  const [betModal,setBetModal]=useState(null);
  const [betInitialSide,setBetInitialSide]=useState("yes");
  const [matchBetModal,setMatchBetModal]=useState(null);
  const [matchBetInitialPred,setMatchBetInitialPred]=useState("");
  const [betsFrozenUntil,setBetsFrozenUntil]=useState(0);
  const matchesRef=useRef([]);
  const [toast,setToast]=useState(null);
  const [showConfetti,setShowConfetti]=useState(false);
  const [showOnboarding,setShowOnboarding]=useState(false);
  const [publicProfileUser,setPublicProfileUser]=useState(null);
  const [pendingFriendCount,setPendingFriendCount]=useState(0);
  const profileRef=useRef(null);

  const showToast=(msg,type="success")=>{setToast({msg,type});if(type==="win")setShowConfetti(true);};

  const loadLeaderboard=useCallback(async(token)=>{
    try{
      const data=await req("profiles?select=id,username,coins,store_coins,xp,level,total_wins,total_bets,total_profit,subscription&order=total_profit.desc&limit=50",{_token:token});
      if(data?.length) setLeaderboard(data.map((p,i)=>({...p,rank:i+1})));
    }catch{}
  },[]);

  const checkAndResolveBets=useCallback(async(token,userId,currentMatches,pendingBets)=>{
    if(!token||!pendingBets?.length||!currentMatches?.length) return;
    const pending=pendingBets.filter(b=>b.status==="pending"&&b.id);
    if(!pending.length) return;
    let profileUpdated=false;
    let newCoins=profileRef.current?.coins||0;
    let newXP=profileRef.current?.xp||0;
    let newProfit=profileRef.current?.total_profit||0;
    let newWins=profileRef.current?.total_wins||0;

    const finishedMatches=currentMatches.filter(m=>m.status==="FINISHED");
    for(const bet of pending){
      try{
        if(bet.bet_type==="parlay") continue; // combinés désactivés
        if(false){
          continue;
        }
        // Résolution d'un pari simple
        const match=finishedMatches.find(m=>
          bet.match_title&&bet.match_title.includes(m.home_team)&&bet.match_title.includes(m.away_team)
        );
        if(!match) continue;
        let scorers=match.scorers||[];
        const needsScorers=["first_scorer","scorer"].includes(bet.bet_type)&&scorers.length===0&&match.id;
        if(needsScorers){
          try{const fr=await fetch(`/api/fixtures?id=${match.id}`);const fd=await fr.json();if(fd.scorers?.length) scorers=fd.scorers;}catch{}
        }
        const matchResult={homeScore:match.home_score,awayScore:match.away_score,homeTeam:match.home_team,awayTeam:match.away_team,scorers};
        const won=resolveBet(bet,matchResult);
        const newStatus=won?"won":"lost";
        try{await req(`match_bets?id=eq.${bet.id}`,{method:"PATCH",_token:token,body:JSON.stringify({status:newStatus})});}catch{}
        setMatchBets(prev=>prev.map(b=>b.id===bet.id?{...b,status:newStatus}:b));
        if(won){
          const gain=bet.potential_gain||0;
          newCoins+=gain;newProfit+=gain-(bet.cost||0);newWins+=1;profileUpdated=true;
          showToast(`🏆 PARI GAGNE ! +${fmt(gain)} MC — ${bet.match_title||""}`, "win");
        }
      }catch{}
    }

    if(profileUpdated){
      const oldXP=profileRef.current?.xp||0;
      const newLevel=getLevel(newXP);
      const {scBonus,messages}=calcLevelUpRewards(oldXP,newXP);
      const newSC=(profileRef.current?.store_coins||0)+scBonus;
      try{
        await req(`profiles?id=eq.${userId}`,{method:"PATCH",_token:token,body:JSON.stringify({coins:newCoins,xp:newXP,level:newLevel,store_coins:newSC,total_profit:newProfit,total_wins:newWins,updated_at:new Date().toISOString()})});
      }catch{}
      setProfile(p=>({...p,coins:newCoins,xp:newXP,level:newLevel,store_coins:newSC,total_profit:newProfit,total_wins:newWins}));
      profileRef.current={...profileRef.current,coins:newCoins,xp:newXP,level:newLevel,store_coins:newSC,total_profit:newProfit,total_wins:newWins};
      messages.forEach(m=>setTimeout(()=>showToast(m,"win"),500));
      await loadLeaderboard(token);
    }
  },[loadLeaderboard]);

  // Enrichit les matchs à venir avec des cotes dynamiques (forme, stats, blessures)
  // Tourne en arrière-plan sans bloquer l'affichage initial
  const enrichMatchOdds=useCallback(async(matches)=>{
    const upcoming=matches.filter(m=>m.status==="SCHEDULED").slice(0,20); // max 20 matchs
    if(!upcoming.length) return;
    const enriched=await Promise.allSettled(
      upcoming.map(async m=>{
        try{
          const r=await fetch(`/api/match-odds?home_team=${encodeURIComponent(m.home_team)}&away_team=${encodeURIComponent(m.away_team)}`);
          if(!r.ok) return null;
          const odds=await r.json();
          if(odds.error) return null;
          return {id:m.id, odds};
        }catch{return null;}
      })
    );
    const updates={};
    enriched.forEach(r=>{if(r.status==="fulfilled"&&r.value) updates[r.value.id]=r.value.odds;});
    if(!Object.keys(updates).length) return;
    setMatches(prev=>prev.map(m=>updates[m.id]?{...m,dynamicOdds:updates[m.id]}:m));
    matchesRef.current=matchesRef.current.map(m=>updates[m.id]?{...m,dynamicOdds:updates[m.id]}:m);
  },[]);

  const loadMatches=useCallback(async()=>{
    setMatchesLoading(true);
    const allMatches=[];
    try{
      const fetchComp=async(comp)=>{
        try{
          const controller=new AbortController();
          const timeout=setTimeout(()=>controller.abort(),10000);
          const data=await fetch(`/api/matches?competition=${comp}`,{signal:controller.signal}).then(r=>r.json());
          clearTimeout(timeout);
          if(!data?.matches) return [];
          return data.matches;
        }catch{return [];}
      };
      const groups=[];
      for(let i=0;i<COMPETITIONS.length;i+=4) groups.push(COMPETITIONS.slice(i,i+4));
      for(const group of groups){
        const results=await Promise.allSettled(group.map(comp=>fetchComp(comp)));
        results.forEach(r=>{if(r.status==="fulfilled") allMatches.push(...r.value);});
      }
      allMatches.sort((a,b)=>new Date(a.match_date)-new Date(b.match_date));
      matchesRef.current=allMatches;
      setMatches(allMatches);
      // Enrichir avec les cotes dynamiques en arrière-plan (sans bloquer l'affichage)
      enrichMatchOdds(allMatches);
    }catch(e){console.error("loadMatches error",e);}
    setMatchesLoading(false);
    return allMatches;
  },[]);

  const loadMarkets=useCallback(async()=>{
    try{
      const [rumors,customs]=await Promise.all([
        req("rumors?select=*&status=eq.open&order=created_at.desc").catch(()=>[]),
        req("custom_markets?status=eq.open&order=created_at.desc").catch(()=>[]),
      ]);
      const rumorMarkets=(rumors||[]).map(r=>({id:r.rumor_id,title:r.event_question||`${r.player_name} → ${r.to_club} ?`,q_yes:100,q_no:100,total_volume:0,participants:0,closes_at:r.expires_at||new Date(Date.now()+14*86400000).toISOString(),category:"Transferts",source:r.source_name||"Source",status:"open"}));
      const savedOdds=loadSavedOdds();
      const customMarkets=(customs||[]).map(c=>{
        const saved=savedOdds[c.id];
        return {id:c.id,title:c.title,q_yes:saved?.q_yes??c.q_yes??100,q_no:saved?.q_no??c.q_no??100,total_volume:saved?.total_volume??c.total_volume??0,participants:saved?.participants??c.participants??0,closes_at:c.closes_at||null,category:c.category||"Rumeurs",source:c.source||"MarketBall",status:"open",proposed_by:c.proposed_by||null,market_type:c.market_type||"binary",options:c.options||null,created_at:c.created_at||null};
      });
      setMarkets([...customMarkets,...rumorMarkets]);
    }catch{}
  },[]);

  // Rafraîchissement classement + marchés toutes les 10s (cotes en temps réel)
  useEffect(()=>{
    if(!session) return;
    const interval=setInterval(()=>{
      loadLeaderboard(session.token);
      loadMarkets();
    },10000);
    return()=>clearInterval(interval);
  },[session]);

  const generateReferralCode=(name)=>{
    const base=(name||"USER").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6).padEnd(3,"X");
    const suffix=Math.random().toString(36).slice(2,6).toUpperCase();
    return `${base}-${suffix}`;
  };

  const loadProfile=useCallback(async(token,userId,favoriteClub=null,referralCode=null)=>{
    try{
      const data=await req(`profiles?id=eq.${userId}&select=*`,{_token:token});
      if(data?.[0]){
        let p=data[0];
        // Si le profil existe mais n'a pas de code parrain, en générer un maintenant
        if(!p.referral_code){
          const refCode=generateReferralCode(p.username||userId.slice(0,6));
          try{await req(`profiles?id=eq.${userId}`,{method:"PATCH",_token:token,body:JSON.stringify({referral_code:refCode,referral_sc_earned:0,updated_at:new Date().toISOString()})});}catch{}
          p={...p,referral_code:refCode,referral_sc_earned:0};
        }
        setProfile(p);profileRef.current=p;
      }else{
        const refCode=generateReferralCode(favoriteClub||userId.slice(0,6));
        const np={id:userId,coins:3000,store_coins:0,xp:0,level:1,total_bets:0,total_wins:0,total_profit:0,favorite_club:favoriteClub,referral_code:refCode,referral_sc_earned:0,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
        try{await req("profiles",{method:"POST",_token:token,body:JSON.stringify(np)});}catch{}
        setProfile(np);profileRef.current=np;
        if(referralCode){
          try{await fetch("/api/referral",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({referralCode,newUserId:userId})});}catch{}
        }
      }
    }catch{}
  },[]);

  const loadBets=useCallback(async(t,u)=>{try{const d=await req(`user_bets?user_id=eq.${u}&select=*&order=created_at.desc&limit=200`,{_token:t});if(d)setBets(d);}catch{}},[]);
  const loadMatchBets=useCallback(async(t,u)=>{
    try{
      const d=await req(`match_bets?user_id=eq.${u}&select=*&order=created_at.desc&limit=200`,{_token:t});
      if(d) setMatchBets(d);
      return (d||[]).filter(b=>b.status==="pending");
    }catch{return[];}
  },[]);

  useEffect(()=>{loadMarkets();loadMatches();},[]);

  const handleDailyStreak=async(token,userId)=>{
    try{
      const today=new Date().toISOString().split("T")[0];
      const p=profileRef.current;
      if(!p) return;
      if(p.last_login===today) return;
      const yesterday=new Date(Date.now()-86400000).toISOString().split("T")[0];
      const newStreak=p.last_login===yesterday?(p.streak||0)+1:1;
      let bonusCoins=getMCBoost(p.subscription||"starter");
      let bonusMsg=`🔥 Streak ${newStreak} jour${newStreak>1?"s":""} ! +${bonusCoins} MC`;
      if(newStreak===3){bonusCoins=30;bonusMsg="🔥 Streak 3 jours ! +30 MC bonus !";}
      if(newStreak===7){bonusCoins=100;bonusMsg="🔥🔥 STREAK 7 JOURS ! +100 MC !";}
      if(newStreak>7&&newStreak%7===0){bonusCoins=100;bonusMsg=`🔥🔥 STREAK ${newStreak} JOURS ! +100 MC !`;}
      const newCoins=(p.coins||0)+bonusCoins;
      const {newXP,newLevel,newSC,messages}=applyXPGain(p.xp,3);
      await req(`profiles?id=eq.${userId}`,{method:"PATCH",_token:token,body:JSON.stringify({last_login:today,streak:newStreak,coins:newCoins,xp:newXP,level:newLevel,store_coins:newSC,updated_at:new Date().toISOString()})});
      setProfile(pr=>({...pr,last_login:today,streak:newStreak,coins:newCoins,xp:newXP,level:newLevel,store_coins:newSC}));
      profileRef.current={...profileRef.current,last_login:today,streak:newStreak,coins:newCoins,xp:newXP,level:newLevel,store_coins:newSC};
      showToast(bonusMsg);
      messages.forEach((m,i)=>setTimeout(()=>showToast(m,"win"),600*(i+1)));
    }catch{}
  };

  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const payment=params.get("payment");
    // Note : les SC sont crédités uniquement via le webhook Stripe (api/webhook.js)
    // On affiche juste un message de confirmation ici, sans modifier les données
    if(payment==="success"){
      showToast("Paiement réussi ! Ton compte sera mis à jour dans quelques secondes.");
      window.history.replaceState({},"","/");
      // Recharger le profil depuis Supabase après un court délai pour afficher les nouvelles données
      if(session) setTimeout(()=>loadProfile(session.token,session.user.id),3000);
    }
    if(payment==="cancel"){
      showToast("Paiement annulé","warning");
      window.history.replaceState({},"","/");
    }
  },[session]);

  const loadPendingFriends=useCallback(async(token,userId)=>{
    try{
      const [friends,challenges]=await Promise.all([
        req(`friendships?recipient_id=eq.${userId}&status=eq.pending&select=id`,{_token:token}),
        req(`friend_challenges?challenged_id=eq.${userId}&status=eq.pending&select=id`,{_token:token}),
      ]);
      setPendingFriendCount((friends?.length||0)+(challenges?.length||0));
    }catch{}
  },[]);

  const handleAuth=async(token,user,refreshToken,referralCode=null)=>{
    if(refreshToken) localStorage.setItem("mb_auth",JSON.stringify({access_token:token,refresh_token:refreshToken,user}));
    setSession({token,user});
    const favClub=user.user_metadata?.favorite_club||null;
    await loadProfile(token,user.id,favClub,referralCode);
    await loadBets(token,user.id);
    const mb=await loadMatchBets(token,user.id);
    await loadLeaderboard(token);
    const loadedMatches=await loadMatches();
    if(mb?.length) await checkAndResolveBets(token,user.id,loadedMatches,mb);
    await handleDailyStreak(token,user.id);
    loadPendingFriends(token,user.id);
    if(!localStorage.getItem("mb_onboarded"))setShowOnboarding(true);
    // Interval unique 60s : recharge matchs + résout les paris terminés
    const interval=setInterval(async()=>{
      const prevMatches=matchesRef.current||[];
      const lm=await loadMatches();
      // Détecter un changement de score → geler les paris 30s pour éviter la triche
      const scoreChanged=lm.some(m=>{
        const prev=prevMatches.find(p=>p.id===m.id);
        return prev&&(m.status==="IN_PLAY"||m.status==="PAUSED")&&
          (prev.home_score!==m.home_score||prev.away_score!==m.away_score);
      });
      if(scoreChanged) setBetsFrozenUntil(Date.now()+90000);
      const pendingMB=await loadMatchBets(token,user.id);
      if(pendingMB?.some(b=>b.status==="pending")) await checkAndResolveBets(token,user.id,lm,pendingMB);
    },30*1000);
    intervalsRef.current=[interval];
  };

  // Restauration automatique de session au chargement de la page
  useEffect(()=>{
    const saved=localStorage.getItem("mb_auth");
    if(!saved) return;
    let parsed;
    try{parsed=JSON.parse(saved);}catch{localStorage.removeItem("mb_auth");return;}
    const {refresh_token,user}=parsed;
    if(!refresh_token||!user) return;
    authReq("token?grant_type=refresh_token",{refresh_token})
      .then(data=>{
        if(!data.access_token) throw new Error("no token");
        localStorage.setItem("mb_auth",JSON.stringify({access_token:data.access_token,refresh_token:data.refresh_token,user:data.user||user}));
        handleAuth(data.access_token,data.user||user,data.refresh_token);
      })
      .catch(()=>{localStorage.removeItem("mb_auth");});
  },[]);

  const updateProfile=async(updates,token,userId)=>{
    try{await req(`profiles?id=eq.${userId}`,{method:"PATCH",_token:token,body:JSON.stringify({...updates,updated_at:new Date().toISOString()})});}catch{}
    setProfile(p=>({...p,...updates}));
    profileRef.current={...profileRef.current,...updates};
  };

  const applyXPGain=(oldXP,addXP)=>{
    const newXP=(oldXP||0)+addXP;
    const newLevel=getLevel(newXP);
    const {scBonus,messages}=calcLevelUpRewards(oldXP||0,newXP);
    const newSC=(profile?.store_coins||0)+scBonus;
    return {newXP,newLevel,newSC,scBonus,messages};
  };

  const handleBetConfirm=async(side,amount,cost,gain)=>{
    if(!session) return;
    const newCoins=(profile?.coins||0)-cost;
    if(newCoins<0){showToast("Pas assez de MC !","error");return;}
    const {newXP,newLevel,newSC,messages}=applyXPGain(profile?.xp,5);
    try{
      const safeGain=Math.max(cost+1, gain||cost+1);
      await req("user_bets",{method:"POST",_token:session.token,body:JSON.stringify({user_id:session.user.id,username:profile?.username||"Anonyme",market_id:betModal.id,market_title:betModal.title,side,amount,cost,potential_gain:safeGain,status:"pending"})});
      const updMarket=markets.find(m=>m.id===betModal.id);
      const upd=markets.map(m=>m.id===betModal.id?{...m,q_yes:side==="yes"?m.q_yes+amount:m.q_yes,q_no:side==="no"?m.q_no+amount:m.q_no,total_volume:m.total_volume+cost,participants:m.participants+1}:m);
      setMarkets(upd);saveOdds(upd);
      if(updMarket){
        const newQYes=side==="yes"?updMarket.q_yes+amount:updMarket.q_yes;
        const newQNo=side==="no"?updMarket.q_no+amount:updMarket.q_no;
        try{await req(`custom_markets?id=eq.${betModal.id}`,{method:"PATCH",_token:session.token,body:JSON.stringify({q_yes:newQYes,q_no:newQNo,total_volume:updMarket.total_volume+cost,participants:updMarket.participants+1})});}catch(e){console.warn("[bet] PATCH custom_markets failed:",e.message);}
      }
      await updateProfile({coins:newCoins,xp:newXP,level:newLevel,store_coins:newSC,total_bets:(profile?.total_bets||0)+1},session.token,session.user.id);
      setBetModal(null);
      showToast("Prediction placee ! +5 XP");
      messages.forEach((m,i)=>setTimeout(()=>showToast(m,"win"),600*(i+1)));
      setTimeout(()=>loadBets(session.token,session.user.id),500);
      await loadLeaderboard(session.token);
    }catch(e){showToast(`Erreur : ${e.message}`,"error");}
  };

  const handleMultiBetConfirm=async(optionLabel,odds,cost,gain)=>{
    if(!session) return;
    const newCoins=(profile?.coins||0)-cost;
    if(newCoins<0){showToast("Pas assez de MC !","error");return;}
    const {newXP,newLevel,newSC,messages}=applyXPGain(profile?.xp,5);
    try{
      await req("user_bets",{method:"POST",_token:session.token,body:JSON.stringify({user_id:session.user.id,username:profile?.username||"Anonyme",market_id:betModal.id,market_title:betModal.title,side:optionLabel,amount:cost,cost,potential_gain:gain,status:"pending"})});
      const upd=markets.map(m=>m.id===betModal.id?{...m,total_volume:m.total_volume+cost,participants:m.participants+1}:m);
      setMarkets(upd);saveOdds(upd);
      try{await req(`custom_markets?id=eq.${betModal.id}`,{method:"PATCH",_token:session.token,body:JSON.stringify({total_volume:(markets.find(m=>m.id===betModal.id)?.total_volume||0)+cost,participants:(markets.find(m=>m.id===betModal.id)?.participants||0)+1})});}catch{}
      await updateProfile({coins:newCoins,xp:newXP,level:newLevel,store_coins:newSC,total_bets:(profile?.total_bets||0)+1},session.token,session.user.id);
      setBetModal(null);
      showToast("Prediction placee ! +5 XP");
      messages.forEach((m,i)=>setTimeout(()=>showToast(m,"win"),600*(i+1)));
      setTimeout(()=>loadBets(session.token,session.user.id),500);
      await loadLeaderboard(session.token);
    }catch(e){showToast(`Erreur : ${e.message}`,"error");}
  };

  const handleMatchBetConfirm=async(match,betType,prediction,amount,gain)=>{
    if(!session) return;
    const newCoins=(profile?.coins||0)-amount;
    if(newCoins<0){showToast("Pas assez de MC !","error");return;}
    const {newXP,newLevel,newSC,messages}=applyXPGain(profile?.xp,5);
    try{
      const res=await req("match_bets",{method:"POST",_token:session.token,body:JSON.stringify({user_id:session.user.id,username:profile?.username||"Anonyme",match_id:null,match_title:`${match.home_team} vs ${match.away_team}`,bet_type:betType,prediction,cost:amount,potential_gain:gain,status:"pending"})});
      const newBet=res?.[0]||{id:null,match_title:`${match.home_team} vs ${match.away_team}`,bet_type:betType,prediction,cost:amount,potential_gain:gain,status:"pending"};
      setMatchBets(prev=>[newBet,...prev]);
      await updateProfile({coins:newCoins,xp:newXP,level:newLevel,store_coins:newSC,total_bets:(profile?.total_bets||0)+1},session.token,session.user.id);
      setMatchBetModal(null);
      showToast("Pari place ! +5 XP");
      messages.forEach((m,i)=>setTimeout(()=>showToast(m,"win"),600*(i+1)));
      await loadLeaderboard(session.token);
    }catch(e){showToast(`Erreur : ${e.message}`,"error");}
  };


  const handleSpin=async(segment)=>{
    if(!session) return;
    const updates={last_spin:new Date().toISOString()};
    if(segment.type==="mc") updates.coins=(profile?.coins||0)+segment.value;
    else if(segment.type==="sc") updates.store_coins=(profile?.store_coins||0)+segment.value;
    else if(segment.type==="cashout") updates.free_cashouts=(profile?.free_cashouts||0)+1;
    await updateProfile(updates,session.token,session.user.id);
    if(segment.type==="cashout") showToast("🔓 1 Cashout gratuit débloqué ! Dispo dans ton Wallet");
    else showToast(`+${segment.value} ${segment.type==="sc"?"💎 SC":"🪙 MC"} gagnes !`);
  };

  const handleWatchAd=async()=>{
    if(!session) return;
    const today=new Date().toISOString().split("T")[0];
    const adsToday=profile?.ads_reset_date===today?(profile?.ads_watched_today||0)+1:1;
    await updateProfile({coins:(profile?.coins||0)+20,ads_watched_today:adsToday,ads_reset_date:today},session.token,session.user.id);
    showToast("+20 MC gagnes !");
  };

  const handleRedeemSC=async(reward)=>{
    if(!session||(profile?.store_coins||0)<reward.cost){showToast("Pas assez de SC !","error");return;}
    await updateProfile({store_coins:(profile?.store_coins||0)-reward.cost},session.token,session.user.id);
    showToast(`${reward.emoji} ${reward.name} obtenu !`);
  };


  const handleConvertSC=async(amount)=>{
    if(!session) return;
    const mcAmount=amount*10;
    const wk=getWeekKey(),wp=profile?.weekly_reset_date===wk?(profile?.weekly_mc_purchased||0):0;
    if(wp+mcAmount>WEEKLY_MC_LIMIT){showToast("Limite hebdo atteinte !","error");return;}
    if((profile?.store_coins||0)<amount){showToast("Pas assez de SC !","error");return;}
    await updateProfile({coins:(profile?.coins||0)+mcAmount,store_coins:(profile?.store_coins||0)-amount,weekly_mc_purchased:wp+mcAmount,weekly_reset_date:wk},session.token,session.user.id);
    showToast(`${amount} SC → ${mcAmount} MC !`);
  };

  // Conversion MC → SC (500 MC = 1 SC, taux volontairement défavorable selon le concept)
  const handleConvertMCtoSC=async(amount)=>{
    if(!session) return;
    const mcCost=amount*MC_TO_SC_RATE;
    if((profile?.coins||0)<mcCost){showToast("Pas assez de MC !","error");return;}
    await updateProfile({coins:(profile?.coins||0)-mcCost,store_coins:(profile?.store_coins||0)+amount},session.token,session.user.id);
    showToast(`${mcCost} MC → ${amount} SC !`);
  };

  const handleSubscribe=async(planId)=>{
    if(!session) return;
    const plan=SUBSCRIPTION_PLANS.find(p=>p.id===planId);
    if(!plan) return;
    if(planId==="starter"){
      try{
        await req(`profiles?id=eq.${session.user.id}`,{method:"PATCH",_token:session.token,body:JSON.stringify({subscription:"starter",stripe_subscription_id:null,updated_at:new Date().toISOString()})});
        setProfile(p=>({...p,subscription:"starter"}));
        showToast("Abonnement résilié — plan Starter actif");
      }catch(e){showToast("Erreur : "+e.message,"error");}
      return;
    }
    if(!plan.priceId){
      showToast("Abonnements bientôt disponibles — Price ID Stripe en attente","warning");
      return;
    }
    try{
      showToast("Redirection vers le paiement...");
      const res=await fetch("/api/create-subscription",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({priceId:plan.priceId,userId:session.user.id,plan:planId})
      });
      const data=await res.json();
      if(data.url) window.location.href=data.url;
      else showToast("Erreur paiement","error");
    }catch(e){showToast("Erreur : "+e.message,"error");}
  };

  const handleCashout=async(bet,cashoutValue,isMatchBet=false)=>{
    const hasFree=(profile?.free_cashouts||0)>0;
    if(!session||(!isPro(profile)&&!hasFree)) return;
    try{
      const table=isMatchBet?"match_bets":"user_bets";
      await req(`${table}?id=eq.${bet.id}`,{method:"PATCH",_token:session.token,body:JSON.stringify({status:"cashed_out"})});
      const newCoins=(profile?.coins||0)+cashoutValue;
      const profileUpdate={coins:newCoins,updated_at:new Date().toISOString()};
      if(!isPro(profile)&&hasFree) profileUpdate.free_cashouts=Math.max(0,(profile?.free_cashouts||0)-1);
      await req(`profiles?id=eq.${session.user.id}`,{method:"PATCH",_token:session.token,body:JSON.stringify(profileUpdate)});
      const newFree=(!isPro(profile)&&hasFree)?Math.max(0,(profile?.free_cashouts||0)-1):(profile?.free_cashouts||0);
      setProfile(p=>({...p,coins:newCoins,free_cashouts:newFree}));
      profileRef.current={...profileRef.current,coins:newCoins,free_cashouts:newFree};
      if(isMatchBet) setMatchBets(prev=>prev.map(b=>b.id===bet.id?{...b,status:"cashed_out"}:b));
      else setBets(prev=>prev.map(b=>b.id===bet.id?{...b,status:"cashed_out"}:b));
      showToast(`💰 Cashout ! +${fmt(cashoutValue)} MC récupérés`,"win");
    }catch(e){showToast("Erreur cashout : "+e.message,"error");}
  };

  const handleLogout=async()=>{
    // Nettoyer les intervals pour éviter les fuites mémoire
    intervalsRef.current.forEach(clearInterval);
    intervalsRef.current=[];
    localStorage.removeItem("mb_auth");
    try{await authReq("logout",{});}catch{}
    setSession(null);setProfile(null);setBets([]);setMatchBets([]);profileRef.current=null;
  };

  const coins=profile?.coins??500,sc=profile?.store_coins??0;
  const username=profile?.username||session?.user?.user_metadata?.username||session?.user?.email?.split("@")[0]||"Joueur";

  const NAV=[
    {id:"home",icon:"⚡",label:t("nav.home")},
    {id:"matches",icon:"⚽",label:t("nav.matches")},
    {id:"markets",icon:"📊",label:t("nav.markets")},
    {id:"community",icon:"💬",label:t("nav.community")},
    {id:"wallet",icon:"💰",label:t("nav.wallet")},
    {id:"leaderboard",icon:"🏆",label:t("nav.leaderboard")},
    {id:"store",icon:"🎁",label:t("nav.store")},
    {id:"subscription",icon:"👑",label:t("nav.subscription")},
    {id:"howto",icon:"❓",label:t("nav.howto")},
  ];

  const LangToggle = () => (
    <button onClick={()=>setLang(lang==="fr"?"en":"fr")}
      style={{ padding:"4px 10px", borderRadius:7, border:"1px solid rgba(241,245,249,0.12)", background:"rgba(241,245,249,0.04)", color:"rgba(241,245,249,0.6)", fontWeight:700, fontSize:11, cursor:"pointer", letterSpacing:0.5, flexShrink:0, transition:"all 0.2s" }}
      title={lang==="fr"?"Switch to English":"Passer en français"}>
      {lang==="fr"?"🇬🇧 EN":"🇫🇷 FR"}
    </button>
  );

  const [showAuthModal,setShowAuthModal]=useState(false);

  const requireAuth=(action)=>{
    if(!session){setShowAuthModal(true);return false;}
    return true;
  };

  if(showAuthModal&&!session) return <AuthPage onAuth={handleAuth} />;
  if(!session) return (
    <div style={{ minHeight:"100vh", background:"#030712", fontFamily:"'DM Sans',sans-serif", color:"#f1f5f9" }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, overflow:"hidden" }}>
        <div style={{ position:"absolute", top:"5%", left:"15%", width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle,rgba(16,185,129,0.03),transparent 65%)", animation:"floatOrb 12s ease-in-out infinite" }} />
        <div style={{ position:"absolute", bottom:"10%", right:"10%", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle,rgba(59,130,246,0.025),transparent 65%)", animation:"floatOrb 15s ease-in-out infinite reverse" }} />
      </div>
      {/* Header identique au mode connecté */}
      <div style={{ position:"sticky", top:0, zIndex:200, background:"rgba(3,7,18,0.92)", backdropFilter:"blur(24px)", borderBottom:"1px solid rgba(241,245,249,0.05)" }}>
        <div className="header-row1" style={{ maxWidth:980, margin:"0 auto", padding:"0 14px", display:"flex", alignItems:"center", justifyContent:"space-between", height:48 }}>
          <div onClick={()=>setPage("home")} style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0, cursor:"pointer" }}>
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:3 }}>MARKET<span style={{ color:"#10b981" }}>BALL</span></span>
          </div>
          <nav className="hide-mobile" style={{ display:"flex", gap:1, flex:1, margin:"0 10px" }}>
            {NAV.map(n=>(
              <button key={n.id} onClick={()=>setPage(n.id)} style={{ padding:"5px 8px", borderRadius:8, border:"none", background:page===n.id?"rgba(16,185,129,0.1)":"transparent", color:page===n.id?"#10b981":"rgba(241,245,249,0.65)", fontWeight:600, fontSize:11, cursor:"pointer", transition:"all 0.2s", borderBottom:page===n.id?"2px solid #10b981":"2px solid transparent", whiteSpace:"nowrap" }}>
                {n.icon} {n.label}
              </button>
            ))}
          </nav>
          <div className="hide-mobile" style={{ display:"flex", gap:6, alignItems:"center", flexShrink:0 }}>
            <LangToggle />
            <button onClick={()=>setShowAuthModal(true)} style={{ padding:"6px 16px", borderRadius:8, border:"1px solid rgba(16,185,129,0.4)", background:"rgba(16,185,129,0.08)", color:"#10b981", fontWeight:700, fontSize:12, cursor:"pointer", letterSpacing:0.5 }}>
              {t("auth.login_btn")}
            </button>
          </div>
          <div className="show-mobile" style={{ display:"none", gap:6, alignItems:"center" }}>
            <LangToggle />
            <button onClick={()=>setShowAuthModal(true)} style={{ padding:"5px 12px", borderRadius:7, border:"1px solid rgba(16,185,129,0.4)", background:"rgba(16,185,129,0.08)", color:"#10b981", fontWeight:700, fontSize:11, cursor:"pointer" }}>
              {t("auth.login_btn_mobile")}
            </button>
          </div>
        </div>
        <div className="mobile-header-nav" style={{ display:"none", overflowX:"auto", scrollbarWidth:"none", borderTop:"1px solid rgba(241,245,249,0.04)", padding:"0 6px" }}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>setPage(n.id)} style={{ flexShrink:0, display:"flex", flexDirection:"column", alignItems:"center", padding:"6px 12px", border:"none", borderBottom:page===n.id?"2px solid #10b981":"2px solid transparent", background:"transparent", color:page===n.id?"#10b981":"rgba(241,245,249,0.45)", cursor:"pointer", fontSize:18, lineHeight:1, gap:2, transition:"all 0.15s" }}>
              <span>{n.icon}</span>
              <span style={{ fontSize:9, fontWeight:700, letterSpacing:0.3, whiteSpace:"nowrap" }}>{n.label}</span>
            </button>
          ))}
        </div>
      </div>
      {/* Bannière CTA */}
      <div style={{ background:"linear-gradient(135deg,rgba(16,185,129,0.08),rgba(59,130,246,0.06))", borderBottom:"1px solid rgba(16,185,129,0.12)", padding:"10px 20px", textAlign:"center" }}>
        <span style={{ fontSize:13, color:"rgba(241,245,249,0.7)" }}>{t("auth.cta_banner")} </span>
        <button onClick={()=>setShowAuthModal(true)} style={{ marginLeft:10, padding:"4px 14px", borderRadius:6, border:"none", background:"#10b981", color:"#030712", fontWeight:700, fontSize:12, cursor:"pointer" }}>{t("auth.create_account")}</button>
      </div>
      {/* Contenu public */}
      <div key={page} className="page-slide-right page-content" style={{ maxWidth:980, margin:"0 auto", padding:"24px 20px 32px", position:"relative", zIndex:1 }}>
        {page==="home"&&<HomePage markets={markets} coins={500} sc={0} username="Visiteur" onBet={()=>setShowAuthModal(true)} onNavigate={setPage} matches={matches} onMatchBet={()=>setShowAuthModal(true)} profile={null} leaderboard={leaderboard} />}
        {page==="matches"&&<MatchesPage matches={matches} onBet={()=>setShowAuthModal(true)} loading={matchesLoading} />}
        {page==="markets"&&<MarketsPage markets={markets} onBet={()=>setShowAuthModal(true)} profile={null} session={null} showToast={showToast} />}
        {page==="leaderboard"&&<LeaderboardPage leaderboard={leaderboard} username="" onViewProfile={()=>setShowAuthModal(true)} />}
        {page==="community"&&<CommunityPage session={null} profile={null} showToast={showToast} onViewProfile={()=>setShowAuthModal(true)} />}
        {(page==="wallet"||page==="store"||page==="subscription"||page==="profile"||page==="howto")&&(
          <div style={{ textAlign:"center", padding:"60px 20px" }}>
            <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
            <div style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>{t("auth.locked_title")}</div>
            <div style={{ fontSize:14, color:"rgba(241,245,249,0.4)", marginBottom:24 }}>{t("auth.locked_sub")}</div>
            <button onClick={()=>setShowAuthModal(true)} style={{ padding:"12px 32px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", fontWeight:700, fontSize:15, cursor:"pointer" }}>{t("auth.create_free")}</button>
          </div>
        )}
      </div>
      {/* Bottom nav mobile visiteur */}
      <div className="mobile-bottom-nav" style={{ display:"none", position:"fixed", bottom:0, left:0, right:0, zIndex:200, background:"rgba(3,7,18,0.96)", backdropFilter:"blur(20px)", borderTop:"1px solid rgba(241,245,249,0.07)", paddingBottom:"env(safe-area-inset-bottom)" }}>
        {[{id:"home",icon:"⚡",labelKey:"nav.home"},{id:"matches",icon:"⚽",labelKey:"nav.matches"},{id:"markets",icon:"📊",labelKey:"nav.markets"},{id:"community",icon:"💬",labelKey:"nav.com_short"},{id:"leaderboard",icon:"🏆",labelKey:"nav.leaderboard"}].map(n=>(
          <button key={n.id} onClick={()=>setPage(n.id)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"9px 2px 7px", border:"none", background:"transparent", color:page===n.id?"#10b981":"rgba(241,245,249,0.38)", cursor:"pointer", transition:"all 0.15s", position:"relative" }}>
            {page===n.id&&<div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:28, height:2, background:"#10b981", borderRadius:"0 0 2px 2px" }} />}
            <span style={{ fontSize:20, lineHeight:1 }}>{n.icon}</span>
            <span style={{ fontSize:9, fontWeight:700, marginTop:3, letterSpacing:0.3 }}>{t(n.labelKey)}</span>
          </button>
        ))}
        <button onClick={()=>setShowAuthModal(true)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"9px 2px 7px", border:"none", background:"transparent", color:"#10b981", cursor:"pointer" }}>
          <span style={{ fontSize:20, lineHeight:1 }}>👤</span>
          <span style={{ fontSize:9, fontWeight:700, marginTop:3, letterSpacing:0.3 }}>{t("nav.login")}</span>
        </button>
      </div>
      {toast&&<Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)} />}
    </div>
  );

  return <div style={{ minHeight:"100vh", background:"#030712", fontFamily:"'DM Sans',sans-serif", color:"#f1f5f9" }}>
    <style>{GLOBAL_CSS}</style>
    <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, overflow:"hidden" }}>
      <div style={{ position:"absolute", top:"5%", left:"15%", width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle,rgba(16,185,129,0.03),transparent 65%)", animation:"floatOrb 12s ease-in-out infinite" }} />
      <div style={{ position:"absolute", bottom:"10%", right:"10%", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle,rgba(59,130,246,0.025),transparent 65%)", animation:"floatOrb 15s ease-in-out infinite reverse" }} />
    </div>

    <div style={{ position:"sticky", top:0, zIndex:200, background:"rgba(3,7,18,0.92)", backdropFilter:"blur(24px)", borderBottom:"1px solid rgba(241,245,249,0.05)" }}>
      {/* Ligne 1 : logo + droite */}
      <div className="header-row1" style={{ maxWidth:980, margin:"0 auto", padding:"0 14px", display:"flex", alignItems:"center", justifyContent:"space-between", height:48 }}>
        <div onClick={()=>navigateTo("home")} style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0, cursor:"pointer" }}>
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:3 }}>MARKET<span style={{ color:"#10b981" }}>BALL</span></span>
        </div>
        {/* Desktop : nav centrale */}
        <nav className="hide-mobile" style={{ display:"flex", gap:1, flex:1, margin:"0 10px" }}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>navigateTo(n.id)} style={{ padding:"5px 8px", borderRadius:8, border:"none", background:page===n.id?"rgba(16,185,129,0.1)":"transparent", color:page===n.id?"#10b981":"rgba(241,245,249,0.65)", fontWeight:600, fontSize:11, cursor:"pointer", transition:"all 0.2s", borderBottom:page===n.id?"2px solid #10b981":"2px solid transparent", whiteSpace:"nowrap", position:"relative" }}>
              {n.icon} {n.label}
              {n.id==="community"&&pendingFriendCount>0&&<span style={{ position:"absolute", top:0, right:0, width:8, height:8, borderRadius:"50%", background:"#ef4444", border:"1.5px solid #030712" }} />}
            </button>
          ))}
        </nav>
        {/* Desktop : coins + profil */}
        <div className="hide-mobile" style={{ display:"flex", gap:5, alignItems:"center", flexShrink:0 }}>
          <button onClick={()=>navigateTo("profile")} style={{ padding:"4px 6px", borderRadius:7, border:"none", background:"transparent", cursor:"pointer", display:"flex", alignItems:"center", gap:7 }}>
            <Avatar username={username} size={28} radius={8} />
            <span style={{ color:"rgba(241,245,249,0.5)", fontWeight:600, fontSize:11 }}>{username}</span>
          </button>
          {profile?.subscription && profile.subscription !== "starter" && <SubBadge profile={profile} />}
          <LangToggle />
          <div onClick={()=>navigateTo("wallet")} style={{ background:"rgba(251,191,36,0.07)", border:"1px solid rgba(251,191,36,0.15)", borderRadius:7, padding:"3px 9px", cursor:"pointer" }}>
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", color:"#fbbf24", fontSize:13, letterSpacing:1 }}>🪙 {fmt(coins)}</span>
          </div>
          <div style={{ background:"rgba(16,185,129,0.07)", border:"1px solid rgba(16,185,129,0.15)", borderRadius:7, padding:"3px 9px" }}>
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", color:"#10b981", fontSize:13, letterSpacing:1 }}>💎 {fmt(sc)}</span>
          </div>
        </div>
        {/* Mobile : coins compacts */}
        <div className="show-mobile" style={{ display:"none", gap:5, alignItems:"center" }}>
          <div onClick={()=>navigateTo("wallet")} style={{ background:"rgba(251,191,36,0.08)", border:"1px solid rgba(251,191,36,0.18)", borderRadius:7, padding:"3px 9px", cursor:"pointer" }}>
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", color:"#fbbf24", fontSize:12, letterSpacing:1 }}>🪙 {fmt(coins)}</span>
          </div>
          <div style={{ background:"rgba(16,185,129,0.08)", border:"1px solid rgba(16,185,129,0.18)", borderRadius:7, padding:"3px 9px" }}>
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", color:"#10b981", fontSize:12, letterSpacing:1 }}>💎 {fmt(sc)}</span>
          </div>
        </div>
      </div>
      {/* Ligne 2 mobile : nav horizontale scrollable */}
      <div className="mobile-header-nav" style={{ display:"none", overflowX:"auto", scrollbarWidth:"none", borderTop:"1px solid rgba(241,245,249,0.04)", padding:"0 6px" }}>
        {[
          {id:"home",icon:"⚡",labelKey:"nav.home"},
          {id:"matches",icon:"⚽",labelKey:"nav.matches"},
          {id:"markets",icon:"📊",labelKey:"nav.markets"},
          {id:"community",icon:"💬",labelKey:"nav.community"},
          {id:"wallet",icon:"💰",labelKey:"nav.wallet"},
          {id:"leaderboard",icon:"🏆",labelKey:"nav.top_short"},
          {id:"store",icon:"🎁",labelKey:"nav.store"},
          {id:"profile",icon:"👤",labelKey:"nav.profile"},
        ].map(n=>(
          <button key={n.id} onClick={()=>navigateTo(n.id)} style={{ flexShrink:0, display:"flex", flexDirection:"column", alignItems:"center", padding:"6px 12px", border:"none", borderBottom:page===n.id?"2px solid #10b981":"2px solid transparent", background:"transparent", color:page===n.id?"#10b981":"rgba(241,245,249,0.45)", cursor:"pointer", fontSize:18, lineHeight:1, gap:2, transition:"all 0.15s" }}>
            <span>{n.icon}</span>
            <span style={{ fontSize:9, fontWeight:700, letterSpacing:0.3, whiteSpace:"nowrap" }}>{t(n.labelKey)}</span>
          </button>
        ))}
      </div>
    </div>

    <div key={page} className="page-slide-right page-content" style={{ maxWidth:980, margin:"0 auto", padding:"24px 20px 32px", position:"relative", zIndex:1 }}>
      {page==="home"&&<HomePage markets={markets} coins={coins} sc={sc} username={username} onBet={(m,side)=>{setBetModal(m);setBetInitialSide(side||"yes");}} onNavigate={navigateTo} matches={matches} onMatchBet={(m,pred)=>{setMatchBetModal(m);setMatchBetInitialPred(pred||"");}} profile={profile} leaderboard={leaderboard} session={session} showToast={showToast} />}
      {page==="matches"&&<MatchesPage matches={matches} onBet={(m,pred)=>{setMatchBetModal(m);setMatchBetInitialPred(pred||"");}} loading={matchesLoading} session={session} profile={profile} />}
      {page==="markets"&&<MarketsPage markets={markets} onBet={(m,side)=>{setBetModal(m);setBetInitialSide(side||"yes");}} profile={profile} session={session} showToast={showToast} />}
      {page==="wallet"&&<WalletPage coins={coins} sc={sc} bets={bets} matchBets={matchBets} profile={profile} onSpin={handleSpin} onWatchAd={handleWatchAd} onConvertSC={handleConvertSC} onConvertMCtoSC={handleConvertMCtoSC} onCashout={handleCashout} markets={markets} session={session} showToast={showToast} />}
      {page==="leaderboard"&&!publicProfileUser&&<LeaderboardPage leaderboard={leaderboard.length?leaderboard:[{rank:1,username,coins,xp:profile?.xp||0,total_wins:profile?.total_wins||0,total_bets:profile?.total_bets||0,total_profit:0}]} username={username} onViewProfile={(u)=>setPublicProfileUser(u)} profile={profile} session={session} showToast={showToast} />}
      {page==="leaderboard"&&publicProfileUser&&<PublicProfilePage username={publicProfileUser} onBack={()=>setPublicProfileUser(null)} leaderboard={leaderboard} session={session} profile={profile} showToast={showToast} />}
      {page==="store"&&<StorePage coins={coins} sc={sc} profile={profile} onRedeemSC={handleRedeemSC} onSubscribe={handleSubscribe} onNavigate={navigateTo} />}
      {page==="subscription"&&<SubscriptionPage profile={profile} onSubscribe={handleSubscribe} />}
      {page==="profile"&&<ProfilePage profile={profile} username={username} onLogout={handleLogout} onNavigate={navigateTo} session={session} />}
      {page==="howto"&&<HowItWorksPage onNavigate={navigateTo} />}
      {page==="community"&&<CommunityPage session={session} profile={profile} showToast={showToast} onViewProfile={(u)=>{setPublicProfileUser(u);navigateTo("leaderboard");}} />}
      {page==="friends"&&<FriendsPage profile={profile} session={session} onViewProfile={(u)=>setPublicProfileUser(u)} showToast={showToast} />}
      {page==="leagues"&&<LeaguesPage profile={profile} session={session} showToast={showToast} />}
    </div>

    {/* Bottom nav mobile */}
    <div className="mobile-bottom-nav" style={{ display:"none", position:"fixed", bottom:0, left:0, right:0, zIndex:200, background:"rgba(3,7,18,0.96)", backdropFilter:"blur(20px)", borderTop:"1px solid rgba(241,245,249,0.07)", paddingBottom:"env(safe-area-inset-bottom)" }}>
      {[
        {id:"home",icon:"⚡",labelKey:"nav.home"},
        {id:"matches",icon:"⚽",labelKey:"nav.matches"},
        {id:"markets",icon:"📊",labelKey:"nav.markets"},
        {id:"community",icon:"💬",labelKey:"nav.com_short"},
        {id:"wallet",icon:"💰",labelKey:"nav.wallet"},
        {id:"leaderboard",icon:"🏆",labelKey:"nav.top_short"},
        {id:"profile",icon:"👤",labelKey:"nav.profile"},
      ].map(n=>(
        <button key={n.id} onClick={()=>navigateTo(n.id)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"9px 2px 7px", border:"none", background:"transparent", color:page===n.id?"#10b981":"rgba(241,245,249,0.38)", cursor:"pointer", transition:"all 0.15s", position:"relative" }}>
          {page===n.id&&<div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:28, height:2, background:"#10b981", borderRadius:"0 0 2px 2px" }} />}
          <span style={{ fontSize:20, lineHeight:1, position:"relative" }}>
            {n.icon}
            {n.id==="community"&&pendingFriendCount>0&&<span style={{ position:"absolute", top:-2, right:-4, width:8, height:8, borderRadius:"50%", background:"#ef4444", border:"1.5px solid #030712" }} />}
          </span>
          <span style={{ fontSize:9, fontWeight:700, marginTop:3, letterSpacing:0.3 }}>{t(n.labelKey)}</span>
        </button>
      ))}
    </div>

{betModal&&(betModal.market_type==="multi"
  ?<MultiBetModal market={betModal} coins={coins} onClose={()=>setBetModal(null)} onConfirm={handleMultiBetConfirm} />
  :<BetModal market={betModal} coins={coins} onClose={()=>setBetModal(null)} onConfirm={handleBetConfirm} initialSide={betInitialSide} />
)}
    {matchBetModal&&<MatchBetModal match={matches.find(m=>m.id===matchBetModal.id)||matchBetModal} coins={coins} onClose={()=>setMatchBetModal(null)} onConfirm={handleMatchBetConfirm} betsFrozenUntil={betsFrozenUntil} initialPrediction={matchBetInitialPred} />}
    {toast&&<Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)} />}
    {showConfetti&&<Confetti onDone={()=>setShowConfetti(false)} />}
    {showOnboarding&&<OnboardingModal username={username} onClose={()=>{localStorage.setItem("mb_onboarded","1");setShowOnboarding(false);}} />}
  </div>;
}
