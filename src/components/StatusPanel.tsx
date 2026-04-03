import type { OrchestratorResult } from "@/lib/types";

interface StatusPanelProps {
  isRunning: boolean;
  result: OrchestratorResult | null;
}

export function StatusPanel({ isRunning, result }: StatusPanelProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <StatusCard
        label="Status"
        value={isRunning ? "Running" : result ? (result.success ? "Complete" : "Failed") : "Idle"}
        variant={isRunning ? "running" : result?.success ? "success" : result ? "error" : "idle"}
      />
      <StatusCard
        label="Iterations"
        value={result?.iterations?.toString() || "—"}
        variant="idle"
      />
      <StatusCard
        label="Agents"
        value={isRunning ? "Active" : "Standby"}
        variant={isRunning ? "running" : "idle"}
      />
    </div>
  );
}

function StatusCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant: "idle" | "running" | "success" | "error";
}) {
  const borderClass = {
    idle: "border-border",
    running: "border-primary/50 glow-blue",
    success: "border-success/50 glow-success",
    error: "border-destructive/50 glow-red",
  }[variant];

  const dotClass = {
    idle: "bg-muted-foreground",
    running: "bg-primary animate-pulse-glow",
    success: "bg-success",
    error: "bg-destructive",
  }[variant];

  return (
    <div className={`bg-card border rounded-lg p-3 ${borderClass} transition-all duration-300`}>
      <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <span className={`inline-block w-2 h-2 rounded-full ${dotClass}`} />
        <span className="font-mono text-sm font-semibold text-foreground">{value}</span>
      </div>
    </div>
  );
}
