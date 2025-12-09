type TaskType = "scaffold" | "tests" | "refactor";

type AgentPayload = {
  taskType: TaskType;
  target: string;
  context?: unknown;
};

type AgentResult = {
  summary: string;
  files: { filePath: string; contents: string }[];
};

const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY ?? "";
const TOGETHER_MODEL = "meta-llama/Llama-3-70b-chat-hf";

export async function runAgentTask(
  taskType: TaskType,
  payload: AgentPayload,
): Promise<AgentResult> {
  // If you want to use the fine-tuned Oumi model instead of Together:
  // 1) Train with ml/oumi_train.py and host the model (or call Oumi’s hosted inference).
  // 2) Add a flag, e.g., process.env.USE_OUMI_MODEL === "true".
  // 3) When the flag is true, call your Oumi inference endpoint with the payload:
  //
  //    if (process.env.USE_OUMI_MODEL === "true") {
  //      const oumiRes = await fetch(process.env.OUMI_INFERENCE_URL!, {
  //        method: "POST",
  //        headers: {
  //          "Content-Type": "application/json",
  //          Authorization: `Bearer ${process.env.OUMI_API_KEY}`,
  //        },
  //        body: JSON.stringify({ prompt: payload }),
  //      });
  //      const data = await oumiRes.json();
  //      return {
  //        summary: data.summary,
  //        files: data.files, // expect same shape: [{ filePath, contents }]
  //      };
  //    }
  //
  const body = {
    model: TOGETHER_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are DevPilot, an autonomous dev agent that returns code changes as structured outputs.",
      },
      {
        role: "user",
        content: JSON.stringify(payload, null, 2),
      },
    ],
    max_tokens: 8000,
    temperature: 0.2,
  };

  // Placeholder call; wire to Together when ready.
  await fetch("https://api.together.xyz/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOGETHER_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  // Stubbed agent response; replace with parsed model output.
  return {
    summary: `Stubbed ${taskType} response for ${payload.target}`,
    files: [],
  };
}

