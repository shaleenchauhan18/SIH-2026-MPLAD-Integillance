"use client";
import { useState } from "react";

export function DownloadReport({ projectId }: { projectId: string }) {
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try {
      const res = await fetch(`/api/report/${projectId}`);
      const data = await res.json();
      const [{ default: jsPDF }, autoTableMod] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable")
      ]);
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const W = doc.internal.pageSize.getWidth();
      const marg = 40;
      let y = marg;

      doc.setFillColor(11, 18, 32); doc.rect(0, 0, W, 70, "F");
      doc.setTextColor(255); doc.setFontSize(16); doc.text("MPLAD Intelligence — Investigation Report", marg, 32);
      doc.setFontSize(9); doc.setTextColor(180);
      doc.text(`Generated: ${new Date(data.generatedAt).toLocaleString("en-IN")}`, marg, 52);
      doc.setTextColor(20); y = 90;

      const p = data.project;
      const a = data.analysis;

      doc.setFontSize(12); doc.text(`Project: ${p.id} — ${p.name}`, marg, y); y += 16;
      doc.setFontSize(10);
      const info = [
        ["State", p.state], ["District", p.district], ["Constituency", p.constituency],
        ["Category", p.category], ["Agency", p.agency], ["Vendor", p.vendor || "—"],
        ["Sanctioned", `₹${p.sanctionedAmount.toLocaleString("en-IN")}`],
        ["Expenditure", `₹${p.expenditure.toLocaleString("en-IN")}`],
        ["Start", p.startDate], ["Expected", p.expectedCompletionDate],
        ["Actual", p.actualCompletionDate || "—"], ["Status", p.status]
      ];
      // @ts-ignore
      (autoTableMod.default || (doc as any).autoTable)(doc, {
        startY: y, head: [["Field", "Value"]], body: info,
        theme: "grid", styles: { fontSize: 9 }, headStyles: { fillColor: [30, 41, 59] }
      });
      // @ts-ignore
      y = (doc as any).lastAutoTable.finalY + 20;

      doc.setFontSize(12); doc.text(`Risk Score: ${a.riskScore} / 100 — ${a.riskCategory}`, marg, y); y += 14;

      const signals = a.signals.map((s: any) => [s.label, s.severity, `+${s.weight}`, s.explanation]);
      // @ts-ignore
      (autoTableMod.default || (doc as any).autoTable)(doc, {
        startY: y, head: [["Signal", "Severity", "Weight", "Explanation"]],
        body: signals.length ? signals : [["No signals", "-", "-", "No risk signals detected"]],
        theme: "grid", styles: { fontSize: 9 }, columnStyles: { 3: { cellWidth: 260 } },
        headStyles: { fillColor: [30, 41, 59] }
      });
      // @ts-ignore
      y = (doc as any).lastAutoTable.finalY + 20;

      doc.setFontSize(11); doc.text("Peer comparison", marg, y); y += 12;
      const peers = (data.peers || []).map((q: any) => [q.id, q.name, q.state, q.status, `₹${q.sanctionedAmount.toLocaleString("en-IN")}`]);
      // @ts-ignore
      (autoTableMod.default || (doc as any).autoTable)(doc, {
        startY: y, head: [["ID", "Peer project", "State", "Status", "Sanctioned"]],
        body: peers.length ? peers : [["—", "No comparable peers", "-", "-", "-"]],
        theme: "grid", styles: { fontSize: 9 }, headStyles: { fillColor: [30, 41, 59] }
      });
      // @ts-ignore
      y = (doc as any).lastAutoTable.finalY + 20;

      doc.setFontSize(11); doc.text("Recommended investigation steps", marg, y); y += 12;
      // @ts-ignore
      (autoTableMod.default || (doc as any).autoTable)(doc, {
        startY: y, body: a.recommendations.map((r: string, i: number) => [String(i + 1), r]),
        theme: "plain", styles: { fontSize: 9 }, columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 470 } }
      });
      // @ts-ignore
      y = (doc as any).lastAutoTable.finalY + 24;

      doc.setFontSize(8); doc.setTextColor(100);
      const disc = doc.splitTextToSize(data.disclaimer, W - marg * 2);
      doc.text(disc, marg, y);

      doc.save(`${p.id}-investigation-report.pdf`);
    } catch (e) {
      console.error(e);
      alert("Report generation failed. See console for details.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <button onClick={go} disabled={busy} className="px-4 py-2 rounded bg-accent text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-60">
      {busy ? "Generating…" : "Generate Investigation Report (PDF)"}
    </button>
  );
}
