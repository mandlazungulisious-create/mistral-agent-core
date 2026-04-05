// ──────────────────────────────────────────────
// Agent Orchestrator — Content Script
// Injects a free-floating panel into any page
// with VISUAL ACTION FEEDBACK (cursor, clicks, typing)
// ──────────────────────────────────────────────

(function () {
  if (document.getElementById("agent-orch-panel")) return;

  // ── Inject Visual Feedback Styles ──
  const feedbackStyle = document.createElement("style");
  feedbackStyle.textContent = `
    @keyframes ao-ripple {
      0% { transform: translate(-50%,-50%) scale(0); opacity: 1; }
      100% { transform: translate(-50%,-50%) scale(3); opacity: 0; }
    }
    @keyframes ao-pulse-border {
      0%, 100% { box-shadow: 0 0 0 2px rgba(59,130,246,0.4); }
      50% { box-shadow: 0 0 0 4px rgba(59,130,246,0.8), 0 0 20px rgba(59,130,246,0.3); }
    }
    @keyframes ao-typing-cursor {
      0%, 100% { border-right-color: #3b82f6; }
      50% { border-right-color: transparent; }
    }
    @keyframes ao-scroll-indicator {
      0% { transform: translateY(0); opacity: 1; }
      100% { transform: translateY(20px); opacity: 0; }
    }
    #ao-virtual-cursor {
      position: fixed;
      width: 20px; height: 20px;
      pointer-events: none;
      z-index: 2147483646;
      transition: left 0.4s cubic-bezier(.4,0,.2,1), top 0.4s cubic-bezier(.4,0,.2,1);
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
    }
    #ao-virtual-cursor svg {
      width: 20px; height: 20px;
    }
    #ao-action-label {
      position: fixed;
      pointer-events: none;
      z-index: 2147483646;
      background: #0d1117ee;
      color: #c9d1d9;
      font-family: 'Consolas', 'JetBrains Mono', monospace;
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 4px;
      border: 1px solid #30363d;
      white-space: nowrap;
      transition: left 0.4s cubic-bezier(.4,0,.2,1), top 0.4s cubic-bezier(.4,0,.2,1);
    }
    .ao-highlight-element {
      outline: 2px solid #3b82f6 !important;
      outline-offset: 2px !important;
      animation: ao-pulse-border 1s ease-in-out infinite !important;
      transition: outline 0.2s !important;
    }
    .ao-click-ripple {
      position: fixed;
      width: 20px; height: 20px;
      border-radius: 50%;
      background: rgba(59,130,246,0.4);
      pointer-events: none;
      z-index: 2147483646;
      animation: ao-ripple 0.6s ease-out forwards;
    }
    .ao-typing-indicator {
      position: fixed;
      pointer-events: none;
      z-index: 2147483646;
      background: #161b22ee;
      border: 1px solid #3b82f6;
      border-radius: 6px;
      padding: 4px 8px;
      font-family: 'Consolas', monospace;
      font-size: 12px;
      color: #3b82f6;
      white-space: nowrap;
    }
    .ao-scroll-arrow {
      position: fixed;
      left: 50%;
      top: 50%;
      transform: translateX(-50%);
      pointer-events: none;
      z-index: 2147483646;
      font-size: 28px;
      color: #3b82f6;
      animation: ao-scroll-indicator 1s ease-out forwards;
    }
  `;
  document.head.appendChild(feedbackStyle);

  // ── Virtual Cursor ──
  const cursor = document.createElement("div");
  cursor.id = "ao-virtual-cursor";
  cursor.innerHTML = `<svg viewBox="0 0 24 24" fill="none"><path d="M4 2 L4 20 L9 15 L14 22 L17 20 L12 13 L19 13 Z" fill="#3b82f6" stroke="#fff" stroke-width="1.5"/></svg>`;
  cursor.style.display = "none";
  document.body.appendChild(cursor);

  const actionLabel = document.createElement("div");
  actionLabel.id = "ao-action-label";
  actionLabel.style.display = "none";
  document.body.appendChild(actionLabel);

  function showCursor() { cursor.style.display = "block"; }
  function hideCursor() { cursor.style.display = "none"; actionLabel.style.display = "none"; }

  function moveCursorTo(x, y, label) {
    showCursor();
    cursor.style.left = x + "px";
    cursor.style.top = y + "px";
    if (label) {
      actionLabel.textContent = label;
      actionLabel.style.display = "block";
      actionLabel.style.left = (x + 24) + "px";
      actionLabel.style.top = (y + 4) + "px";
    }
  }

  function moveCursorToElement(el, label) {
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    moveCursorTo(x, y, label);
    return { x, y };
  }

  function showClickRipple(x, y) {
    const ripple = document.createElement("div");
    ripple.className = "ao-click-ripple";
    ripple.style.left = x + "px";
    ripple.style.top = y + "px";
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }

  function highlightElement(el) {
    el.classList.add("ao-highlight-element");
    return () => el.classList.remove("ao-highlight-element");
  }

  function showScrollArrow(direction) {
    const arrow = document.createElement("div");
    arrow.className = "ao-scroll-arrow";
    arrow.textContent = direction > 0 ? "⬇" : "⬆";
    document.body.appendChild(arrow);
    setTimeout(() => arrow.remove(), 1000);
  }

  async function simulateTyping(el, text) {
    const rect = el.getBoundingClientRect();
    const indicator = document.createElement("div");
    indicator.className = "ao-typing-indicator";
    indicator.style.left = rect.left + "px";
    indicator.style.top = (rect.bottom + 6) + "px";
    document.body.appendChild(indicator);

    el.focus();
    el.value = "";
    for (let i = 0; i < text.length; i++) {
      el.value += text[i];
      indicator.textContent = `typing: "${el.value}█"`;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise(r => setTimeout(r, 40 + Math.random() * 60));
    }
    el.dispatchEvent(new Event("change", { bubbles: true }));
    indicator.textContent = `✔ "${text}"`;
    setTimeout(() => indicator.remove(), 800);
  }

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
      body: JSON.stringify({ agent_id: agentId, messages }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Mistral API ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "{}";

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
      task, url: snapshot.url, title: snapshot.title, dom,
      forms: snapshot.forms,
      interactiveElements: snapshot.interactiveElements.length,
      memory,
    };

    const output = await callMistralAgent(agentId, apiKey, [
      { role: "user", content: JSON.stringify(payload) },
    ]);

    if (output.confidence && output.confidence < 70) output.status = "need_red";
    return output;
  }

  // ── Red Agent ──
  async function runRedAgent(task, snapshot, memory, blueContext, apiKey, agentId) {
    const dom = cleanDOM(snapshot.domTree);
    const payload = {
      task, url: snapshot.url, dom,
      forms: snapshot.forms,
      interactiveElements: snapshot.interactiveElements,
      memory,
      blueReasoning: blueContext?.reasoning || null,
    };

    const output = await callMistralAgent(agentId, apiKey, [
      { role: "user", content: JSON.stringify(payload) },
    ]);

    const validTypes = ["click", "fill", "select", "hover", "type", "submit", "upload", "wait", "scroll"];
    output.actions = (output.actions || []).filter((a) => validTypes.includes(a.type));
    return output;
  }

  // ── Execute browser actions WITH visual feedback ──
  async function executeBrowserAction(action) {
    const el = action.selector ? document.querySelector(action.selector) : null;
    let removeHighlight = null;

    switch (action.type) {
      case "click": {
        if (!el) throw new Error(`Element not found: ${action.selector}`);
        removeHighlight = highlightElement(el);
        const pos = moveCursorToElement(el, `click → ${action.selector}`);
        await new Promise(r => setTimeout(r, 500));
        showClickRipple(pos.x, pos.y);
        await new Promise(r => setTimeout(r, 200));
        el.click();
        break;
      }
      case "fill":
      case "type": {
        if (!el) throw new Error(`Element not found: ${action.selector}`);
        removeHighlight = highlightElement(el);
        moveCursorToElement(el, `type → "${(action.value || "").slice(0, 20)}"`);
        await new Promise(r => setTimeout(r, 400));
        await simulateTyping(el, action.value || "");
        break;
      }
      case "select": {
        if (!el) break;
        removeHighlight = highlightElement(el);
        moveCursorToElement(el, `select → "${action.value}"`);
        await new Promise(r => setTimeout(r, 400));
        el.value = action.value || "";
        el.dispatchEvent(new Event("change", { bubbles: true }));
        break;
      }
      case "hover": {
        if (!el) break;
        removeHighlight = highlightElement(el);
        moveCursorToElement(el, "hover");
        await new Promise(r => setTimeout(r, 400));
        el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
        break;
      }
      case "submit": {
        if (!el) break;
        removeHighlight = highlightElement(el);
        const pos = moveCursorToElement(el, "submit");
        await new Promise(r => setTimeout(r, 400));
        showClickRipple(pos.x, pos.y);
        if (el.tagName === "FORM") el.submit();
        else el.click();
        break;
      }
      case "scroll":
        showScrollArrow(parseInt(action.value) || 300);
        moveCursorTo(window.innerWidth / 2, window.innerHeight / 2, `scroll ${parseInt(action.value) > 0 ? "↓" : "↑"} ${Math.abs(parseInt(action.value) || 300)}px`);
        await new Promise(r => setTimeout(r, 300));
        window.scrollBy({ top: parseInt(action.value) || 300, behavior: "smooth" });
        await new Promise(r => setTimeout(r, 600));
        break;
      case "wait":
        moveCursorTo(window.innerWidth / 2, window.innerHeight / 2, `waiting ${action.value || 1000}ms...`);
        await new Promise(r => setTimeout(r, parseInt(action.value) || 1000));
        break;
      default:
        break;
    }

    // Clean up highlight after a delay
    if (removeHighlight) setTimeout(removeHighlight, 1200);
    return Promise.resolve();
  }

  // ── Logging ──
  const AGENT_LABELS = { blue: "BLUE", red: "RED ", orchestrator: "ORCH", system: "SYS " };
  const TYPE_ICONS = { info: "●", action: "▶", error: "✖", success: "✔", warning: "⚠" };

  let logs = [];
  let isRunning = false;
  let result = null;
  let currentView = "main";

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
    if (currentView === "settings") renderSettings();
    else renderMain();
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
              <span class="ao-status-dot" style="background:#8b949e"></span> Idle
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
          <input class="ao-input" id="ao-task-input" placeholder="Describe the task..." value="">
        </div>
        <button class="ao-btn" id="ao-run-btn">▶ Execute Task</button>
        <div id="ao-log-area" style="margin-top:12px;"></div>
        <div id="ao-result-area"></div>
      </div>
    `;

    document.getElementById("ao-close-btn").onclick = () => panel.classList.add("hidden");
    document.getElementById("ao-minimize-btn").onclick = () => panel.classList.add("hidden");
    document.getElementById("ao-settings-btn").onclick = () => { currentView = "settings"; render(); };
    document.getElementById("ao-run-btn").onclick = handleRun;

    setupDrag();

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

    if (iterVal) iterVal.textContent = result?.iterations?.toString() || "—";
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
                return;
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
                await new Promise(r => setTimeout(r, 300));
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

            await new Promise(r => setTimeout(r, 800));
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
        hideCursor();
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
