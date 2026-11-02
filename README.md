# MPLAD Intelligence & Audit System

**Smart India Hackathon — Problem Statement SIH26102**
*Development of an AI-powered system to detect anomalies, fraud, and inefficiencies in MPLAD scheme implementation.*

**Live demo (hosted, no install):** https://claude.ai/code/artifact/8cde038d-1a0a-4147-b7f6-7e1d03a0acea — a self-contained build running on the real fund data with working Excel/CSV/PDF export. The full Next.js app in this repo adds the live ingestion pipeline, server-side exports, the Leaflet map and the works-investigation report.

---

## 1. Problem overview

Under the Members of Parliament Local Area Development Scheme (MPLADS), each MP recommends works aggregating to hundreds of crores every year, spread across thousands of projects and implementing agencies. Manual review of every project is impractical, which allows cost outliers, timeline anomalies, duplicate works, unusual agency patterns and data-quality problems to go unnoticed.

## 2. Solution overview

The MPLAD Intelligence & Audit System is a browser-based screening and investigation platform with two layers:

1. **Fund Utilisation (real data).** It ingests **real 16th Lok Sabha MPLAD fund data** — entitlement, GoI release, release-pending, unsanctioned and unspent balances for 359 MP constituencies across 29 States/UTs — and computes an explainable *inefficiency score* for each constituency (idle released funds, over-sanction, pending release, low release rate, stalled pipeline). Every constituency can be opened for a full breakdown and the whole view exported to Excel, CSV or PDF.
2. **Works Audit (illustrative).** A project-level investigation workflow — cost outliers, timeline anomalies, duplicate detection, agency patterns, peer comparison and a full evidence pack — demonstrated on a clearly-labelled synthetic works dataset, because project-level cost/date records are not published in the open fund data.

A data-ingestion pipeline (`ingest/fetch.ts`) pulls the fund data live from the official open-data source when the network is available and falls back to a bundled real snapshot otherwise.

**Terminology matters.** The system identifies *risk indicators* and *anomalies requiring verification*. It does not claim proof of fraud or wrongdoing. Every red flag is presented alongside the underlying evidence and a recommendation for human investigation.

## 3. Key features

- **Real fund-utilisation intelligence:** 359 MP constituencies scored for inefficiency from real 16th Lok Sabha entitlement/release/unspent data, with a sortable/filterable table, per-constituency investigation pages and state-wise geographic breakdown.
- **Export to Excel, CSV and PDF:** the current filtered view of the fund table exports to a real `.xlsx` workbook, `.csv`, or a formatted `.pdf` — both from the hosted page (via the claude.ai downloads capability) and the Next.js server route `/api/funds/export`.
- **Live data ingestion pipeline** over the official CKAN datastore API + direct CSV, with graceful offline fallback; supports 16th and 17th Lok Sabha terms (`npm run ingest`, `npm run ingest:17`).
- **MPLADS-norms compliance screening** — checks the real fund data against scheme rules it can support (₹25 cr/term cap, full release, timely utilisation) and is transparent about norms needing the work-level feed (SC/ST allocation, sanction timelines).
- **Model-validation page** — precision 99% / recall 94% / F1 0.96 on a labelled synthetic anomaly set, a threshold-sensitivity curve, per-anomaly-type detection rates, and an honest statement of limitations on unlabelled real data.
- **Citizen "My Constituency" view, India tile-grid map, compare mode, a ⌘K command palette, and a personal watchlist** (per-viewer, exportable).
- **AI assistant** grounded in the real data (uses the claude.ai model on the hosted page, deterministic fallback otherwise).
- Executive dashboard with KPIs, risk distribution, category and status breakdowns, state-wise concentration and top high-risk projects.
- Projects table with full search, filters and sort (state, district, category, status, risk, agency, date, name/ID).
- Project investigation workspace: risk gauge, signal breakdown with weights and explanations, peer comparison charts, nearest comparable projects, relationship graph (project ↔ agency, location, vendor, peers), data quality report, plain-language explanation and recommended investigation steps.
- Interactive map of all projects, colour-coded by risk.
- Implementing agency portfolio view with delay rates, average risk scores and high-risk counts.
- Ask-AI natural-language interface grounded in the analytics output, with deterministic fallback so the demo does not depend on any external LLM.
- One-click investigation report generation as a downloadable PDF.
- Demo dataset explicitly labelled synthetic; not real government records.

## 4. System architecture

