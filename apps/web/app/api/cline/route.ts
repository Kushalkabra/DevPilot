import { NextResponse } from "next/server";
import { addRun, appendKestraSummary, type RunLog } from "@/lib/store";
import { generateKestraSummary } from "@/lib/kestra-summary";

export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds to allow for AI summary generation

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

    // Automatically generate and add Kestra summary
    try {
      console.log("[cline-api] Generating Kestra summary for:", body.id);
      const summary = await generateKestraSummary(body);
      console.log("[cline-api] Generated summary:", summary);
      await appendKestraSummary(body.id, summary);
      console.log("[cline-api] Successfully added Kestra summary for:", body.id);
    } catch (error) {
      // Don't fail the request if summary generation fails
      console.error("[cline-api] Error generating Kestra summary (non-fatal):", error);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[cline-api] Error in POST /api/cline:", error);
    return NextResponse.json(
      { error: "Failed to record log" },
      { status: 500 },
    );
  }
}

