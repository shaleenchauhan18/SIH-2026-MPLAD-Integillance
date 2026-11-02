import { NextRequest, NextResponse } from "next/server";
import { getAllAnalyses, getAllProjects } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").toLowerCase();
  const state = url.searchParams.get("state") || "";
  const district = url.searchParams.get("district") || "";
  const category = url.searchParams.get("category") || "";
  const status = url.searchParams.get("status") || "";
  const risk = url.searchParams.get("risk") || "";
  const agency = url.searchParams.get("agency") || "";
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";
  const sort = url.searchParams.get("sort") || "risk";
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const size = Math.min(parseInt(url.searchParams.get("size") || "25", 10), 100);

  const projects = getAllProjects();
  const analyses = new Map(getAllAnalyses().map(a => [a.projectId, a]));

  let list = projects.map(p => {
    const a = analyses.get(p.id)!;
    return { ...p, riskScore: a.riskScore, riskCategory: a.riskCategory, signalsCount: a.signals.length };
  });

  if (q) list = list.filter(p => p.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q));
  if (state) list = list.filter(p => p.state === state);
  if (district) list = list.filter(p => p.district === district);
  if (category) list = list.filter(p => p.category === category);
  if (status) list = list.filter(p => p.status === status);
  if (risk) list = list.filter(p => p.riskCategory === risk);
  if (agency) list = list.filter(p => p.agency === agency);
  if (from) list = list.filter(p => p.startDate >= from);
  if (to) list = list.filter(p => p.startDate <= to);

  switch (sort) {
    case "risk": list.sort((a, b) => b.riskScore - a.riskScore); break;
    case "amount": list.sort((a, b) => b.sanctionedAmount - a.sanctionedAmount); break;
    case "date": list.sort((a, b) => b.startDate.localeCompare(a.startDate)); break;
    case "name": list.sort((a, b) => a.name.localeCompare(b.name)); break;
  }

  const total = list.length;
  const start = (page - 1) * size;
  const items = list.slice(start, start + size);

  // Filter option pools
  const opts = {
    states: Array.from(new Set(projects.map(p => p.state))).sort(),
    districts: Array.from(new Set(projects.map(p => p.district))).sort(),
    categories: Array.from(new Set(projects.map(p => p.category))).sort(),
    statuses: Array.from(new Set(projects.map(p => p.status))).sort(),
    agencies: Array.from(new Set(projects.map(p => p.agency))).sort(),
    risks: ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
  };

  return NextResponse.json({ total, page, size, items, opts });
}