```
                 MPLAD Project Data (data/projects.json)
                                 │
                                 ▼
                       Data Validation + ETL (lib/analytics.ts)
                                 │
                                 ▼
                       Feature Engine (stats + aggregations)
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
        Anomaly detection                Pattern detection
        (z-score, IQR, ratio)      (duplicates, geo clusters,
                                    agency portfolio patterns)
                 └───────────────┬───────────────┘
                                 ▼
                       Weighted risk scoring
                                 │
                                 ▼
                     Explainable results (signals)
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
           Dashboard / Map              Investigation workspace
                                                 │
                                                 ▼
                                     PDF report + Q&A assistant
```

A single Next.js 14 application serves both the frontend (React) and the backend API routes. Analytics run inside the server on module import and are cached in memory for the life of the process.

## 5. Technology stack

- Next.js 14 (App Router) + React 18 + TypeScript
- Tailwind CSS for the UI system
- Recharts for charts
- React-Leaflet + OpenStreetMap tiles for the map
- jsPDF + jspdf-autotable for PDF reports; SheetJS (`xlsx`) for Excel/CSV export (server route `/api/funds/export` and client-side in the hosted artifact)
- A live ingestion pipeline over the CKAN datastore API + direct CSV (`ingest/`)
- Node.js runtime (no external database required for the MVP)

## 6. AI / ML methodology

The analytics engine intentionally separates *anomaly detection* from *language generation*:

- **Numerical/structural anomalies** are detected with statistical methods on the underlying data — z-score on log-cost against peer projects, expenditure/sanctioned ratio thresholds, duration-vs-peer-median thresholds, near-duplicate matching over category + district + budget + geodesic distance, and geographic bucket clustering.
- **Agency and geographic patterns** are surfaced as aggregate statistics per implementing agency and per lat/lng bucket.
- **Language explanations** are generated from the resulting structured signals (`lib/qna.ts`) so they are always grounded in verifiable evidence. An optional LLM can be wired in via `OPENAI_API_KEY` (`.env.example`), but the system remains fully functional without it — the graceful fallback uses deterministic templates over the same signals.

This separation makes the platform technically defensible: LLM ≠ anomaly detector.

## 7. Risk scoring methodology

Each project receives a weighted 0–100 score composed of independent signals:

| Signal                              | Typical weight |
|-------------------------------------|----------------|
| Cost anomaly (z-score outlier)      | 15 – 25        |
| Expenditure over-run                | 12 – 20        |
| Under-utilisation                   | 10             |
| Timeline anomaly (vs peers)         | 12 – 20        |
| Severe delay (vs own expected)      | 15             |
| Near-duplicate project              | 20             |
| Implementing agency risk pattern    | 10 – 15        |
| Geographic clustering               | 10             |
| Data inconsistency                  | 5 – 10         |

Categories: `0–29 LOW`, `30–49 MEDIUM`, `50–74 HIGH`, `75–100 CRITICAL`. The score is capped at 100 and every contributing signal is shown to the user with its own explanation and, where useful, its underlying evidence values.

## 8. Dataset

### Real fund data (16th Lok Sabha)

`data/sources/mplad_funds_16ls.psv` holds **359 real MP-constituency fund records across 29 States/UTs** for the 16th Lok Sabha (2014–2019): entitlement, GoI release, release-pending, unsanctioned balance, unspent balance and last-release date. This is genuine government open data, sourced from the India Open Government Data ecosystem via **data.opencity.in** (CKAN resource id `57baaa96-04ca-4328-86bc-17b455af1024`), which aggregates it from `mplads.gov.in`. The ingestion pipeline (§8a) refreshes it live; `data/fund-data.json` is the normalized, scored output the app serves.

Totals in the bundled snapshot: **₹8,562.5 crore** entitlement, **₹8,052.5 crore** released, **₹821.3 crore** unspent; the engine flags 7 constituencies SEVERE and 37 ELEVATED for inefficiency.

### Synthetic works data (illustrative)

The demo works dataset (`data/projects.json`) contains **600 synthetic MPLAD project records** across ten states and ten work categories, generated deterministically by `scripts/generate-dataset.ts`. It deliberately plants a mix of:

- cost outliers (~3%),
- expenditure over-runs (~2%),
- severe schedule delays (~5%),
- date inconsistencies (~1%),
- near-duplicate projects,
- agency behavioural patterns on two "problem" agencies,
- a geographic cluster in Jaipur,
- missing-vendor data-quality issues.

A handful of showcase "critical" projects (see `seedShowcaseCritical`) combine multiple issues so judges see the full pipeline light up.

**The works dataset is synthetic and clearly labelled as such throughout the UI. It is not real government data. The fund dataset above IS real government open data.**

