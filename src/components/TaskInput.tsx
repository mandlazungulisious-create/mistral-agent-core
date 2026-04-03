import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TaskInputProps {
  onSubmit: (task: string, url: string) => void;
  isRunning: boolean;
}

export function TaskInput({ onSubmit, isRunning }: TaskInputProps) {
  const [task, setTask] = useState("Find a login page and prepare to log in");
  const [url, setUrl] = useState("https://example.com");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (task.trim() && url.trim()) {
      onSubmit(task.trim(), url.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          Task Description
        </label>
        <Input
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="Describe the task for the agents..."
          disabled={isRunning}
          className="bg-secondary border-border font-mono text-sm"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          Start URL
        </label>
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          disabled={isRunning}
          className="bg-secondary border-border font-mono text-sm"
        />
      </div>
      <Button
        type="submit"
        disabled={isRunning || !task.trim() || !url.trim()}
        className="w-full font-mono"
      >
        {isRunning ? (
          <span className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-primary-foreground animate-pulse-glow" />
            Agents Running...
          </span>
        ) : (
          "▶ Execute Task"
        )}
      </Button>
    </form>
  );
}
