#!/usr/bin/env node
/**
 * DevPilot CLI
 * Scaffolds, tests, and refactors via agent tasks.
 *
 * Commands:
 *  - devpilot scaffold <featureName>
 *  - devpilot tests <filePath>
 *  - devpilot refactor <filePath>
 *
 * This file is framework-agnostic; wire runAgentTask to Together/Oumi later.
 */
import * as fs from "fs/promises";
import * as path from "path";

type TaskType = "scaffold" | "tests" | "refactor";

type AgentResult = {
  summary: string;
  files: { filePath: string; contents: string }[];
};

type RunLog = {
  id: string;
  taskType: TaskType;
  timestamp: string;
  input: string;
  outputSummary: string;
  status: "completed" | "failed";
};

/**
 * Gets the API endpoint URL from environment variables or defaults to localhost
 * @returns The API endpoint URL string
 */
function getApiEndpoint(): string {
  const apiBase =
    process.env.DEVPILOT_API_ENDPOINT ??
    (process.env.NEXT_PUBLIC_API_BASE_URL
      ? `${process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, "")}/api/cline`
      : null);
  return apiBase ?? "http://localhost:3000/api/cline";
}

/**
 * Gets the agent endpoint URL from environment variables if configured
 * @returns The agent endpoint URL string or null if not configured
 */
function getAgentEndpoint(): string | null {
  const agentBase =
    process.env.DEVPILOT_AGENT_ENDPOINT ??
    (process.env.NEXT_PUBLIC_API_BASE_URL
      ? `${process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, "")}/api/agent/run`
      : null);
  return agentBase ?? null;
}

const API_ENDPOINT = getApiEndpoint();
const AGENT_ENDPOINT = getAgentEndpoint();
const repoRoot = path.resolve(__dirname, "..");

/**
 * Extracts a human-readable error message from an error object
 * @param error - The error object (may be Error instance or unknown)
 * @returns A string error message
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown agent failure";
}

/**
 * Validates input based on task type
 * @param input - The input string to validate
 * @param taskType - The type of task being performed
 * @returns True if input is valid, false otherwise
 */
function validateInput(input: string, taskType: TaskType): boolean {
  if (!input || input.trim().length === 0) {
    return false;
  }

  if (taskType === "tests" || taskType === "refactor") {
    // For file paths, ensure they don't contain dangerous patterns
    if (input.includes("..") || input.includes("~")) {
      return false;
    }
  }

  return true;
}

/**
 * Main entry point for the CLI
 * Validates arguments, executes the requested task, and logs results
 */
async function main() {
  const [, , command, arg] = process.argv;
  if (!command || !arg) {
    printHelp();
    process.exit(1);
  }

  const taskType = normalizeCommand(command);
  if (!taskType) {
    console.error(`Unknown command: ${command}\n`);
    printHelp();
    process.exit(1);
  }

  if (!validateInput(arg, taskType)) {
    console.error(`Invalid input for ${taskType} command\n`);
    printHelp();
    process.exit(1);
  }

  const runId = `run-${Date.now()}`;
  const timestamp = new Date().toISOString();

  const context = await collectContext(repoRoot, arg);
  const agentPayload = { taskType, target: arg, context };

  let log: RunLog;
  try {
    const agentResult = await runAgentTask(taskType, agentPayload);
    await persistAgentOutput(agentResult.files);

    log = {
      id: runId,
      taskType,
      timestamp,
      input: arg,
      outputSummary: agentResult.summary,
      status: "completed",
    };
  } catch (error) {
    const message = extractErrorMessage(error);
    log = {
      id: runId,
      taskType,
      timestamp,
      input: arg,
      outputSummary: message,
      status: "failed",
    };
    console.error(`Task failed: ${message}`);
  }

  await postLog(log);
  console.log(`Logged run ${log.id} (${log.status}) to ${API_ENDPOINT}`);
}

/**
 * Normalizes command string to TaskType enum value
 * @param command - The raw command string from CLI
 * @returns The normalized TaskType or null if invalid
 */
function normalizeCommand(command: string): TaskType | null {
  if (command === "devpilot") {
    const sub = process.argv[3];
    if (sub === "scaffold" || sub === "tests" || sub === "refactor") {
      return sub;
    }
    return null;
  }
  if (command === "scaffold" || command === "tests" || command === "refactor") {
    return command;
  }
  return null;
}

/**
 * Prints help text to the console
 */
function printHelp() {
  console.log(`DevPilot CLI

Usage:
  devpilot scaffold <featureName>
  devpilot tests <filePath>
  devpilot refactor <filePath>
`);
}

/**
 * Collects repository context for agent task execution
 * @param root - The repository root directory
 * @param target - The target file or feature name
 * @returns Context object with file listings and target information
 */
async function collectContext(root: string, target: string) {
  const files = await listFiles(root, 150);
  const targetAbs = path.resolve(root, target);
  const targetExists = await pathExists(targetAbs);
  const targetSnippet = targetExists
    ? await readSnippet(targetAbs, 2000)
    : "Target file not found.";

  return {
    root,
    target,
    targetExists,
    files,
    targetSnippet,
  };
}

/**
 * Lists files in a directory up to a maximum count
 * @param dir - The directory to scan
 * @param max - Maximum number of files to return
 * @returns Array of relative file paths
 */
async function listFiles(dir: string, max: number) {
  const results: string[] = [];
  const ignoredDirs = ["node_modules", ".git", ".next", ".turbo"];

  async function walk(current: string) {
    if (results.length >= max) return;
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (ignoredDirs.includes(entry.name)) {
        continue;
      }
      const full = path.join(current, entry.name);
      const rel = path.relative(dir, full);
      if (entry.isDirectory()) {
        await walk(full);
      } else {
        results.push(rel);
      }
      if (results.length >= max) return;
    }
  }
  await walk(dir);
  return results;
}

