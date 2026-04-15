// Génère un avatar coloré avec les initiales du pseudo
// La couleur est déterministe : toujours la même pour un même username

const COLORS = [
  ["#6366f1","#4f46e5"], // indigo
  ["#10b981","#059669"], // vert
  ["#f59e0b","#d97706"], // amber
  ["#ef4444","#dc2626"], // rouge
  ["#8b5cf6","#7c3aed"], // violet
  ["#3b82f6","#2563eb"], // bleu
  ["#ec4899","#db2777"], // rose
  ["#f97316","#ea580c"], // orange
  ["#14b8a6","#0d9488"], // teal
  ["#a855f7","#9333ea"], // purple
];

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/[\s_\-\.]+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getColor(name) {
  if (!name) return COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function Avatar({ username, size = 36, radius = 10, fontSize = null }) {
  const initials = getInitials(username);
  const [from, to] = getColor(username);
  const fs = fontSize || Math.round(size * 0.38);
  return (
    <div style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0,
      background: `linear-gradient(135deg,${from},${to})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Bebas Neue',sans-serif", fontSize: fs, letterSpacing: 1,
      color: "#fff", userSelect: "none",
      boxShadow: `0 4px 12px ${from}40`,
    }}>
      {initials}
    </div>
  );
}
