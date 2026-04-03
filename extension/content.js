// ──────────────────────────────────────────────
// Agent Orchestrator — Content Script
// Injects a free-floating panel into any page
// ──────────────────────────────────────────────

(function () {
  if (document.getElementById("agent-orch-panel")) return;

  // ── DOM Cleaner ──
  function cleanDOM(dom) {
    return dom
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/\s+/g, " ")
      .slice(0, 3000);
  }

  // ── Get real page snapshot ──
  function getPageSnapshot() {
    const forms = Array.from(document.forms).map(
      (f) => f.id || f.name || "unnamed"
    );
    const interactive = Array.from(
      document.querySelectorAll(
        'a, button, input, select, textarea, [role="button"], [onclick]'
      )
    ).map((el) => {
      const tag = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : "";
      const cls = el.className
        ? `.${String(el.className).split(" ").slice(0, 2).join(".")}`
        : "";
      const text = el.textContent?.trim().slice(0, 30) || "";
      return `${tag}${id}${cls}${text ? ` "${text}"` : ""}`;
    });

    return {
      url: location.href,
      title: document.title,
      domTree: document.documentElement.outerHTML,
      forms,
      interactiveElements: interactive.slice(0, 50),
      visibleText: document.body?.innerText?.slice(0, 2000) || "",
    };
  }

  // ── Mistral Agent API call ──
  async function callMistralAgent(agentId, apiKey, messages) {
    const res = await fetch("https://api.mistral.ai/v1/agents/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent_id: agentId,
        messages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Mistral API ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const text =
      data.choices?.[0]?.message?.content || "{}";

    try {
      return JSON.parse(text);
    } catch {
      return { raw: text, status: "need_red", reasoning: text, confidence: 50, actions: [] };
    }
  }

  // ── Blue Agent ──
  async function runBlueAgent(task, snapshot, memory, apiKey, agentId) {
    const dom = cleanDOM(snapshot.domTree);
    const payload = {
      task,
      url: snapshot.url,
      title: snapshot.title,
      dom,
      forms: snapshot.forms,
      interactiveElements: snapshot.interactiveElements.length,
      memory,
    };

    const output = await callMistralAgent(agentId, apiKey, [
      { role: "user", content: JSON.stringify(payload) },
    ]);

    if (output.confidence && output.confidence < 70) {
      output.status = "need_red";
    }

    return output;
  }

  // ── Red Agent ──
  async function runRedAgent(task, snapshot, memory, blueContext, apiKey, agentId) {
    const dom = cleanDOM(snapshot.domTree);
    const payload = {
      task,
      url: snapshot.url,
      dom,
      forms: snapshot.forms,
      interactiveElements: snapshot.interactiveElements,
      memory,
      blueReasoning: blueContext?.reasoning || null,
    };

    const output = await callMistralAgent(agentId, apiKey, [
      { role: "user", content: JSON.stringify(payload) },
    ]);

    const validTypes = ["click", "fill", "select", "hover", "type", "submit", "upload", "wait", "scroll"];
    output.actions = (output.actions || []).filter((a) =>
      validTypes.includes(a.type)
    );

    return output;
  }

  // ── Execute browser actions ──
  function executeBrowserAction(action) {
    switch (action.type) {
      case "click": {
        const el = document.querySelector(action.selector);
        if (el) el.click();
        else throw new Error(`Element not found: ${action.selector}`);
        break;
      }
      case "fill":
      case "type": {
        const el = document.querySelector(action.selector);
        if (el) {
          el.focus();
          el.value = action.value || "";
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        } else throw new Error(`Element not found: ${action.selector}`);
        break;
      }
      case "select": {
        const el = document.querySelector(action.selector);
        if (el) {
          el.value = action.value || "";
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }
        break;
      }
      case "hover": {
        const el = document.querySelector(action.selector);
        if (el) el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
        break;
      }
      case "submit": {
        const el = document.querySelector(action.selector);
        if (el) {
          if (el.tagName === "FORM") el.submit();
          else el.click();
        }
        break;
      }
      case "scroll":
        window.scrollBy(0, parseInt(action.value) || 300);
        break;
      case "wait":
        return new Promise((r) => setTimeout(r, parseInt(action.value) || 1000));
      default:
        break;
    }
    return Promise.resolve();
  }

  // ── Logging ──
  const AGENT_LABELS = { blue: "BLUE", red: "RED ", orchestrator: "ORCH", system: "SYS " };
  const TYPE_ICONS = { info: "●", action: "▶", error: "✖", success: "✔", warning: "⚠" };

  let logs = [];
  let isRunning = false;
  let result = null;
  let currentView = "main"; // main | settings | log

  function createLog(agent, message, type = "info") {
    return { id: Date.now() + Math.random(), timestamp: Date.now(), agent, message, type };
  }

  function addLog(agent, message, type = "info") {
    const entry = createLog(agent, message, type);
    logs.push(entry);
    renderLogEntry(entry);
    scrollLogToBottom();
  }

  // ── UI Creation ──
  const panel = document.createElement("div");
  panel.id = "agent-orch-panel";
  panel.className = "hidden";
  document.body.appendChild(panel);

  function render() {
    if (currentView === "settings") {
      renderSettings();
    } else {
      renderMain();
    }
  }

  function renderMain() {
    panel.innerHTML = `
      <div class="ao-header" id="ao-drag-handle">
        <div class="ao-title">
          <div class="ao-dots">
            <div class="ao-dot ao-dot-blue"></div>
            <div class="ao-dot ao-dot-red"></div>
          </div>
          Agent Orchestrator
        </div>
        <div class="ao-header-btns">
          <button class="ao-header-btn" id="ao-settings-btn" title="Settings">⚙</button>
          <button class="ao-header-btn" id="ao-minimize-btn" title="Minimize">─</button>
          <button class="ao-header-btn" id="ao-close-btn" title="Close">✕</button>
        </div>
      </div>
      <div class="ao-body">
        <div class="ao-status-row">
          <div class="ao-status-card">
            <div class="ao-status-label">Status</div>
            <div class="ao-status-value" id="ao-status-val">
              <span class="ao-status-dot" style="background:#8b949e"></span>
              Idle
            </div>
          </div>
          <div class="ao-status-card">
            <div class="ao-status-label">Iterations</div>
            <div class="ao-status-value" id="ao-iter-val">—</div>
          </div>
          <div class="ao-status-card">
            <div class="ao-status-label">Mode</div>
            <div class="ao-status-value" id="ao-mode-val">Live</div>
          </div>
        </div>
        <div class="ao-input-group">
          <label class="ao-label">Task</label>
          <input class="ao-input" id="ao-task-input" placeholder="Describe the task..." value="Find a login page and prepare to log in">
        </div>
        <button class="ao-btn" id="ao-run-btn">▶ Execute Task</button>
        <div id="ao-log-area" style="margin-top:12px;"></div>
        <div id="ao-result-area"></div>
      </div>
    `;

    // Bind events
    document.getElementById("ao-close-btn").onclick = () => panel.classList.add("hidden");
    document.getElementById("ao-minimize-btn").onclick = () => panel.classList.add("hidden");
    document.getElementById("ao-settings-btn").onclick = () => { currentView = "settings"; render(); };
    document.getElementById("ao-run-btn").onclick = handleRun;

    setupDrag();

    // Re-render logs
    const logArea = document.getElementById("ao-log-area");
    if (logs.length === 0) {
      logArea.innerHTML = '<div class="ao-empty">Awaiting task execution...</div>';
    } else {
      logArea.innerHTML = "";
      logs.forEach((e) => renderLogEntry(e));
    }

    updateStatus();
  }

  function renderSettings() {
    chrome.storage.local.get(
      ["mistralApiKey", "blueAgentId", "redAgentId"],
      (data) => {
        panel.innerHTML = `
          <div class="ao-header" id="ao-drag-handle">
            <div class="ao-title">
              <div class="ao-dots">
                <div class="ao-dot ao-dot-blue"></div>
                <div class="ao-dot ao-dot-red"></div>
              </div>
              Settings
            </div>
            <div class="ao-header-btns">
              <button class="ao-header-btn" id="ao-back-btn" title="Back">←</button>
              <button class="ao-header-btn" id="ao-close-btn2" title="Close">✕</button>
            </div>
          </div>
          <div class="ao-body">
            <div class="ao-settings-group">
              <div class="ao-settings-title">🔑 Mistral API Key</div>
              <input class="ao-input ao-input-password" id="ao-api-key" type="password"
                placeholder="Enter your Mistral API key..."
                value="${data.mistralApiKey || ""}">
            </div>
            <div class="ao-settings-group">
              <div class="ao-settings-title">🔵 Blue Agent ID</div>
              <input class="ao-input" id="ao-blue-id"
                placeholder="ag_..."
                value="${data.blueAgentId || "ag_019d3f32fc3576c6a94b8b8e033c700f"}">
            </div>
            <div class="ao-settings-group">
              <div class="ao-settings-title">🔴 Red Agent ID</div>
              <input class="ao-input" id="ao-red-id"
                placeholder="ag_..."
                value="${data.redAgentId || "ag_019d3f38dfd2721cb947ec4597d6eaa8"}">
            </div>
            <button class="ao-btn" id="ao-save-btn">💾 Save Settings</button>
            <div class="ao-save-msg" id="ao-save-msg">Settings saved!</div>
            <div style="margin-top:16px; padding-top:12px; border-top:1px solid #30363d;">
              <div class="ao-label" style="margin-bottom:8px;">Security Note</div>
              <p style="font-size:11px; color:#8b949e; line-height:1.5;">
                Your API key is stored locally in Chrome's secure storage and never sent to any server except Mistral's API.
              </p>
            </div>
          </div>
        `;

        document.getElementById("ao-back-btn").onclick = () => { currentView = "main"; render(); };
        document.getElementById("ao-close-btn2").onclick = () => panel.classList.add("hidden");
        document.getElementById("ao-save-btn").onclick = () => {
          chrome.storage.local.set({
            mistralApiKey: document.getElementById("ao-api-key").value.trim(),
            blueAgentId: document.getElementById("ao-blue-id").value.trim(),
            redAgentId: document.getElementById("ao-red-id").value.trim(),
          }, () => {
            const msg = document.getElementById("ao-save-msg");
            msg.classList.add("show");
            setTimeout(() => msg.classList.remove("show"), 2000);
          });
        };

        setupDrag();
      }
    );
  }

  function renderLogEntry(entry) {
    const logArea = document.getElementById("ao-log-area");
    if (!logArea) return;

    // Remove empty state
    const empty = logArea.querySelector(".ao-empty");
    if (empty) empty.remove();

    const time = new Date(entry.timestamp).toLocaleTimeString("en-US", {
      hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit",
    });

    const div = document.createElement("div");
    div.className = "ao-log-entry";
    div.innerHTML = `
      <span class="ao-log-time">${time}</span>
      <span class="ao-log-agent ${entry.agent}">[${AGENT_LABELS[entry.agent]}]</span>
      <span class="ao-log-icon ${entry.type}">${TYPE_ICONS[entry.type]}</span>
      <span class="ao-log-msg">${entry.message}</span>
    `;
    logArea.appendChild(div);
  }

  function scrollLogToBottom() {
    const body = panel.querySelector(".ao-body");
    if (body) body.scrollTop = body.scrollHeight;
  }

  function updateStatus() {
    const statusVal = document.getElementById("ao-status-val");
    const iterVal = document.getElementById("ao-iter-val");
    if (!statusVal) return;

    if (isRunning) {
      statusVal.innerHTML = '<span class="ao-status-dot" style="background:#3b82f6"></span> Running';
    } else if (result) {
      const color = result.success ? "#3fb950" : "#f85149";
      const text = result.success ? "Complete" : "Failed";
      statusVal.innerHTML = `<span class="ao-status-dot" style="background:${color}"></span> ${text}`;
    } else {
      statusVal.innerHTML = '<span class="ao-status-dot" style="background:#8b949e"></span> Idle';
    }

    if (iterVal) {
      iterVal.textContent = result?.iterations?.toString() || "—";
    }
  }

  function showResult() {
    const area = document.getElementById("ao-result-area");
    if (!area || !result) return;

    area.innerHTML = `
      <div class="ao-result ${result.success ? "success" : "error"}">
        <div class="ao-label" style="margin-bottom:4px;">Result</div>
        <div>${result.output || "No output"}</div>
      </div>
    `;
  }

  // ── Drag Logic ──
  function setupDrag() {
    const handle = document.getElementById("ao-drag-handle");
    if (!handle) return;

    let isDragging = false;
    let startX, startY, startLeft, startTop;

    handle.addEventListener("mousedown", (e) => {
      if (e.target.closest(".ao-header-btn")) return;
      isDragging = true;
      const rect = panel.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startLeft = rect.left;
      startTop = rect.top;
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      panel.style.left = startLeft + (e.clientX - startX) + "px";
      panel.style.top = startTop + (e.clientY - startY) + "px";
      panel.style.right = "auto";
    });

    document.addEventListener("mouseup", () => { isDragging = false; });
  }

  // ── Execute Task ──
  async function handleRun() {
    const taskInput = document.getElementById("ao-task-input");
    const task = taskInput?.value?.trim();
    if (!task || isRunning) return;

    chrome.storage.local.get(
      ["mistralApiKey", "blueAgentId", "redAgentId"],
      async (data) => {
        if (!data.mistralApiKey) {
          addLog("system", "⚠ No API key configured — open Settings", "error");
          return;
        }

        const apiKey = data.mistralApiKey;
        const blueId = data.blueAgentId || "ag_019d3f32fc3576c6a94b8b8e033c700f";
        const redId = data.redAgentId || "ag_019d3f38dfd2721cb947ec4597d6eaa8";

        isRunning = true;
        logs = [];
        result = null;
        render();

        const btn = document.getElementById("ao-run-btn");
        if (btn) { btn.disabled = true; btn.className = "ao-btn running"; btn.textContent = "⟳ Running..."; }

        let memory = {};
        let iterations = 0;
        const startTime = Date.now();

        addLog("orchestrator", `Starting task: "${task}"`, "info");
        addLog("system", `Current page: ${location.href}`, "action");

        try {
          while (iterations < 15) {
            iterations++;
            addLog("orchestrator", `── Iteration ${iterations} ──`, "info");
            updateStatus();

            const snapshot = getPageSnapshot();

            // Blue Agent
            addLog("orchestrator", "Invoking Blue Agent...", "info");
            let blue;
            try {
              blue = await runBlueAgent(task, snapshot, memory, apiKey, blueId);
              addLog("blue", `Status: ${blue.status || "unknown"} | Confidence: ${blue.confidence || "?"}%`, "info");
              if (blue.reasoning) addLog("blue", blue.reasoning, "info");
            } catch (err) {
              addLog("blue", `Error: ${err.message}`, "error");
              break;
            }

            if (blue.status === "task_complete") {
              addLog("orchestrator", "✓ Task completed", "success");
              result = { success: true, output: blue.result || snapshot.visibleText?.slice(0, 200), iterations };
              break;
            }

            if (blue.status === "navigation_needed" && blue.navigationAction) {
              const url = blue.navigationAction.url;
              if (url) {
                addLog("system", `Navigating to ${url}`, "action");
                location.href = url;
                return; // page will reload
              }
            }

            // Red Agent
            addLog("orchestrator", "Invoking Red Agent...", "info");
            let red;
            try {
              red = await runRedAgent(task, snapshot, memory, blue, apiKey, redId);
              if (red.reasoning) addLog("red", red.reasoning, "info");
            } catch (err) {
              addLog("red", `Error: ${err.message}`, "error");
              break;
            }

            if (red.actions?.length) {
              addLog("red", `Executing ${red.actions.length} action(s)...`, "action");
              for (const action of red.actions) {
                addLog("red", `→ ${action.type}: ${action.selector || ""}${action.value ? ` = "${action.value}"` : ""}`, "action");
                try {
                  await executeBrowserAction(action);
                  addLog("red", `  ✔ Done`, "success");
                } catch (err) {
                  addLog("red", `  ✖ Failed: ${err.message}`, "error");
                }
                await new Promise((r) => setTimeout(r, 300));
              }
            }

            if (red.needsHumanInput) {
              addLog("orchestrator", `⚠ Human input needed: ${red.humanInputQuestion}`, "warning");
              result = { success: false, output: red.humanInputQuestion, iterations };
              break;
            }

            if (red.result) {
              result = { success: true, output: red.result, iterations };
              addLog("orchestrator", `✓ Result: ${red.result}`, "success");
              break;
            }

            memory = { ...memory, lastUrl: location.href, iteration: iterations };

            if (Date.now() - startTime > 60000) {
              addLog("orchestrator", "⏰ Timeout", "error");
              result = { success: false, output: "Timeout", iterations };
              break;
            }

            await new Promise((r) => setTimeout(r, 800));
          }

          if (!result) {
            result = { success: false, output: "Max iterations reached", iterations };
            addLog("orchestrator", "Max iterations reached", "warning");
          }
        } catch (err) {
          addLog("orchestrator", `Fatal: ${err.message}`, "error");
          result = { success: false, output: err.message, iterations };
        }

        isRunning = false;
        updateStatus();
        showResult();

        if (btn) { btn.disabled = false; btn.className = "ao-btn"; btn.textContent = "▶ Execute Task"; }
      }
    );
  }

  // ── Message Listener ──
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "TOGGLE_PANEL") {
      panel.classList.toggle("hidden");
      if (!panel.classList.contains("hidden")) render();
    }
    if (msg.type === "SHOW_SETTINGS") {
      panel.classList.remove("hidden");
      currentView = "settings";
      render();
    }
  });

  // Initial render
  render();
})();
