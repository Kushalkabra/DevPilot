import { NextResponse } from "next/server";
import { loadRuns } from "@/lib/store";

export const runtime = "nodejs";

/**
 * GET /api/runs
 * Returns all stored runs for the dashboard
 * @returns JSON response with runs array
 */
export async function GET() {
  try {
    const runs = await loadRuns();
    return NextResponse.json({ runs });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[runs-api] Error loading runs:", errorMessage);
    return NextResponse.json(
      { error: "Failed to load runs", runs: [] },
      { status: 500 },
    );
  }
}

