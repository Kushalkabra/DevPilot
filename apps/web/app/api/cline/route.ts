import { NextResponse } from "next/server";
import { addRun, appendKestraSummary, type RunLog } from "@/lib/store";
import { generateKestraSummary } from "@/lib/kestra-summary";

export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds to allow for AI summary generation

/**
 * Validates that a RunLog object has all required fields
 * @param body - The request body to validate
 * @returns True if valid, false otherwise
 */
function isValidRunLog(body: unknown): body is RunLog {
  if (!body || typeof body !== "object") {
    return false;
  }
  const log = body as Partial<RunLog>;
  return (
    typeof log.id === "string" &&
    typeof log.taskType === "string" &&
    ["scaffold", "tests", "refactor"].includes(log.taskType) &&
    typeof log.timestamp === "string" &&
    typeof log.input === "string" &&
    typeof log.outputSummary === "string" &&
    typeof log.status === "string" &&
    ["completed", "failed"].includes(log.status)
  );
}

/**
 * Creates an error response with consistent formatting
 * @param message - Error message
 * @param status - HTTP status code (default: 400)
 * @returns NextResponse with error
 */
function createErrorResponse(message: string, status: number = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Handles Kestra summary generation with error recovery
 * @param runId - The run ID to attach summary to
 * @param run - The run log object
 */
async function handleKestraSummaryGeneration(runId: string, run: RunLog): Promise<void> {
  try {
    console.log("[cline-api] Generating Kestra summary for:", runId);
    const summary = await generateKestraSummary(run);
    console.log("[cline-api] Generated summary:", summary);
    await appendKestraSummary(runId, summary);
    console.log("[cline-api] Successfully added Kestra summary for:", runId);
  } catch (error) {
    // Don't fail the request if summary generation fails
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[cline-api] Error generating Kestra summary (non-fatal):", errorMessage);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate request payload structure
    if (!isValidRunLog(body)) {
      console.error("[cline-api] Invalid payload structure:", body);
      return createErrorResponse("Invalid payload: missing required fields (id, taskType, timestamp, input, outputSummary, status)");
    }

    console.log("[cline-api] Starting addRun for:", body.id);
    await addRun(body);
    console.log("[cline-api] Completed addRun for:", body.id);
    console.log("[cline-log]", body);

    // Automatically generate and add Kestra summary (non-blocking)
    await handleKestraSummaryGeneration(body.id, body);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[cline-api] Error in POST /api/cline:", errorMessage);
    return NextResponse.json(
      { error: `Failed to record log: ${errorMessage}` },
      { status: 500 },
    );
  }
}

