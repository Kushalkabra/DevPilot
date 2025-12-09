import { promises as fs } from "fs";
import path from "path";

export type KestraSummary = {
  status: string;
  summary: string;
  decision?: string;
  createdAt: string;
};

export type RunLog = {
  id: string;
  taskType: "scaffold" | "tests" | "refactor";
  timestamp: string;
  input: string;
  outputSummary: string;
  status: "completed" | "failed";
  kestraSummaries?: KestraSummary[];
};

const dataDir =
  process.env.RUNS_DATA_DIR ?? path.join("/tmp", "devpilot-data"); // writable on Vercel
const dataFile = path.join(dataDir, "runs.json");
const memKey = "__DEV_PILOT_RUNS__";

function getMemoryStore(): RunLog[] {
  const g = globalThis as typeof globalThis & { [memKey]?: RunLog[] };
  if (!g[memKey]) g[memKey] = [];
  return g[memKey]!;
}

export async function loadRuns(): Promise<RunLog[]> {
  const mem = getMemoryStore();
  if (mem.length) return mem;
  try {
    const raw = await fs.readFile(dataFile, "utf8");
    const runs = JSON.parse(raw) as RunLog[];
    mem.push(...runs);
    return runs;
  } catch {
    return mem;
  }
}

export async function addRun(run: RunLog): Promise<void> {
  const runs = await loadRuns();
  if (!run.kestraSummaries) {
    run.kestraSummaries = [];
  }
  runs.unshift(run);
  try {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(dataFile, JSON.stringify(runs, null, 2), "utf8");
  } catch {
    // Ignore persistence errors on read-only FS; memory store still works.
  }
}

export async function appendKestraSummary(
  runId: string,
  summary: KestraSummary,
): Promise<void> {
  const runs = await loadRuns();
  const idx = runs.findIndex((r) => r.id === runId);
  if (idx === -1) {
    throw new Error(`Run ${runId} not found`);
  }
  const existing = runs[idx].kestraSummaries ?? [];
  runs[idx].kestraSummaries = [summary, ...existing];
  try {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(dataFile, JSON.stringify(runs, null, 2), "utf8");
  } catch {
    // Ignore persistence errors on read-only FS; memory store still works.
  }
}

