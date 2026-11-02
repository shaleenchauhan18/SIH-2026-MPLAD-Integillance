import type {
  Project,
  ProjectAnalysis,
  RiskSignal,
  DataQualityIssue
} from "./types";
import { median, stdev, mean, iqr, zscore, haversineKm } from "./stats";
import { daysBetween } from "./format";

// ---------- Data Quality ----------
export function computeDataQuality(p: Project, all: Project[]): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];

  if (!p.vendor || p.vendor.trim() === "") {
    issues.push({ code: "missing-vendor", label: "Missing vendor", detail: "No implementing vendor recorded." });
  }
  if (!p.agency) {
    issues.push({ code: "missing-agency", label: "Missing agency", detail: "No implementing agency recorded." });
  }
  if (p.sanctionedAmount <= 0) {
    issues.push({ code: "invalid-amount", label: "Invalid sanctioned amount", detail: "Sanctioned amount is zero or negative." });
  }
  if (p.expenditure < 0) {
    issues.push({ code: "negative-expenditure", label: "Negative expenditure", detail: "Expenditure recorded as negative." });
  }
  const start = new Date(p.startDate).getTime();
  const expected = new Date(p.expectedCompletionDate).getTime();
  if (isNaN(start) || isNaN(expected)) {
    issues.push({ code: "invalid-dates", label: "Invalid dates", detail: "Start or expected completion date is invalid." });
  } else if (expected <= start) {
    issues.push({ code: "date-order", label: "Expected date not after start", detail: "Expected completion is on/before start date." });
  }
  if (p.actualCompletionDate) {
    const actual = new Date(p.actualCompletionDate).getTime();
    if (isNaN(actual)) {
      issues.push({ code: "invalid-actual", label: "Invalid actual completion date", detail: "Actual completion date is unparseable." });
    } else if (actual < start) {
      issues.push({ code: "actual-before-start", label: "Actual completion before start", detail: "Actual completion date is before start date." });
    }
  }
  if (p.status === "Completed" && !p.actualCompletionDate) {
    issues.push({ code: "status-date-mismatch", label: "Completed without actual date", detail: "Status Completed but no actual completion date." });
  }
  if (p.status !== "Completed" && p.actualCompletionDate) {
    issues.push({ code: "status-date-mismatch2", label: "Actual date without Completed status", detail: "Actual completion date recorded but status not Completed." });
  }
  return issues;
}

// ---------- Peer selection ----------
export function peersOf(p: Project, all: Project[]): Project[] {
  return all.filter(x => x.id !== p.id && x.category === p.category);
}

