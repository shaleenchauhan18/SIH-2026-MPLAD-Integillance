"use client";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, CartesianGrid, LineChart, Line, Legend
} from "recharts";

const RISK_COLORS: Record<string, string> = {
  LOW: "#10b981", MEDIUM: "#f59e0b", HIGH: "#f97316", CRITICAL: "#ef4444"
};
const PALETTE = ["#3b82f6", "#22d3ee", "#a78bfa", "#f472b6", "#fbbf24", "#34d399", "#f87171", "#60a5fa", "#c084fc", "#fb923c"];

const tooltipStyle = {
  contentStyle: { background: "#0b1220", border: "1px solid #1f2a44", borderRadius: 6, color: "#e5e7eb", fontSize: 12 },
  labelStyle: { color: "#94a3b8" },
  itemStyle: { color: "#e5e7eb" }
};

export function RiskPie({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).map(([k, v]) => ({ name: k, value: v }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={entries} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={3}>
          {entries.map((e, i) => <Cell key={i} fill={RISK_COLORS[e.name] || PALETTE[i]} />)}
        </Pie>
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function CategoryBar({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).map(([k, v]) => ({ name: k, count: v })).sort((a, b) => b.count - a.count);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={entries} margin={{ left: 0, right: 8, top: 8, bottom: 40 }}>
        <CartesianGrid stroke="#1f2a44" vertical={false} />
        <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} interval={0} angle={-30} textAnchor="end" />
        <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StatusBar({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).map(([k, v]) => ({ name: k, count: v }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={entries} margin={{ left: 0, right: 8, top: 8, bottom: 20 }}>
        <CartesianGrid stroke="#1f2a44" vertical={false} />
        <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
        <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="count" fill="#22d3ee" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SignalBar({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).map(([k, v]) => ({ name: k, count: v })).sort((a, b) => b.count - a.count).slice(0, 8);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={entries} layout="vertical" margin={{ left: 20, right: 8, top: 8, bottom: 8 }}>
        <CartesianGrid stroke="#1f2a44" horizontal={false} />
        <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} />
        <YAxis dataKey="name" type="category" tick={{ fill: "#94a3b8", fontSize: 11 }} width={180} />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StateBar({ data }: { data: Record<string, { count: number; highRisk: number }> }) {
  const entries = Object.entries(data).map(([k, v]) => ({ name: k, ...v })).sort((a, b) => b.count - a.count);
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={entries} margin={{ left: 0, right: 8, top: 8, bottom: 40 }}>
        <CartesianGrid stroke="#1f2a44" vertical={false} />
        <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} interval={0} angle={-30} textAnchor="end" />
        <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
        <Bar dataKey="count" name="Projects" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="highRisk" name="High + Critical" fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CompareBar({ label, project, peer }: { label: string; project: number; peer: number }) {
  const data = [{ name: label, "This project": project, "Peer median": peer }];
  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data} layout="vertical" margin={{ left: 20, right: 16, top: 12, bottom: 12 }}>
        <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} />
        <YAxis type="category" dataKey="name" hide />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
        <Bar dataKey="This project" fill="#ef4444" radius={[4, 4, 4, 4]} />
        <Bar dataKey="Peer median" fill="#3b82f6" radius={[4, 4, 4, 4]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
