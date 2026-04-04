// ============================================================
// BADGES / XP
// ============================================================
export const BADGES = [
  { id: "rookie", label: "Rookie", minLevel: 1, maxLevel: 10, color: "#94a3b8", emoji: "🌱", glow: "rgba(148,163,184,0.25)" },
  { id: "scout", label: "Scout", minLevel: 11, maxLevel: 25, color: "#60a5fa", emoji: "🔍", glow: "rgba(96,165,250,0.25)" },
  { id: "analyst", label: "Analyst", minLevel: 26, maxLevel: 50, color: "#a78bfa", emoji: "📈", glow: "rgba(167,139,250,0.25)" },
  { id: "pro", label: "Pro", minLevel: 51, maxLevel: 80, color: "#fbbf24", emoji: "⚡", glow: "rgba(251,191,36,0.25)" },
  { id: "legend", label: "Legend", minLevel: 81, maxLevel: 999, color: "#34d399", emoji: "👑", glow: "rgba(52,211,153,0.3)" },
];
export const XP_PER_LEVEL = 100;

// ============================================================
// STORE — 1€ = 1 SC
// ============================================================
export const STORE_ITEMS = [
  { id: "s1", name: "Carte cadeau Amazon", cost: 50, emoji: "🛒", plan: "starter", planLabel: "Starter", planColor: "#94a3b8", value: "5€", description: "Code envoyé par email sous 48h" },
  { id: "s2", name: "Carte cadeau JD Sport", cost: 80, emoji: "👟", plan: "starter", planLabel: "Starter", planColor: "#94a3b8", value: "10€", description: "Code envoyé par email sous 48h" },
  { id: "s3", name: "Points FIFA", cost: 100, emoji: "🎮", plan: "starter", planLabel: "Starter", planColor: "#94a3b8", value: "10€", description: "Code envoyé par email sous 48h" },
  { id: "s4", name: "Maillot de foot officiel", cost: 400, emoji: "👕", plan: "pro", planLabel: "Pro", planColor: "#3b82f6", value: "Replica officielle", description: "Taille au choix, livraison sous 7j" },
  { id: "s5", name: "Carte cadeau Unisport", cost: 350, emoji: "⚽", plan: "pro", planLabel: "Pro", planColor: "#3b82f6", value: "50€", description: "Code envoyé par email sous 48h" },
  { id: "s6", name: "Maillot dédicacé", cost: 1200, emoji: "✍️", plan: "elite", planLabel: "Elite", planColor: "#f59e0b", value: "Signature originale", description: "Maillot officiel signé par un joueur pro" },
  { id: "s7", name: "Place VIP match", cost: 2000, emoji: "🏟️", plan: "elite", planLabel: "Elite", planColor: "#f59e0b", value: "Expérience unique", description: "Tribune VIP + accès coulisses sur demande" },
];

export const SUBSCRIPTION_PLANS = [
  {
    id: "starter",
    label: "Ligue Starter",
    price: 0,
    priceLabel: "Gratuit",
    color: "#94a3b8",
    emoji: "🌱",
    mcBoost: 100,
    features: ["100 MC chaque lundi","Roue quotidienne","Récompenses standard (cartes cadeaux 5-10€)","Pubs récompensées"],
    noFeatures: ["Cashout","Marchés exclusifs","Support prioritaire"],
  },
  {
    id: "pro",
    label: "Ligue Pro",
    price: 4.99,
    priceLabel: "4.99€/mois",
    color: "#3b82f6",
    emoji: "⚡",
    mcBoost: 150,
    priceId: "price_1TF03SEMwfOErJuWzQ59d54A", // Ligue Pro
    features: ["150 MC chaque lundi","Option Cashout","Récompenses Premium (maillots, tech)","Sans pub"],
    popular: true,
  },
  {
    id: "elite",
    label: "Ligue Elite",
    price: 14.99,
    priceLabel: "14.99€/mois",
    color: "#f59e0b",
    emoji: "👑",
    mcBoost: 250,
    priceId: "price_1TF03vEMwfOErJuWF6vlaoue", // Ligue Elite
    features: ["250 MC chaque lundi","Accès marchés exclusifs","Récompenses de luxe (VIP, dédicaces)","Sans pub","Support prioritaire"],
  },
];

