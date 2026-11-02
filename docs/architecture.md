# Architecture Notes

## Runtime shape

- Single Next.js 14 app (App Router) with:
  - Server components for pages that render analytics deterministically (dashboard, agencies, individual project pages).
  - Client components for interactive surfaces (projects table with filters, map, Q&A).
  - Route handlers under `app/api/*` for JSON APIs.
- `lib/data.ts` loads `data/projects.json` once at process start, runs the analytics pipeline and caches per-project results in memory.

## Module map

```
app/
  layout.tsx, globals.css           # shell, theme, top nav
  page.tsx                          # Executive dashboard
  projects/page.tsx                 # Projects list + filters
  projects/[id]/page.tsx            # Investigation workspace
  map/page.tsx                      # Geographic view
  qna/page.tsx                      # AI assistant
  agencies/page.tsx                 # Agency portfolio view
  api/
    dashboard/route.ts              # aggregate KPIs & charts
    projects/route.ts               # filtered / paginated projects
    projects/[id]/route.ts          # project + analysis + peers
    agencies/route.ts               # agency portfolio metrics
    qna/route.ts                    # deterministic Q&A
    report/[id]/route.ts            # JSON payload for PDF generator

components/
  NavLink, Kpi, RiskBadge, RiskGauge
  Charts (Recharts wrappers)
  MapView (react-leaflet, ssr:false)
  RelationshipGraph (inline SVG)
  DownloadReport (jsPDF client-side)

lib/
  types.ts       # Project / RiskSignal / ProjectAnalysis
  stats.ts       # median, mean, stdev, iqr, zscore, haversine
  format.ts      # INR formatting, colour helpers
  analytics.ts   # data quality + anomaly detection + scoring
  qna.ts         # deterministic answerer

data/projects.json         # 600 synthetic MPLAD projects
scripts/generate-dataset.ts # deterministic dataset generator
```

## Why a single service?

The hackathon MVP does not benefit from splitting frontend and backend. Route handlers give us clean JSON APIs, server components skip the network round-trip where they can, and one deployment target keeps demo risk low.

## Where a real deployment would grow

- Move `data/projects.json` to a Postgres table with change-data-capture from the MPLAD MIS.
- Precompute analyses in a job (nightly + on ingest) and store the resulting signals table.
- Add an authenticated case management layer around the investigation page.
- Wire the Q&A route to a hosted LLM but keep the deterministic path as a fallback.
