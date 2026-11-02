import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { getAllProjects, getAllAnalyses, getAgencyStats } from "../lib/data";
import { median } from "../lib/stats";
import { daysBetween } from "../lib/format";

const projects = getAllProjects();
const analyses = new Map(getAllAnalyses().map(a => [a.projectId, a]));

const rows = projects.map(p => {
  const a = analyses.get(p.id)!;
  return {
    id: p.id, name: p.name, state: p.state, district: p.district,
    constituency: p.constituency, mp: p.mp, lat: p.lat, lng: p.lng,
    category: p.category, sanctionedAmount: p.sanctionedAmount, expenditure: p.expenditure,
    startDate: p.startDate, expectedCompletionDate: p.expectedCompletionDate,
    actualCompletionDate: p.actualCompletionDate, status: p.status,
    agency: p.agency, vendor: p.vendor, description: p.description,
    riskScore: a.riskScore, riskCategory: a.riskCategory,
    signals: a.signals, qualityIssues: a.qualityIssues,
    peerIds: a.peers.peerIds, peerCostMedian: Math.round(a.peers.peerCostMedian),
    peerDurationMedianDays: Math.round(a.peers.peerDurationMedianDays),
    costDeviationPct: a.peers.costDeviationPct !== null ? Number(a.peers.costDeviationPct.toFixed(1)) : null,
    durationDeviationPct: a.peers.durationDeviationPct !== null ? Number(a.peers.durationDeviationPct.toFixed(1)) : null,
    recommendations: a.recommendations,
    seededIssues: (p as any)._seededIssues || []
  };
});

// Agency stats
const byAgency = new Map<string, any[]>();
for (const p of projects) {
  const arr = byAgency.get(p.agency) || [];
  arr.push(p);
  byAgency.set(p.agency, arr);
}
const agencyRows = Array.from(byAgency.entries()).map(([agency, list]) => {
  const scores = list.map(p => analyses.get(p.id)!.riskScore);
  const durations = list.filter(p => p.actualCompletionDate).map(p => daysBetween(p.startDate, p.actualCompletionDate!));
  return {
    agency, projects: list.length,
    delayRate: Number((list.filter(p => p.status === "Delayed" || p.status === "Stalled").length / list.length).toFixed(3)),
    medianDurationDays: median(durations),
    avgRiskScore: Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)),
    highRiskCount: scores.filter(s => s >= 50).length
  };
}).sort((a, b) => b.avgRiskScore - a.avgRiskScore);

// Dashboard aggregates
const counts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 } as Record<string, number>;
for (const r of rows) counts[r.riskCategory]++;
const statusCount: Record<string, number> = {};
for (const p of rows) statusCount[p.status] = (statusCount[p.status] || 0) + 1;
const categoryCount: Record<string, number> = {};
for (const p of rows) categoryCount[p.category] = (categoryCount[p.category] || 0) + 1;
const stateAgg: Record<string, { count: number; value: number; highRisk: number }> = {};
for (const p of rows) {
  const s = (stateAgg[p.state] ||= { count: 0, value: 0, highRisk: 0 });
  s.count++; s.value += p.sanctionedAmount;
  if (p.riskCategory === "HIGH" || p.riskCategory === "CRITICAL") s.highRisk++;
}
const signalCounts: Record<string, number> = {};
for (const r of rows) for (const s of r.signals) signalCounts[s.label] = (signalCounts[s.label] || 0) + 1;

const totalValue = rows.reduce((s, p) => s + p.sanctionedAmount, 0);
const totalExpenditure = rows.reduce((s, p) => s + p.expenditure, 0);
const delayed = rows.filter(p => p.status === "Delayed" || p.status === "Stalled").length;
const financialAnomalies = rows.filter(p => p.signals.some((s: any) => s.code === "cost-outlier" || s.code === "expenditure-overrun")).length;
const dataQualityIssues = rows.filter(p => p.qualityIssues.length > 0).length;

const opts = {
  states: Array.from(new Set(rows.map(p => p.state))).sort(),
  districts: Array.from(new Set(rows.map(p => p.district))).sort(),
  categories: Array.from(new Set(rows.map(p => p.category))).sort(),
  statuses: Array.from(new Set(rows.map(p => p.status))).sort(),
  agencies: Array.from(new Set(rows.map(p => p.agency))).sort(),
  risks: ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
};

const out = {
  projects: rows,
  agencies: agencyRows,
  dashboard: {
    kpis: { totalProjects: rows.length, totalValue, totalExpenditure, highRisk: counts.HIGH, criticalRisk: counts.CRITICAL, delayed, financialAnomalies, dataQualityIssues },
    riskDistribution: counts, statusCount, categoryCount, stateAgg, signalCounts
  },
  opts
};

const outPath = join(__dirname, "..", "data", "artifact-data.json");
writeFileSync(outPath, JSON.stringify(out));
console.log("Wrote", outPath, (JSON.stringify(out).length / 1024).toFixed(0), "KB");
