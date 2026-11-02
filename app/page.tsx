import Link from "next/link";
import { getAllAnalyses, getAllProjects } from "@/lib/data";
import { Kpi } from "@/components/Kpi";
import { RiskBadge } from "@/components/RiskBadge";
import { RiskPie, CategoryBar, StatusBar, SignalBar, StateBar } from "@/components/Charts";
import { inrLakh } from "@/lib/format";

export const dynamic = "force-static";

export default function Dashboard() {
  const projects = getAllProjects();
  const analyses = getAllAnalyses();
  const byId = new Map(analyses.map(a => [a.projectId, a]));

  const totalValue = projects.reduce((s, p) => s + p.sanctionedAmount, 0);
  const totalExpenditure = projects.reduce((s, p) => s + p.expenditure, 0);
  const counts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  for (const a of analyses) counts[a.riskCategory]++;
  const delayed = projects.filter(p => p.status === "Delayed" || p.status === "Stalled").length;
  const financialAnomalies = analyses.filter(a => a.signals.some(s => s.code === "cost-outlier" || s.code === "expenditure-overrun")).length;
  const dataQualityIssues = analyses.filter(a => a.qualityIssues.length > 0).length;

  const statusCount: Record<string, number> = {};
  for (const p of projects) statusCount[p.status] = (statusCount[p.status] || 0) + 1;
  const categoryCount: Record<string, number> = {};
  for (const p of projects) categoryCount[p.category] = (categoryCount[p.category] || 0) + 1;

  const stateAgg: Record<string, { count: number; highRisk: number }> = {};
  for (const p of projects) {
    const a = byId.get(p.id)!;
    const s = (stateAgg[p.state] ||= { count: 0, highRisk: 0 });
    s.count++;
    if (a.riskCategory === "HIGH" || a.riskCategory === "CRITICAL") s.highRisk++;
  }
  const signalCounts: Record<string, number> = {};
  for (const a of analyses) for (const s of a.signals) signalCounts[s.label] = (signalCounts[s.label] || 0) + 1;

  const highRisk = analyses
    .filter(a => a.riskCategory === "HIGH" || a.riskCategory === "CRITICAL")
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 10)
    .map(a => ({ a, p: projects.find(p => p.id === a.projectId)! }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Executive Dashboard</h1>
        <p className="text-sm text-muted mt-1">
          A high-level view of the MPLAD portfolio: total activity, risk concentration, delays and data quality. All numbers are computed live from the underlying dataset.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Total Projects" value={projects.length.toLocaleString("en-IN")} />
        <Kpi label="Total Sanctioned" value={inrLakh(totalValue)} sub={`Expenditure ${inrLakh(totalExpenditure)}`} />
        <Kpi label="High Risk" value={counts.HIGH} tone="high" sub={`${((counts.HIGH / projects.length) * 100).toFixed(1)}% of portfolio`} />
        <Kpi label="Critical Risk" value={counts.CRITICAL} tone="critical" sub={`${((counts.CRITICAL / projects.length) * 100).toFixed(1)}% of portfolio`} />
        <Kpi label="Delayed / Stalled" value={delayed} tone="medium" />
        <Kpi label="Financial Anomalies" value={financialAnomalies} tone="high" sub="Cost outlier + over-run" />
        <Kpi label="Data Quality Issues" value={dataQualityIssues} tone="medium" />
        <Kpi label="Low Risk" value={counts.LOW} tone="low" sub={`${((counts.LOW / projects.length) * 100).toFixed(0)}% clean`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-sm font-medium mb-2">Risk distribution</div>
          <RiskPie data={counts} />
        </div>
        <div className="card p-4 lg:col-span-2">
          <div className="text-sm font-medium mb-2">Anomaly signal frequency</div>
          <SignalBar data={signalCounts} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="text-sm font-medium mb-2">Project status</div>
          <StatusBar data={statusCount} />
        </div>
        <div className="card p-4">
          <div className="text-sm font-medium mb-2">Projects by category</div>
          <CategoryBar data={categoryCount} />
        </div>
      </div>

      <div className="card p-4">
        <div className="text-sm font-medium mb-2">Projects and high-risk concentration by state</div>
        <StateBar data={stateAgg} />
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium">Top high-risk projects</div>
          <Link href="/projects?risk=CRITICAL" className="text-xs text-accent hover:underline">See all high-risk →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">ID</th>
                <th className="table-header">Project</th>
                <th className="table-header">State</th>
                <th className="table-header">Category</th>
                <th className="table-header">Sanctioned</th>
                <th className="table-header">Status</th>
                <th className="table-header">Risk</th>
              </tr>
            </thead>
            <tbody>
              {highRisk.map(({ a, p }) => (
                <tr key={p.id} className="border-t border-border hover:bg-white/[0.03]">
                  <td className="table-cell font-mono text-xs">{p.id}</td>
                  <td className="table-cell">
                    <Link href={`/projects/${p.id}`} className="text-accent hover:underline">{p.name}</Link>
                  </td>
                  <td className="table-cell">{p.state}</td>
                  <td className="table-cell">{p.category}</td>
                  <td className="table-cell">{inrLakh(p.sanctionedAmount)}</td>
                  <td className="table-cell">{p.status}</td>
                  <td className="table-cell"><RiskBadge category={a.riskCategory} score={a.riskScore} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
