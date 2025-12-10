"use client";

import { useEffect, useMemo, useState } from "react";

type KestraSummary = {
  status: string;
  summary: string;
  decision?: string;
  createdAt: string;
};

type Run = {
  id: string;
  taskType: "scaffold" | "tests" | "refactor";
  timestamp: string;
  input: string;
  outputSummary: string;
  status: "completed" | "failed";
  kestraSummaries?: KestraSummary[];
};

const statusTone: Record<Run["status"], string> = {
  completed: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  failed: "bg-rose-500/15 text-rose-200 border border-rose-500/30",
};

const typeLabel: Record<Run["taskType"], string> = {
  scaffold: "Scaffold",
  tests: "Tests",
  refactor: "Refactor",
};

export default function Home() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/runs");
        if (!res.ok) {
          console.error("Failed to fetch runs:", res.status, res.statusText);
          return;
        }
        const data = (await res.json()) as { runs: Run[] };
        console.log("[Dashboard] Loaded runs:", data.runs.length, data.runs);
        setRuns(data.runs);
        if (data.runs.length) {
          setSelectedId(data.runs[0].id);
        }
      } catch (error) {
        console.error("Failed to load runs", error);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const selected = useMemo(
    () => runs.find((r) => r.id === selectedId) ?? runs[0],
    [runs, selectedId],
  );

  return (
    <main className="min-h-screen">
      <header className="border-b bg-slate-950/60 backdrop-blur-md border-white/5">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              DevPilot · AI Auto-Dev Agent Suite
            </p>
            <h1 className="text-2xl font-semibold">Agent Control Deck</h1>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
            Hackathon: AI Agents Assemble
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-6 py-8">
        <aside className="w-80 shrink-0 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-slate-900/40">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-200">Executed runs</h2>
              <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                Live
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Scaffold · Tests · Refactor
            </p>
          </div>

          <div className="space-y-3">
            {loading && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-slate-400">
                Loading runs...
              </div>
            )}
            {!loading && runs.length === 0 && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-slate-400">
                No runs yet. Trigger a CLI command to see it here.
              </div>
            )}
            {runs.map((run) => (
              <button
                key={run.id}
                onClick={() => setSelectedId(run.id)}
                className={`w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:-translate-y-[1px] hover:border-white/20 hover:bg-white/10 ${selected?.id === run.id ? "border-emerald-500/50 bg-emerald-500/5" : ""}`}
        >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400">{run.id}</span>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusTone[run.status]}`}
                  >
                    {run.status}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-100">
                  {typeLabel[run.taskType]}
                </p>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                  <span className="rounded-full bg-slate-800/80 px-2 py-1 font-medium text-slate-200">
                    {new Date(run.timestamp).toLocaleString()}
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">
                    {run.taskType}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="flex-1 space-y-4">
          {!selected && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-slate-300">
              Select a run to view details.
            </div>
          )}

          {selected && (
            <>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-slate-900/40">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-mono text-slate-400">{selected.id}</p>
                    <h2 className="text-xl font-semibold text-slate-50">
                      {typeLabel[selected.taskType]}
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      {new Date(selected.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-800/80 px-3 py-1 text-xs font-semibold text-slate-200">
                      {typeLabel[selected.taskType]}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusTone[selected.status]}`}
                    >
                      {selected.status}
                    </span>
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-300 whitespace-pre-wrap">
                  {selected.input}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-100">
                    Agent output summary
                  </h3>
                  <span className="text-xs text-emerald-300">Latest</span>
                </div>
                <p className="mt-3 text-sm text-slate-300 whitespace-pre-wrap">
                  {selected.outputSummary || "No output recorded."}
                </p>
              </div>

              {selected.kestraSummaries && selected.kestraSummaries.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-100">
                      Kestra AI summaries
                    </h3>
                    <span className="text-xs text-slate-300">
                      {selected.kestraSummaries.length} entr
                      {selected.kestraSummaries.length === 1 ? "y" : "ies"}
                    </span>
                  </div>
                  <div className="mt-3 space-y-3">
                    {selected.kestraSummaries.map((k) => (
                      <div
                        key={`${k.createdAt}-${k.status}-${k.summary.slice(0, 20)}`}
                        className="rounded-xl border border-white/10 bg-slate-900/70 p-4"
        >
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>{new Date(k.createdAt).toLocaleString()}</span>
                          <span className="rounded-full bg-slate-800/80 px-2 py-1 font-semibold text-slate-200">
                            {k.status}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-200 whitespace-pre-wrap">
                          {k.summary}
                        </p>
                        {k.decision && (
                          <p className="mt-2 text-xs text-emerald-300">
                            Decision: {k.decision}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
    </div>
    </main>
  );
}
