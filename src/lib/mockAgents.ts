import { cleanDOM } from "./domCleaner";
import type {
  PageSnapshot,
  BlueAgentOutput,
  RedAgentOutput,
  AgentLogEntry,
  OrchestratorResult,
} from "./types";

// Simulated page snapshots for demo
const MOCK_PAGES: Record<string, PageSnapshot> = {
  "https://example.com": {
    url: "https://example.com",
    title: "Example Domain",
    domTree: "<html><body><h1>Example Domain</h1><p>This domain is for use in illustrative examples.</p><a href='/login'>Login</a></body></html>",
    forms: [],
    interactiveElements: ["a[href='/login']"],
    visibleText: "Example Domain. This domain is for use in illustrative examples.",
  },
  "https://example.com/login": {
    url: "https://example.com/login",
    title: "Login - Example",
    domTree: '<html><body><form id="login"><input name="email" type="email"/><input name="password" type="password"/><button type="submit">Sign In</button></form></body></html>',
    forms: ["login"],
    interactiveElements: ['input[name="email"]', 'input[name="password"]', 'button[type="submit"]'],
    visibleText: "Sign In. Email. Password.",
  },
};

let currentUrl = "https://example.com";
let memory: Record<string, unknown> = {};

function createLog(
  agent: AgentLogEntry["agent"],
  message: string,
  type: AgentLogEntry["type"] = "info",
  data?: unknown
): AgentLogEntry {
  return {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    agent,
    message,
    type,
    data,
  };
}

async function simulateDelay(ms = 800): Promise<void> {
  return new Promise((r) => setTimeout(r, ms + Math.random() * 400));
}

async function runBlueAgent(
  task: string,
  snapshot: PageSnapshot
): Promise<{ output: BlueAgentOutput; logs: AgentLogEntry[] }> {
  const logs: AgentLogEntry[] = [];
  const dom = cleanDOM(snapshot.domTree);

  logs.push(createLog("blue", `Analyzing page: ${snapshot.url}`, "info"));
  logs.push(createLog("blue", `DOM size: ${dom.length} chars, ${snapshot.interactiveElements.length} interactive elements`, "info"));

  await simulateDelay(1200);

  // Simulate Blue Agent logic
  if (snapshot.forms.length > 0 && task.toLowerCase().includes("login")) {
    logs.push(createLog("blue", "Login form detected — task can proceed", "success"));
    return {
      output: {
        status: "need_red",
        reasoning: "Found login form with email and password fields. Delegating to Red Agent for interaction.",
        confidence: 92,
      },
      logs,
    };
  }

  if (snapshot.interactiveElements.some((e) => e.includes("login"))) {
    logs.push(createLog("blue", "Login link found — navigation needed", "warning"));
    return {
      output: {
        status: "navigation_needed",
        reasoning: "Found login link on page. Need to navigate to login page first.",
        confidence: 85,
        navigationAction: { type: "goto", url: "https://example.com/login" },
      },
      logs,
    };
  }

  logs.push(createLog("blue", "Low confidence — requesting Red Agent analysis", "warning"));
  return {
    output: {
      status: "need_red",
      reasoning: "Page analyzed but confidence is low. Need Red Agent for deeper inspection.",
      confidence: 45,
    },
    logs,
  };
}

async function runRedAgent(
  task: string,
  snapshot: PageSnapshot,
  blueContext: BlueAgentOutput
): Promise<{ output: RedAgentOutput; logs: AgentLogEntry[] }> {
  const logs: AgentLogEntry[] = [];

  logs.push(createLog("red", `Received context from Blue: ${blueContext.reasoning}`, "info"));

  await simulateDelay(1000);

  if (snapshot.forms.includes("login")) {
    const actions = [
      { type: "fill" as const, selector: 'input[name="email"]', value: "user@example.com" },
      { type: "fill" as const, selector: 'input[name="password"]', value: "••••••••" },
      { type: "click" as const, selector: 'button[type="submit"]' },
    ];

    logs.push(createLog("red", `Generated ${actions.length} actions for login form`, "action"));
    actions.forEach((a) =>
      logs.push(createLog("red", `→ ${a.type}: ${a.selector}${a.value ? ` = "${a.value}"` : ""}`, "action"))
    );

    return {
      output: {
        actions,
        reasoning: "Filling login form with credentials and submitting.",
        result: "Login form filled and submitted successfully.",
      },
      logs,
    };
  }

  logs.push(createLog("red", "No actionable elements found for this task", "warning"));
  return {
    output: {
      actions: [],
      reasoning: "Could not identify actionable elements for the current task.",
      needsHumanInput: true,
      humanInputQuestion: "Please provide the specific page or URL where you'd like to perform this task.",
    },
    logs,
  };
}

export async function executeTask(
  task: string,
  startUrl: string,
  onLog: (log: AgentLogEntry) => void
): Promise<OrchestratorResult> {
  const allLogs: AgentLogEntry[] = [];
  const addLog = (log: AgentLogEntry) => {
    allLogs.push(log);
    onLog(log);
  };

  currentUrl = startUrl;
  memory = {};
  let iterations = 0;
  const startTime = Date.now();

  addLog(createLog("orchestrator", `Starting task: "${task}"`, "info"));
  addLog(createLog("system", `Navigating to ${startUrl}`, "action"));

  await simulateDelay(600);

  while (iterations < 5) {
    iterations++;
    addLog(createLog("orchestrator", `── Iteration ${iterations} ──`, "info"));

    const snapshot = MOCK_PAGES[currentUrl] || MOCK_PAGES["https://example.com"];

    // Blue Agent
    addLog(createLog("orchestrator", "Invoking Blue Agent...", "info"));
    const blue = await runBlueAgent(task, snapshot);
    blue.logs.forEach(addLog);

    if (blue.output.status === "task_complete") {
      addLog(createLog("orchestrator", "✓ Task completed successfully", "success"));
      return { success: true, output: snapshot.visibleText, iterations, logs: allLogs };
    }

    if (blue.output.status === "navigation_needed" && blue.output.navigationAction) {
      const navUrl = blue.output.navigationAction.url || currentUrl;
      addLog(createLog("system", `Navigating to ${navUrl}`, "action"));
      currentUrl = navUrl;
      await simulateDelay(800);
      continue;
    }

    // Red Agent
    addLog(createLog("orchestrator", "Invoking Red Agent...", "info"));
    const red = await runRedAgent(task, snapshot, blue.output);
    red.logs.forEach(addLog);

    if (red.output.needsHumanInput) {
      addLog(createLog("orchestrator", `⚠ Human input needed: ${red.output.humanInputQuestion}`, "warning"));
      return { success: false, output: red.output.humanInputQuestion || null, iterations, logs: allLogs };
    }

    if (red.output.result) {
      addLog(createLog("orchestrator", `✓ Result: ${red.output.result}`, "success"));
      return { success: true, output: red.output.result, iterations, logs: allLogs };
    }

    // Memory
    memory = { ...memory, lastUrl: currentUrl, iteration: iterations };

    if (Date.now() - startTime > 30000) {
      addLog(createLog("orchestrator", "⏰ Timeout reached", "error"));
      return { success: false, output: "Task timed out", iterations, logs: allLogs };
    }

    await simulateDelay(500);
  }

  addLog(createLog("orchestrator", "Max iterations reached", "warning"));
  return { success: false, output: "Max iterations reached without completion", iterations, logs: allLogs };
}
