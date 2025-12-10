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

// Lazy initialization for Redis/KV storage
let kv: { get: (key: string) => Promise<string | null>; set: (key: string, value: string) => Promise<void> } | null = null;
let kvInitialized = false;

async function getKV() {
  if (kvInitialized) return kv;
  kvInitialized = true;
  
  // Try standard Redis connection first (Redis Labs, Upstash, etc.)
  if (process.env.REDIS_URL) {
    try {
      const { createClient } = await import("redis");
      const client = createClient({ url: process.env.REDIS_URL });
      await client.connect();
      
      kv = {
        get: async (key: string) => {
          const value = await client.get(key);
          return value;
        },
        set: async (key: string, value: string) => {
          await client.set(key, value);
        },
      };
      console.log("[store] Using Redis for persistent storage (REDIS_URL)");
      return kv;
    } catch (error) {
      console.warn("[store] Redis connection failed, trying Vercel KV:", error);
    }
  }
  
  // Fall back to Vercel KV
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      const { kv: kvClient } = await import("@vercel/kv");
      // Wrap Vercel KV client to match our interface
      kv = {
        get: async (key: string) => {
          const value = await kvClient.get(key);
          return typeof value === "string" ? value : null;
        },
        set: async (key: string, value: string) => {
          await kvClient.set(key, value);
        },
      };
      console.log("[store] Using Vercel KV for persistent storage");
    } catch (error) {
      console.warn("[store] Vercel KV not available, falling back to file/memory storage:", error);
    }
  }
  return kv;
}

const KV_KEY = "devpilot:runs";
const defaultDataDir = process.env.VERCEL
  ? path.join("/tmp", "devpilot-data") // Vercel writable temp (ephemeral)
  : path.join(process.cwd(), ".data"); // local dev default
const dataDir = process.env.RUNS_DATA_DIR ?? defaultDataDir;
const dataFile = path.join(dataDir, "runs.json");
const memKey = "__DEV_PILOT_RUNS__";

function getMemoryStore(): RunLog[] {
  const g = globalThis as typeof globalThis & { [memKey]?: RunLog[] };
  if (!g[memKey]) g[memKey] = [];
  return g[memKey]!;
}

export async function loadRuns(): Promise<RunLog[]> {
  // Use Vercel KV if available
  const kvClient = await getKV();
  if (kvClient) {
    try {
      const data = await kvClient.get(KV_KEY);
      if (data) {
        const runs = JSON.parse(data) as RunLog[];
        // Also update memory store for consistency
        const mem = getMemoryStore();
        mem.length = 0;
        mem.push(...runs);
        return runs;
      }
      return [];
    } catch (error) {
      console.error("[store] Error loading from KV:", error);
      // Fall through to file/memory storage
    }
  }

  // Fallback to file/memory storage
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

  // Use Vercel KV if available
  const kvClient = await getKV();
  if (kvClient) {
    try {
      await kvClient.set(KV_KEY, JSON.stringify(runs));
      // Also update memory store
      const mem = getMemoryStore();
      mem.length = 0;
      mem.push(...runs);
      return;
    } catch (error) {
      console.error("[store] Error saving to KV:", error);
      // Fall through to file storage
    }
  }

  // Fallback to file/memory storage
  try {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(dataFile, JSON.stringify(runs, null, 2), "utf8");
    const mem = getMemoryStore();
    mem.length = 0;
    mem.push(...runs);
  } catch (error) {
    console.warn("[store] Error persisting to file:", error);
    // Update memory store as last resort
    const mem = getMemoryStore();
    mem.length = 0;
    mem.push(...runs);
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

  // Use Vercel KV if available
  const kvClient = await getKV();
  if (kvClient) {
    try {
      await kvClient.set(KV_KEY, JSON.stringify(runs));
      const mem = getMemoryStore();
      mem.length = 0;
      mem.push(...runs);
      return;
    } catch (error) {
      console.error("[store] Error saving to KV:", error);
      // Fall through to file storage
    }
  }

  // Fallback to file/memory storage
  try {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(dataFile, JSON.stringify(runs, null, 2), "utf8");
    const mem = getMemoryStore();
    mem.length = 0;
    mem.push(...runs);
  } catch (error) {
    console.warn("[store] Error persisting to file:", error);
    const mem = getMemoryStore();
    mem.length = 0;
    mem.push(...runs);
  }
}

