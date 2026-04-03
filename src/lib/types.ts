export interface PageSnapshot {
  url: string;
  title: string;
  domTree: string;
  forms: string[];
  interactiveElements: string[];
  visibleText: string;
}

export interface AgentAction {
  type: "click" | "fill" | "select" | "hover" | "type" | "submit" | "upload" | "wait" | "scroll";
  selector?: string;
  value?: string;
}

export interface BlueAgentOutput {
  status: "need_red" | "task_complete" | "navigation_needed";
  reasoning: string;
  confidence: number;
  navigationAction?: { type: string; url?: string };
}

export interface RedAgentOutput {
  actions: AgentAction[];
  reasoning: string;
  needsHumanInput?: boolean;
  humanInputQuestion?: string;
  result?: string;
}

export interface AgentLogEntry {
  id: string;
  timestamp: number;
  agent: "blue" | "red" | "orchestrator" | "system";
  message: string;
  data?: unknown;
  type: "info" | "action" | "error" | "success" | "warning";
}

export interface OrchestratorResult {
  success: boolean;
  output: string | null;
  iterations: number;
  logs: AgentLogEntry[];
}
