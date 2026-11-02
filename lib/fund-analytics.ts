import type { RawFundRow, FundRecord, FundSignal, FundAggregates } from "./fund-types";

// Reference "as-on" date of the 16th LS pending-release snapshot (~Aug 2022).
const SNAPSHOT_DATE = new Date("2022-08-21");

function num(s: string | undefined): number {
  if (s === undefined || s === null) return 0;
  const v = parseFloat(String(s).trim());
  return isNaN(v) ? 0 : v;
}

function parseDate(s: string | undefined): Date | null {
  if (!s || !s.trim()) return null;
  const t = s.trim();
  // formats: dd-mm-yyyy
  const m = t.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function normalizeFundRow(r: RawFundRow, idx: number): FundRecord {
  const entitlement = num(r.TotalEntitlementAmount_crore);
  const released = num(r.TotalGOIRelease_crore);
  const releasePending = num(r.ReleasePendingAmount_crore);
  const unsanctionBalance = num(r.UnSanctionBalance_crore);
  const unspentBalance = num(r.UnspentBalance_crore);
  const lastDate = parseDate(r.LastReleaseDate);

  const releaseRatePct = entitlement > 0 ? (released / entitlement) * 100 : null;
  const unspentRatioPct = released > 0 ? (unspentBalance / released) * 100 : null;
  const idlePct = entitlement > 0 ? (unspentBalance / entitlement) * 100 : null;
  const oversanctioned = unsanctionBalance < -0.5; // sanctioned meaningfully beyond funds available
  const daysSinceLastRelease = lastDate
    ? Math.round((SNAPSHOT_DATE.getTime() - lastDate.getTime()) / 86400000)
    : null;
  // "Stalled pipeline" = an old last release AND money still sitting unspent.
  // (The 16th LS term closed in 2019, so an old date alone is not discriminating.)
  const stale =
    daysSinceLastRelease !== null &&
    daysSinceLastRelease > 365 * 3 &&
    unspentBalance >= 1.5;

  const signals: FundSignal[] = [];

  // 1. Idle funds (released but unspent) — inefficiency in utilisation
  if (unspentRatioPct !== null && unspentBalance >= 2 && unspentRatioPct >= 15) {
    const sev = unspentRatioPct >= 25 ? "High" : "Medium";
    signals.push({
      code: "idle-funds",
      label: "Idle released funds",
      severity: sev,
      weight: sev === "High" ? 28 : 18,
      explanation: `₹${unspentBalance.toFixed(2)} crore of released MPLAD funds remain unspent (${unspentRatioPct.toFixed(0)}% of amount released), indicating slow ground-level utilisation.`
    });
  }

  // 2. Over-sanction (negative unsanction balance) — works sanctioned beyond available funds
  if (oversanctioned) {
    const mag = Math.abs(unsanctionBalance);
    const sev = mag >= 3 ? "High" : "Medium";
    signals.push({
      code: "over-sanction",
      label: "Sanctions exceed available funds",
      severity: sev,
      weight: sev === "High" ? 24 : 15,
      explanation: `Works worth ₹${mag.toFixed(2)} crore appear sanctioned beyond the funds currently available (negative unsanctioned balance), which can leave works unfunded.`
    });
  }

  // 3. Release pending / withheld — GoI has not released full entitlement
  if (releasePending >= 2.5) {
    const sev = releasePending >= 7.5 ? "High" : "Medium";
    signals.push({
      code: "release-pending",
      label: "Central release pending",
      severity: sev,
      weight: sev === "High" ? 20 : 12,
      explanation: `₹${releasePending.toFixed(2)} crore of entitlement is pending release from the Government of India, often held back for missing utilisation/audit certificates.`
    });
  }

  // 4. Low release rate — structurally under-released constituency
  if (releaseRatePct !== null && releaseRatePct < 70 && entitlement >= 10) {
    signals.push({
      code: "low-release-rate",
      label: "Low release rate",
      severity: "Medium",
      weight: 10,
      explanation: `Only ${releaseRatePct.toFixed(0)}% of the ₹${entitlement.toFixed(1)} crore entitlement has actually been released to this constituency.`
    });
  }

  // 5. Stalled pipeline — old last release with money still unspent
  if (stale && daysSinceLastRelease !== null) {
    const years = (daysSinceLastRelease / 365).toFixed(1);
    signals.push({
      code: "stale-release",
      label: "Stalled fund pipeline",
      severity: "Medium",
      weight: 12,
      explanation: `No fresh installment for about ${years} years (last on ${formatDate(lastDate)}), yet ₹${unspentBalance.toFixed(2)} crore remains unspent — a stalled pipeline with idle money.`
    });
  }

  const raw = signals.reduce((s, x) => s + x.weight, 0);
  const inefficiencyScore = Math.min(100, raw);
  const inefficiencyCategory =
    inefficiencyScore >= 60 ? "SEVERE" :
    inefficiencyScore >= 40 ? "ELEVATED" :
    inefficiencyScore >= 20 ? "MODERATE" : "LOW";

  return {
    id: `MP-${String(idx + 1).padStart(3, "0")}-${slug(r.Constituency).slice(0, 24)}`,
    state: r.State.trim(),
    mp: r.MPName.trim(),
    constituency: r.Constituency.trim(),
    district: r.District.trim(),
    entitlement, released, releasePending, unsanctionBalance, unspentBalance,
    lastReleaseDate: lastDate ? lastDate.toISOString().slice(0, 10) : null,
    releaseRatePct: round(releaseRatePct),
    unspentRatioPct: round(unspentRatioPct),
    idlePct: round(idlePct),
    oversanctioned,
    daysSinceLastRelease,
    stale,
    inefficiencyScore,
    inefficiencyCategory: inefficiencyCategory as any,
    signals
  };
}

function round(n: number | null): number | null {
  return n === null ? null : Math.round(n * 10) / 10;
}
function formatDate(d: Date | null): string {
  if (!d) return "—";
  return d.toISOString().slice(0, 10);
}

export function computeFundAggregates(records: FundRecord[]): FundAggregates {
  const valid = records.filter(r => r.entitlement > 0);
  const totalEntitlement = sum(valid.map(r => r.entitlement));
  const totalReleased = sum(valid.map(r => r.released));
  const totalReleasePending = sum(valid.map(r => r.releasePending));
  const totalUnspent = sum(valid.map(r => r.unspentBalance));
  const releaseRates = valid.map(r => r.releaseRatePct).filter((x): x is number => x !== null);
  const unspentRatios = valid.map(r => r.unspentRatioPct).filter((x): x is number => x !== null);

  const categoryCounts: Record<string, number> = { LOW: 0, MODERATE: 0, ELEVATED: 0, SEVERE: 0 };
  for (const r of records) categoryCounts[r.inefficiencyCategory]++;

  const byState: FundAggregates["byState"] = {};
  for (const r of records) {
    const s = (byState[r.state] ||= { mps: 0, entitlement: 0, released: 0, unspent: 0, releasePending: 0, avgInefficiency: 0, flagged: 0 });
    s.mps++;
    s.entitlement += r.entitlement;
    s.released += r.released;
    s.unspent += r.unspentBalance;
    s.releasePending += r.releasePending;
    s.avgInefficiency += r.inefficiencyScore;
    if (r.inefficiencyCategory === "ELEVATED" || r.inefficiencyCategory === "SEVERE") s.flagged++;
  }
  for (const k of Object.keys(byState)) {
    byState[k].avgInefficiency = Math.round((byState[k].avgInefficiency / byState[k].mps) * 10) / 10;
    byState[k].entitlement = round2(byState[k].entitlement);
    byState[k].released = round2(byState[k].released);
    byState[k].unspent = round2(byState[k].unspent);
    byState[k].releasePending = round2(byState[k].releasePending);
  }

  const signalCounts: Record<string, number> = {};
  for (const r of records) for (const s of r.signals) signalCounts[s.label] = (signalCounts[s.label] || 0) + 1;

  return {
    totalMPs: records.length,
    states: new Set(records.map(r => r.state)).size,
    totalEntitlement: round2(totalEntitlement),
    totalReleased: round2(totalReleased),
    totalReleasePending: round2(totalReleasePending),
    totalUnspent: round2(totalUnspent),
    avgReleaseRatePct: releaseRates.length ? round1(avg(releaseRates)) : 0,
    avgUnspentRatioPct: unspentRatios.length ? round1(avg(unspentRatios)) : 0,
    oversanctionedCount: records.filter(r => r.oversanctioned).length,
    staleCount: records.filter(r => r.stale).length,
    categoryCounts,
    byState,
    signalCounts
  };
}

function sum(a: number[]) { return a.reduce((x, y) => x + y, 0); }
function avg(a: number[]) { return a.length ? sum(a) / a.length : 0; }
function round1(n: number) { return Math.round(n * 10) / 10; }
function round2(n: number) { return Math.round(n * 100) / 100; }

// Parse a pipe-separated values file into raw rows.
export function parsePSV(text: string): RawFundRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];
  const header = lines[0].split("|");
  const out: RawFundRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split("|");
    const obj: any = {};
    header.forEach((h, j) => { obj[h.trim()] = (cells[j] ?? "").trim(); });
    out.push(obj as RawFundRow);
  }
  return out;
}