## 8a. Data ingestion pipeline (web scraping / fetching)

`ingest/` contains a real, runnable pipeline:

- `ingest/sources.ts` documents the live sources with their real endpoints and licences: the OpenCity CKAN dataset (datastore API + direct CSV), the data.gov.in OGD work-level catalog, and the MPLADS eSAKSHI portal (MoSPI).
- `ingest/fetch.ts` fetches the full dataset live — first via the CKAN `datastore_search` JSON API (paginated), then the direct CSV download as a fallback — normalizes it to the internal schema, computes the inefficiency analytics, and writes `data/fund-data.json`. If the network is blocked (e.g. an offline/locked-down environment) it transparently falls back to the bundled real snapshot.

```bash
npm run ingest          # fetch live, fall back to snapshot
npm run ingest:offline  # use bundled snapshot only
```

The `data.gov.in` OGD API path is documented in `sources.ts` and enabled by setting a free `DATAGOV_API_KEY`.

## 9. Installation

```bash
git clone <your-fork-url>
cd SIH26102-MPLAD-INTELLIGENCE
npm install
npm run ingest       # fetch real fund data live (falls back to snapshot offline)
npm run seed         # regenerate synthetic works data/projects.json (optional)
npm run dev          # http://localhost:3000
```

## 10. Environment setup

Copy `.env.example` to `.env` if you want to attach an external LLM later:

```
OPENAI_API_KEY=            # leave empty to use the deterministic answerer
OPENAI_MODEL=gpt-4o-mini
```

The application ships with the deterministic answerer enabled — no keys are required for the demo.

## 11. Local development

```bash
npm run dev            # dev server with hot reload
npm run build          # production build
npm run start          # start built server
npm run seed           # regenerate the synthetic dataset
```

## 12. Deployment

The application is a plain Next.js 14 app and deploys unchanged to Vercel, Netlify, Render or any Node host:

- **Vercel (recommended):** `vercel` → `vercel --prod`. No environment variables required.
- **Any Node host:** `npm ci && npm run build && npm run start -- -p $PORT`.

Analytics run in memory on boot; no database provisioning is required.

## 13. Demo workflow (2–5 minute judge narrative)

1. **Dashboard.** Open `/`. Point out total projects, risk distribution, delayed and financial anomaly KPIs. Highlight top high-risk projects.
2. **Filter for critical risk.** Click *See all high-risk →* or open `/projects?risk=CRITICAL`.
3. **Open a critical project** — for example `MPLAD-01012 — Community Hall works at Jaipur Central`.
4. **Show the risk score gauge** — 100/100 CRITICAL.
5. **Explain the score.** Walk through the risk-signals table: cost anomaly, expenditure over-run, timeline anomaly, severe delay, near-duplicate.
6. **Compare with peers.** The cost and duration bar charts show this project against the peer median for the same category.
7. **Relationship graph.** Show connections to the implementing agency, location, vendor and comparable projects.
8. **Ask the AI.** Go to `/qna`, ask *"Why is MPLAD-01012 high risk?"* — the assistant returns a grounded plain-language explanation.
9. **Recommendations.** Back on the project page, show the recommended investigation steps.
10. **Generate the report.** Click *Generate Investigation Report (PDF)* and open the downloaded file to show the full evidence pack.
11. **Map.** Open `/map` and show the Jaipur cluster of critical/high-risk projects.
12. **Agencies.** Open `/agencies` to close the loop on agency-level patterns.

## 14. Limitations

- The demo dataset is synthetic. On real MPLAD MIS data, threshold values would be recalibrated against the true distribution and precision/recall would be measured against reviewed cases.
- The system is a risk screening prototype. Every flag requires human verification and the concerned implementing agency must be given a reasonable opportunity to explain.
- The current MVP holds analytics in memory. Production deployments would move to a database (PostgreSQL/Supabase) with a background pipeline that refreshes signals on ingest.

## 15. Future scope

- Direct ingest from the MPLAD MIS with change-data-capture.
- Learned anomaly models (Isolation Forest / autoencoder) once labelled review outcomes are available.
- Document intelligence for tender documents, utilisation certificates and completion photographs.
- Role-based access, audit trail and case management for investigating officers.
- Multi-lingual explanations for regional users.

## 16. Team

Placeholder — add team member names, roles and college. The application ships without any embedded credentials or personal data.

---

*This system is a hackathon prototype for SIH26102. Findings displayed by the system are risk indicators requiring human verification; they do not constitute a legal determination of fraud, misconduct or wrongdoing.*
