import { NextResponse } from "next/server";
import { getAllProjects, getAllAnalyses } from "@/lib/data";
import { median } from "@/lib/stats";
import { daysBetween } from "@/lib/format";

export const dynamic = "force-static";

export async function GET() {
  const projects = getAllProjects();
  const analyses = new Map(getAllAnalyses().map(a => [a.projectId, a]));
  const byAgency = new Map<string, any[]>();
  for (const p of projects) {
    const arr = byAgency.get(p.agency) || [];
    arr.push(p);
    byAgency.set(p.agency, arr);
  }
  const rows: any[] = [];
  for (const [agency, list] of byAgency) {
    const scores = list.map(p => analyses.get(p.id)!.riskScore);
    const durations = list.filter(p => p.actualCompletionDate).map(p => daysBetween(p.startDate, p.actualCompletionDate!));
    rows.push({
      agency,
      projects: list.length,
      delayRate: list.filter(p => p.status === "Delayed" || p.status === "Stalled").length / list.length,
      medianDurationDays: median(durations),
      avgRiskScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      highRiskCount: scores.filter(s => s >= 50).length
    });
  }
  rows.sort((a, b) => b.avgRiskScore - a.avgRiskScore);
  return NextResponse.json({ rows });
}
