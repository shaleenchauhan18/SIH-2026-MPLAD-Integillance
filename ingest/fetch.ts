/**
 * MPLAD data ingestion pipeline.
 *
 *   npx tsx ingest/fetch.ts            # fetch from live source, fall back to snapshot
 *   npx tsx ingest/fetch.ts --offline  # use bundled snapshot only
 *
 * Strategy:
 *   1. Try the CKAN datastore_search API (paginated JSON) on data.opencity.in.
 *   2. If that fails, try the direct CSV download.
 *   3. If the network is unavailable (locked-down sandbox), fall back to the
 *      bundled real snapshot at data/sources/mplad_funds_16ls.psv.
 *
 * The output is written to data/fund-data.json (records + aggregates + provenance),
 * which the Next.js API and the static artifact both consume.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { SOURCES } from "./sources";
import {
  parsePSV,
  normalizeFundRow,
  computeFundAggregates
} from "../lib/fund-analytics";
import type { RawFundRow } from "../lib/fund-types";

const ROOT = join(__dirname, "..");
const SNAPSHOT = join(ROOT, "data", "sources", "mplad_funds_16ls.psv");
const OUT = join(ROOT, "data", "fund-data.json");
const OFFLINE = process.argv.includes("--offline");

const COLS = [
  "State", "MPName", "Constituency", "District",
  "TotalEntitlementAmount_crore", "TotalGOIRelease_crore",
  "ReleasePendingAmount_crore", "UnSanctionBalance_crore",
  "UnspentBalance_crore", "LastReleaseDate"
];

async function fetchWithTimeout(url: string, ms = 20000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "mplad-intelligence-ingest/1.0" } });
  } finally {
    clearTimeout(t);
  }
}

/** CKAN datastore_search — paginate through all records. */
async function fetchFromDatastore(api: string): Promise<RawFundRow[]> {
  const rows: RawFundRow[] = [];
  const pageSize = 200;
  let offset = 0;
  for (let guard = 0; guard < 100; guard++) {
    const url = `${api}&limit=${pageSize}&offset=${offset}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`datastore HTTP ${res.status}`);
    const json: any = await res.json();
    const recs: any[] = json?.result?.records ?? [];
    if (recs.length === 0) break;
    for (const r of recs) {
      const row: any = {};
      for (const c of COLS) row[c] = r[c] ?? "";
      rows.push(row as RawFundRow);
    }
    offset += recs.length;
    const total = json?.result?.total ?? 0;
    if (offset >= total) break;
  }
  if (rows.length === 0) throw new Error("datastore returned no rows");
  return rows;
}

/** Direct CSV download fallback. */
async function fetchFromCsv(url: string): Promise<RawFundRow[]> {
  const res = await fetchWithTimeout(url, 30000);
  if (!res.ok) throw new Error(`csv HTTP ${res.status}`);
  const text = await res.text();
  return parseCsv(text);
}

function parseCsv(text: string): RawFundRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length);
  const header = splitCsvLine(lines[0]);
  const out: RawFundRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const obj: any = {};
    header.forEach((h, j) => { obj[h.trim()] = (cells[j] ?? "").trim(); });
    out.push(obj as RawFundRow);
  }
  return out;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (c === "," && !inQ) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

function loadSnapshot(): RawFundRow[] {
  if (!existsSync(SNAPSHOT)) throw new Error(`snapshot missing: ${SNAPSHOT}`);
  return parsePSV(readFileSync(SNAPSHOT, "utf8"));
}

async function main() {
  // --term=16 (default) or --term=17 selects the Lok Sabha term to ingest.
  const termArg = (process.argv.find(a => a.startsWith("--term=")) || "--term=16").split("=")[1];
  const src = SOURCES.find(s => s.lokSabha === termArg && s.datastoreApi) || SOURCES[0];
  console.log(`→ target: ${src.title}`);
  let rows: RawFundRow[] = [];
  let origin = "bundled-snapshot";

  if (!OFFLINE) {
    try {
      console.log(`→ trying CKAN datastore API: ${src.datastoreApi}`);
      rows = await fetchFromDatastore(src.datastoreApi!);
      origin = "live:ckan-datastore";
      console.log(`  ✓ fetched ${rows.length} rows from datastore API`);
    } catch (e: any) {
      console.log(`  ✗ datastore failed (${e.message}); trying direct CSV…`);
      try {
        rows = await fetchFromCsv(src.csvDownload!);
        origin = "live:csv-download";
        console.log(`  ✓ fetched ${rows.length} rows from CSV`);
      } catch (e2: any) {
        console.log(`  ✗ CSV failed (${e2.message}); falling back to bundled snapshot.`);
      }
    }
  }

  if (rows.length === 0) {
    if (src.lokSabha !== "16") {
      console.error(`✗ No live data for ${src.lokSabha}th LS and no bundled snapshot for it. Run on an open network to fetch it from the CKAN API.`);
      process.exit(2);
    }
    rows = loadSnapshot();
    origin = OFFLINE ? "bundled-snapshot (offline)" : "bundled-snapshot (network blocked)";
    console.log(`→ loaded ${rows.length} rows from bundled snapshot`);
  }

  const records = rows.map(normalizeFundRow);
  const aggregates = computeFundAggregates(records);

  const payload = {
    meta: {
      generatedAt: new Date().toISOString(),
      origin,
      source: {
        id: src.id, title: src.title, provider: src.provider,
        homepage: src.homepage, resourceId: src.resourceId,
        license: src.license, lokSabha: src.lokSabha
      },
      rowCount: records.length,
      disclaimer:
        "Real MPLAD fund data (16th Lok Sabha). Inefficiency indicators are computed screening signals requiring human verification, not findings of wrongdoing."
    },
    records,
    aggregates
  };

  writeFileSync(OUT, JSON.stringify(payload));
  console.log(`✓ wrote ${OUT} — ${records.length} records, origin=${origin}`);
  console.log(`  entitlement ₹${aggregates.totalEntitlement} cr · released ₹${aggregates.totalReleased} cr · unspent ₹${aggregates.totalUnspent} cr`);
  console.log(`  flagged (elevated+severe): ${aggregates.categoryCounts.ELEVATED + aggregates.categoryCounts.SEVERE}`);
}

main().catch(e => { console.error(e); process.exit(1); });
