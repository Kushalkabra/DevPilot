import { type RunLog } from "./store";

// Optional: Free AI API support (Hugging Face or Groq)
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY ?? "";
const GROQ_API_KEY = process.env.GROQ_API_KEY ?? "";

export type KestraSummary = {
  status: string;
  summary: string;
  decision?: string;
  createdAt: string;
};

/**
 * Generate a smart template-based Kestra summary (no API needed)
 */
function generateTemplateSummary(run: RunLog): KestraSummary {
  const taskTypeLabels: Record<RunLog["taskType"], string> = {
    scaffold: "Scaffolding",
    tests: "Test Generation",
    refactor: "Refactoring",
  };

  const statusLabels: Record<RunLog["status"], { status: string; decision: string }> = {
    completed: {
      status: "success",
      decision: "Task completed successfully. Ready for review.",
    },
    failed: {
      status: "failed",
      decision: "Task failed. Review required before proceeding.",
    },
  };

  const statusInfo = statusLabels[run.status];
  const taskLabel = taskTypeLabels[run.taskType];

  // Analyze output summary to create a more detailed summary
  let summary = "";
  if (run.status === "completed") {
    summary = `${taskLabel} task completed for "${run.input}". `;
    
    // Extract key information from output summary
    if (run.outputSummary.includes("Simulated") || run.outputSummary.includes("Stubbed")) {
      summary += "This was a simulated execution. ";
    }
    
    if (run.taskType === "scaffold") {
      summary += `New feature scaffolding completed. Files have been generated and are ready for implementation.`;
    } else if (run.taskType === "tests") {
      summary += `Test files have been generated. Review the test cases and ensure they cover the required scenarios.`;
    } else if (run.taskType === "refactor") {
      summary += `Refactoring analysis completed. Review the suggested changes before applying them.`;
    }
    
    // Add output summary details if available
    const outputPreview = run.outputSummary.slice(0, 150);
    if (outputPreview && !outputPreview.includes("Simulated")) {
      summary += ` Details: ${outputPreview}`;
    }
  } else {
    summary = `${taskLabel} task failed for "${run.input}". `;
    summary += `Error details: ${run.outputSummary.slice(0, 200)}`;
  }

  return {
    status: statusInfo.status,
    summary: summary.trim(),
    decision: statusInfo.decision,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generate Kestra summary using Hugging Face Inference API (free tier available)
 */
async function generateWithHuggingFace(run: RunLog): Promise<KestraSummary | null> {
  if (!HUGGINGFACE_API_KEY) return null;

  try {
    const prompt = `Analyze this DevPilot task execution and provide a concise summary:

Task: ${run.taskType}
Status: ${run.status}
Input: ${run.input}
Output: ${run.outputSummary.slice(0, 500)}

Provide a brief analysis with:
- Status: success/warning/failed
- Summary: 2-3 sentences
- Decision: what to do next`;

    const response = await fetch(
      "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
        },
        body: JSON.stringify({ inputs: prompt }),
      },
    );

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.status}`);
    }

    const data = await response.json();
    const content = Array.isArray(data) ? data[0]?.generated_text : data.generated_text || "";

    return {
      status: run.status === "completed" ? "success" : "failed",
      summary: content.slice(0, 300) || generateTemplateSummary(run).summary,
      decision: run.status === "completed" ? "Proceed with review" : "Review required",
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[kestra-summary] Hugging Face API error:", error);
    return null;
  }
}

/**
 * Generate Kestra summary using Groq API (free tier available)
 */
async function generateWithGroq(run: RunLog): Promise<KestraSummary | null> {
  if (!GROQ_API_KEY) return null;

  try {
    const prompt = `You are a senior engineer. Analyze this DevPilot task:

Task: ${run.taskType}
Status: ${run.status}
Input: ${run.input}
Output: ${run.outputSummary.slice(0, 500)}

Provide a concise JSON response:
{
  "status": "success|warning|failed",
  "summary": "2-3 sentence summary",
  "decision": "recommendation"
}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: "You are a senior engineer. Respond with valid JSON only.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 300,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          status: parsed.status || (run.status === "completed" ? "success" : "failed"),
          summary: parsed.summary || generateTemplateSummary(run).summary,
          decision: parsed.decision,
          createdAt: new Date().toISOString(),
        };
      }
    } catch {
      // Fall through to template summary
    }

    return {
      status: run.status === "completed" ? "success" : "failed",
      summary: content.slice(0, 300) || generateTemplateSummary(run).summary,
      decision: run.status === "completed" ? "Proceed" : "Review required",
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[kestra-summary] Groq API error:", error);
    return null;
  }
}

/**
 * Generate a Kestra summary for a run
 * Uses free AI APIs if available, otherwise falls back to smart template-based summary
 */
export async function generateKestraSummary(
  run: RunLog,
): Promise<KestraSummary> {
  // Try free AI APIs first (if configured)
  if (GROQ_API_KEY) {
    const groqSummary = await generateWithGroq(run);
    if (groqSummary) {
      console.log("[kestra-summary] Generated summary using Groq API");
      return groqSummary;
    }
  }

  if (HUGGINGFACE_API_KEY) {
    const hfSummary = await generateWithHuggingFace(run);
    if (hfSummary) {
      console.log("[kestra-summary] Generated summary using Hugging Face API");
      return hfSummary;
    }
  }

  // Default: Use smart template-based summary (no API needed)
  console.log("[kestra-summary] Generated summary using template-based generator");
  return generateTemplateSummary(run);
}

