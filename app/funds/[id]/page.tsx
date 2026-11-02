import Link from "next/link";
import { notFound } from "next/navigation";
import { getFundRecord, getFundRecords } from "@/lib/fund-data";

const cr = (n: number) => `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr`;
const CAT_CLASS: Record<string, string> = {
  LOW: "text-low", MODERATE: "text-medium", ELEVATED: "text-high", SEVERE: "text-critical"
};

export default function FundDetail({ params }: { params: { id: string } }) {
  const r = getFundRecord(params.id);
  if (!r) return notFound();
  const peers = getFundRecords().filter(x => x.state === r.state && x.id !== r.id);
  const peerUnspentAvg = peers.length ? peers.reduce((s, x) => s + x.unspentBalance, 0) / peers.length : 0;
  const all = getFundRecords();
  const natUnspentAvg = all.reduce((s, x) => s + x.unspentBalance, 0) / all.length;
  const utilised = r.released > 0 ? ((r.released - r.unspentBalance) / r.released) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted"><Link href="/funds" className="hover:text-white">← Back to fund utilisation</Link></div>
      <div className="card p-5">
        <div className="flex flex-col md:flex-row gap-6 md:items-start">
          <div className="flex-1">
            <span className="chip bg-low/15 text-low border border-low/40">REAL DATA · 16th Lok Sabha</span>
            <h1 className="text-2xl font-semibold mt-3">{r.constituency}</h1>
            <div className="text-sm text-muted mt-1">{r.mp} · {r.district} district · {r.state}</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
              <F k="Entitlement" v={cr(r.entitlement)} />
              <F k="GoI released" v={cr(r.released)} />
              <F k="Release rate" v={r.releaseRatePct != null ? `${r.releaseRatePct.toFixed(0)}%` : "—"} />
              <F k="Release pending" v={cr(r.releasePending)} />
              <F k="Unspent balance" v={cr(r.unspentBalance)} />
              <F k="Utilised of released" v={`${utilised.toFixed(0)}%`} />
              <F k="Unsanctioned balance" v={`${r.unsanctionBalance > 0 ? "+" : ""}${r.unsanctionBalance} Cr`} />
              <F k="Last release" v={r.lastReleaseDate || "—"} />
            </div>
          </div>
          <div className="md:w-64">
            <div className="text-xs text-muted uppercase tracking-widest">Inefficiency</div>
            <div className={`text-5xl font-semibold ${CAT_CLASS[r.inefficiencyCategory]}`}>{r.inefficiencyScore}</div>
            <div className={`text-lg font-medium ${CAT_CLASS[r.inefficiencyCategory]}`}>{r.inefficiencyCategory}</div>
            <div className="text-xs text-muted mt-2">Composite of idle funds, over-sanction, pending release and pipeline staleness.</div>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="text-sm font-medium mb-3">Screening signals</div>
        {r.signals.length === 0 ? (
          <div className="text-sm text-muted">No inefficiency signals — funds appear to be flowing and utilised normally.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className="table-header">Signal</th><th className="table-header">Severity</th><th className="table-header">Weight</th><th className="table-header">Explanation</th></tr></thead>
              <tbody>
                {r.signals.slice().sort((a, b) => b.weight - a.weight).map(s => (
                  <tr key={s.code} className="border-t border-border">
                    <td className="table-cell font-medium">{s.label}</td>
                    <td className="table-cell">{s.severity}</td>
                    <td className="table-cell font-mono">+{s.weight}</td>
                    <td className="table-cell text-sm">{s.explanation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card p-4">
        <div className="text-sm font-medium mb-2">Unspent vs peers</div>
        <div className="text-sm text-muted">
          This constituency: <b className="text-high">{cr(r.unspentBalance)}</b> unspent ·
          {" "}{r.state} average: <b>{cr(peerUnspentAvg)}</b> ({peers.length} peers) ·
          {" "}National average: <b>{cr(natUnspentAvg)}</b>.
        </div>
        <div className="text-xs text-muted mt-3">Screening indicators for administrative review, not findings of wrongdoing. Cross-verify against the MPLADS eSAKSHI portal before any conclusion.</div>
      </div>
    </div>
  );
}

function F({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted">{k}</div>
      <div className="text-sm mt-0.5">{v}</div>
    </div>
  );
}
