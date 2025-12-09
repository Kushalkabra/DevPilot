import { NextResponse } from "next/server";
import { loadRuns } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  const runs = await loadRuns();
  return NextResponse.json({ runs });
}

