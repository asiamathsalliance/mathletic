import { NextRequest } from "next/server";
import { searchQuestionsAI } from "@/lib/questions";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const results = searchQuestionsAI(q.trim());
  return Response.json({ results });
}
