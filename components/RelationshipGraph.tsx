"use client";
// Lightweight SVG relationship graph — no library dependency
type Node = { id: string; label: string; type: "project" | "agency" | "location" | "vendor" | "peer" };
type Edge = { from: string; to: string; label?: string };

export function RelationshipGraph({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) {
  const centerX = 400, centerY = 220;
  // Place first node (project) at center, others around it
  const center = nodes[0];
  const others = nodes.slice(1);
  const radius = 170;
  const positions = new Map<string, { x: number; y: number }>();
  positions.set(center.id, { x: centerX, y: centerY });
  others.forEach((n, i) => {
    const angle = (i / others.length) * Math.PI * 2 - Math.PI / 2;
    positions.set(n.id, {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius
    });
  });

  const colors: Record<string, string> = {
    project: "#3b82f6", agency: "#f97316", location: "#22d3ee", vendor: "#a78bfa", peer: "#f59e0b"
  };

  return (
    <div className="w-full overflow-x-auto">
      <svg width="800" height="440" viewBox="0 0 800 440" className="w-full max-w-[900px] mx-auto">
        {edges.map((e, i) => {
          const a = positions.get(e.from); const b = positions.get(e.to);
          if (!a || !b) return null;
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#334155" strokeWidth="1.5" />;
        })}
        {nodes.map(n => {
          const p = positions.get(n.id)!;
          const isCenter = n.id === center.id;
          return (
            <g key={n.id} transform={`translate(${p.x},${p.y})`}>
              <circle r={isCenter ? 34 : 22} fill={colors[n.type] + "33"} stroke={colors[n.type]} strokeWidth={2} />
              <text textAnchor="middle" y={isCenter ? 4 : 3} fontSize={isCenter ? 12 : 10} fill="#e5e7eb" fontWeight={isCenter ? 700 : 500}>
                {truncate(n.label, isCenter ? 16 : 12)}
              </text>
              <text textAnchor="middle" y={isCenter ? 50 : 38} fontSize={9} fill="#94a3b8" textTransform="uppercase" letterSpacing={1}>
                {n.type}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
function truncate(s: string, n: number) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }
