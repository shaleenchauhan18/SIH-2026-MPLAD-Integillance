import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllProjects, getAnalysis, getProject } from "@/lib/data";
import { inrLakh, pct, daysBetween } from "@/lib/format";
import { RiskGauge } from "@/components/RiskGauge";
import { RiskBadge } from "@/components/RiskBadge";
import { CompareBar } from "@/components/Charts";
import { RelationshipGraph } from "@/components/RelationshipGraph";
import { DownloadReport } from "@/components/DownloadReport";
import { explainProject } from "@/lib/qna";

export default function ProjectPage({ params }: { params: { id: string } }) {
  const p = getProject(params.id);
  if (!p) return notFound();
  const a = getAnalysis(params.id)!;
  const allProjects = getAllProjects();
  const peers = a.peers.peerIds
    .map(id => allProjects.find(x => x.id === id))
    .filter(Boolean) as any[];

  const explanation = explainProject(p, a);

  const nowRef = "2026-09-01";
  const projDuration = p.actualCompletionDate ? daysBetween(p.startDate, p.actualCompletionDate) : daysBetween(p.startDate, nowRef);

  // Relationship graph nodes
  const nodes = [
    { id: p.id, label: p.id, type: "project" as const },
    { id: `A:${p.agency}`, label: p.agency, type: "agency" as const },
    { id: `L:${p.district}`, label: `${p.district}, ${p.state}`, type: "location" as const },
    { id: `V:${p.vendor || "N/A"}`, label: p.vendor || "N/A", type: "vendor" as const },
    ...peers.slice(0, 4).map(q => ({ id: q.id, label: q.id, type: "peer" as const }))
  ];
  const edges = [
    { from: p.id, to: `A:${p.agency}` },
    { from: p.id, to: `L:${p.district}` },
    { from: p.id, to: `V:${p.vendor || "N/A"}` },
    ...peers.slice(0, 4).map(q => ({ from: p.id, to: q.id }))
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Link href="/projects" className="hover:text-white">← Back to projects</Link>
      </div>

      <div className="card p-5">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          <div className="flex-1">
            <div className="text-xs text-muted font-mono">{p.id}</div>
            <h1 className="text-2xl font-semibold mt-1">{p.name}</h1>
            <div className="text-sm text-muted mt-1">{p.description}</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
              <Field label="State" value={p.state} />
              <Field label="District" value={p.district} />
              <Field label="Constituency" value={p.constituency} />
              <Field label="MP" value={p.mp} />
              <Field label="Category" value={p.category} />
              <Field label="Status" value={p.status} />
              <Field label="Agency" value={p.agency} />
              <Field label="Vendor" value={p.vendor || "—"} />
              <Field label="Sanctioned" value={inrLakh(p.sanctionedAmount)} />
              <Field label="Expenditure" value={inrLakh(p.expenditure)} />
              <Field label="Start" value={p.startDate} />
              <Field label="Expected" value={p.expectedCompletionDate} />
              <Field label="Actual" value={p.actualCompletionDate || "—"} />
              <Field label="Location" value={`${p.lat.toFixed(3)}, ${p.lng.toFixed(3)}`} />
            </div>
          </div>
          <div className="md:w-72">
            <RiskGauge score={a.riskScore} category={a.riskCategory} />
            <div className="mt-4">
              <DownloadReport projectId={p.id} />
            </div>
          </div>
        </div>
      </div>

      {/* Risk signals */}
      <div className="card p-5">
        <div className="text-sm font-medium mb-3">Risk signals contributing to the score</div>
        {a.signals.length === 0 ? (
          <div className="text-sm text-muted">No risk signals detected. Routine verification recommended.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Signal</th>
                  <th className="table-header">Severity</th>
                  <th className="table-header">Weight</th>
                  <th className="table-header">Explanation</th>
                </tr>
              </thead>
              <tbody>
                {a.signals.slice().sort((x, y) => y.weight - x.weight).map(s => (
                  <tr key={s.code} className="border-t border-border">
                    <td className="table-cell font-medium">{s.label}</td>
                    <td className="table-cell">
                      <span className={"chip " + (s.severity === "High" ? "bg-high/15 text-high border-high/40" : s.severity === "Medium" ? "bg-medium/15 text-medium border-medium/40" : "bg-low/15 text-low border-low/40")}>{s.severity}</span>
                    </td>
                    <td className="table-cell font-mono">+{s.weight}</td>
                    <td className="table-cell text-sm">{s.explanation}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  <td className="table-cell font-medium">Total</td>
                  <td className="table-cell" />
                  <td className="table-cell font-mono">{a.signals.reduce((s, x) => s + x.weight, 0)}</td>
                  <td className="table-cell text-sm text-muted">Capped at 100. Category: <RiskBadge category={a.riskCategory} score={a.riskScore} /></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Evidence panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="text-sm font-medium mb-2">Cost vs peer median (INR)</div>
          <CompareBar label="Cost" project={p.sanctionedAmount} peer={a.peers.peerCostMedian} />
          <div className="text-xs text-muted mt-2">Peer median across {peers.length} comparable projects. Deviation: <b className={a.peers.costDeviationPct && a.peers.costDeviationPct > 0 ? "text-high" : "text-low"}>{pct(a.peers.costDeviationPct, 0)}</b>.</div>
        </div>
        <div className="card p-4">
          <div className="text-sm font-medium mb-2">Duration vs peer median (days)</div>
          <CompareBar label="Days" project={projDuration} peer={a.peers.peerDurationMedianDays} />
          <div className="text-xs text-muted mt-2">Peer median for completed comparable projects. Deviation: <b className={a.peers.durationDeviationPct && a.peers.durationDeviationPct > 0 ? "text-high" : "text-low"}>{pct(a.peers.durationDeviationPct, 0)}</b>.</div>
        </div>
      </div>

      {/* Peer table */}
      <div className="card p-4">
        <div className="text-sm font-medium mb-3">Nearest comparable projects</div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">ID</th>
                <th className="table-header">Name</th>
                <th className="table-header">State</th>
                <th className="table-header">Sanctioned</th>
                <th className="table-header">Status</th>
              </tr>
            </thead>
            <tbody>
              {peers.map(q => (
                <tr key={q.id} className="border-t border-border">
                  <td className="table-cell font-mono text-xs"><Link href={`/projects/${q.id}`} className="text-accent hover:underline">{q.id}</Link></td>
                  <td className="table-cell">{q.name}</td>
                  <td className="table-cell">{q.state}</td>
                  <td className="table-cell">{inrLakh(q.sanctionedAmount)}</td>
                  <td className="table-cell">{q.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Relationship graph */}
      <div className="card p-4">
        <div className="text-sm font-medium mb-3">Relationships</div>
        <RelationshipGraph nodes={nodes} edges={edges} />
      </div>

      {/* Data quality */}
      {a.qualityIssues.length > 0 && (
        <div className="card p-4">
          <div className="text-sm font-medium mb-2">Data quality issues</div>
          <ul className="list-disc pl-5 text-sm text-muted space-y-1">
            {a.qualityIssues.map(i => <li key={i.code}><b className="text-white">{i.label}:</b> {i.detail}</li>)}
          </ul>
          <div className="text-xs text-muted mt-2">Note: data quality issues are shown separately from risk indicators — they reduce confidence in the underlying record and should be corrected in the MPLAD MIS.</div>
        </div>
      )}

      {/* Explanation + recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="text-sm font-medium mb-2">Why has this been flagged?</div>
          <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-200 font-sans">{explanation}</pre>
        </div>
        <div className="card p-4">
          <div className="text-sm font-medium mb-2">Recommended investigation steps</div>
          <ol className="list-decimal pl-5 text-sm space-y-1">
            {a.recommendations.map((r, i) => <li key={i}>{r}</li>)}
          </ol>
          <div className="text-xs text-muted mt-3">These are investigative recommendations, not accusations. Give the implementing agency an opportunity to explain before any conclusion.</div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted">{label}</div>
      <div className="text-sm mt-0.5">{value}</div>
    </div>
  );
}