/**
 * Checks if a file or directory path exists
 * @param p - The path to check
 * @returns True if path exists, false otherwise
 */
async function pathExists(p: string) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads a snippet of a file's contents
 * @param p - The file path to read
 * @param bytes - Maximum number of bytes to read
 * @returns The file content snippet or empty string on error
 */
async function readSnippet(p: string, bytes: number) {
  try {
    const content = await fs.readFile(p, "utf8");
    return content.slice(0, bytes);
  } catch {
    return "";
  }
}

/**
 * Builds request configuration with Vercel protection bypass if needed
 * @param baseUrl - The base URL for the request
 * @returns Object with URL and headers configured
 */
function buildRequestConfig(baseUrl: string): { url: string; headers: Record<string, string> } {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  let url = baseUrl;
  const bypassToken = process.env.VERCEL_PROTECTION_BYPASS;
  if (bypassToken) {
    const separator = url.includes("?") ? "&" : "?";
    url = `${url}${separator}x-vercel-protection-bypass=${bypassToken}`;
    headers.Cookie = `vercel-protection-bypass=${bypassToken}`;
  }

  return { url, headers };
}

/**
 * Attempts to execute agent task remotely via API endpoint
 * @param payload - The task payload to send
 * @returns Promise resolving to agent result if successful, null on failure
 */
async function tryRemoteExecution(payload: unknown): Promise<AgentResult | null> {
  if (!AGENT_ENDPOINT) {
    return null;
  }

  try {
    const { url, headers } = buildRequestConfig(AGENT_ENDPOINT);
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Agent API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = (await response.json()) as AgentResult;
    console.log(`✓ Agent task executed remotely via ${AGENT_ENDPOINT}`);
    return result;
  } catch (error) {
    const message = extractErrorMessage(error);
    console.warn(`⚠ Remote agent execution failed: ${message}`);
    console.warn(`⚠ Falling back to local execution`);
    return null;
  }
}

/**
 * Executes an agent task either remotely or locally
 * @param taskType - The type of task to execute
 * @param payload - The task payload with context
 * @returns Promise resolving to agent result with summary and files
 */
async function runAgentTask(
  taskType: TaskType,
  payload: unknown,
): Promise<AgentResult> {
  // If remote agent endpoint is configured, use it
  if (AGENT_ENDPOINT) {
    const remoteResult = await tryRemoteExecution(payload);
    if (remoteResult) {
      return remoteResult;
    }
    // Fall through to local execution if remote fails
  }

  // Local execution (placeholder: swap this with Together / Oumi orchestration)
  const summary = `Simulated ${taskType} task for payload: ${JSON.stringify(payload, null, 2).slice(0, 400)}`;
  const files = buildSampleFiles(taskType, payload);
  return { summary, files };
}

/**
 * Builds sample files based on task type
 * @param taskType - The type of task being performed
 * @param payload - The task payload containing target information
 * @returns Array of file objects with paths and contents
 */
function buildSampleFiles(taskType: TaskType, payload: unknown) {
  const timestamp = new Date().toISOString();

  if (taskType === "scaffold") {
    const feature = (payload as { target?: string }).target ?? "feature";
    return [
      {
        filePath: path.join(
          repoRoot,
          "apps",
          "web",
          "app",
          "devpilot",
          feature,
          "page.tsx",
        ),
        contents: `// Generated scaffold for ${feature}\nexport default function ${toComponentName(feature)}() {\n  return <main className="p-8 text-slate-50">Scaffolded ${feature} at ${timestamp}</main>;\n}\n`,
      },
    ];
  }

  if (taskType === "tests") {
    const target = (payload as { target?: string }).target ?? "target.ts";
    const fileName = path.basename(target).replace(/\W+/g, "-");
    return [
      {
        filePath: path.join(
          repoRoot,
          "tests",
          "__devpilot__",
          `${fileName}.test.ts`,
        ),
        contents: `// Generated test stub for ${target}\ndescribe("${target}", () => {\n  it("should have a generated test stub", () => {\n    expect(true).toBe(true);\n  });\n});\n`,
      },
    ];
  }

  const target = (payload as { target?: string }).target ?? "file.ts";
  return [
    {
      filePath: path.join(
        repoRoot,
        "refactors",
        "__devpilot__",
        `${path.basename(target)}.md`,
      ),
      contents: `# Refactor plan for ${target}\n\n- Generated at ${timestamp}\n- Placeholder changes recorded here.\n`,
    },
  ];
}

/**
 * Converts a feature name string to a React component name (PascalCase)
 * @param feature - The feature name string
 * @returns PascalCase component name
 */
function toComponentName(feature: string) {
  return feature
    .split(/[\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * Persists agent-generated files to the filesystem
 * @param files - Array of file objects to write
 */
async function persistAgentOutput(files: AgentResult["files"]) {
  for (const file of files) {
    await fs.mkdir(path.dirname(file.filePath), { recursive: true });
    await fs.writeFile(file.filePath, file.contents, "utf8");
    console.log(`Wrote ${path.relative(repoRoot, file.filePath)}`);
  }
}

/**
 * Posts run log to the API endpoint
 * @param log - The run log object to post
 */
async function postLog(log: RunLog) {
  try {
    const { url, headers } = buildRequestConfig(API_ENDPOINT);

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(log),
    });
    if (!res.ok) {
      console.warn(`Failed to POST log: ${res.status} ${res.statusText}`);
    }
  } catch (error) {
    const message = extractErrorMessage(error);
    console.warn(`Error posting log: ${message}`);
  }
}

void main();

