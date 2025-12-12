import { NextResponse } from "next/server";
import { appendKestraSummary } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      runId?: string;
      status?: string;
      summary?: string;
      decision?: string;
      createdAt?: string;
    };

    console.log("[kestra-webhook] Received request:", body);

    if (!body.runId || !body.status || !body.summary) {
      console.error("[kestra-webhook] Missing required fields:", {
        hasRunId: !!body.runId,
        hasStatus: !!body.status,
        hasSummary: !!body.summary,
      });
      return NextResponse.json(
        { error: "runId, status, and summary are required" },
        { status: 400 },
      );
    }

    const createdAt = body.createdAt ?? new Date().toISOString();

    console.log(`[kestra-webhook] Appending summary to run: ${body.runId}`);
    await appendKestraSummary(body.runId, {
      status: body.status,
      summary: body.summary,
      decision: body.decision,
      createdAt,
    });
    console.log(`[kestra-webhook] Successfully appended summary to run: ${body.runId}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[kestra-webhook] Error:", error);
    return NextResponse.json({ error: "Failed to record summary" }, { status: 500 });
  }
}