// ---------- Signals ----------
export function computeSignals(
  p: Project,
  all: Project[],
  agencyStats: Map<string, { count: number; delayRate: number; medianCost: number }>,
  duplicateSet: Set<string>,
  geoClusterSet: Set<string>
): RiskSignal[] {
  const signals: RiskSignal[] = [];
  const peers = peersOf(p, all);
  const peerCosts = peers.map(x => x.sanctionedAmount);
  const peerMedianCost = median(peerCosts);

  // 1. Cost outlier via z-score on log(cost) — robust
  const logs = peerCosts.filter(v => v > 0).map(v => Math.log(v));
  if (logs.length >= 8 && p.sanctionedAmount > 0) {
    const z = zscore(Math.log(p.sanctionedAmount), logs);
    if (z >= 2.0) {
      const dev = ((p.sanctionedAmount - peerMedianCost) / peerMedianCost) * 100;
      signals.push({
        code: "cost-outlier",
        label: "Cost anomaly",
        severity: z >= 3 ? "High" : "Medium",
        weight: z >= 3 ? 52 : 32,
        explanation: `Sanctioned amount is significantly higher than comparable ${p.category.toLowerCase()} projects (z-score ${z.toFixed(2)}, ${dev.toFixed(0)}% above peer median).`,
        evidence: { zScore: Number(z.toFixed(2)), peerMedian: peerMedianCost, projectAmount: p.sanctionedAmount }
      });
    }
  }

  // 2. Expenditure overrun / ratio anomaly
  if (p.sanctionedAmount > 0) {
    const ratio = p.expenditure / p.sanctionedAmount;
    if (ratio > 1.05) {
      signals.push({
        code: "expenditure-overrun",
        label: "Expenditure exceeds sanctioned amount",
        severity: ratio > 1.2 ? "High" : "Medium",
        weight: ratio > 1.2 ? 50 : 26,
        explanation: `Actual expenditure is ${((ratio - 1) * 100).toFixed(0)}% above sanctioned amount, indicating budget over-run.`,
        evidence: { ratio: Number(ratio.toFixed(2)) }
      });
    } else if (ratio < 0.3 && p.status !== "Sanctioned") {
      signals.push({
        code: "under-utilization",
        label: "Unusually low utilization",
        severity: "Medium",
        weight: 10,
        explanation: `Only ${(ratio * 100).toFixed(0)}% of sanctioned amount has been utilised despite project being ${p.status}.`,
        evidence: { ratio: Number(ratio.toFixed(2)) }
      });
    }
  }

  // 3. Timeline anomaly
  const peerDurations = peers
    .filter(x => x.actualCompletionDate)
    .map(x => daysBetween(x.startDate, x.actualCompletionDate!));
  const expectedDays = daysBetween(p.startDate, p.expectedCompletionDate);
  const nowRef = "2026-09-01";
  const currentDurationDays = p.actualCompletionDate
    ? daysBetween(p.startDate, p.actualCompletionDate)
    : daysBetween(p.startDate, nowRef);
  if (peerDurations.length >= 8) {
    const peerMedian = median(peerDurations);
    if (peerMedian > 0 && currentDurationDays > peerMedian * 2.2) {
      const dev = ((currentDurationDays - peerMedian) / peerMedian) * 100;
      signals.push({
        code: "timeline-anomaly",
        label: "Timeline anomaly",
        severity: dev > 100 ? "High" : "Medium",
        weight: dev > 100 ? 40 : 24,
        explanation: `Project duration is ${dev.toFixed(0)}% above the peer median for ${p.category.toLowerCase()} works.`,
        evidence: { peerMedianDays: peerMedian, projectDurationDays: currentDurationDays }
      });
    }
  }
  if (expectedDays > 0 && currentDurationDays > expectedDays * 2.6) {
    signals.push({
      code: "expected-delay",
      label: "Severe delay vs expected",
      severity: "High",
      weight: 26,
      explanation: `Project has run ${(((currentDurationDays - expectedDays) / expectedDays) * 100).toFixed(0)}% longer than its own expected schedule.`,
      evidence: { expectedDays, currentDurationDays }
    });
  }

  // 4. Duplicate / similarity
  if (duplicateSet.has(p.id)) {
    signals.push({
      code: "duplicate-pattern",
      label: "Near-duplicate project",
      severity: "High",
      weight: 52,
      explanation: `Another MPLAD project has highly similar name, location and budget — potential duplication.`
    });
  }

  // 5. Agency pattern
  const ag = agencyStats.get(p.agency);
  if (ag && ag.count >= 15) {
    if (ag.delayRate > 0.35) {
      signals.push({
        code: "agency-pattern",
        label: "Implementing agency risk pattern",
        severity: ag.delayRate > 0.5 ? "High" : "Medium",
        weight: ag.delayRate > 0.5 ? 15 : 10,
        explanation: `Agency "${p.agency}" shows an unusually high delay rate of ${(ag.delayRate * 100).toFixed(0)}% across ${ag.count} projects.`,
        evidence: { agencyDelayRate: Number(ag.delayRate.toFixed(2)), agencyProjects: ag.count }
      });
    }
  }

  // 6. Geographic cluster
  if (geoClusterSet.has(p.id)) {
    signals.push({
      code: "geo-cluster",
      label: "Geographic clustering",
      severity: "Medium",
      weight: 10,
      explanation: `Multiple MPLAD projects are concentrated within a very small radius of this location.`
    });
  }

  // 7. Data inconsistency
  const q = computeDataQuality(p, all);
  if (q.length > 0) {
    signals.push({
      code: "data-inconsistency",
      label: "Data inconsistency",
      severity: q.length >= 2 ? "Medium" : "Low",
      weight: q.length >= 2 ? 10 : 5,
      explanation: `Record contains ${q.length} data quality issue(s) that reduce confidence in reported values.`,
      evidence: { issues: q.map(i => i.label).join(", ") }
    });
  }

  return signals;
}

// ---------- Aggregations required by scorer ----------
export function computeAgencyStats(all: Project[]) {
  const map = new Map<string, { count: number; delayCount: number; costs: number[] }>();
  for (const p of all) {
    const s = map.get(p.agency) ?? { count: 0, delayCount: 0, costs: [] };
    s.count++;
    if (p.status === "Delayed" || p.status === "Stalled") s.delayCount++;
    s.costs.push(p.sanctionedAmount);
    map.set(p.agency, s);
  }
  const out = new Map<string, { count: number; delayRate: number; medianCost: number }>();
  for (const [k, v] of map) {
    out.set(k, {
      count: v.count,
      delayRate: v.count ? v.delayCount / v.count : 0,
      medianCost: median(v.costs)
    });
  }
  return out;
}

