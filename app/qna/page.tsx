"use client";
import { useState } from "react";
import Link from "next/link";

const SUGGESTIONS = [
  "Why is MPLAD-01042 high risk?",
  "Show me high-risk projects in Maharashtra.",
  "Which agencies have the highest anomaly rates?",
  "What should I investigate first?",
  "How is MPLAD implementation in Rajasthan?"
];

export default function QnA() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<{ q: string; a: string; citations: { id: string; name: string }[] }[]>([]);

  async function ask(question?: string) {
    const query = (question ?? q).trim();
    if (!query) return;
    setBusy(true);
    try {
      const r = await fetch("/api/qna", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: query }) });
      const d = await r.json();
      setHistory(h => [{ q: query, a: d.answer, citations: d.citations }, ...h]);
      setQ("");
    } catch (e) {
      setHistory(h => [{ q: query, a: "AI service is currently unavailable. Please try again shortly.", citations: [] }, ...h]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Ask the MPLAD Assistant</h1>
        <p className="text-sm text-muted mt-1">
          Answers are grounded strictly in the computed risk analytics and the current dataset. If an external LLM is unavailable, deterministic explanations are used.
        </p>
      </div>

      <div className="card p-4">
        <form onSubmit={e => { e.preventDefault(); ask(); }} className="flex gap-2">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Ask a question about MPLAD projects, risks or agencies…" className="flex-1 bg-ink border border-border rounded px-3 py-2 text-sm" />
          <button disabled={busy} className="px-4 py-2 rounded bg-accent text-white text-sm disabled:opacity-50">{busy ? "Thinking…" : "Ask"}</button>
        </form>
        <div className="flex flex-wrap gap-2 mt-3">
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => ask(s)} className="text-xs px-2 py-1 rounded border border-border text-muted hover:text-white hover:border-accent">{s}</button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {history.map((h, i) => (
          <div key={i} className="card p-4">
            <div className="text-xs text-muted uppercase tracking-widest">Question</div>
            <div className="text-sm font-medium mt-1">{h.q}</div>
            <div className="text-xs text-muted uppercase tracking-widest mt-3">Answer</div>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-6 mt-1 text-slate-200">{h.a}</pre>
            {h.citations.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {h.citations.map(c => (
                  <Link key={c.id} href={`/projects/${c.id}`} className="text-xs px-2 py-1 rounded border border-border text-accent hover:underline">
                    {c.id} — {c.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
