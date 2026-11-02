/**
 * Real MPLAD open-data sources.
 *
 * These are genuine, public endpoints. The ingestion pipeline (ingest/fetch.ts)
 * pulls the full dataset from them when run on an open network. In locked-down
 * environments (e.g. the hackathon sandbox), the fetch falls back to the
 * bundled snapshot in data/sources/.
 */

export interface DataSource {
  id: string;
  title: string;
  provider: string;
  homepage: string;
  /** CKAN datastore_search API (JSON, paginated) */
  datastoreApi?: string;
  /** Direct file download (CSV) */
  csvDownload?: string;
  resourceId?: string;
  lokSabha?: string;
  license: string;
  notes: string;
}

export const SOURCES: DataSource[] = [
  {
    id: "opencity-16ls-funds",
    title:
      "Lok Sabha MP Local Area Development Funds Details — 16th Lok Sabha (2014-2019)",
    provider: "OpenCity / Data{Meet} (aggregated from mplads.gov.in)",
    homepage:
      "https://data.opencity.in/dataset/lok-sabha-mp-local-area-development-funds-details",
    datastoreApi:
      "https://data.opencity.in/api/3/action/datastore_search?resource_id=57baaa96-04ca-4328-86bc-17b455af1024",
    csvDownload:
      "https://data.opencity.in/dataset/0844e65b-76ff-422b-a213-2495aec592d9/resource/57baaa96-04ca-4328-86bc-17b455af1024/download/d6a40c40-f0bb-44d7-b697-fd4d74ffefd3.csv",
    resourceId: "57baaa96-04ca-4328-86bc-17b455af1024",
    lokSabha: "16",
    license: "Open Government Data (OGD) India — Government Open Data License",
    notes:
      "MP/constituency-level entitlement, GoI release, release-pending, unsanctioned and unspent balances. This is the dataset bundled as data/sources/mplad_funds_16ls.psv."
  },
  {
    id: "opencity-17ls-funds",
    title:
      "Lok Sabha MP Local Area Development Funds Details — 17th Lok Sabha (2019-2024)",
    provider: "OpenCity / Data{Meet} (aggregated from mplads.gov.in)",
    homepage:
      "https://data.opencity.in/dataset/lok-sabha-mp-local-area-development-funds-details",
    datastoreApi:
      "https://data.opencity.in/api/3/action/datastore_search?resource_id=4d2bc892-cd12-4f17-befa-aa7efb6e210b",
    resourceId: "4d2bc892-cd12-4f17-befa-aa7efb6e210b",
    lokSabha: "17",
    license: "Open Government Data (OGD) India — Government Open Data License",
    notes:
      "Current-term (17th Lok Sabha) MP/constituency fund data. Same schema as the 16th LS resource. Fetched live by the pipeline with --term=17; not bundled as a snapshot. Media reporting notes MPLAD unspent share roughly doubled over this term."
  },
  {
    id: "datagov-16ls-works",
    title:
      "Utilisation of MPLAD Scheme funds and detail of works — 16th Lok Sabha MPs",
    provider: "Open Government Data (OGD) Platform India — data.gov.in",
    homepage:
      "https://www.data.gov.in/catalog/utilisation-mplad-scheme-funds-and-detail-works-16th-lok-sabha-mps-0",
    resourceId: "",
    lokSabha: "16",
    license: "Government Open Data License — India",
    notes:
      "Work-level detail catalog on data.gov.in. Requires an api.data.gov.in API key (free). Set DATAGOV_API_KEY to enable in fetch.ts."
  },
  {
    id: "mospi-esakshi",
    title: "MPLADS eSAKSHI dashboard (official live portal)",
    provider: "Ministry of Statistics and Programme Implementation (MoSPI)",
    homepage: "https://mplads.mospi.gov.in/",
    license: "Government of India",
    notes:
      "The authoritative live portal. Real-time works, sanction and expenditure data. Public bulk export is limited; used here as the canonical reference / provenance."
  }
];
