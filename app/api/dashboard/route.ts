import { NextResponse } from "next/server";
import { getAllAnalyses, getAllProjects } from "@/lib/data";

export const dynamic = "force-static";

export async function GET() {
  const projects = getAllProjects();
  const analyses = getAllAnalyses();
  const byId = new Map(analyses.map(a => [a.projectId, a]));

  const totalValue = projects.reduce((s, p) => s + p.sanctionedAmount, 0);
  const totalExpenditure = projects.reduce((s, p) => s + p.expenditure, 0);

  const counts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  for (const a of analyses) counts[a.riskCategory]++;

  const statusCount: Record<string, number> = {};
  for (const p of projects) statusCount[p.status] = (statusCount[p.status] || 0) + 1;

  const categoryCount: Record<string, number> = {};
  for (const p of projects) categoryCount[p.category] = (categoryCount[p.category] || 0) + 1;

  const stateAgg: Record<string, { count: number; value: number; highRisk: number }> = {};
  for (const p of projects) {
    const a = byId.get(p.id)!;
    const s = (stateAgg[p.state] ||= { count: 0, value: 0, highRisk: 0 });
    s.count++;
    s.value += p.sanctionedAmount;
    if (a.riskCategory === "HIGH" || a.riskCategory === "CRITICAL") s.highRisk++;
  }

  // Anomaly category tally
  const signalCounts: Record<string, number> = {};
  for (const a of analyses) for (const s of a.signals) signalCounts[s.label] = (signalCounts[s.label] || 0) + 1;

  const highRisk = analyses
    .filter(a => a.riskCategory === "HIGH" || a.riskCategory === "CRITICAL")
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 25);

  const highRiskDetailed = highRisk.map(a => {
    const p = projects.find(x => x.id === a.projectId)!;
    return {
      id: p.id, name: p.name, state: p.state, district: p.district,
      category: p.category, sanctionedAmount: p.sanctionedAmount,
      status: p.status, agency: p.agency,
      riskScore: a.riskScore, riskCategory: a.riskCategory
    };
  });

  const delayed = projects.filter(p => p.status === "Delayed" || p.status === "Stalled").length;
  const financialAnomalies = analyses.filter(a =>
    a.signals.some(s => s.code === "cost-outlier" || s.code === "expenditure-overrun")
  ).length;
  const dataQualityIssues = analyses.filter(a => a.qualityIssues.length > 0).length;

  return NextResponse.json({
    kpis: {
      totalProjects: projects.length,
      totalValue,
      totalExpenditure,
      highRisk: counts.HIGH,
      criticalRisk: counts.CRITICAL,
      delayed,
      financialAnomalies,
      dataQualityIssues
    },
    riskDistribution: counts,
    statusCount,
    categoryCount,
    stateAgg,
    signalCounts,
    highRisk: highRiskDetailed
  });
}
