import projectsJson from "../data/projects.json";
import type { Project, ProjectAnalysis } from "./types";
import {
  computeAgencyStats,
  computeDuplicates,
  computeGeoClusters,
  scoreProject
} from "./analytics";

const PROJECTS: Project[] = projectsJson as Project[];

const AGENCY_STATS = computeAgencyStats(PROJECTS);
const DUPLICATE_SET = computeDuplicates(PROJECTS);
const GEO_CLUSTER_SET = computeGeoClusters(PROJECTS);

const ANALYSIS_CACHE = new Map<string, ProjectAnalysis>();
for (const p of PROJECTS) {
  ANALYSIS_CACHE.set(p.id, scoreProject(p, PROJECTS, AGENCY_STATS, DUPLICATE_SET, GEO_CLUSTER_SET));
}

export function getAllProjects(): Project[] {
  return PROJECTS;
}
export function getProject(id: string): Project | undefined {
  return PROJECTS.find(p => p.id === id);
}
export function getAnalysis(id: string): ProjectAnalysis | undefined {
  return ANALYSIS_CACHE.get(id);
}
export function getAllAnalyses(): ProjectAnalysis[] {
  return Array.from(ANALYSIS_CACHE.values());
}
export function getAgencyStats() {
  return AGENCY_STATS;
}
