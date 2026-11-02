import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { FundRecord, FundAggregates } from "./fund-types";
import { parsePSV, normalizeFundRow, computeFundAggregates } from "./fund-analytics";

// Prefer the ingested data/fund-data.json (produced by `npm run ingest`);
// fall back to normalizing the bundled real snapshot directly.
let RECORDS: FundRecord[] = [];
let AGG: FundAggregates;
let META: any = { origin: "unknown", source: {} };

try {
  const p = join(process.cwd(), "data", "fund-data.json");
  if (existsSync(p)) {
    const j = JSON.parse(readFileSync(p, "utf8"));
    RECORDS = j.records;
    AGG = j.aggregates;
    META = j.meta;
  } else {
    throw new Error("no fund-data.json");
  }
} catch {
  const snap = join(process.cwd(), "data", "sources", "mplad_funds_16ls.psv");
  const rows = parsePSV(readFileSync(snap, "utf8"));
  RECORDS = rows.map(normalizeFundRow);
  AGG = computeFundAggregates(RECORDS);
  META = { origin: "bundled-snapshot (runtime normalize)", rowCount: RECORDS.length };
}

export function getFundRecords(): FundRecord[] { return RECORDS; }
export function getFundAggregates(): FundAggregates { return AGG; }
export function getFundMeta() { return META; }
export function getFundRecord(id: string): FundRecord | undefined {
  return RECORDS.find(r => r.id === id);
}
