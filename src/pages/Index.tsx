import { useState } from "react";
import iconImg from "@/assets/extension-icon.png";

const Index = () => {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    setDownloading(true);
    fetch("/agent-orchestrator.zip")
      .then((res) => {
        if (!res.ok) throw new Error(`Download failed: ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "agent-orchestrator.zip";
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch((err) => alert(err.message))
      .finally(() => setDownloading(false));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-lg w-full text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <img src={iconImg} alt="Agent Orchestrator" width={96} height={96} className="rounded-2xl" />
        </div>

        {/* Title */}
        <div>
          <h1 className="text-3xl font-mono font-bold text-foreground mb-2">
            Agent Orchestrator
          </h1>
          <p className="text-muted-foreground text-sm">
            Blue + Red Mistral AI Agents — Chrome Extension
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3 text-left">
          {[
            { icon: "🔵", label: "Blue Agent", desc: "Page analysis & planning" },
            { icon: "🔴", label: "Red Agent", desc: "Action execution & validation" },
            { icon: "🧠", label: "Smart Memory", desc: "Cross-iteration context" },
            { icon: "🔒", label: "Secure Keys", desc: "Stored locally in Chrome" },
          ].map((f) => (
            <div key={f.label} className="bg-card border border-border rounded-lg p-3">
              <div className="text-lg mb-1">{f.icon}</div>
              <div className="text-xs font-mono font-semibold text-foreground">{f.label}</div>
              <div className="text-xs text-muted-foreground">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Download */}
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full py-3 bg-primary text-primary-foreground font-mono font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {downloading ? "Downloading..." : "⬇ Download Extension"}
        </button>

        {/* Install steps */}
        <div className="bg-card border border-border rounded-lg p-4 text-left">
          <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
            Installation
          </h2>
          <ol className="space-y-2 text-sm text-foreground/80">
            <li className="flex gap-2">
              <span className="text-primary font-mono font-bold">1.</span>
              Unzip the downloaded file
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-mono font-bold">2.</span>
              Open <code className="bg-secondary px-1.5 py-0.5 rounded text-xs font-mono">chrome://extensions</code>
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-mono font-bold">3.</span>
              Enable <strong>Developer mode</strong> (top-right toggle)
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-mono font-bold">4.</span>
              Click <strong>Load unpacked</strong> → select the folder
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-mono font-bold">5.</span>
              Click the extension icon → open Settings → add your Mistral API key
            </li>
          </ol>
        </div>

        <p className="text-xs text-muted-foreground">
          Works in Chrome, Edge, Brave, Arc, and Opera
        </p>
      </div>
    </div>
  );
};

export default Index;
