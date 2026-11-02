"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { inrLakh } from "@/lib/format";

const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then(m => m.CircleMarker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(m => m.Popup), { ssr: false });

type Item = { id: string; name: string; state: string; district: string; category: string; sanctionedAmount: number; riskScore: number; riskCategory: string; lat: number; lng: number; agency: string };

const COLOR: Record<string, string> = { LOW: "#10b981", MEDIUM: "#f59e0b", HIGH: "#f97316", CRITICAL: "#ef4444" };

export function MapView() {
  const [items, setItems] = useState<Item[]>([]);
  const [risk, setRisk] = useState("");

  useEffect(() => {
    // Pull all projects (large page size)
    const u = new URLSearchParams({ size: "600", sort: "risk" });
    if (risk) u.set("risk", risk);
    fetch(`/api/projects?${u.toString()}`).then(r => r.json()).then(d => setItems(d.items));
  }, [risk]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted">Showing {items.length} projects. Colours indicate risk category.</div>
        <select value={risk} onChange={e => setRisk(e.target.value)} className="bg-ink border border-border rounded px-2 py-1 text-sm">
          <option value="">All risk levels</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>
      <div className="card overflow-hidden" style={{ height: 640 }}>
        <MapContainer center={[22.5, 79]} zoom={5} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {items.map(p => (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lng]}
              radius={p.riskCategory === "CRITICAL" ? 8 : p.riskCategory === "HIGH" ? 6 : 4}
              pathOptions={{ color: COLOR[p.riskCategory], fillColor: COLOR[p.riskCategory], fillOpacity: 0.7, weight: 1 }}
            >
              <Popup>
                <div style={{ minWidth: 220, color: "#111" }}>
                  <div style={{ fontWeight: 700 }}>{p.id}</div>
                  <div style={{ fontSize: 12, margin: "4px 0" }}>{p.name}</div>
                  <div style={{ fontSize: 11 }}>{p.district}, {p.state}</div>
                  <div style={{ fontSize: 11 }}>{p.category} · {p.agency}</div>
                  <div style={{ fontSize: 11 }}>Sanctioned: {inrLakh(p.sanctionedAmount)}</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>
                    <b style={{ color: COLOR[p.riskCategory] }}>{p.riskCategory}</b> · risk {p.riskScore}/100
                  </div>
                  <Link href={`/projects/${p.id}`} style={{ color: "#2563eb", fontSize: 12, textDecoration: "underline" }}>Open investigation →</Link>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
