import { NextRequest, NextResponse } from "next/server";
import { answerQuestion } from "@/lib/qna";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();
    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }
    const { answer, citations } = answerQuestion(question);
    return NextResponse.json({ answer, citations, mode: "deterministic" });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
