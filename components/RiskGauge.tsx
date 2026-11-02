import { riskColor } from "@/lib/format";
import clsx from "clsx";

export function RiskGauge({ score, category }: { score: number; category: string }) {
  const pct = Math.max(0, Math.min(100, score));
  const stroke = category === "CRITICAL" ? "#ef4444" : category === "HIGH" ? "#f97316" : category === "MEDIUM" ? "#f59e0b" : "#10b981";
  const r = 60, c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <div className="flex items-center gap-4">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} stroke="#1f2a44" strokeWidth="14" fill="none" />
        <circle cx="70" cy="70" r={r} stroke={stroke} strokeWidth="14" fill="none"
          strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={c / 4} strokeLinecap="round" transform="rotate(-90 70 70)" />
        <text x="70" y="70" textAnchor="middle" fontSize="30" fontWeight="700" fill="#fff" dy="4">{score}</text>
        <text x="70" y="94" textAnchor="middle" fontSize="10" fill="#94a3b8">/ 100</text>
      </svg>
      <div>
        <div className="text-xs text-muted uppercase tracking-widest">Risk Score</div>
        <div className={clsx("text-3xl font-semibold", riskColor(category))}>{category}</div>
        <div className="text-xs text-muted mt-1">Composite of financial, timeline, agency, geographic and data-quality signals.</div>
      </div>
    </div>
  );
}
