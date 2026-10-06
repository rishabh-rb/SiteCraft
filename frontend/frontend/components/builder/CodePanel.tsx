"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  Code2,
  ShieldCheck,
  FileCode2,
  AlertCircle,
  Files,
  LockKeyhole,
  Hash,
  Search,
  Maximize2,
  X,
} from "lucide-react";

import { FileExplorer } from "./FileExplorer";
import type { GeneratedFile, GeneratedWebsite } from "@/lib/api";

interface CodePanelProps {
  website?: GeneratedWebsite;
  selectedFile: string;
  onSelectFile: (path: string) => void;
}

/* =========================================================
   HELPERS
========================================================= */

function getLanguageLabel(file?: GeneratedFile) {
  if (!file) return "text";

  if (file.language) {
    return file.language;
  }

  const extension = file.path.split(".").pop()?.toLowerCase();

  const languageMap: Record<string, string> = {
    tsx: "tsx",
    ts: "typescript",
    jsx: "jsx",
    js: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    json: "json",
    css: "css",
    scss: "scss",
    sass: "sass",
    less: "less",
    html: "html",
    htm: "html",
    md: "markdown",
    mdx: "mdx",
    yaml: "yaml",
    yml: "yaml",
    xml: "xml",
    svg: "xml",
    sql: "sql",
    py: "python",
    java: "java",
    php: "php",
  };

  return languageMap[extension || ""] || "text";
}