export const WEEKLY_MC_LIMIT = 200;

export const SPIN_SEGMENTS = [
  { label: "10 MC", value: 10, type: "mc", color: "#3b82f6" },
  { label: "20 MC", value: 20, type: "mc", color: "#8b5cf6" },
  { label: "1 SC", value: 1, type: "sc", color: "#10b981" },
  { label: "50 MC", value: 50, type: "mc", color: "#f59e0b" },
  { label: "10 MC", value: 10, type: "mc", color: "#3b82f6" },
  { label: "100 MC", value: 100, type: "mc", color: "#ef4444" },
  { label: "20 MC", value: 20, type: "mc", color: "#8b5cf6" },
  { label: "200 MC", value: 200, type: "mc", color: "#fbbf24" },
];

export const COMPETITIONS = ["PL","FL1","CL","PD","BL1","SA","PPL","EL","BSA","MLS","ERE","TSL","NL","EURO","WC","FR","WCQ_UEFA","AFCON","COPA","U21UEFA"];

export const COMP_INFO = {
  "PL":       { name: "Premier League",            emoji: "🏴", color: "#3b82f6" },
  "FL1":      { name: "Ligue 1",                   emoji: "🇫🇷", color: "#ef4444" },
  "CL":       { name: "Champions League",          emoji: "🏆", color: "#fbbf24" },
  "PD":       { name: "La Liga",                   emoji: "🇪🇸", color: "#f97316" },
  "BL1":      { name: "Bundesliga",                emoji: "🇩🇪", color: "#6b7280" },
  "SA":       { name: "Serie A",                   emoji: "🇮🇹", color: "#10b981" },
  "PPL":      { name: "Liga Portugal",             emoji: "🇵🇹", color: "#8b5cf6" },
  "EL":       { name: "Europa League",             emoji: "🔶", color: "#f59e0b" },
  "WC":       { name: "Coupe du Monde",            emoji: "🌍", color: "#fbbf24" },
  "EURO":     { name: "Euro",                      emoji: "🇪🇺", color: "#3b82f6" },
  "NL":       { name: "Ligue des Nations",         emoji: "🌐", color: "#10b981" },
  "FR":       { name: "Amicaux Internationaux",    emoji: "🤝", color: "#94a3b8" },
  "BSA":      { name: "Brasileirao",               emoji: "🇧🇷", color: "#10b981" },
  "MLS":      { name: "MLS",                       emoji: "🇺🇸", color: "#ef4444" },
  "ERE":      { name: "Eredivisie",                emoji: "🇳🇱", color: "#f97316" },
  "TSL":      { name: "Süper Lig",                 emoji: "🇹🇷", color: "#ef4444" },
  "WCQ_UEFA": { name: "Qualif. Mondial UEFA",      emoji: "🌍", color: "#94a3b8" },
  "WCQ_CONC": { name: "Qualif. Mondial CONCACAF",  emoji: "🌍", color: "#94a3b8" },
  "WCQ_CONM": { name: "Qualif. Mondial CONMEBOL",  emoji: "🌍", color: "#94a3b8" },
  "WCQ_AFC":  { name: "Qualif. Mondial AFC",       emoji: "🌍", color: "#94a3b8" },
  "AFCON":    { name: "CAN",                       emoji: "🌍", color: "#f59e0b" },
  "COPA":     { name: "Copa América",              emoji: "🌎", color: "#10b981" },
  "U21UEFA":  { name: "Euro U21 Qualif.",           emoji: "🇪🇺", color: "#60a5fa" },
};

