export interface RawFundRow {
  State: string;
  MPName: string;
  Constituency: string;
  District: string;
  TotalEntitlementAmount_crore: string;
  TotalGOIRelease_crore: string;
  ReleasePendingAmount_crore: string;
  UnSanctionBalance_crore: string;
  UnspentBalance_crore: string;
  LastReleaseDate: string;
}

export interface FundSignal {
  code: string;
  label: string;
  severity: "Low" | "Medium" | "High";
  weight: number;
  explanation: string;
}

export interface FundRecord {
  id: string;
  state: string;
  mp: string;
  constituency: string;
  district: string;
  entitlement: number; // ₹ crore
  released: number; // ₹ crore
  releasePending: number; // ₹ crore
  unsanctionBalance: number; // ₹ crore (negative => sanctioned beyond available)
  unspentBalance: number; // ₹ crore (released but not spent)
  lastReleaseDate: string | null; // ISO or null

  // derived
  releaseRatePct: number | null; // released / entitlement
  unspentRatioPct: number | null; // unspent / released
  idlePct: number | null; // unspent / entitlement
  oversanctioned: boolean;
  daysSinceLastRelease: number | null;
  stale: boolean;

  inefficiencyScore: number; // 0-100
  inefficiencyCategory: "LOW" | "MODERATE" | "ELEVATED" | "SEVERE";
  signals: FundSignal[];
}

export interface FundAggregates {
  totalMPs: number;
  states: number;
  totalEntitlement: number;
  totalReleased: number;
  totalReleasePending: number;
  totalUnspent: number;
  avgReleaseRatePct: number;
  avgUnspentRatioPct: number;
  oversanctionedCount: number;
  staleCount: number;
  categoryCounts: Record<string, number>;
  byState: Record<string, {
    mps: number;
    entitlement: number;
    released: number;
    unspent: number;
    releasePending: number;
    avgInefficiency: number;
    flagged: number;
  }>;
  signalCounts: Record<string, number>;
}
