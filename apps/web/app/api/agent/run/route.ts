import { NextResponse } from "next/server";
import { runAgentTask } from "@/lib/agents";

export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds for agent tasks

type AgentPayload = {
  taskType: "scaffold" | "tests" | "refactor";
  target: string;
  context?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AgentPayload;
    
    if (!body?.taskType || !body?.target) {
      return NextResponse.json(
        { error: "Missing required fields: taskType, target" },
        { status: 400 }
      );
    }

    if (!["scaffold", "tests", "refactor"].includes(body.taskType)) {
      return NextResponse.json(
        { error: "Invalid taskType. Must be: scaffold, tests, or refactor" },
        { status: 400 }
      );
    }

    console.log(`[agent-run] Executing ${body.taskType} for ${body.target}`);
    
    const result = await runAgentTask(body.taskType, {
      taskType: body.taskType,
      target: body.target,
      context: body.context,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[agent-run] Error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Agent task failed: ${message}` },
      { status: 500 }
    );
  }
}



