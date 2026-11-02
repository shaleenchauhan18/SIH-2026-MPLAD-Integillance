export function inrLakh(n: number): string {
  const lakh = n / 100000;
  if (lakh >= 100) return `₹${(lakh / 100).toFixed(2)} Cr`;
  return `₹${lakh.toFixed(2)} L`;
}
export function inr(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}
export function pct(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined || !isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}
export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}
export function riskColor(cat: string) {
  switch (cat) {
    case "CRITICAL": return "text-critical";
    case "HIGH": return "text-high";
    case "MEDIUM": return "text-medium";
    default: return "text-low";
  }
}
export function riskBg(cat: string) {
  switch (cat) {
    case "CRITICAL": return "bg-critical/15 border-critical/40 text-critical";
    case "HIGH": return "bg-high/15 border-high/40 text-high";
    case "MEDIUM": return "bg-medium/15 border-medium/40 text-medium";
    default: return "bg-low/15 border-low/40 text-low";
  }
}
