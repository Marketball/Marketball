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
export const XP_PER_LEVEL = 100; // legacy — ne plus utiliser directement
// Nouveau système : niveau N nécessite xpForLevel(N) XP cumulés
// Niveau 1→2 : 100 XP, puis +50 par niveau (150, 200, 250...)
// Formule : xpForLevel(N) = 25 × (N-1) × (N+2)

// ============================================================
// STORE — 1 SC = 0,10 € de cadeau (valeur réelle × 10 = prix SC)
// ============================================================
export const STORE_ITEMS = [
  // ── TIER 1 — Free (30-70 SC) ───────────────────────────────
  { id: "s1",  name: "Booster Topps Match Attax",       name_en: "Topps Match Attax Booster Pack",    cost: 30,  emoji: "🃏", plan: "starter", planLabel: "Free", planColor: "#94a3b8", value: "~3€", description: "8 cartes UCL ou Liga, livraison sous 10j",                           description_en: "8 UCL or Liga cards, delivered within 10 days" },
  { id: "s2",  name: "Booster Topps UCL",               name_en: "Topps UCL Booster Pack",            cost: 40,  emoji: "🏆", plan: "starter", planLabel: "Free", planColor: "#94a3b8", value: "~4€", description: "6 cartes + 1 rare Champions League",                                description_en: "6 cards + 1 rare Champions League card" },
  { id: "s3",  name: "Carte cadeau Amazon 5€",          name_en: "Amazon Gift Card €5",               cost: 50,  emoji: "🛒", plan: "starter", planLabel: "Free", planColor: "#94a3b8", value: "5€",  description: "Code envoyé par email sous 48h",                                    description_en: "Code sent by email within 48h" },
  { id: "s4",  name: "Carte cadeau Fanatics 5€",        name_en: "Fanatics Gift Card €5",             cost: 50,  emoji: "👟", plan: "starter", planLabel: "Free", planColor: "#94a3b8", value: "5€",  description: "Code envoyé par email sous 48h",                                    description_en: "Code sent by email within 48h" },
  { id: "s5",  name: "Pack 3 boosters Topps",           name_en: "3 Topps Booster Packs",             cost: 70,  emoji: "📦", plan: "starter", planLabel: "Free", planColor: "#94a3b8", value: "~7€", description: "3 boosters Topps au choix, livraison sous 10j",                     description_en: "3 Topps boosters of your choice, delivered within 10 days" },
  // ── TIER 2 — Standard (100-320 SC) ────────────────────────
  { id: "s6",  name: "Boîte Topps Match Attax",         name_en: "Topps Match Attax Box",             cost: 100, emoji: "🎁", plan: "pro", planLabel: "Standard", planColor: "#3b82f6", value: "~10€", description: "18 boosters UCL ou Liga, livraison sous 10j",                      description_en: "18 UCL or Liga boosters, delivered within 10 days" },
  { id: "s7",  name: "Blaster Box Topps Bundesliga",    name_en: "Topps Bundesliga Blaster Box",      cost: 130, emoji: "🃏", plan: "pro", planLabel: "Standard", planColor: "#3b82f6", value: "~13€", description: "Blaster Box Topps Chrome Bundesliga",                               description_en: "Topps Chrome Bundesliga Blaster Box" },
  { id: "s8",  name: "Carte cadeau Amazon 15€",         name_en: "Amazon Gift Card €15",              cost: 150, emoji: "🛒", plan: "pro", planLabel: "Standard", planColor: "#3b82f6", value: "15€",  description: "Code envoyé par email sous 48h",                                    description_en: "Code sent by email within 48h" },
  { id: "s9",  name: "Carte cadeau Fanatics 15€",       name_en: "Fanatics Gift Card €15",            cost: 150, emoji: "👟", plan: "pro", planLabel: "Standard", planColor: "#3b82f6", value: "15€",  description: "Code envoyé par email sous 48h",                                    description_en: "Code sent by email within 48h" },
  { id: "s10", name: "Blaster Box Topps Premier League",name_en: "Topps Premier League Blaster Box",  cost: 150, emoji: "🏴", plan: "pro", planLabel: "Standard", planColor: "#3b82f6", value: "~15€", description: "Blaster Box Topps Chrome Premier League",                          description_en: "Topps Chrome Premier League Blaster Box" },
  { id: "s11", name: "Hobby Box Topps Ligue 1",         name_en: "Topps Ligue 1 Hobby Box",           cost: 280, emoji: "🇫🇷", plan: "pro", planLabel: "Standard", planColor: "#3b82f6", value: "~28€", description: "24 boosters + relics garantis, livraison sous 14j",               description_en: "24 boosters + guaranteed relics, delivered within 14 days" },
  { id: "s12", name: "Carte cadeau Amazon 30€",         name_en: "Amazon Gift Card €30",              cost: 300, emoji: "🛒", plan: "pro", planLabel: "Standard", planColor: "#3b82f6", value: "30€",  description: "Code envoyé par email sous 48h",                                    description_en: "Code sent by email within 48h" },
  { id: "s13", name: "Hobby Box Topps UCL",             name_en: "Topps UCL Hobby Box",               cost: 320, emoji: "🏆", plan: "pro", planLabel: "Standard", planColor: "#3b82f6", value: "~32€", description: "Hobby Box Topps UEFA Champions League",                            description_en: "Topps UEFA Champions League Hobby Box" },
  { id: "s14", name: "Place match tribune",             name_en: "Stadium Stand Ticket",              cost: 450, emoji: "🏟️", plan: "pro", planLabel: "Standard", planColor: "#3b82f6", value: "~45€", description: "Tribune standard, clubs partenaires",                              description_en: "Standard stand, partner clubs" },
  { id: "s15", name: "Carte cadeau Fanatics 50€",       name_en: "Fanatics Gift Card €50",            cost: 500, emoji: "👟", plan: "pro", planLabel: "Standard", planColor: "#3b82f6", value: "50€",  description: "Code envoyé par email sous 48h",                                    description_en: "Code sent by email within 48h" },
  // ── TIER 3-5 — Premium (700+ SC) ──────────────────────────
  { id: "s16", name: "Carte Topps autographe Ligue 1",  name_en: "Topps Ligue 1 Autograph Card",      cost: 700,  emoji: "✍️", plan: "elite", planLabel: "Premium", planColor: "#f59e0b", value: "~70€",  description: "Autographe joueur Ligue 1 certifié, livraison assurée",          description_en: "Certified Ligue 1 player autograph, insured delivery" },
  { id: "s17", name: "Carte cadeau Amazon 75€",         name_en: "Amazon Gift Card €75",              cost: 750,  emoji: "🛒", plan: "elite", planLabel: "Premium", planColor: "#f59e0b", value: "75€",   description: "Code envoyé par email sous 48h",                                  description_en: "Code sent by email within 48h" },
  { id: "s18", name: "Maillot de foot officiel",        name_en: "Official Football Jersey",          cost: 800,  emoji: "👕", plan: "elite", planLabel: "Premium", planColor: "#f59e0b", value: "~80€",  description: "Maillot officiel au choix, taille au choix, livraison sous 14j", description_en: "Official jersey of your choice, any size, delivered within 14 days" },
  { id: "s19", name: "Pack 2 places match premium",     name_en: "2 Premium Match Tickets",           cost: 800,  emoji: "🎟️", plan: "elite", planLabel: "Premium", planColor: "#f59e0b", value: "~80€",  description: "2 places catégorie premium, clubs partenaires",                   description_en: "2 premium category seats, partner clubs" },
  { id: "s20", name: "Visite stade + vestiaires",       name_en: "Stadium & Locker Room Tour",        cost: 900,  emoji: "🏟️", plan: "elite", planLabel: "Premium", planColor: "#f59e0b", value: "~90€",  description: "Visite exclusive stade + vestiaires, clubs partenaires",         description_en: "Exclusive stadium + locker room tour, partner clubs" },
  { id: "s21", name: "Carte cadeau Fanatics 100€",      name_en: "Fanatics Gift Card €100",           cost: 1000, emoji: "👟", plan: "elite", planLabel: "Premium", planColor: "#f59e0b", value: "100€",  description: "Code envoyé par email sous 48h",                                  description_en: "Code sent by email within 48h" },
  { id: "s22", name: "Autographe superstar (Mbappé, Vini...)", name_en: "Superstar Autograph (Mbappé, Vini...)", cost: 1500, emoji: "⭐", plan: "elite", planLabel: "Premium", planColor: "#f59e0b", value: "~150€", description: "Carte Topps autographe superstar certifiée",             description_en: "Certified Topps superstar autograph card" },
  { id: "s23", name: "Maillot signé + certificat",      name_en: "Signed Jersey + Certificate",       cost: 2000, emoji: "🏅", plan: "elite", planLabel: "Premium", planColor: "#f59e0b", value: "~200€", description: "Maillot officiel signé joueur pro + certificat d'authenticité",  description_en: "Official jersey signed by a pro player + certificate of authenticity" },
  { id: "s24", name: "Pack VIP match + hospitalité",    name_en: "VIP Match + Hospitality Pack",      cost: 2000, emoji: "🥂", plan: "elite", planLabel: "Premium", planColor: "#f59e0b", value: "~200€", description: "Pack VIP + hospitalité club, expérience unique",                  description_en: "VIP pack + club hospitality, unique experience" },
  { id: "s25", name: "Carte cadeau Amazon 200€",        name_en: "Amazon Gift Card €200",             cost: 2000, emoji: "🛒", plan: "elite", planLabel: "Premium", planColor: "#f59e0b", value: "200€",  description: "Code envoyé par email sous 48h",                                  description_en: "Code sent by email within 48h" },
  { id: "s26", name: "Week-end supporter VIP",          name_en: "VIP Fan Weekend",                   cost: 2500, emoji: "✈️", plan: "elite", planLabel: "Premium", planColor: "#f59e0b", value: "~250€", description: "Hôtel + 2 places match, week-end supporter complet",             description_en: "Hotel + 2 match tickets, full supporter weekend" },
  { id: "s27", name: "Carte Topps 1/1 — One of One",   name_en: "Topps 1/1 — One of One Card",       cost: 2500, emoji: "💎", plan: "elite", planLabel: "Premium", planColor: "#f59e0b", value: "~250€", description: "Exemplaire unique, numéroté 1/1, certifié Topps",                description_en: "Unique copy, numbered 1/1, Topps certified" },
  { id: "s28", name: "Séance photo avec joueurs pros",  name_en: "Photo Session with Pro Players",    cost: 3000, emoji: "📸", plan: "elite", planLabel: "Premium", planColor: "#f59e0b", value: "~300€", description: "Partenariat club, séance photo exclusive avec joueurs",          description_en: "Club partnership, exclusive photo session with players" },
];

