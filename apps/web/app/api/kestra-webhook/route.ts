import { NextResponse } from "next/server";
import { appendKestraSummary } from "@/lib/store";

export const runtime = "nodejs";

/**
 * Type guard for Kestra webhook payload
 */
type KestraWebhookPayload = {
  runId?: string;
  status?: string;
  summary?: string;
  decision?: string;
  createdAt?: string;
};

/**
 * Validates Kestra webhook payload has required fields
 */
function isValidKestraPayload(body: unknown): body is KestraWebhookPayload {
  if (!body || typeof body !== "object") {
    return false;
  }
  const payload = body as KestraWebhookPayload;
  return (
    typeof payload.runId === "string" &&
    payload.runId.length > 0 &&
    typeof payload.status === "string" &&
    payload.status.length > 0 &&
    typeof payload.summary === "string" &&
    payload.summary.length > 0
  );
}

/**
 * Creates standardized error response
 */
function createErrorResponse(message: string, status: number = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log("[kestra-webhook] Received request:", body);

    // Validate required fields
    if (!isValidKestraPayload(body)) {
      console.error("[kestra-webhook] Missing required fields:", {
        hasRunId: typeof body === "object" && body !== null && "runId" in body,
        hasStatus: typeof body === "object" && body !== null && "status" in body,
        hasSummary: typeof body === "object" && body !== null && "summary" in body,
      });
      return createErrorResponse("runId, status, and summary are required");
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[kestra-webhook] Error:", errorMessage);
    return NextResponse.json(
      { error: `Failed to record summary: ${errorMessage}` },
      { status: 500 },
    );
  }
}