export const CLUB_COLORS = {
  "Arsenal": "#EF0107", "Chelsea": "#034694", "Liverpool": "#C8102E", "Man City": "#6CABDD",
  "Man United": "#DA291C", "Tottenham": "#132257", "Newcastle": "#000000", "Aston Villa": "#670E36",
  "PSG": "#004170", "Marseille": "#00A9E0", "Lyon": "#0032A0", "Monaco": "#E31837",
  "Real Madrid": "#00529F", "Barcelona": "#A50044", "Atletico": "#CB3524",
  "Bayern": "#DC052D", "Dortmund": "#FDE100", "Leverkusen": "#E32221",
  "Inter": "#010E80", "Juventus": "#000000", "Napoli": "#12A0C3", "Roma": "#8B0000",
  "Lorient": "#F36F21", "Le Havre": "#003399", "Brest": "#CC0000",
  "Reims": "#DC143C", "Metz": "#8B0000", "Strasbourg": "#003B8E",
  "Benfica": "#CC0000", "Porto": "#003B8E", "Sporting": "#00A859",
};

// ============================================================
// GLOBAL CSS
// ============================================================
export const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #030712; color: #f1f5f9; font-family: 'DM Sans', sans-serif; overflow-x: hidden; }
  body::before { content: ''; position: fixed; inset: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E"); pointer-events: none; z-index: 999; opacity: 0.35; }
  input::placeholder { color: rgba(241,245,249,0.2); }
  input:focus { border-color: rgba(16,185,129,0.5) !important; box-shadow: 0 0 0 3px rgba(16,185,129,0.1); }
  button { font-family: 'DM Sans', sans-serif; }
  @keyframes slideUp { from{transform:translateX(-50%) translateY(20px);opacity:0} to{transform:translateX(-50%) translateY(0);opacity:1} }
  @keyframes fadeInUp { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  @keyframes floatOrb { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-25px)} }
  @keyframes winPop { 0%{transform:scale(0.5);opacity:0} 60%{transform:scale(1.2)} 100%{transform:scale(1);opacity:1} }
  @keyframes slideInRight { from{transform:translateX(40px);opacity:0} to{transform:translateX(0);opacity:1} }
  @keyframes slideInLeft { from{transform:translateX(-40px);opacity:0} to{transform:translateX(0);opacity:1} }
  @keyframes ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
  @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  @keyframes confetti-fall { 0%{transform:translateY(-20px) rotate(0deg);opacity:1} 100%{transform:translateY(100vh) rotate(720deg);opacity:0} }
  @keyframes market-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,0.4)} 50%{box-shadow:0 0 0 8px rgba(16,185,129,0)} }
  @keyframes btn-press { 0%,100%{transform:scale(1)} 50%{transform:scale(0.96)} }
  .page-enter { animation: fadeInUp 0.3s ease forwards; }
  .page-slide-right { animation: slideInRight 0.3s ease forwards; }
  .page-slide-left { animation: slideInLeft 0.3s ease forwards; }
  .card-hover { transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; }
  .card-hover:hover { transform: translateY(-3px); box-shadow: 0 12px 30px rgba(0,0,0,0.3); }
  .btn-animated { transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease; }
  .btn-animated:hover:not(:disabled) { transform: translateY(-1px) scale(1.02); }
  .btn-animated:active:not(:disabled) { transform: scale(0.97); }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-thumb { background: rgba(16,185,129,0.2); border-radius: 99px; }
  .nav-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
  .nav-scroll::-webkit-scrollbar { display: none; }
  @media (max-width: 640px) {
    .nav-label { display: none; }
    .hide-mobile { display: none !important; }
    .coin-badge { padding: 3px 7px !important; }
    .coin-badge span { font-size: 11px !important; }
    .modal-overlay { align-items: flex-end !important; padding: 0 !important; }
    .modal-inner { width: 100% !important; max-width: 100vw !important; border-radius: 22px 22px 0 0 !important; max-height: 92vh !important; padding-bottom: max(24px, env(safe-area-inset-bottom)) !important; }
  }
`;
