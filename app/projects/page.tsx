"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RiskBadge } from "@/components/RiskBadge";
import { inrLakh } from "@/lib/format";

type Item = {
  id: string; name: string; state: string; district: string; category: string;
  sanctionedAmount: number; expenditure: number; status: string; agency: string;
  riskScore: number; riskCategory: string; signalsCount: number; startDate: string;
};
type Opts = {
  states: string[]; districts: string[]; categories: string[]; statuses: string[]; agencies: string[]; risks: string[];
};

export default function ProjectsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [opts, setOpts] = useState<Opts | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const size = 25;

  const [q, setQ] = useState("");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [risk, setRisk] = useState("");
  const [agency, setAgency] = useState("");
  const [sort, setSort] = useState("risk");

  // initial url params
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setQ(p.get("q") || "");
    setState(p.get("state") || "");
    setDistrict(p.get("district") || "");
    setCategory(p.get("category") || "");
    setStatus(p.get("status") || "");
    setRisk(p.get("risk") || "");
    setAgency(p.get("agency") || "");
  }, []);

  const query = useMemo(() => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (state) u.set("state", state);
    if (district) u.set("district", district);
    if (category) u.set("category", category);
    if (status) u.set("status", status);
    if (risk) u.set("risk", risk);
    if (agency) u.set("agency", agency);
    u.set("sort", sort);
    u.set("page", String(page));
    u.set("size", String(size));
    return u.toString();
  }, [q, state, district, category, status, risk, agency, sort, page]);

  useEffect(() => {
    fetch(`/api/projects?${query}`).then(r => r.json()).then(d => {
      setItems(d.items); setTotal(d.total); setOpts(d.opts);
    });
  }, [query]);

  const pages = Math.max(1, Math.ceil(total / size));

  function clear() {
    setQ(""); setState(""); setDistrict(""); setCategory(""); setStatus(""); setRisk(""); setAgency(""); setSort("risk"); setPage(1);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Projects</h1>
        <p className="text-sm text-muted mt-1">Search, filter and open any project to see risk signals, evidence and investigation recommendations.</p>
      </div>

      <div className="card p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Search by ID or name" className="bg-ink border border-border rounded px-3 py-2 text-sm md:col-span-2" />
          <select value={sort} onChange={e => setSort(e.target.value)} className="bg-ink border border-border rounded px-3 py-2 text-sm">
            <option value="risk">Sort: highest risk</option>
            <option value="amount">Sort: sanctioned amount</option>
            <option value="date">Sort: start date</option>
            <option value="name">Sort: name</option>
          </select>
          <button onClick={clear} className="bg-white/5 border border-border rounded text-sm">Clear filters</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <select value={risk} onChange={e => { setRisk(e.target.value); setPage(1); }} className="bg-ink border border-border rounded px-2 py-2 text-sm">
            <option value="">Risk: all</option>
            {opts?.risks.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={state} onChange={e => { setState(e.target.value); setPage(1); }} className="bg-ink border border-border rounded px-2 py-2 text-sm">
            <option value="">State: all</option>
            {opts?.states.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={district} onChange={e => { setDistrict(e.target.value); setPage(1); }} className="bg-ink border border-border rounded px-2 py-2 text-sm">
            <option value="">District: all</option>
            {opts?.districts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }} className="bg-ink border border-border rounded px-2 py-2 text-sm">
            <option value="">Category: all</option>
            {opts?.categories.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="bg-ink border border-border rounded px-2 py-2 text-sm">
            <option value="">Status: all</option>
            {opts?.statuses.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={agency} onChange={e => { setAgency(e.target.value); setPage(1); }} className="bg-ink border border-border rounded px-2 py-2 text-sm">
            <option value="">Agency: all</option>
            {opts?.agencies.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-header">ID</th>
              <th className="table-header">Project</th>
              <th className="table-header">State / District</th>
              <th className="table-header">Category</th>
              <th className="table-header">Sanctioned</th>
              <th className="table-header">Status</th>
              <th className="table-header">Agency</th>
              <th className="table-header">Risk</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={8} className="table-cell text-center text-muted py-8">No projects match the current filters.</td></tr>
            )}
            {items.map(p => (
              <tr key={p.id} className="border-t border-border hover:bg-white/[0.03]">
                <td className="table-cell font-mono text-xs">{p.id}</td>
                <td className="table-cell">
                  <Link href={`/projects/${p.id}`} className="text-accent hover:underline">{p.name}</Link>
                </td>
                <td className="table-cell">{p.state} · {p.district}</td>
                <td className="table-cell">{p.category}</td>
                <td className="table-cell">{inrLakh(p.sanctionedAmount)}</td>
                <td className="table-cell">{p.status}</td>
                <td className="table-cell">{p.agency}</td>
                <td className="table-cell"><RiskBadge category={p.riskCategory} score={p.riskScore} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted">
        <div>{total.toLocaleString("en-IN")} projects · page {page} / {pages}</div>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded border border-border disabled:opacity-40">Previous</button>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded border border-border disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  );
}
