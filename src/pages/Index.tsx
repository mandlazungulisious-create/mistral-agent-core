import { useState, useRef, useEffect } from "react";
import { TaskInput } from "@/components/TaskInput";
import { AgentLogItem } from "@/components/AgentLogEntry";
import { StatusPanel } from "@/components/StatusPanel";
import { executeTask } from "@/lib/mockAgents";
import type { AgentLogEntry, OrchestratorResult } from "@/lib/types";

const Index = () => {
  const [logs, setLogs] = useState<AgentLogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<OrchestratorResult | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleExecute = async (task: string, url: string) => {
    setLogs([]);
    setResult(null);
    setIsRunning(true);

    try {
      const res = await executeTask(task, url, (log) => {
        setLogs((prev) => [...prev, log]);
      });
      setResult(res);
    } catch (err) {
      setLogs((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          agent: "orchestrator",
          message: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
          type: "error",
        },
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <span className="w-3 h-3 rounded-full bg-blue-agent animate-pulse-glow" />
              <span className="w-3 h-3 rounded-full bg-red-agent animate-pulse-glow" style={{ animationDelay: "1s" }} />
            </div>
            <h1 className="text-lg font-mono font-bold text-foreground">
              Agent Orchestrator
            </h1>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            BLUE + RED • Mistral Agents
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        {/* Left Panel */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-4">
              Mission Control
            </h2>
            <TaskInput onSubmit={handleExecute} isRunning={isRunning} />
          </div>

          <StatusPanel isRunning={isRunning} result={result} />

          {result?.output && (
            <div className={`bg-card border rounded-lg p-4 ${result.success ? "border-success/30" : "border-destructive/30"}`}>
              <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">
                Result
              </h2>
              <p className="font-mono text-sm text-foreground/80">{result.output}</p>
            </div>
          )}
        </div>

        {/* Right Panel — Agent Log */}
        <div className="bg-card border border-border rounded-lg flex flex-col min-h-[500px]">
          <div className="border-b border-border px-4 py-3 flex items-center justify-between">
            <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Agent Output
            </h2>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-agent" /> Blue
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-agent" /> Red
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {logs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground font-mono text-sm">
                Awaiting task execution...
              </div>
            ) : (
              logs.map((entry) => <AgentLogItem key={entry.id} entry={entry} />)
            )}
            <div ref={logEndRef} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