export const SUBSCRIPTION_PLANS = [
  {
    id: "starter",
    label: "Ligue Free",
    price: 0,
    priceLabel: "Gratuit",
    color: "#94a3b8",
    emoji: "🌱",
    mcBoost: 1000,
    bonusMC: 3000,
    features: ["sub.feat.mc_1000_monday","sub.feat.mc_3000_signup","sub.feat.daily_wheel","sub.feat.rewards_t1","sub.feat.rewarded_ads"],
    noFeatures: ["sub.nofeat.cashout","sub.nofeat.exclusive_markets","sub.nofeat.priority_support"],
  },
  {
    id: "pro",
    label: "Ligue Standard",
    price: 5,
    priceLabel: "5€/mois",
    color: "#3b82f6",
    emoji: "⚡",
    mcBoost: 3000,
    bonusMC: 9000,
    priceId: "price_1TOJWuIB3HPK0xH5DzsgINcE",
    features: ["sub.feat.mc_3000_monday","sub.feat.mc_9000_signup","sub.feat.cashout_option","sub.feat.rewards_t2","sub.feat.no_ads"],
    popular: true,
  },
  {
    id: "elite",
    label: "Ligue Premium",
    price: 15,
    priceLabel: "15€/mois",
    color: "#f59e0b",
    emoji: "👑",
    mcBoost: 8000,
    bonusMC: 24000,
    priceId: "price_1TOJYAIB3HPK0xH5AusdEOFn",
    features: ["sub.feat.mc_8000_monday","sub.feat.mc_24000_signup","sub.feat.exclusive_markets","sub.feat.rewards_t35","sub.feat.no_ads","sub.feat.priority_support"],
  },
];