export function computeDuplicates(all: Project[]) {
  const set = new Set<string>();
  // Same category + same district + budget within 10% + close location
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i], b = all[j];
      if (a.category !== b.category) continue;
      if (a.district !== b.district) continue;
      const budgetClose =
        Math.abs(a.sanctionedAmount - b.sanctionedAmount) / Math.max(a.sanctionedAmount, 1) < 0.1;
      const near = haversineKm(a, b) < 2;
      if (budgetClose && near) {
        set.add(a.id);
        set.add(b.id);
      }
    }
  }
  return set;
}

export function computeGeoClusters(all: Project[]) {
  const set = new Set<string>();
  // Bucket by rounded lat/lng (~1km grid)
  const buckets = new Map<string, Project[]>();
  for (const p of all) {
    const key = `${p.lat.toFixed(2)}_${p.lng.toFixed(2)}`;
    const arr = buckets.get(key) ?? [];
    arr.push(p);
    buckets.set(key, arr);
  }
  for (const [, arr] of buckets) {
    if (arr.length >= 4) arr.forEach(p => set.add(p.id));
  }
  return set;
}

// ---------- Risk score ----------
export function scoreProject(
  p: Project,
  all: Project[],
  agencyStats: Map<string, { count: number; delayRate: number; medianCost: number }>,
  duplicateSet: Set<string>,
  geoClusterSet: Set<string>
): ProjectAnalysis {
  const signals = computeSignals(p, all, agencyStats, duplicateSet, geoClusterSet);
  const raw = signals.reduce((s, sig) => s + sig.weight, 0);
  const score = Math.min(100, raw);
  const cat =
    score >= 75 ? "CRITICAL" :
    score >= 50 ? "HIGH" :
    score >= 30 ? "MEDIUM" : "LOW";

  // Peer comparison
  const peers = peersOf(p, all);
  const peerCosts = peers.map(x => x.sanctionedAmount);
  const peerDurations = peers
    .filter(x => x.actualCompletionDate)
    .map(x => daysBetween(x.startDate, x.actualCompletionDate!));
  const peerCostMedian = median(peerCosts);
  const peerDurationMedianDays = median(peerDurations);
  const nowRef = "2026-09-01";
  const projDuration = p.actualCompletionDate
    ? daysBetween(p.startDate, p.actualCompletionDate)
    : daysBetween(p.startDate, nowRef);
  const costDeviationPct = peerCostMedian
    ? ((p.sanctionedAmount - peerCostMedian) / peerCostMedian) * 100
    : null;
  const durationDeviationPct = peerDurationMedianDays
    ? ((projDuration - peerDurationMedianDays) / peerDurationMedianDays) * 100
    : null;

  // Similar-project ids (nearest by peer)
  const scored = peers
    .map(x => ({
      id: x.id,
      score:
        Math.abs(x.sanctionedAmount - p.sanctionedAmount) / Math.max(p.sanctionedAmount, 1) +
        haversineKm(x, p) / 200
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
    .map(x => x.id);

  const qualityIssues = computeDataQuality(p, all);

  const recommendations = buildRecommendations(signals);

  return {
    projectId: p.id,
    riskScore: score,
    riskCategory: cat as any,
    signals,
    qualityIssues,
    peers: {
      peerIds: scored,
      peerCostMedian,
      peerDurationMedianDays,
      costDeviationPct,
      durationDeviationPct
    },
    recommendations
  };
}

function buildRecommendations(signals: RiskSignal[]): string[] {
  const rec: string[] = [];
  const codes = new Set(signals.map(s => s.code));
  if (codes.has("cost-outlier")) rec.push("Compare tendered rates with schedule of rates and peer projects; verify quantity estimates.");
  if (codes.has("expenditure-overrun")) rec.push("Obtain and review revised estimates; confirm competent-authority approval for cost escalation.");
  if (codes.has("under-utilization")) rec.push("Request utilization certificate and physical progress report.");
  if (codes.has("timeline-anomaly") || codes.has("expected-delay")) rec.push("Review site inspection reports and reasons for delay documented by the implementing agency.");
  if (codes.has("duplicate-pattern")) rec.push("Physically verify project location and completion; check for duplicate billing across sanction letters.");
  if (codes.has("agency-pattern")) rec.push("Review implementing agency's overall MPLAD portfolio; consider audit sample of concurrent projects.");
  if (codes.has("geo-cluster")) rec.push("Verify that clustered projects are distinct and not double-counted; inspect geo-coordinates on site.");
  if (codes.has("data-inconsistency")) rec.push("Cross-check MPLAD MIS entries with district registers; correct data before further analysis.");
  if (rec.length === 0) rec.push("No specific red flag detected. Routine verification recommended as part of sample audit.");
  rec.push("Document findings and provide the implementing agency a reasonable opportunity to explain before any conclusion.");
  return rec;
}
