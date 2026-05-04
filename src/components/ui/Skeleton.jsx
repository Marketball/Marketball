if (typeof document !== "undefined" && !document.getElementById("mb-sk")) {
  const s = document.createElement("style");
  s.id = "mb-sk";
  s.textContent = `@keyframes mbShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`;
  document.head.appendChild(s);
}

const S = {
  background: "linear-gradient(90deg,rgba(241,245,249,0.04) 0%,rgba(241,245,249,0.09) 50%,rgba(241,245,249,0.04) 100%)",
  backgroundSize: "200% 100%",
  animation: "mbShimmer 1.6s ease-in-out infinite",
  borderRadius: 8,
};

export function SkeletonLine({ width = "100%", height = 14, style }) {
  return <div style={{ ...S, width, height, flexShrink: 0, ...style }} />;
}

export function SkeletonCircle({ size = 40 }) {
  return <div style={{ ...S, width: size, height: size, borderRadius: "50%", flexShrink: 0 }} />;
}

export function SkeletonMatchCard() {
  return (
    <div style={{ background: "rgba(241,245,249,0.02)", border: "1px solid rgba(241,245,249,0.05)", borderRadius: 16, padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <SkeletonLine width={70} height={10} />
        <SkeletonLine width={45} height={10} />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, flex: 1 }}>
          <SkeletonCircle size={38} />
          <SkeletonLine width={60} height={10} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
          <SkeletonLine width={44} height={22} style={{ borderRadius: 8 }} />
          <SkeletonLine width={30} height={9} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, flex: 1 }}>
          <SkeletonCircle size={38} />
          <SkeletonLine width={60} height={10} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <SkeletonLine height={36} style={{ flex: 1, borderRadius: 10 }} />
        <SkeletonLine height={36} style={{ flex: 1, borderRadius: 10 }} />
        <SkeletonLine height={36} style={{ flex: 1, borderRadius: 10 }} />
      </div>
    </div>
  );
}

export function SkeletonMarketCard() {
  return (
    <div style={{ background: "rgba(241,245,249,0.02)", border: "1px solid rgba(241,245,249,0.05)", borderRadius: 16, padding: "18px 20px" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <SkeletonLine width={52} height={20} style={{ borderRadius: 20 }} />
        <SkeletonLine width={90} height={10} />
      </div>
      <SkeletonLine width="88%" height={13} style={{ marginBottom: 7 }} />
      <SkeletonLine width="62%" height={13} style={{ marginBottom: 18 }} />
      <SkeletonLine height={7} style={{ borderRadius: 4, marginBottom: 10 }} />
      <div style={{ display: "flex", gap: 8 }}>
        <SkeletonLine height={40} style={{ flex: 1, borderRadius: 10 }} />
        <SkeletonLine height={40} style={{ flex: 1, borderRadius: 10 }} />
      </div>
    </div>
  );
}

export function SkeletonLeaderRow() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: "rgba(241,245,249,0.02)", borderRadius: 14 }}>
      <SkeletonLine width={22} height={14} style={{ flexShrink: 0 }} />
      <SkeletonCircle size={36} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <SkeletonLine width="50%" height={12} />
        <SkeletonLine width="30%" height={9} />
      </div>
      <SkeletonLine width={48} height={14} style={{ flexShrink: 0 }} />
    </div>
  );
}

export function SkeletonBetRow() {
  return (
    <div style={{ background: "rgba(241,245,249,0.02)", border: "1px solid rgba(241,245,249,0.05)", borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SkeletonLine width="60%" height={12} />
        <SkeletonLine width={50} height={20} style={{ borderRadius: 8 }} />
      </div>
      <SkeletonLine width="40%" height={10} />
      <div style={{ display: "flex", gap: 16 }}>
        <SkeletonLine width={60} height={10} />
        <SkeletonLine width={80} height={10} />
      </div>
    </div>
  );
}
