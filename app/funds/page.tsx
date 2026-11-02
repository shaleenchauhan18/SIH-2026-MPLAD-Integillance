"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Rec = {
  id: string; state: string; mp: string; constituency: string; district: string;
  entitlement: number; released: number; releasePending: number; unsanctionBalance: number;
  unspentBalance: number; releaseRatePct: number | null; inefficiencyScore: number; inefficiencyCategory: string;
};

const CAT_CLASS: Record<string, string> = {
  LOW: "bg-low/15 text-low border-low/40",
  MODERATE: "bg-medium/15 text-medium border-medium/40",
  ELEVATED: "bg-high/15 text-high border-high/40",
  SEVERE: "bg-critical/15 text-critical border-critical/40"
};
const cr = (n: number) => `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr`;

export default function FundsPage() {
  const [items, setItems] = useState<Rec[]>([]);
  const [opts, setOpts] = useState<{ states: string[]; categories: string[] } | null>(null);
  const [agg, setAgg] = useState<any>(null);
  const [meta, setMeta] = useState<any>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [state, setState] = useState("");
  const [category, setCategory] = useState("");
  const [flag, setFlag] = useState("");
  const [sort, setSort] = useState("score");

  const query = useMemo(() => {
    const u = new URLSearchParams();
    if (q) u.set("q", q); if (state) u.set("state", state); if (category) u.set("category", category);
    if (flag) u.set("flag", flag); u.set("sort", sort); u.set("page", String(page)); u.set("size", "25");
    return u.toString();
  }, [q, state, category, flag, sort, page]);

  useEffect(() => {
    fetch(`/api/funds?${query}`).then(r => r.json()).then(d => {
      setItems(d.items); setTotal(d.total); setOpts(d.opts); setAgg(d.aggregates); setMeta(d.meta);
    });
  }, [query]);

  const exportUrl = (format: string) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q); if (state) u.set("state", state); if (category) u.set("category", category); if (flag) u.set("flag", flag);
    u.set("format", format);
    return `/api/funds/export?${u.toString()}`;
  };
  const pages = Math.max(1, Math.ceil(total / 25));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Fund Utilisation — real 16th Lok Sabha data</h1>
        <p className="text-sm text-muted mt-1">
          Every MP constituency ranked by a transparent inefficiency score from idle funds, over-sanction, pending release and stalled pipelines.
          {meta && <span className="ml-1 text-xs">Source origin: <span className="font-mono">{meta.origin}</span>.</span>}
        </p>
      </div>

      {agg && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi label="Total entitlement" value={cr(agg.totalEntitlement)} />
          <Kpi label="Unspent balance" value={cr(agg.totalUnspent)} tone="text-high" />
          <Kpi label="Severe / elevated" value={`${agg.categoryCounts.SEVERE} / ${agg.categoryCounts.ELEVATED}`} tone="text-critical" />
          <Kpi label="Over-sanctioned" value={agg.oversanctionedCount} tone="text-high" />
        </div>
      )}

      <div className="card p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Search constituency / MP / district" className="bg-ink border border-border rounded px-3 py-2 text-sm md:col-span-2" />
          <select value={state} onChange={e => { setState(e.target.value); setPage(1); }} className="bg-ink border border-border rounded px-2 py-2 text-sm">
            <option value="">State: all</option>
            {opts?.states.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }} className="bg-ink border border-border rounded px-2 py-2 text-sm">
            <option value="">Inefficiency: all</option>
            {opts?.categories.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={flag} onChange={e => { setFlag(e.target.value); setPage(1); }} className="bg-ink border border-border rounded px-2 py-2 text-sm">
            <option value="">Flag: all</option>
            <option value="idle">Idle funds</option>
            <option value="over">Over-sanctioned</option>
            <option value="pending">Release pending</option>
          </select>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-xs text-muted">Export current view:</span>
          <a href={exportUrl("xlsx")} className="px-3 py-1.5 rounded border border-border text-sm hover:border-accent">⬇ Excel (.xlsx)</a>
          <a href={exportUrl("csv")} className="px-3 py-1.5 rounded border border-border text-sm hover:border-accent">⬇ CSV</a>
          <select value={sort} onChange={e => setSort(e.target.value)} className="bg-ink border border-border rounded px-2 py-1.5 text-sm ml-auto">
            <option value="score">Sort: inefficiency</option>
            <option value="unspent">Sort: unspent</option>
            <option value="entitlement">Sort: entitlement</option>
            <option value="pending">Sort: pending</option>
          </select>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead><tr>
            <th className="table-header">Constituency / MP</th>
            <th className="table-header">State</th>
            <th className="table-header">Entitlement</th>
            <th className="table-header">Release %</th>
            <th className="table-header">Unspent</th>
            <th className="table-header">Unsanc.</th>
            <th className="table-header">Pending</th>
            <th className="table-header">Inefficiency</th>
          </tr></thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={8} className="table-cell text-center text-muted py-8">No constituencies match.</td></tr>}
            {items.map(r => (
              <tr key={r.id} className="border-t border-border hover:bg-white/[0.03]">
                <td className="table-cell">
                  <Link href={`/funds/${r.id}`} className="text-accent hover:underline">{r.constituency}</Link>
                  <div className="text-xs text-muted">{r.mp}</div>
                </td>
                <td className="table-cell">{r.state}</td>
                <td className="table-cell font-mono text-xs">{cr(r.entitlement)}</td>
                <td className="table-cell font-mono text-xs">{r.releaseRatePct != null ? `${r.releaseRatePct.toFixed(0)}%` : "—"}</td>
                <td className={`table-cell font-mono text-xs ${r.unspentBalance >= 2 ? "text-high" : ""}`}>{cr(r.unspentBalance)}</td>
                <td className={`table-cell font-mono text-xs ${r.unsanctionBalance < -0.5 ? "text-high" : ""}`}>{r.unsanctionBalance > 0 ? "+" : ""}{r.unsanctionBalance}</td>
                <td className={`table-cell font-mono text-xs ${r.releasePending >= 2.5 ? "text-medium" : ""}`}>{cr(r.releasePending)}</td>
                <td className="table-cell"><span className={`chip border ${CAT_CLASS[r.inefficiencyCategory]}`}>{r.inefficiencyCategory} · {r.inefficiencyScore}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted">
        <div>{total.toLocaleString("en-IN")} constituencies · page {page} / {pages}</div>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded border border-border disabled:opacity-40">Previous</button>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded border border-border disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone = "text-white" }: { label: string; value: any; tone?: string }) {
  return (
    <div className="card p-4">
      <div className="kpi-label">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${tone}`}>{value}</div>
    </div>
  );
}
