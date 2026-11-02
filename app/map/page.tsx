import { MapView } from "@/components/MapView";

export default function MapPage() {
  return (
    <div className="space-y-4">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div>
        <h1 className="text-2xl font-semibold">Geographic view</h1>
        <p className="text-sm text-muted mt-1">Every project plotted on the map. Colours indicate risk category; click a marker for details or to open the investigation page.</p>
      </div>
      <MapView />
    </div>
  );
}
