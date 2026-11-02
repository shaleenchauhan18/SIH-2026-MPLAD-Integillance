import Link from "next/link";
import { getAllProjects, getAllAnalyses } from "@/lib/data";
import { median } from "@/lib/stats";
import { daysBetween } from "@/lib/format";

export const dynamic = "force-static";

export default function AgenciesPage() {
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Implementing agencies</h1>
        <p className="text-sm text-muted mt-1">Portfolio view of each implementing agency across MPLAD projects. Agencies with an unusually high risk profile deserve targeted verification.</p>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-header">Agency</th>
              <th className="table-header">Projects</th>
              <th className="table-header">Delay rate</th>
              <th className="table-header">Median duration (days)</th>
              <th className="table-header">Avg risk score</th>
              <th className="table-header">High/critical risk</th>
              <th className="table-header"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.agency} className="border-t border-border hover:bg-white/[0.03]">
                <td className="table-cell font-medium">{r.agency}</td>
                <td className="table-cell">{r.projects}</td>
                <td className={`table-cell ${r.delayRate > 0.35 ? "text-high" : ""}`}>{(r.delayRate * 100).toFixed(0)}%</td>
                <td className="table-cell">{r.medianDurationDays || "—"}</td>
                <td className={`table-cell ${r.avgRiskScore > 40 ? "text-high" : ""}`}>{r.avgRiskScore.toFixed(1)}</td>
                <td className="table-cell">{r.highRiskCount}</td>
                <td className="table-cell">
                  <Link href={`/projects?agency=${encodeURIComponent(r.agency)}`} className="text-accent text-xs hover:underline">Open projects →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
