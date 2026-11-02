import { NextResponse } from "next/server";
import { getFundRecord, getFundRecords } from "@/lib/fund-data";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const r = getFundRecord(params.id);
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const peers = getFundRecords().filter(x => x.state === r.state && x.id !== r.id);
  const peerUnspentAvg = peers.length ? peers.reduce((s, x) => s + x.unspentBalance, 0) / peers.length : 0;
  const all = getFundRecords();
  const natUnspentAvg = all.reduce((s, x) => s + x.unspentBalance, 0) / all.length;
  return NextResponse.json({ record: r, peerUnspentAvg, natUnspentAvg, peerCount: peers.length });
}
