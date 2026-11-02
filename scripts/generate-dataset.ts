import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Project, ProjectCategory, ProjectStatus } from "../lib/types";

// Deterministic PRNG so dataset is stable across builds
let SEED = 1337;
function rand() {
  SEED = (SEED * 9301 + 49297) % 233280;
  return SEED / 233280;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
function randint(a: number, b: number) {
  return Math.floor(rand() * (b - a + 1)) + a;
}
function jitter(base: number, pct: number) {
  return base * (1 + (rand() - 0.5) * 2 * pct);
}

const STATES = [
  { state: "Maharashtra", districts: ["Pune", "Nagpur", "Mumbai Suburban", "Nashik", "Aurangabad"], lat: 19.5, lng: 75.5 },
  { state: "Karnataka", districts: ["Bengaluru Urban", "Mysuru", "Belagavi", "Dharwad", "Kalaburagi"], lat: 15.3, lng: 75.7 },
  { state: "Tamil Nadu", districts: ["Chennai", "Coimbatore", "Madurai", "Salem", "Tiruchirappalli"], lat: 11.1, lng: 78.6 },
  { state: "Uttar Pradesh", districts: ["Lucknow", "Kanpur Nagar", "Varanasi", "Agra", "Prayagraj"], lat: 27.0, lng: 80.9 },
  { state: "West Bengal", districts: ["Kolkata", "Howrah", "Darjeeling", "Nadia", "Bardhaman"], lat: 22.9, lng: 87.8 },
  { state: "Rajasthan", districts: ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer"], lat: 27.0, lng: 74.2 },
  { state: "Gujarat", districts: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar"], lat: 22.7, lng: 71.6 },
  { state: "Madhya Pradesh", districts: ["Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain"], lat: 22.9, lng: 78.6 },
  { state: "Bihar", districts: ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Darbhanga"], lat: 25.1, lng: 85.3 },
  { state: "Kerala", districts: ["Thiruvananthapuram", "Ernakulam", "Kozhikode", "Thrissur", "Kollam"], lat: 10.8, lng: 76.3 }
];

const CATEGORIES: ProjectCategory[] = [
  "Roads & Bridges",
  "Drinking Water",
  "Education",
  "Health",
  "Sanitation",
  "Electrification",
  "Community Hall",
  "Sports Infrastructure",
  "Irrigation",
  "Public Library"
];

// Typical sanctioned budget medians in INR lakh, per category
const CATEGORY_BUDGET_LAKH: Record<ProjectCategory, number> = {
  "Roads & Bridges": 25,
  "Drinking Water": 12,
  Education: 18,
  Health: 22,
  Sanitation: 10,
  Electrification: 15,
  "Community Hall": 20,
  "Sports Infrastructure": 14,
  Irrigation: 16,
  "Public Library": 9
};

const CATEGORY_DURATION_MONTHS: Record<ProjectCategory, number> = {
  "Roads & Bridges": 10,
  "Drinking Water": 6,
  Education: 8,
  Health: 9,
  Sanitation: 5,
  Electrification: 6,
  "Community Hall": 8,
  "Sports Infrastructure": 7,
  Irrigation: 9,
  "Public Library": 5
};

const AGENCIES = [
  "PWD State Division",
  "Municipal Corporation",
  "District Rural Development Agency",
  "Zilla Parishad Works Dept",
  "State Water Board",
  "Jal Nigam",
  "State Electricity Corp.",
  "Public Health Engineering Dept",
  "Education Dept Works Cell",
  "State Sports Authority",
  "Urban Local Body",
  "Panchayati Raj Institution"
];

// A couple of "problem" agencies to seed patterns
const PROBLEM_AGENCIES = ["District Rural Development Agency", "Urban Local Body"];

const VENDORS = [
  "Shakti Constructions",
  "Bharat Infra Ltd",
  "Krishna Engineering Works",
  "Vindhya Builders",
  "Ganga Contractors Pvt Ltd",
  "Meru Enterprises",
  "Chola Engineers",
  "Aravalli Contractors",
  "Godavari Infra",
  "Yamuna Works Co."
];

const MP_NAMES = [
  "Anil Kumar", "Rekha Sharma", "Manoj Patil", "Sunita Devi", "Ramesh Iyer",
  "Meena Nair", "Vikram Singh", "Neha Gupta", "Pradeep Verma", "Kavita Rao",
  "Deepak Yadav", "Fatima Sheikh", "Rohit Deshpande", "Lakshmi Menon", "Arjun Reddy",
  "Priya Chatterjee", "Sanjay Mishra", "Nirmala Balakrishnan", "Ajay Thakur", "Shabnam Ali"
];

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addMonths(d: Date, m: number) {
  const nd = new Date(d);
  nd.setMonth(nd.getMonth() + m);
  return nd;
}
function addDays(d: Date, days: number) {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + days);
  return nd;
}

function makeConstituency(state: string, district: string, i: number) {
  return `${district} ${["North", "South", "East", "West", "Central"][i % 5]}`;
}

function makeProject(i: number): Project {
  const st = pick(STATES);
  const district = pick(st.districts);
  const category = pick(CATEGORIES);
  const constituency = makeConstituency(st.state, district, i);
  const agency = pick(AGENCIES);
  const vendor = pick(VENDORS);
  const mp = pick(MP_NAMES);

  const baseBudgetLakh = CATEGORY_BUDGET_LAKH[category];
  const sanctionedLakh = Math.max(2, jitter(baseBudgetLakh, 0.4));
  const sanctionedAmount = Math.round(sanctionedLakh * 100000);

  // Utilization typically 60-100%
  const utilization = 0.6 + rand() * 0.4;
  const expenditure = Math.round(sanctionedAmount * utilization);

  const REF_NOW = new Date("2026-09-01");
  const expectedMonths = CATEGORY_DURATION_MONTHS[category];
  const expectedDays = expectedMonths * 30;

  // Status distribution, with start dates chosen RELATIVE to the reference
  // "now" so that normal ongoing projects are NOT incidentally overdue.
  // Only planted anomalies (seedAnomalies) create extreme delays.
  const r = rand();
  let status: ProjectStatus;
  let start: Date;
  let expected: Date;
  let actual: string | null = null;
  if (r < 0.55) {
    // Completed on/near schedule sometime in the past
    start = addDays(REF_NOW, -expectedDays - randint(30, 900));
    expected = addMonths(start, expectedMonths);
    actual = isoDate(addDays(expected, randint(-30, 60)));
    status = "Completed";
  } else if (r < 0.8) {
    // In progress, within schedule (expected completion in the near future)
    start = addDays(REF_NOW, -Math.round(expectedDays * (0.2 + rand() * 0.6)));
    expected = addMonths(start, expectedMonths);
    status = "In Progress";
  } else if (r < 0.9) {
    // Delayed but only moderately (below the extreme-anomaly bar)
    start = addDays(REF_NOW, -Math.round(expectedDays * (1.3 + rand() * 0.5)));
    expected = addMonths(start, expectedMonths);
    status = "Delayed";
  } else if (r < 0.96) {
    // Just sanctioned, recently
    start = addDays(REF_NOW, -randint(10, 90));
    expected = addMonths(start, expectedMonths);
    status = "Sanctioned";
  } else {
    // Stalled: overdue moderately (below the extreme bar)
    start = addDays(REF_NOW, -Math.round(expectedDays * (1.6 + rand() * 0.6)));
    expected = addMonths(start, expectedMonths);
    status = "Stalled";
  }

  // Location jitter around state centroid
  const lat = st.lat + (rand() - 0.5) * 3;
  const lng = st.lng + (rand() - 0.5) * 3;

  return {
    id: `MPLAD-${String(1000 + i).padStart(5, "0")}`,
    name: `${category} works at ${constituency} (Ph-${1 + (i % 4)})`,
    state: st.state,
    district,
    constituency,
    mp,
    lat: Number(lat.toFixed(4)),
    lng: Number(lng.toFixed(4)),
    category,
    sanctionedAmount,
    expenditure,
    startDate: isoDate(start),
    expectedCompletionDate: isoDate(expected),
    actualCompletionDate: actual,
    status,
    agency,
    vendor,
    description: `${category} improvement work sanctioned under MPLADS for ${constituency}, ${district}, ${st.state}. Implemented by ${agency}.`
  };
}

function seedAnomalies(projects: Project[]) {
  // 1. Financial cost outliers: bump 3% of projects to 3-5x category median
  for (let i = 0; i < projects.length; i++) {
    if (rand() < 0.03) {
      const p = projects[i];
      const base = CATEGORY_BUDGET_LAKH[p.category] * 100000;
      p.sanctionedAmount = Math.round(base * (3 + rand() * 2));
      p.expenditure = Math.round(p.sanctionedAmount * (0.7 + rand() * 0.3));
      (p._seededIssues ??= []).push("cost-outlier");
    }
  }

  // 2. Expenditure over-run: ~2% — clearly above the +20% high-severity bar
  for (const p of projects) {
    if (rand() < 0.02) {
      p.expenditure = Math.round(p.sanctionedAmount * (1.25 + rand() * 0.35));
      (p._seededIssues ??= []).push("expenditure-overrun");
    }
  }

  // 3. Timeline anomalies: ~5% severely delayed — clearly beyond normal Delayed/Stalled
  for (const p of projects) {
    if (rand() < 0.05) {
      const start = new Date(p.startDate);
      const expected = new Date(p.expectedCompletionDate);
      const expectedDays = (expected.getTime() - start.getTime()) / 86400000;
      const actualDays = expectedDays * (3 + rand() * 1.5); // 3–4.5x expected
      const actual = addDays(start, Math.round(actualDays));
      p.actualCompletionDate = isoDate(actual);
      p.status = "Completed";
      (p._seededIssues ??= []).push("severe-delay");
    }
  }

  // 4. Impossible/inconsistent dates: ~1%
  for (const p of projects) {
    if (rand() < 0.01) {
      p.actualCompletionDate = isoDate(addDays(new Date(p.startDate), -randint(5, 30)));
      (p._seededIssues ??= []).push("date-inconsistency");
    }
  }

  // 5. Duplicates: pick 8 pairs and make near-duplicates
  for (let k = 0; k < 8; k++) {
    const i = randint(0, projects.length - 1);
    const j = randint(0, projects.length - 1);
    if (i === j) continue;
    const src = projects[i];
    projects[j] = {
      ...src,
      id: projects[j].id, // keep id
      lat: src.lat + (rand() - 0.5) * 0.012, // within ~0.7km so the <2km duplicate detector catches it
      lng: src.lng + (rand() - 0.5) * 0.012,
      sanctionedAmount: Math.round(src.sanctionedAmount * (0.96 + rand() * 0.06)),
      expenditure: Math.round(src.expenditure * (0.96 + rand() * 0.06))
    };
    (projects[j]._seededIssues ??= []).push("near-duplicate");
    (projects[i]._seededIssues ??= []).push("near-duplicate");
  }

  // 6. Agency pattern: boost problem agencies with more delays & higher costs
  for (const p of projects) {
    if (PROBLEM_AGENCIES.includes(p.agency) && rand() < 0.35) {
      if (rand() < 0.5) {
        p.status = "Delayed";
      }
      p.sanctionedAmount = Math.round(p.sanctionedAmount * (1.3 + rand() * 0.5));
      (p._seededIssues ??= []).push("agency-pattern");
    }
  }

  // 7. Geographic cluster: dense set in one small area
  const cluster = { lat: 26.8, lng: 75.85, state: "Rajasthan", district: "Jaipur" };
  for (let k = 0; k < 12; k++) {
    const idx = randint(0, projects.length - 1);
    projects[idx].lat = cluster.lat + (rand() - 0.5) * 0.03;
    projects[idx].lng = cluster.lng + (rand() - 0.5) * 0.03;
    projects[idx].state = cluster.state;
    projects[idx].district = cluster.district;
    projects[idx].constituency = "Jaipur Central";
    (projects[idx]._seededIssues ??= []).push("geo-cluster");
  }

  // 8. Missing values (data quality only): ~2%
  for (const p of projects) {
    if (rand() < 0.02) {
      // @ts-expect-error intentional
      p.vendor = "";
      (p._seededIssues ??= []).push("missing-vendor");
    }
  }
}

function seedShowcaseCritical(projects: Project[]) {
  // Plant a handful of clearly-suspicious "hero" projects to make the demo pop.
  // Each combines multiple signals: cost outlier + expenditure over-run + severe delay
  // + duplicate + agency pattern + geo cluster.
  const cluster = { lat: 26.8, lng: 75.85, state: "Rajasthan", district: "Jaipur" };
  const heroes = [
    { i: 12, cat: "Community Hall" as ProjectCategory, agency: "District Rural Development Agency" },
    { i: 44, cat: "Roads & Bridges" as ProjectCategory, agency: "Urban Local Body" },
    { i: 88, cat: "Sports Infrastructure" as ProjectCategory, agency: "District Rural Development Agency" }
  ];
  for (const h of heroes) {
    const p = projects[h.i];
    p.category = h.cat;
    p.agency = h.agency;
    p.state = cluster.state;
    p.district = cluster.district;
    p.constituency = "Jaipur Central";
    p.name = `${h.cat} works at Jaipur Central (Ph-${1 + (h.i % 4)})`;
    p.description = `${h.cat} improvement work sanctioned under MPLADS for Jaipur Central, Jaipur, Rajasthan. Implemented by ${h.agency}.`;
    p.lat = cluster.lat + (rand() - 0.5) * 0.02;
    p.lng = cluster.lng + (rand() - 0.5) * 0.02;
    const base = CATEGORY_BUDGET_LAKH[h.cat] * 100000;
    p.sanctionedAmount = Math.round(base * (4 + rand() * 2));       // 4-6x median
    p.expenditure = Math.round(p.sanctionedAmount * (1.2 + rand() * 0.3)); // over-run
    // severe delay
    const start = new Date(p.startDate);
    const expected = new Date(p.expectedCompletionDate);
    const dExp = (expected.getTime() - start.getTime()) / 86400000;
    p.actualCompletionDate = isoDate(addDays(start, Math.round(dExp * 3.5)));
    p.status = "Completed";
    (p._seededIssues ??= []).push("hero-critical");
    // Also mark vendor missing for data quality
    if (h.i === 88) (p as any).vendor = "";
  }
  // Near-duplicate pair for hero 12
  projects[13] = {
    ...projects[12],
    id: projects[13].id,
    lat: projects[12].lat + 0.005,
    lng: projects[12].lng + 0.005,
    sanctionedAmount: Math.round(projects[12].sanctionedAmount * 0.98)
  };
  (projects[13]._seededIssues ??= []).push("near-duplicate");
}

function main() {
  const N = 600;
  const projects: Project[] = [];
  for (let i = 0; i < N; i++) projects.push(makeProject(i));
  seedAnomalies(projects);
  seedShowcaseCritical(projects);

  const outDir = join(__dirname, "..", "data");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "projects.json"), JSON.stringify(projects, null, 2));
  console.log(`Wrote ${projects.length} projects to data/projects.json`);
}

main();
