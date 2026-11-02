import { NextRequest, NextResponse } from "next/server";
import { getFundRecords, getFundAggregates, getFundMeta } from "@/lib/fund-data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").toLowerCase();
  const state = url.searchParams.get("state") || "";
  const category = url.searchParams.get("category") || "";
  const flag = url.searchParams.get("flag") || "";
  const sort = url.searchParams.get("sort") || "score";
  const dir = url.searchParams.get("dir") === "asc" ? 1 : -1;
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const size = Math.min(parseInt(url.searchParams.get("size") || "25", 10), 500);

  let list = getFundRecords().slice();
  if (q) list = list.filter(r => r.constituency.toLowerCase().includes(q) || r.mp.toLowerCase().includes(q) || r.district.toLowerCase().includes(q));
  if (state) list = list.filter(r => r.state === state);
  if (category) list = list.filter(r => r.inefficiencyCategory === category);
  if (flag === "over") list = list.filter(r => r.oversanctioned);
  if (flag === "pending") list = list.filter(r => r.releasePending >= 2.5);
  if (flag === "idle") list = list.filter(r => r.unspentRatioPct !== null && r.unspentRatioPct >= 15 && r.unspentBalance >= 2);

  list.sort((a, b) => {
    switch (sort) {
      case "unspent": return dir * (a.unspentBalance - b.unspentBalance);
      case "entitlement": return dir * (a.entitlement - b.entitlement);
      case "pending": return dir * (a.releasePending - b.releasePending);
      case "release": return dir * ((a.releaseRatePct || 0) - (b.releaseRatePct || 0));
      case "constituency": return dir * a.constituency.localeCompare(b.constituency);
      default: return dir * (a.inefficiencyScore - b.inefficiencyScore);
    }
  });

  const total = list.length;
  const items = list.slice((page - 1) * size, (page - 1) * size + size);
  const states = Array.from(new Set(getFundRecords().map(r => r.state))).sort();

  return NextResponse.json({
    total, page, size, items,
    opts: { states, categories: ["LOW", "MODERATE", "ELEVATED", "SEVERE"] },
    aggregates: getFundAggregates(),
    meta: getFundMeta()
  });
}
