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

    if (!body.runId || !body.status || !body.summary) {
      return NextResponse.json(
        { error: "runId, status, and summary are required" },
        { status: 400 },
      );
    }

    const createdAt = body.createdAt ?? new Date().toISOString();

    await appendKestraSummary(body.runId, {
      status: body.status,
      summary: body.summary,
      decision: body.decision,
      createdAt,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("kestra-webhook error", error);
    return NextResponse.json({ error: "Failed to record summary" }, { status: 500 });
  }
}

