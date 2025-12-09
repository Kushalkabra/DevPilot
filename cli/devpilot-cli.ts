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

const API_ENDPOINT =
  process.env.DEVPILOT_API_ENDPOINT ?? "http://localhost:3000/api/cline";
const repoRoot = path.resolve(__dirname, "..");

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
    const message =
      error instanceof Error ? error.message : "Unknown agent failure";
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

function printHelp() {
  console.log(`DevPilot CLI

Usage:
  devpilot scaffold <featureName>
  devpilot tests <filePath>
  devpilot refactor <filePath>
`);
}

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

async function listFiles(dir: string, max: number) {
  const results: string[] = [];
  async function walk(current: string) {
    if (results.length >= max) return;
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (["node_modules", ".git", ".next", ".turbo"].includes(entry.name)) {
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

async function pathExists(p: string) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function readSnippet(p: string, bytes: number) {
  try {
    const content = await fs.readFile(p, "utf8");
    return content.slice(0, bytes);
  } catch {
    return "";
  }
}

async function runAgentTask(
  taskType: TaskType,
  payload: unknown,
): Promise<AgentResult> {
  // Placeholder: swap this with Together / Oumi orchestration.
  const summary = `Simulated ${taskType} task for payload: ${JSON.stringify(payload, null, 2).slice(0, 400)}`;
  const files = buildSampleFiles(taskType, payload);
  return { summary, files };
}

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

function toComponentName(feature: string) {
  return feature
    .split(/[\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

async function persistAgentOutput(files: AgentResult["files"]) {
  for (const file of files) {
    await fs.mkdir(path.dirname(file.filePath), { recursive: true });
    await fs.writeFile(file.filePath, file.contents, "utf8");
    console.log(`Wrote ${path.relative(repoRoot, file.filePath)}`);
  }
}

async function postLog(log: RunLog) {
  try {
    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(log),
    });
    if (!res.ok) {
      console.warn(`Failed to POST log: ${res.status} ${res.statusText}`);
    }
  } catch (error) {
    console.warn("Error posting log:", error);
  }
}

void main();

