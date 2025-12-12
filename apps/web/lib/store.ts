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
      const client = createClient({ 
        url: process.env.REDIS_URL,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 3) {
              console.error("[store] Redis reconnection failed after 3 retries");
              return new Error("Redis reconnection limit exceeded");
            }
            return Math.min(retries * 100, 1000);
          },
        },
      });
      
      // Handle connection errors
      client.on("error", (err) => {
        console.error("[store] Redis client error:", err);
      });
      
      await client.connect();
      console.log("[store] Redis connected successfully");
      
      kv = {
        get: async (key: string) => {
          try {
            const value = await client.get(key);
            console.log(`[store] Redis GET ${key}:`, value ? "found" : "not found");
            return value;
          } catch (error) {
            console.error(`[store] Redis GET error for ${key}:`, error);
            throw error;
          }
        },
        set: async (key: string, value: string) => {
          try {
            await client.set(key, value);
            console.log(`[store] Redis SET ${key}: success`);
          } catch (error) {
            console.error(`[store] Redis SET error for ${key}:`, error);
            throw error;
          }
        },
      };
      console.log("[store] Using Redis for persistent storage (REDIS_URL)");
      return kv;
    } catch (error) {
      console.error("[store] Redis connection failed:", error);
      console.warn("[store] Falling back to Vercel KV or file storage");
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
      console.log(`[store] Loading runs from Redis/KV with key: ${KV_KEY}`);
      const data = await kvClient.get(KV_KEY);
      console.log(`[store] Retrieved data:`, data ? `${data.length} chars` : "null");
      if (data) {
        const runs = JSON.parse(data) as RunLog[];
        console.log(`[store] Parsed ${runs.length} runs from Redis/KV`);
        // Also update memory store for consistency
        const mem = getMemoryStore();
        mem.length = 0;
        mem.push(...runs);
        return runs;
      }
      console.log("[store] No data found in Redis/KV, returning empty array");
      return [];
    } catch (error) {
      console.error("[store] Error loading from KV:", error);
      // Fall through to file/memory storage
    }
  } else {
    console.log("[store] No Redis/KV client available, using file/memory storage");
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
  console.log("[store] addRun called for:", run.id);
  const runs = await loadRuns();
  console.log("[store] Loaded", runs.length, "existing runs");
  if (!run.kestraSummaries) {
    run.kestraSummaries = [];
  }
  runs.unshift(run);
  console.log("[store] Added new run, total runs:", runs.length);

  // Use Vercel KV if available
  const kvClient = await getKV();
  if (kvClient) {
    try {
      const data = JSON.stringify(runs);
      console.log(`[store] Saving ${runs.length} runs to Redis/KV with key: ${KV_KEY}`);
      await kvClient.set(KV_KEY, data);
      console.log(`[store] Successfully saved ${runs.length} runs to Redis/KV`);
      // Also update memory store
      const mem = getMemoryStore();
      mem.length = 0;
      mem.push(...runs);
      return;
    } catch (error) {
      console.error("[store] Error saving to KV:", error);
      // Fall through to file storage
    }
  } else {
    console.log("[store] No Redis/KV client available, saving to file/memory");
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
  console.log(`[store] appendKestraSummary called for runId: ${runId}`);
  const runs = await loadRuns();
  console.log(`[store] Found ${runs.length} runs, looking for runId: ${runId}`);
  const idx = runs.findIndex((r) => r.id === runId);
  if (idx === -1) {
    console.error(`[store] Run ${runId} not found. Available run IDs:`, runs.map(r => r.id));
    throw new Error(`Run ${runId} not found`);
  }
  console.log(`[store] Found run at index ${idx}, current summaries:`, runs[idx].kestraSummaries?.length ?? 0);
  const existing = runs[idx].kestraSummaries ?? [];
  runs[idx].kestraSummaries = [summary, ...existing];
  console.log(`[store] Updated summaries count: ${runs[idx].kestraSummaries.length}`);

  // Use Vercel KV if available
  const kvClient = await getKV();
  if (kvClient) {
    try {
      const data = JSON.stringify(runs);
      console.log(`[store] Saving ${runs.length} runs with updated Kestra summary to Redis/KV`);
      await kvClient.set(KV_KEY, data);
      console.log(`[store] Successfully saved Kestra summary to Redis/KV`);
      const mem = getMemoryStore();
      mem.length = 0;
      mem.push(...runs);
      return;
    } catch (error) {
      console.error("[store] Error saving Kestra summary to KV:", error);
      // Fall through to file storage
    }
  } else {
    console.log("[store] No Redis/KV client available, saving Kestra summary to file/memory");
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

