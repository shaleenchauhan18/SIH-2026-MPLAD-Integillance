export type ProjectStatus =
  | "Sanctioned"
  | "In Progress"
  | "Completed"
  | "Delayed"
  | "Stalled";

export type ProjectCategory =
  | "Roads & Bridges"
  | "Drinking Water"
  | "Education"
  | "Health"
  | "Sanitation"
  | "Electrification"
  | "Community Hall"
  | "Sports Infrastructure"
  | "Irrigation"
  | "Public Library";

export interface Project {
  id: string;
  name: string;
  state: string;
  district: string;
  constituency: string;
  mp: string;
  lat: number;
  lng: number;
  category: ProjectCategory;
  sanctionedAmount: number; // INR
  expenditure: number; // INR
  startDate: string; // ISO
  expectedCompletionDate: string; // ISO
  actualCompletionDate: string | null; // ISO or null
  status: ProjectStatus;
  agency: string;
  vendor: string;
  description: string;
  // seeded quality issues
  _seededIssues?: string[];
}

export interface RiskSignal {
  code: string;
  label: string;
  severity: "Low" | "Medium" | "High";
  weight: number; // contribution to score
  explanation: string;
  evidence?: Record<string, string | number | null>;
}

export interface DataQualityIssue {
  code: string;
  label: string;
  detail: string;
}

export interface ProjectAnalysis {
  projectId: string;
  riskScore: number; // 0-100
  riskCategory: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  signals: RiskSignal[];
  qualityIssues: DataQualityIssue[];
  peers: {
    peerIds: string[];
    peerCostMedian: number;
    peerDurationMedianDays: number;
    costDeviationPct: number | null;
    durationDeviationPct: number | null;
  };
  recommendations: string[];
}
