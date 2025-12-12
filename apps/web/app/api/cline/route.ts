import { NextResponse } from "next/server";
import { addRun, type RunLog } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RunLog;
    if (!body?.id || !body?.taskType || !body?.timestamp) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    console.log("[cline-api] Starting addRun for:", body.id);
    await addRun(body);
    console.log("[cline-api] Completed addRun for:", body.id);
    console.log("[cline-log]", body);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[cline-api] Error in POST /api/cline:", error);
    return NextResponse.json(
      { error: "Failed to record log" },
      { status: 500 },
    );
  }
}

