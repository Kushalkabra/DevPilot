import { type RunLog } from "./store";

// Optional: AI API support (Together.ai, Groq, or Hugging Face)
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY ?? "";
const TOGETHER_MODEL = process.env.TOGETHER_MODEL ?? "meta-llama/Llama-3-70b-chat-hf";
const GROQ_API_KEY = process.env.GROQ_API_KEY ?? "";
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY ?? "";

export type KestraSummary = {
  status: string;
  summary: string;
  decision?: string;
  createdAt: string;
};

/**
 * Extracts JSON from AI response text, handling markdown code blocks
 * @param content - Raw text response from AI API
 * @returns Parsed JSON object or null if parsing fails
 */
function extractJsonFromResponse(content: string): { status?: string; summary?: string; decision?: string } | null {
  try {
    // Try to extract JSON from markdown code blocks first (common AI response format)
    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || content.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      const jsonStr = jsonMatch[1];
      return JSON.parse(jsonStr);
    }
    // If no match, try parsing the entire content as JSON
    return JSON.parse(content);
  } catch {
    // Parsing failed - return null to trigger fallback
    return null;
  }
}

/**
 * Creates a fallback summary when AI parsing fails
 * @param run - The run log to create summary for
 * @param rawContent - Raw content from AI (if available)
 * @returns KestraSummary with fallback values
 */
function createFallbackSummary(run: RunLog, rawContent?: string): KestraSummary {
  const templateSummary = generateTemplateSummary(run);
  return {
    status: run.status === "completed" ? "success" : "failed",
    summary: rawContent?.slice(0, 300) || templateSummary.summary,
    decision: run.status === "completed" ? "Proceed" : "Review required",
    createdAt: new Date().toISOString(),
  };
}

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

    // If content is empty or invalid, fallback to template
    if (!content || content.trim().length === 0) {
      console.warn("[kestra-summary] Hugging Face returned empty content, using template");
      return null;
    }

    return {
      status: run.status === "completed" ? "success" : "failed",
      summary: content.slice(0, 300),
      decision: run.status === "completed" ? "Proceed with review" : "Review required",
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[kestra-summary] Hugging Face API error:", error);
    // Return null to trigger fallback chain
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

    // Try to parse JSON from response
    try {
      const parsed = extractJsonFromResponse(content);
      if (parsed) {
        return {
          status: parsed.status || (run.status === "completed" ? "success" : "failed"),
          summary: parsed.summary || generateTemplateSummary(run).summary,
          decision: parsed.decision,
          createdAt: new Date().toISOString(),
        };
      }
    } catch {
      // JSON parsing failed - fall through to template summary
    }

    // If JSON parsing failed, use raw content with fallback
    return createFallbackSummary(run, content);
  } catch (error) {
    console.error("[kestra-summary] Groq API error:", error);
    // Return null to trigger fallback chain
    return null;
  }
}

/**
 * Generate Kestra summary using Together.ai API
 */
async function generateWithTogether(run: RunLog): Promise<KestraSummary | null> {
  if (!TOGETHER_API_KEY) return null;

  try {
    const prompt = `You are a senior engineer reviewing a DevPilot agent task execution.

Task Type: ${run.taskType}
Status: ${run.status}
Input: ${run.input}
Output Summary: ${run.outputSummary.slice(0, 500)}

Please provide a concise analysis:
1. A brief status assessment (one word: "success", "warning", or "failed")
2. A 2-3 sentence summary of what was accomplished or what went wrong
3. A decision/recommendation (what should happen next: proceed, review, or fix)

Respond in JSON format:
{
  "status": "success|warning|failed",
  "summary": "your summary here",
  "decision": "your recommendation here"
}`;

    const body = {
      model: TOGETHER_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a senior engineer providing concise, actionable summaries of development tasks. Always respond with valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 500,
      temperature: 0.3,
    };

    const response = await fetch("https://api.together.xyz/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOGETHER_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Together.ai API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    // Extract and parse JSON from response
    const parsed = extractJsonFromResponse(content);
    if (parsed) {
      return {
        status: parsed.status || (run.status === "completed" ? "success" : "failed"),
        summary: parsed.summary || run.outputSummary.slice(0, 200),
        decision: parsed.decision,
        createdAt: new Date().toISOString(),
      };
    }

    // If JSON parsing failed, use fallback summary
    return createFallbackSummary(run, content);
  } catch (error) {
    console.error("[kestra-summary] Together.ai API error:", error);
    // Return null to trigger fallback chain
    return null;
  }
}

/**
 * Generate a Kestra summary for a run
 * Priority order: Together.ai > Groq > Hugging Face > Template-based (no API)
 * 
 * Each provider is tried in sequence. If a provider fails or returns null,
 * the next provider in the chain is attempted. The template-based generator
 * is guaranteed to succeed and serves as the final fallback.
 * 
 * @param run - The run log to generate a summary for
 * @returns Promise resolving to KestraSummary (never fails)
 */
export async function generateKestraSummary(
  run: RunLog,
): Promise<KestraSummary> {
  // Priority 1: Try Together.ai (if configured)
  if (TOGETHER_API_KEY) {
    const togetherSummary = await generateWithTogether(run);
    if (togetherSummary) {
      console.log("[kestra-summary] Generated summary using Together.ai API");
      return togetherSummary;
    }
    // If Together.ai fails, continue to next provider
  }

  // Priority 2: Try Groq (free tier, fast responses)
  if (GROQ_API_KEY) {
    const groqSummary = await generateWithGroq(run);
    if (groqSummary) {
      console.log("[kestra-summary] Generated summary using Groq API");
      return groqSummary;
    }
    // If Groq fails, continue to next provider
  }

  // Priority 3: Try Hugging Face (free tier, may have cold starts)
  if (HUGGINGFACE_API_KEY) {
    const hfSummary = await generateWithHuggingFace(run);
    if (hfSummary) {
      console.log("[kestra-summary] Generated summary using Hugging Face API");
      return hfSummary;
    }
    // If Hugging Face fails, continue to template fallback
  }

  // Priority 4: Template-based summary (guaranteed fallback, no API needed)
  console.log("[kestra-summary] Generated summary using template-based generator");
  return generateTemplateSummary(run);
}

