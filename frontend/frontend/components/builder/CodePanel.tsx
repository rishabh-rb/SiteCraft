"use client";

import { useState } from "react";
import { Check, Copy, Code2, ShieldCheck } from "lucide-react";
import { FileExplorer } from "./FileExplorer";
import type { GeneratedFile, GeneratedWebsite } from "@/lib/api";

interface CodePanelProps {
  website?: GeneratedWebsite;
  selectedFile: string;
  onSelectFile: (path: string) => void;
}

export function CodePanel({ website, selectedFile, onSelectFile }: CodePanelProps) {
  const [copied, setCopied] = useState(false);

  const files = website?.files ?? [];
  const activeFile: GeneratedFile | undefined = files.find((f) => f.path === selectedFile) ?? files[0];

  const handleCopy = async () => {
    if (!activeFile?.content) return;
    await navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="grid min-h-0 grid-rows-[auto_1fr] border-l border-line bg-white h-full">
      {/* Code Header */}
      <div className="border-b border-line p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-accent" />
            <h2 className="text-base font-black tracking-normal text-ink">Generated Code</h2>
          </div>
          {activeFile && (
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded border border-line bg-paper hover:bg-black/5 text-ink transition-all"
              title="Copy code to clipboard"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-ink/70" />}
              <span>{copied ? "Copied!" : "Copy"}</span>
            </button>
          )}
        </div>

        {website?.qa && (
          <div className="mt-2 flex items-center justify-between rounded-md border border-line bg-paper px-2.5 py-1.5 text-xs">
            <span className="font-bold flex items-center gap-1 text-ink">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> QA Score: {website.qa.score}/100
            </span>
            <span className={`font-semibold ${website.qa.passed ? "text-emerald-600" : "text-amber-600"}`}>
              {website.qa.passed ? "Passed" : "Needs Review"}
            </span>
          </div>
        )}
      </div>

      {/* Main Grid: File Tree + Code Editor Viewer */}
      <div className="grid min-h-0 grid-cols-[140px_1fr]">
        <FileExplorer files={files} selectedFile={activeFile?.path || ""} onSelectFile={onSelectFile} />

        <div className="relative flex flex-col min-h-0 bg-[#111315]">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 text-[11px] text-[#8e95a2] font-mono">
            <span>{activeFile?.path || "No file selected"}</span>
            <span className="uppercase text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/80">{activeFile?.language || "text"}</span>
          </div>
          <pre className="panel-scroll flex-1 min-h-0 overflow-auto p-4 text-xs font-mono leading-5 text-[#f7f3eb] select-text">
            {activeFile?.content || "Generate a website to view code files."}
          </pre>
        </div>
      </div>
    </aside>
  );
}