export const WEEKLY_MC_LIMIT = 200;
// Taux de conversion MC → SC (fin de semaine, volontairement défavorable)
export const MC_TO_SC_RATE = 500; // 500 MC = 1 SC

export const SPIN_SEGMENTS = [
  { label: "1 SC",   value: 1, type: "sc", color: "#10b981" },
  { label: "50 MC",  value: 50, type: "mc", color: "#3b82f6" },
  { label: "2 SC",   value: 2, type: "sc", color: "#34d399" },
  { label: "100 MC", value: 100, type: "mc", color: "#8b5cf6" },
  { label: "1 SC",   value: 1, type: "sc", color: "#10b981" },
  { label: "200 MC", value: 200, type: "mc", color: "#f59e0b" },
  { label: "3 SC",   value: 3, type: "sc", color: "#fbbf24" },
  { label: "5 SC 🎰", value: 5, type: "sc", color: "#ef4444" },
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

// Clubs affichés par défaut (grille)
export const POPULAR_CLUBS = [
  { name:"Paris Saint-Germain", flag:"🇫🇷" },
  { name:"Marseille",           flag:"🇫🇷" },
  { name:"Lyon",                flag:"🇫🇷" },
  { name:"Monaco",              flag:"🇫🇷" },
  { name:"Lille",               flag:"🇫🇷" },
  { name:"Nice",                flag:"🇫🇷" },
  { name:"Arsenal",             flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name:"Liverpool",           flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name:"Manchester City",     flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name:"Manchester United",   flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name:"Chelsea",             flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name:"Real Madrid",         flag:"🇪🇸" },
  { name:"Barcelona",           flag:"🇪🇸" },
  { name:"Atletico Madrid",     flag:"🇪🇸" },
  { name:"Bayern Munich",       flag:"🇩🇪" },
  { name:"Borussia Dortmund",   flag:"🇩🇪" },
  { name:"Juventus",            flag:"🇮🇹" },
  { name:"Inter Milan",         flag:"🇮🇹" },
  { name:"AC Milan",            flag:"🇮🇹" },
  { name:"Napoli",              flag:"🇮🇹" },
];

// Liste complète pour la recherche
export const ALL_CLUBS = [
  // 🇫🇷 Ligue 1
  { name:"Paris Saint-Germain", flag:"🇫🇷" }, { name:"Marseille", flag:"🇫🇷" }, { name:"Lyon", flag:"🇫🇷" },
  { name:"Monaco", flag:"🇫🇷" }, { name:"Lille", flag:"🇫🇷" }, { name:"Nice", flag:"🇫🇷" },
  { name:"Lens", flag:"🇫🇷" }, { name:"Rennes", flag:"🇫🇷" }, { name:"Strasbourg", flag:"🇫🇷" },
  { name:"Nantes", flag:"🇫🇷" }, { name:"Toulouse", flag:"🇫🇷" }, { name:"Montpellier", flag:"🇫🇷" },
  { name:"Le Havre", flag:"🇫🇷" }, { name:"Brest", flag:"🇫🇷" }, { name:"Reims", flag:"🇫🇷" },
  { name:"Metz", flag:"🇫🇷" }, { name:"Lorient", flag:"🇫🇷" }, { name:"Auxerre", flag:"🇫🇷" },
  { name:"Angers", flag:"🇫🇷" }, { name:"Saint-Etienne", flag:"🇫🇷" }, { name:"Bordeaux", flag:"🇫🇷" },
  { name:"Paris FC", flag:"🇫🇷" }, { name:"Stade de Reims", flag:"🇫🇷" }, { name:"Clermont Foot", flag:"🇫🇷" },
  // 🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League
  { name:"Arsenal", flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿" }, { name:"Chelsea", flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿" }, { name:"Liverpool", flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name:"Manchester City", flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿" }, { name:"Manchester United", flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿" }, { name:"Tottenham", flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name:"Newcastle", flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿" }, { name:"Aston Villa", flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿" }, { name:"Brighton", flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name:"West Ham", flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿" }, { name:"Crystal Palace", flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿" }, { name:"Brentford", flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name:"Fulham", flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿" }, { name:"Wolverhampton", flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿" }, { name:"Everton", flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name:"Leicester City", flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿" }, { name:"Nottingham Forest", flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿" }, { name:"Southampton", flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name:"Leeds United", flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿" }, { name:"Ipswich Town", flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  // 🇪🇸 Liga
  { name:"Real Madrid", flag:"🇪🇸" }, { name:"Barcelona", flag:"🇪🇸" }, { name:"Atletico Madrid", flag:"🇪🇸" },
  { name:"Sevilla", flag:"🇪🇸" }, { name:"Villarreal", flag:"🇪🇸" }, { name:"Real Sociedad", flag:"🇪🇸" },
  { name:"Athletic Bilbao", flag:"🇪🇸" }, { name:"Valencia", flag:"🇪🇸" }, { name:"Betis", flag:"🇪🇸" },
  { name:"Osasuna", flag:"🇪🇸" }, { name:"Celta Vigo", flag:"🇪🇸" }, { name:"Girona", flag:"🇪🇸" },
  { name:"Getafe", flag:"🇪🇸" }, { name:"Las Palmas", flag:"🇪🇸" }, { name:"Alaves", flag:"🇪🇸" },
  // 🇩🇪 Bundesliga
  { name:"Bayern Munich", flag:"🇩🇪" }, { name:"Borussia Dortmund", flag:"🇩🇪" }, { name:"Bayer Leverkusen", flag:"🇩🇪" },
  { name:"RB Leipzig", flag:"🇩🇪" }, { name:"Eintracht Frankfurt", flag:"🇩🇪" }, { name:"Wolfsburg", flag:"🇩🇪" },
  { name:"Borussia Mönchengladbach", flag:"🇩🇪" }, { name:"Stuttgart", flag:"🇩🇪" }, { name:"Freiburg", flag:"🇩🇪" },
  { name:"Hoffenheim", flag:"🇩🇪" }, { name:"Schalke 04", flag:"🇩🇪" }, { name:"Hamburger SV", flag:"🇩🇪" },
  // 🇮🇹 Serie A
  { name:"Juventus", flag:"🇮🇹" }, { name:"Inter Milan", flag:"🇮🇹" }, { name:"AC Milan", flag:"🇮🇹" },
  { name:"Napoli", flag:"🇮🇹" }, { name:"Roma", flag:"🇮🇹" }, { name:"Lazio", flag:"🇮🇹" },
  { name:"Fiorentina", flag:"🇮🇹" }, { name:"Atalanta", flag:"🇮🇹" }, { name:"Torino", flag:"🇮🇹" },
  { name:"Bologna", flag:"🇮🇹" }, { name:"Sampdoria", flag:"🇮🇹" }, { name:"Udinese", flag:"🇮🇹" },
  { name:"Cagliari", flag:"🇮🇹" }, { name:"Venezia", flag:"🇮🇹" }, { name:"Genoa", flag:"🇮🇹" },
  // 🇵🇹 Portugal
  { name:"Benfica", flag:"🇵🇹" }, { name:"Porto", flag:"🇵🇹" }, { name:"Sporting CP", flag:"🇵🇹" },
  { name:"Braga", flag:"🇵🇹" }, { name:"Vitoria SC", flag:"🇵🇹" },
  // 🇳🇱 Pays-Bas
  { name:"Ajax", flag:"🇳🇱" }, { name:"Feyenoord", flag:"🇳🇱" }, { name:"PSV Eindhoven", flag:"🇳🇱" },
  { name:"AZ Alkmaar", flag:"🇳🇱" }, { name:"Utrecht", flag:"🇳🇱" },
  // 🇧🇪 Belgique
  { name:"Anderlecht", flag:"🇧🇪" }, { name:"Club Bruges", flag:"🇧🇪" }, { name:"Gent", flag:"🇧🇪" },
  // 🇹🇷 Turquie
  { name:"Galatasaray", flag:"🇹🇷" }, { name:"Fenerbahce", flag:"🇹🇷" }, { name:"Besiktas", flag:"🇹🇷" },
  // 🏴󠁧󠁢󠁳󠁣󠁴󠁿 Écosse
  { name:"Celtic", flag:"🏴󠁧󠁢󠁳󠁣󠁴󠁿" }, { name:"Rangers", flag:"🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  // 🇧🇷 Brésil
  { name:"Flamengo", flag:"🇧🇷" }, { name:"Palmeiras", flag:"🇧🇷" }, { name:"São Paulo", flag:"🇧🇷" },
  { name:"Corinthians", flag:"🇧🇷" }, { name:"Santos", flag:"🇧🇷" }, { name:"Fluminense", flag:"🇧🇷" },
  // 🇦🇷 Argentine
  { name:"Boca Juniors", flag:"🇦🇷" }, { name:"River Plate", flag:"🇦🇷" },
  // 🇺🇸 MLS
  { name:"LA Galaxy", flag:"🇺🇸" }, { name:"Inter Miami", flag:"🇺🇸" }, { name:"New York City FC", flag:"🇺🇸" },
];

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
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Rajdhani:wght@400;500;600;700&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { overflow-x: hidden; max-width: 100vw; }
  body { background: #030712; color: #f1f5f9; font-family: 'Rajdhani', sans-serif; font-weight: 500; font-size: 15px; letter-spacing: 0.01em; touch-action: pan-y; }
  /* Bloquer le scroll du fond quand une modale est ouverte */
  body:has(.modal-overlay) { overflow: hidden; }
  /* L'overlay lui-même est scrollable (au cas où le contenu dépasse) */
  .modal-overlay { overflow-y: auto; }
  body::before { content: ''; position: fixed; inset: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E"); pointer-events: none; z-index: 999; opacity: 0.35; }
  input::placeholder { color: rgba(241,245,249,0.2); font-family: 'Rajdhani', sans-serif; }
  input:focus { border-color: rgba(16,185,129,0.5) !important; box-shadow: 0 0 0 3px rgba(16,185,129,0.1); }
  button { font-family: 'Rajdhani', sans-serif; font-weight: 700; }
  /* Monospace data treatment */
  .mono { font-family: 'Space Mono', monospace !important; }
  /* Ambient breathing for hero orbs */
  @keyframes orb-breathe { 0%,100%{transform:scale(1) translateY(0);opacity:0.6} 50%{transform:scale(1.15) translateY(-10px);opacity:1} }
  @keyframes scan-line { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
  @keyframes number-flash { 0%{opacity:0;transform:translateY(8px)} 100%{opacity:1;transform:translateY(0)} }
  /* Sharp primary CTA */
  .btn-sharp { border-radius:2px; text-transform:uppercase; letter-spacing:3px; font-family:'Rajdhani',sans-serif; font-weight:700; font-size:11px; }
  /* Horizontal rule as design element */
  .rule-accent { height:1px; background:linear-gradient(90deg,rgba(16,185,129,0.5),transparent); border:none; margin:0; }
  .rule-amber  { height:1px; background:linear-gradient(90deg,rgba(245,158,11,0.5),transparent); border:none; margin:0; }
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
  :root {
    --c-green:#10b981; --c-amber:#f59e0b; --c-yellow:#fbbf24;
    --c-blue:#3b82f6; --c-red:#ef4444; --c-text:#f1f5f9;
    --surface:rgba(241,245,249,0.02); --surface-h:rgba(241,245,249,0.045);
    --border:rgba(241,245,249,0.07); --border-l:rgba(241,245,249,0.04);
    --r:10px; --r-sm:5px; --r-tag:4px;
  }
  ::selection { background:rgba(16,185,129,0.25); color:#f1f5f9; }
  .page-enter { animation: fadeInUp 0.3s ease forwards; }
  .page-slide-right { animation: slideInRight 0.3s ease forwards; }
  .page-slide-left { animation: slideInLeft 0.3s ease forwards; }
  /* GSAP handles all card transforms */
  .card-hover { will-change:transform; transition:box-shadow 0.28s ease, border-color 0.28s ease; }
  .card-hover:hover { transform:none !important; box-shadow:none; }
  .btn-animated { transition: transform 0.15s ease, background 0.18s ease, border-color 0.18s ease, color 0.18s ease; }
  .btn-animated:hover:not(:disabled) { transform: translateY(-1px); }
  .btn-animated:active:not(:disabled) { transform: scale(0.97); }
  /* Editorial tag — sharp corners, uppercase, tight tracking */
  .tag-sharp { display:inline-flex; align-items:center; font-size:9px; font-weight:800; letter-spacing:1.5px; text-transform:uppercase; padding:3px 7px; border-radius:4px; border-width:1px; border-style:solid; }
  /* Horizontal rule divider */
  .section-rule { border:none; border-top:1px solid rgba(241,245,249,0.05); margin:0; }
  /* Data label — section heading micro */
  .data-label { font-size:8px; font-weight:800; letter-spacing:2px; text-transform:uppercase; color:rgba(241,245,249,0.28); }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-thumb { background: rgba(16,185,129,0.25); border-radius: 99px; }
  .mobile-header-nav { -webkit-overflow-scrolling: touch; }
  .mobile-header-nav::-webkit-scrollbar { display: none; }
  .sticky-header { padding-top: constant(safe-area-inset-top); padding-top: env(safe-area-inset-top); }
  @media (max-width: 640px) {
    .hide-mobile { display: none !important; }
    .show-mobile { display: flex !important; }
    .mobile-header-nav { display: flex !important; }
    .mobile-bottom-nav { display: none !important; }
    .page-content { padding: 10px 11px 24px !important; }

    /* iOS : empêche le zoom auto sur focus input (déclenché si font-size < 16px) */
    input, select, textarea { font-size: 16px !important; }

    /* Header ligne 1 plus basse */
    .header-row1 { height: 42px !important; }

    /* Nav ligne 2 plus compacte */
    .mobile-header-nav button { padding: 5px 10px !important; font-size: 16px !important; }
    .mobile-header-nav button span:last-child { font-size: 8px !important; }

    /* Cartes plus compactes */
    .card-hover { padding: 13px 14px !important; border-radius: 14px !important; }

    /* Modales bottom-sheet */
    .modal-overlay { align-items: flex-end !important; padding: 0 !important; overflow-y: hidden !important; }
    .modal-inner { width: 100% !important; max-width: 100vw !important; border-radius: 20px 20px 0 0 !important; max-height: min(92vh, 92svh) !important; overflow-y: auto !important; padding: 18px 16px max(18px, env(safe-area-inset-bottom)) !important; }

    /* Réduire les grands chiffres dans les cartes */
    .prob-pct { font-size: 26px !important; }
    .prob-pct span { font-size: 14px !important; }

    /* Désactiver hover transform sur tactile */
    .card-hover:hover { transform: none; }
    .btn-animated:hover:not(:disabled) { transform: none; }
  }
`;
