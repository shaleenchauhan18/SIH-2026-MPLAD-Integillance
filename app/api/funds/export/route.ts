import { NextRequest, NextResponse } from "next/server";
import { getFundRecords } from "@/lib/fund-data";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

function filtered(url: URL) {
  const q = (url.searchParams.get("q") || "").toLowerCase();
  const state = url.searchParams.get("state") || "";
  const category = url.searchParams.get("category") || "";
  const flag = url.searchParams.get("flag") || "";
  let list = getFundRecords().slice();
  if (q) list = list.filter(r => r.constituency.toLowerCase().includes(q) || r.mp.toLowerCase().includes(q) || r.district.toLowerCase().includes(q));
  if (state) list = list.filter(r => r.state === state);
  if (category) list = list.filter(r => r.inefficiencyCategory === category);
  if (flag === "over") list = list.filter(r => r.oversanctioned);
  if (flag === "pending") list = list.filter(r => r.releasePending >= 2.5);
  if (flag === "idle") list = list.filter(r => r.unspentRatioPct !== null && r.unspentRatioPct >= 15 && r.unspentBalance >= 2);
  list.sort((a, b) => b.inefficiencyScore - a.inefficiencyScore);
  return list;
}

function toRows(list: ReturnType<typeof getFundRecords>) {
  return list.map(r => ({
    Constituency: r.constituency, MP: r.mp, District: r.district, State: r.state,
    "Entitlement (Cr)": r.entitlement, "Released (Cr)": r.released, "Release Rate %": r.releaseRatePct,
    "Release Pending (Cr)": r.releasePending, "Unsanctioned Balance (Cr)": r.unsanctionBalance,
    "Unspent (Cr)": r.unspentBalance, "Last Release": r.lastReleaseDate || "",
    "Inefficiency Score": r.inefficiencyScore, Category: r.inefficiencyCategory,
    Signals: r.signals.map(s => s.label).join("; ")
  }));
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const format = (url.searchParams.get("format") || "csv").toLowerCase();
  const rows = toRows(filtered(url));

  if (format === "xlsx") {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MPLAD Fund Utilisation");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
    return new NextResponse(buf, {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": 'attachment; filename="mplad-fund-utilisation.xlsx"'
      }
    });
  }

  // CSV
  const keys = rows.length ? Object.keys(rows[0]) : [];
  const csv = [keys.join(",")]
    .concat(rows.map(r => keys.map(k => {
      const v = (r as any)[k] == null ? "" : String((r as any)[k]);
      return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(",")))
    .join("\n");
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="mplad-fund-utilisation.csv"'
    }
  });
}
