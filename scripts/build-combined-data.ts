import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");

// Real fund data (from ingestion pipeline)
const fund = JSON.parse(readFileSync(join(ROOT, "data", "fund-data.json"), "utf8"));

// Synthetic works data (illustrative investigation layer)
const works = JSON.parse(readFileSync(join(ROOT, "data", "artifact-data.json"), "utf8"));

const combined = {
  generatedAt: new Date().toISOString(),
  funds: fund,      // { meta, records, aggregates }
  works              // { projects, agencies, dashboard, opts }
};

const out = join(ROOT, "artifact", "combined-data.json");
writeFileSync(out, JSON.stringify(combined));
console.log("Wrote", out, (JSON.stringify(combined).length / 1024).toFixed(0), "KB");
console.log("  fund records:", fund.records.length, "| works projects:", works.projects.length);
