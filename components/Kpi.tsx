export function Kpi({
  label, value, sub, tone = "default"
}: { label: string; value: string | number; sub?: string; tone?: "default" | "critical" | "high" | "medium" | "low" }) {
  const toneClass = {
    default: "text-white",
    critical: "text-critical",
    high: "text-high",
    medium: "text-medium",
    low: "text-low"
  }[tone];
  return (
    <div className="card p-4">
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${toneClass}`}>{value}</div>
      {sub && <div className="text-xs text-muted mt-1">{sub}</div>}
    </div>
  );
}
