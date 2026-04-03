import type { AgentLogEntry as LogEntry } from "@/lib/types";

const agentColors: Record<string, string> = {
  blue: "text-blue-agent",
  red: "text-red-agent",
  orchestrator: "text-foreground",
  system: "text-muted-foreground",
};

const agentLabels: Record<string, string> = {
  blue: "BLUE",
  red: "RED ",
  orchestrator: "ORCH",
  system: "SYS ",
};

const typeIcons: Record<string, string> = {
  info: "●",
  action: "▶",
  error: "✖",
  success: "✔",
  warning: "⚠",
};

const typeColors: Record<string, string> = {
  info: "text-muted-foreground",
  action: "text-primary",
  error: "text-destructive",
  success: "text-success",
  warning: "text-warning",
};

export function AgentLogItem({ entry }: { entry: LogEntry }) {
  const time = new Date(entry.timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="flex gap-2 font-mono text-sm leading-relaxed animate-slide-in">
      <span className="text-muted-foreground/50 shrink-0">{time}</span>
      <span className={`shrink-0 font-semibold ${agentColors[entry.agent]}`}>
        [{agentLabels[entry.agent]}]
      </span>
      <span className={`shrink-0 ${typeColors[entry.type]}`}>
        {typeIcons[entry.type]}
      </span>
      <span className="text-foreground/90">{entry.message}</span>
    </div>
  );
}
