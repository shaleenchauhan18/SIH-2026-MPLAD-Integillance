import { getAllProjects, getAnalysis, getProject, getAllAnalyses } from "./data";
import type { Project, ProjectAnalysis } from "./types";
import { inrLakh } from "./format";

// Deterministic natural-language Q&A grounded strictly in computed analytics.
// Returns { answer: string, citations: {id,name}[] }

export function answerQuestion(q: string): { answer: string; citations: { id: string; name: string }[] } {
  const question = q.trim();
  const lower = question.toLowerCase();

  // 1) Direct: why is MPLAD-XXXXX high risk?
  const idMatch = question.match(/MPLAD[-\s]?(\d{4,5})/i);
  if (idMatch) {
    const id = `MPLAD-${idMatch[1].padStart(5, "0")}`;
    const p = getProject(id);
    const a = getAnalysis(id);
    if (p && a) return { answer: explainProject(p, a), citations: [{ id: p.id, name: p.name }] };
    return { answer: `No project with id ${id} was found in the current dataset.`, citations: [] };
  }

  // 2) High-risk in <state>
  if (/high[- ]?risk/.test(lower) || /critical/.test(lower)) {
    const st = detectState(lower);
    const analyses = getAllAnalyses();
    const projects = getAllProjects();
    let items = analyses
      .filter(a => a.riskCategory === "HIGH" || a.riskCategory === "CRITICAL")
      .map(a => ({ a, p: projects.find(p => p.id === a.projectId)! }));
    if (st) items = items.filter(x => x.p.state === st);
    items.sort((x, y) => y.a.riskScore - x.a.riskScore);
    const top = items.slice(0, 5);
    if (top.length === 0) {
      return { answer: `No high or critical risk projects were found${st ? ` in ${st}` : ""}.`, citations: [] };
    }
    const list = top.map(t => `• ${t.p.id} — ${t.p.name} (${t.p.state}); risk ${t.a.riskScore}/100 ${t.a.riskCategory}`).join("\n");
    return {
      answer: `Top ${top.length} high-risk project(s)${st ? ` in ${st}` : ""}:\n\n${list}\n\nOpen any of them to see the risk signal breakdown and evidence.`,
      citations: top.map(t => ({ id: t.p.id, name: t.p.name }))
    };
  }

  // 3) Which agencies have highest anomaly rates?
  if (/agenc/i.test(lower)) {
    const projects = getAllProjects();
    const analyses = new Map(getAllAnalyses().map(a => [a.projectId, a]));
    const map = new Map<string, { total: number; sum: number; delays: number }>();
    for (const p of projects) {
      const m = map.get(p.agency) || { total: 0, sum: 0, delays: 0 };
      m.total++;
      m.sum += analyses.get(p.id)!.riskScore;
      if (p.status === "Delayed" || p.status === "Stalled") m.delays++;
      map.set(p.agency, m);
    }
    const rows = Array.from(map.entries())
      .filter(([, v]) => v.total >= 10)
      .map(([k, v]) => ({ agency: k, avg: v.sum / v.total, delayRate: v.delays / v.total, n: v.total }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5);
    const list = rows.map(r => `• ${r.agency}: avg risk ${r.avg.toFixed(1)}/100, delay rate ${(r.delayRate * 100).toFixed(0)}% across ${r.n} projects`).join("\n");
    return { answer: `Implementing agencies with the highest average risk scores:\n\n${list}`, citations: [] };
  }

  // 4) What should I investigate first?
  if (/(what.*investigate|priority|first)/i.test(lower)) {
    const analyses = getAllAnalyses().slice().sort((a, b) => b.riskScore - a.riskScore).slice(0, 3);
    const projects = getAllProjects();
    const list = analyses.map(a => {
      const p = projects.find(x => x.id === a.projectId)!;
      return `• ${p.id} — ${p.name}: risk ${a.riskScore}/100, signals: ${a.signals.map(s => s.label).slice(0, 3).join("; ")}`;
    }).join("\n");
    return { answer: `Suggested investigation queue (top 3 by risk score):\n\n${list}`, citations: analyses.map(a => ({ id: a.projectId, name: projects.find(x => x.id === a.projectId)!.name })) };
  }

  // 5) State summary
  const st = detectState(lower);
  if (st) {
    const projects = getAllProjects().filter(p => p.state === st);
    const analyses = new Map(getAllAnalyses().map(a => [a.projectId, a]));
    const highRisk = projects.filter(p => {
      const a = analyses.get(p.id)!;
      return a.riskCategory === "HIGH" || a.riskCategory === "CRITICAL";
    });
    const totalValue = projects.reduce((s, p) => s + p.sanctionedAmount, 0);
    return { answer: `In ${st}, ${projects.length} MPLAD projects are on record with a sanctioned value of ${inrLakh(totalValue)}. Of these, ${highRisk.length} are flagged as high or critical risk based on cost, timeline, agency, geographic and data-quality signals. Open the Projects page and filter by state to review them.`, citations: [] };
  }

  // Fallback
  return {
    answer: `I can answer questions grounded in the current MPLAD dataset. Try one of:\n\n• "Why is MPLAD-01042 high risk?"\n• "Show me high-risk projects in Maharashtra."\n• "Which agencies have the highest anomaly rates?"\n• "What should I investigate first?"`,
    citations: []
  };
}

function detectState(lower: string) {
  const states = ["Maharashtra", "Karnataka", "Tamil Nadu", "Uttar Pradesh", "West Bengal", "Rajasthan", "Gujarat", "Madhya Pradesh", "Bihar", "Kerala"];
  return states.find(s => lower.includes(s.toLowerCase())) || "";
}

export function explainProject(p: Project, a: ProjectAnalysis): string {
  if (a.signals.length === 0) {
    return `Project ${p.id} — ${p.name} currently has a risk score of ${a.riskScore}/100 (${a.riskCategory}). No specific risk signals were detected; routine verification is suggested.`;
  }
  const parts = a.signals
    .slice()
    .sort((x, y) => y.weight - x.weight)
    .map(s => `- ${s.label} (+${s.weight}): ${s.explanation}`);
  return [
    `Project ${p.id} — ${p.name} has a risk score of ${a.riskScore}/100 (${a.riskCategory}).`,
    ``,
    `Contributing signals:`,
    ...parts,
    ``,
    `These signals are risk indicators identified by the analytics engine and require human verification. Use the Investigation page to review the underlying evidence and generate a report.`
  ].join("\n");
}