function getFileName(path: string) {
  return path.split("/").pop() || path;
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export function CodePanel({
  website,
  selectedFile,
  onSelectFile,
}: CodePanelProps) {
  const [copied, setCopied] = useState(false);
  const [codeSearch, setCodeSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const files = website?.files ?? [];

  /*
   * Keep the externally controlled selected file as the source
   * of truth whenever it exists.
   */
  const activeFile = useMemo<GeneratedFile | undefined>(() => {
    if (!files.length) return undefined;

    return (
      files.find((file) => file.path === selectedFile) ??
      files[0]
    );
  }, [files, selectedFile]);

  /*
   * If the parent has no selected file but files exist,
   * initialize it with the first generated file.
   */
  useEffect(() => {
    if (files.length > 0 && !selectedFile) {
      onSelectFile(files[0].path);
    }
  }, [files, selectedFile, onSelectFile]);

  const codeContent = activeFile?.content ?? "";
  const codeLines = codeContent.split("\n");
  const language = getLanguageLabel(activeFile);

  const qaScore = Math.min(
    Math.max(website?.qa?.score ?? 0, 0),
    100
  );

  const qaPassed = website?.qa?.passed ?? false;

  const filteredCode = useMemo(() => {
    const query = codeSearch.trim().toLowerCase();

    if (!query) {
      return null;
    }

    return codeLines
      .map((line, index) => ({
        line,
        number: index + 1,
      }))
      .filter(({ line }) =>
        line.toLowerCase().includes(query)
      );
  }, [codeLines, codeSearch]);

  /* =====================================================
     COPY CODE
  ====================================================== */

  const handleCopy = async () => {
    if (!activeFile?.content) return;

    try {
      await navigator.clipboard.writeText(activeFile.content);

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy code:", error);
    }
  };

  /* =====================================================
     KEYBOARD SHORTCUTS
  ====================================================== */

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isCopyShortcut =
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "c";

      const isSearchShortcut =
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "f";

      const isEscape = event.key === "Escape";

      if (isCopyShortcut && activeFile) {
        event.preventDefault();
        void handleCopy();
      }

      if (isSearchShortcut && activeFile) {
        event.preventDefault();
        setShowSearch(true);
      }

      if (isEscape) {
        setShowSearch(false);
        setCodeSearch("");
        setExpanded(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeFile]);

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-line bg-paper">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="shrink-0 border-b border-line bg-paper">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          {/* Project info */}

          <div className="flex min-w-0 items-center gap-2.5">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10">
              <Code2 className="h-5 w-5 text-accent" />

              {files.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[8px] font-bold text-white">
                  {files.length}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-sm font-black tracking-tight text-ink">
                Generated Code
              </h2>

              <p className="mt-0.5 truncate text-[10px] text-ink/40">
                {files.length > 0
                  ? `${files.length} ${
                      files.length === 1 ? "file" : "files"
                    } in project`
                  : "No files generated yet"}
              </p>
            </div>
          </div>

          {/* Header actions */}

          <div className="flex shrink-0 items-center gap-1.5">
            {activeFile && (
              <>
                <button
                  type="button"
                  onClick={() => setShowSearch((value) => !value)}
                  aria-label="Search code"
                  title="Search code"
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${
                    showSearch
                      ? "border-accent/20 bg-accent/10 text-accent"
                      : "border-transparent text-ink/45 hover:border-line hover:bg-white hover:text-ink"
                  }`}
                >
                  <Search className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  aria-label="Expand code editor"
                  title="Expand editor"
                  className="hidden h-8 w-8 items-center justify-center rounded-lg border border-transparent text-ink/45 transition-all hover:border-line hover:bg-white hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 lg:inline-flex"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!activeFile.content}
                  aria-label={
                    copied
                      ? "Code copied to clipboard"
                      : "Copy active file"
                  }
                  title={
                    copied
                      ? "Copied to clipboard"
                      : "Copy active file"
                  }
                  className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-40 ${
                    copied
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-line bg-white text-ink/65 shadow-sm hover:bg-ink/[0.04] hover:text-ink"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">
                        Copied
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">
                        Copy
                      </span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* =================================================
            CODE SEARCH
        ================================================= */}

        {showSearch && activeFile && (
          <div className="border-t border-line px-4 py-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/30" />

              <input
                autoFocus
                type="search"
                value={codeSearch}
                onChange={(event) =>
                  setCodeSearch(event.target.value)
                }
                placeholder="Search inside code..."
                aria-label="Search inside active file"
                className="h-8 w-full rounded-lg border border-line bg-white pl-8 pr-8 text-[10px] font-mono text-ink outline-none transition-all placeholder:text-ink/30 focus:border-accent/30 focus:ring-2 focus:ring-accent/10"
              />

              {codeSearch && (
                <button
                  type="button"
                  onClick={() => setCodeSearch("")}
                  aria-label="Clear code search"
                  className="absolute right-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-md text-ink/30 hover:bg-ink/[0.05] hover:text-ink"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {codeSearch && (
              <p className="mt-1.5 text-[8px] font-medium text-ink/35">
                {filteredCode?.length ?? 0} matching{" "}
                {(filteredCode?.length ?? 0) === 1
                  ? "line"
                  : "lines"}
              </p>
            )}
          </div>
        )}

        {/* =================================================
            QA CARD
        ================================================= */}

        {website?.qa && (
          <div className="px-4 pb-3 pt-1">
            <div
              className={`rounded-xl border p-3 shadow-sm ${
                qaPassed
                  ? "border-emerald-200/70 bg-emerald-50/60"
                  : "border-amber-200/70 bg-amber-50/60"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      qaPassed
                        ? "bg-emerald-100"
                        : "bg-amber-100"
                    }`}
                  >
                    {qaPassed ? (
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-ink/35">
                      Quality Check
                    </p>

                    <p
                      className={`mt-0.5 truncate text-xs font-bold ${
                        qaPassed
                          ? "text-emerald-700"
                          : "text-amber-700"
                      }`}
                    >
                      {qaPassed
                        ? "All checks passed"
                        : "Needs review"}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span
                    className={`text-lg font-black tracking-tight ${
                      qaPassed
                        ? "text-emerald-700"
                        : "text-amber-700"
                    }`}
                  >
                    {qaScore}
                  </span>

                  <span className="ml-0.5 text-[9px] font-semibold text-ink/30">
                    /100
                  </span>
                </div>
              </div>

              <div className="mt-3">
                <div className="h-1.5 overflow-hidden rounded-full bg-black/5">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      qaPassed
                        ? "bg-emerald-500"
                        : "bg-amber-500"
                    }`}
                    style={{
                      width: `${qaScore}%`,
                    }}
                  />
                </div>

                <div className="mt-1.5 flex justify-between text-[8px] font-medium text-ink/25">
                  <span>0</span>
                  <span>50</span>
                  <span>100</span>
                </div>
              </div>

              {website.qa.issues?.length ? (
                <div className="mt-3 border-t border-black/5 pt-2.5">
                  <p className="mb-1.5 text-[8px] font-bold uppercase tracking-wider text-ink/35">
                    {website.qa.issues.length} issue
                    {website.qa.issues.length === 1 ? "" : "s"}{" "}
                    found
                  </p>

                  <div className="space-y-1">
                    {website.qa.issues
                      .slice(0, 3)
                      .map((issue, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-1.5 text-[9px] text-ink/55"
                        >
                          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />

                          <span className="truncate">
                            {issue.message}
                          </span>
                        </div>
                      ))}
                  </div>

                  {website.qa.issues.length > 3 && (
                    <p className="mt-1.5 text-[8px] text-ink/35">
                      +{website.qa.issues.length - 3} more issues
                    </p>
                  )}
                </div>
              ) : (
                qaPassed && (
                  <div className="mt-2.5 flex items-center gap-1.5 border-t border-emerald-900/5 pt-2.5 text-[8px] font-medium text-emerald-700/60">
                    <Check className="h-3 w-3" />
                    No issues detected
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>

      {/* =====================================================
          WORKSPACE
      ===================================================== */}

      <div className="grid min-h-0 flex-1 grid-cols-[180px_minmax(0,1fr)]">
        {/* File Explorer */}

        <FileExplorer
          files={files}
          selectedFile={activeFile?.path || ""}
          onSelectFile={onSelectFile}
        />

        {/* =================================================
            CODE EDITOR
        ================================================== */}

        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-[#101214]">
          {/* Editor header */}

          <div className="flex h-10 shrink-0 items-center justify-between border-b border-white/10 bg-[#17191c] px-3">
            <div className="flex min-w-0 items-center gap-2">
              {activeFile ? (
                <>
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-teal/10">
                    <FileCode2 className="h-3 w-3 text-teal" />
                  </div>

                  <span
                    className="truncate font-mono text-[10px] text-white/65"
                    title={activeFile.path}
                  >
                    {getFileName(activeFile.path)}
                  </span>
                </>
              ) : (
                <>
                  <Code2 className="h-3.5 w-3.5 text-white/25" />

                  <span className="font-mono text-[10px] text-white/30">
                    No file selected
                  </span>
                </>
              )}
            </div>

            {activeFile && (
              <div className="ml-2 flex shrink-0 items-center gap-2">
                <span className="hidden text-[8px] font-medium uppercase tracking-wider text-white/20 sm:inline">
                  Source
                </span>

                <span className="rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-[8px] font-semibold uppercase tracking-wide text-white/50">
                  {language}
                </span>
              </div>
            )}
          </div>

          {/* =================================================
              CODE CONTENT
          ================================================== */}

          {activeFile ? (
            <div className="panel-scroll flex min-h-0 flex-1 overflow-auto">
              {codeSearch.trim() ? (
                <SearchResults
                  results={filteredCode ?? []}
                  query={codeSearch}
                />
              ) : (
                <>
                  {/* Line numbers */}

                  <div className="sticky left-0 z-10 min-h-full shrink-0 select-none border-r border-white/5 bg-[#101214] px-3 py-4 text-right font-mono text-[10px] leading-5 text-white/20">
                    {codeLines.map((_, index) => (
                      <div
                        key={index}
                        className="h-5 tabular-nums"
                      >
                        {index + 1}
                      </div>
                    ))}
                  </div>

                  {/* Code */}

                  <pre className="min-w-max flex-1 select-text p-4 font-mono text-[11px] leading-5 text-[#f7f3eb]">
                    <code>{codeContent}</code>
                  </pre>
                </>
              )}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                <Files className="h-6 w-6 text-white/20" />
              </div>

              <p className="mt-4 text-sm font-semibold text-white/60">
                No code to display
              </p>

              <p className="mt-1 max-w-xs text-[11px] leading-5 text-white/30">
                Generate a website to explore its source
                files and inspect the generated code.
              </p>
            </div>
          )}

          {/* =================================================
              EDITOR FOOTER
          ================================================== */}

          {activeFile && (
            <div className="flex h-7 shrink-0 items-center justify-between border-t border-white/10 bg-[#17191c] px-3">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 font-mono text-[9px] text-white/30">
                  <Hash className="h-2.5 w-2.5" />

                  {codeLines.length}{" "}
                  {codeLines.length === 1 ? "line" : "lines"}
                </span>

                <span className="hidden font-mono text-[9px] text-white/20 sm:inline">
                  {language}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[9px] text-white/25">
                <LockKeyhole className="h-2.5 w-2.5" />
                <span>Read only</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          EXPANDED CODE VIEW
      ===================================================== */}

      {expanded && activeFile && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-[#0b0d0f]/95 p-2 backdrop-blur-md sm:p-4">
          <div className="flex h-12 shrink-0 items-center justify-between rounded-t-xl border border-white/10 bg-[#17191c] px-3 sm:px-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal/10">
                <FileCode2 className="h-3.5 w-3.5 text-teal" />
              </div>

              <div className="min-w-0">
                <p
                  className="truncate font-mono text-xs font-semibold text-white/80"
                  title={activeFile.path}
                >
                  {activeFile.path}
                </p>

                <p className="text-[8px] uppercase tracking-wider text-white/25">
                  {language} · {codeLines.length} lines · Read only
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-white/50 transition-all hover:bg-white/10 hover:text-white"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}

                <span className="hidden sm:inline">
                  {copied ? "Copied" : "Copy"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setExpanded(false)}
                aria-label="Close expanded editor"
                title="Close editor"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/45 transition-all hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 overflow-auto border-x border-white/10 bg-[#101214]">
            <div className="sticky left-0 z-10 min-h-full shrink-0 select-none border-r border-white/5 bg-[#101214] px-4 py-5 text-right font-mono text-[10px] leading-5 text-white/20">
              {codeLines.map((_, index) => (
                <div
                  key={index}
                  className="h-5 tabular-nums"
                >
                  {index + 1}
                </div>
              ))}
            </div>

            <pre className="min-w-max flex-1 p-5 font-mono text-xs leading-5 text-[#f7f3eb]">
              <code>{codeContent}</code>
            </pre>
          </div>

          <div className="flex h-8 shrink-0 items-center justify-between rounded-b-xl border-x border-b border-white/10 bg-[#17191c] px-3 text-[9px] text-white/25 sm:px-4">
            <span>
              {activeFile.path}
            </span>

            <span className="flex items-center gap-1.5">
              <LockKeyhole className="h-2.5 w-2.5" />
              Read only
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}

/* =============================================================
   SEARCH RESULTS
============================================================= */

function SearchResults({
  results,
  query,
}: {
  results: Array<{
    line: string;
    number: number;
  }>;
  query: string;
}) {
  if (!results.length) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center px-6 text-center">
        <Search className="h-7 w-7 text-white/15" />

        <p className="mt-3 text-xs font-semibold text-white/45">
          No matches found
        </p>

        <p className="mt-1 max-w-xs text-[10px] leading-5 text-white/25">
          Nothing in this file matches{" "}
          <span className="font-mono text-white/40">
            "{query}"
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-full p-4">
      <div className="mb-3 flex items-center gap-2 text-[9px] font-semibold text-white/25">
        <Search className="h-3 w-3" />
        {results.length}{" "}
        {results.length === 1 ? "match" : "matches"}
      </div>

      <div className="overflow-hidden rounded-lg border border-white/5 bg-white/[0.02]">
        {results.map(({ line, number }) => (
          <div
            key={number}
            className="flex min-w-max border-b border-white/[0.035] last:border-b-0 hover:bg-white/[0.025]"
          >
            <span className="w-12 shrink-0 select-none border-r border-white/5 px-3 py-1.5 text-right font-mono text-[9px] text-white/20">
              {number}
            </span>

            <pre className="px-3 py-1.5 font-mono text-[10px] leading-5 text-white/70">
              {line || " "}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}