"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  Code2,
  ShieldCheck,
  FileCode2,
  AlertCircle,
} from "lucide-react";

import { FileExplorer } from "./FileExplorer";
import type { GeneratedFile, GeneratedWebsite } from "@/lib/api";

interface CodePanelProps {
  website?: GeneratedWebsite;
  selectedFile: string;
  onSelectFile: (path: string) => void;
}

export function CodePanel({
  website,
  selectedFile,
  onSelectFile,
}: CodePanelProps) {
  const [copied, setCopied] = useState(false);

  const files = website?.files ?? [];

  const activeFile: GeneratedFile | undefined =
    files.find((file) => file.path === selectedFile) ?? files[0];

  /* ---------------------------------------------
     Copy active file
  --------------------------------------------- */
  const handleCopy = async () => {
    if (!activeFile?.content) return;

    try {
      await navigator.clipboard.writeText(activeFile.content);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy code:", error);
    }
  };

  /* ---------------------------------------------
     Code lines for line numbers
  --------------------------------------------- */
  const codeContent = activeFile?.content || "";

  const codeLines = codeContent.split("\n");

  /* ---------------------------------------------
     QA score
  --------------------------------------------- */
  const qaScore = website?.qa?.score ?? 0;

  const qaPassed = website?.qa?.passed ?? false;

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-line bg-white">

      {/* =====================================================
          HEADER
      ====================================================== */}
      <div className="shrink-0 border-b border-line bg-paper/70">

        {/* Main Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3">

          {/* Title */}
          <div className="flex min-w-0 items-center gap-2.5">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10">
              <Code2 className="h-5 w-5 text-accent" />
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-sm font-black tracking-tight text-ink">
                Generated Code
              </h2>

              <p className="mt-0.5 text-[10px] text-ink/40">
                {files.length > 0
                  ? `${files.length} ${
                      files.length === 1 ? "file" : "files"
                    } generated`
                  : "No files generated"}
              </p>
            </div>
          </div>

          {/* Copy Button */}
          {activeFile && (
            <button
              type="button"
              onClick={handleCopy}
              disabled={!activeFile.content}
              aria-label={
                copied
                  ? "Code copied to clipboard"
                  : "Copy code to clipboard"
              }
              title={
                copied
                  ? "Copied to clipboard"
                  : "Copy code to clipboard"
              }
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-accent/20 ${
                copied
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-line bg-white text-ink/70 hover:bg-ink/[0.04] hover:text-ink"
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* =================================================
            QA STATUS
        ================================================== */}
        {website?.qa && (
          <div className="px-4 pb-3">

            <div className="rounded-lg border border-line bg-white p-3">

              {/* QA Header */}
              <div className="flex items-center justify-between">

                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-md ${
                      qaPassed
                        ? "bg-emerald-50"
                        : "bg-amber-50"
                    }`}
                  >
                    {qaPassed ? (
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                    )}
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink/40">
                      Quality Check
                    </p>

                    <p
                      className={`text-xs font-bold ${
                        qaPassed
                          ? "text-emerald-600"
                          : "text-amber-600"
                      }`}
                    >
                      {qaPassed
                        ? "All checks passed"
                        : "Needs review"}
                    </p>
                  </div>
                </div>

                {/* Score */}
                <div className="text-right">
                  <span className="text-lg font-black text-ink">
                    {qaScore}
                  </span>

                  <span className="text-[10px] font-semibold text-ink/35">
                    /100
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    qaPassed
                      ? "bg-emerald-500"
                      : "bg-amber-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      Math.max(qaScore, 0),
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================
          MAIN CODE AREA
      ====================================================== */}
      <div className="grid min-h-0 flex-1 grid-cols-[170px_minmax(0,1fr)]">

        {/* File Explorer */}
        <FileExplorer
          files={files}
          selectedFile={activeFile?.path || ""}
          onSelectFile={onSelectFile}
        />

        {/* =================================================
            CODE EDITOR
        ================================================== */}
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-[#111315]">

          {/* Editor Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#17191c] px-3 py-2">

            {/* File Name */}
            <div className="flex min-w-0 items-center gap-2">

              <FileCode2 className="h-3.5 w-3.5 shrink-0 text-teal" />

              <span
                className="truncate font-mono text-[10px] text-white/65"
                title={activeFile?.path}
              >
                {activeFile?.path || "No file selected"}
              </span>
            </div>

            {/* Language */}
            {activeFile && (
              <span className="ml-2 shrink-0 rounded border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-white/50">
                {activeFile.language || "text"}
              </span>
            )}
          </div>

          {/* Editor */}
          {activeFile ? (
            <div className="panel-scroll flex min-h-0 flex-1 overflow-auto">

              {/* Line Numbers */}
              <div className="sticky left-0 select-none border-r border-white/5 bg-[#111315] px-3 py-4 text-right font-mono text-[11px] leading-5 text-white/20">
                {codeLines.map((_, index) => (
                  <div key={index} className="h-5">
                    {index + 1}
                  </div>
                ))}
              </div>

              {/* Code */}
              <pre className="min-w-max flex-1 select-text p-4 font-mono text-[11px] leading-5 text-[#f7f3eb]">
                <code>{codeContent}</code>
              </pre>
            </div>
          ) : (
            /* Empty Editor */
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">

              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                <Code2 className="h-6 w-6 text-white/25" />
              </div>

              <p className="text-sm font-semibold text-white/60">
                No code to display
              </p>

              <p className="mt-1 max-w-xs text-[11px] leading-5 text-white/30">
                Generate a website to view its source files and
                inspect the generated code.
              </p>
            </div>
          )}

          {/* Editor Footer */}
          {activeFile && (
            <div className="flex shrink-0 items-center justify-between border-t border-white/10 bg-[#17191c] px-3 py-1.5">

              <div className="flex items-center gap-3">

                <span className="font-mono text-[9px] text-white/30">
                  {codeLines.length}{" "}
                  {codeLines.length === 1 ? "line" : "lines"}
                </span>

                <span className="font-mono text-[9px] text-white/20">
                  {activeFile.language || "text"}
                </span>
              </div>

              <span className="text-[9px] text-white/20">
                Read only
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
