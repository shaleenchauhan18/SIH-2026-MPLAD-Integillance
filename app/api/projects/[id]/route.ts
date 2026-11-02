import { NextResponse } from "next/server";
import { getAnalysis, getProject, getAllProjects } from "@/lib/data";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const p = getProject(params.id);
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const a = getAnalysis(params.id)!;
  const allProjects = getAllProjects();
  const peers = a.peers.peerIds
    .map(id => {
      const q = allProjects.find(x => x.id === id);
      return q ? {
        id: q.id, name: q.name, state: q.state, district: q.district,
        category: q.category, sanctionedAmount: q.sanctionedAmount,
        startDate: q.startDate, actualCompletionDate: q.actualCompletionDate,
        agency: q.agency, status: q.status
      } : null;
    })
    .filter(Boolean);
  return NextResponse.json({ project: p, analysis: a, peers });
}
