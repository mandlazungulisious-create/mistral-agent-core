const toggleBtn = document.getElementById("toggleBtn");
const settingsBtn = document.getElementById("settingsBtn");
const statusEl = document.getElementById("status");

// Check if API key is set
chrome.storage.local.get(["mistralApiKey"], (data) => {
  if (data.mistralApiKey) {
    statusEl.textContent = "✔ API key configured";
    statusEl.className = "status connected";
  } else {
    statusEl.textContent = "✖ No API key — open Settings";
    statusEl.className = "status disconnected";
  }
});

toggleBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "TOGGLE_PANEL" });
  window.close();
});

settingsBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "TOGGLE_PANEL" });
  // Small delay then tell panel to open settings view
  setTimeout(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "SHOW_SETTINGS" });
      }
    });
  }, 300);
  window.close();
});
