
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  AlertCircle,
  Check,
  Code2,
  Copy,
  FileCode2,
  FileSearch,
  Hash,
  LockKeyhole,
  Maximize2,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";

import { FileExplorer } from "./FileExplorer";
import type { GeneratedFile, GeneratedWebsite } from "@/lib/api";

interface CodePanelProps {
  website?: GeneratedWebsite;
  selectedFile: string;
  onSelectFile: (path: string) => void;
}

interface SearchResult {
  line: string;
  number: number;
}

const COPY_SUCCESS_DURATION = 1800;
const COPY_ERROR_DURATION = 2500;

const LANGUAGE_MAP: Record<string, string> = {
  tsx: "TypeScript React",
  ts: "TypeScript",
  jsx: "JavaScript React",
  js: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  json: "JSON",
  css: "CSS",
  scss: "SCSS",
  sass: "Sass",
  less: "Less",
  html: "HTML",
  htm: "HTML",
  md: "Markdown",
  mdx: "MDX",
  yaml: "YAML",
  yml: "YAML",
  xml: "XML",
  svg: "SVG",
  sql: "SQL",
  py: "Python",
  java: "Java",
  php: "PHP",
  sh: "Shell",
  bash: "Shell",
  txt: "Plain Text",
  env: "Environment",
  prisma: "Prisma",
  graphql: "GraphQL",
  gql: "GraphQL",
  vue: "Vue",
  svelte: "Svelte",
  go: "Go",
  rs: "Rust",
  c: "C",
  cpp: "C++",
  h: "C Header",
  hpp: "C++ Header",
  rb: "Ruby",
  kt: "Kotlin",
  swift: "Swift",
};

function getFileName(path: string): string {
  return path.split("/").pop() || path;
}

function getFileExtension(path: string): string {
  const name = getFileName(path);

  if (name.toLowerCase() === ".env") return "ENV";

  const dotIndex = name.lastIndexOf(".");

  return dotIndex > 0
    ? name.slice(dotIndex + 1).toUpperCase()
    : "FILE";
}

function getLanguageLabel(file?: GeneratedFile): string {
  if (!file) return "Plain Text";
  if (file.language) return file.language;

  const name = getFileName(file.path).toLowerCase();
  const extension =
    name === ".env"
      ? "env"
      : name.includes(".")
        ? name.split(".").pop() ?? ""
        : "";

  return LANGUAGE_MAP[extension] ?? "Plain Text";
}

function highlightMatch(line: string, query: string): ReactNode {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) return line;

  const parts: ReactNode[] = [];
  const lowerLine = line.toLowerCase();
  const lowerQuery = trimmedQuery.toLowerCase();

  let cursor = 0;
  let key = 0;

  while (cursor < line.length) {
    const matchIndex = lowerLine.indexOf(lowerQuery, cursor);

    if (matchIndex === -1) {
      parts.push(
        <span key={key++}>{line.slice(cursor)}</span>
      );
      break;
    }

    if (matchIndex > cursor) {
      parts.push(
        <span key={key++}>
          {line.slice(cursor, matchIndex)}
        </span>
      );
    }

    parts.push(
      <mark
        key={key++}
        className="rounded-sm bg-amber-300/30 text-amber-100"
      >
        {line.slice(
          matchIndex,
          matchIndex + trimmedQuery.length
        )}
      </mark>
    );

    cursor = matchIndex + trimmedQuery.length;
  }

  return parts.length ? parts : line;
}

export function CodePanel({
  website,
  selectedFile,
  onSelectFile,
}: CodePanelProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [codeSearch, setCodeSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showAllIssues, setShowAllIssues] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const expandedDialogRef = useRef<HTMLDivElement>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const files = website?.files ?? [];

  const activeFile = useMemo(
    () =>
      files.find((file) => file.path === selectedFile) ??
      files[0],
    [files, selectedFile]
  );

  const codeContent = activeFile?.content ?? "";

  const codeLines = useMemo(
    () => codeContent.split("\n"),
    [codeContent]
  );

  const language = getLanguageLabel(activeFile);
  const extension = activeFile
    ? getFileExtension(activeFile.path)
    : "FILE";

  const qaScore = Math.min(
    100,
    Math.max(0, website?.qa?.score ?? 0)
  );

  const qaPassed = website?.qa?.passed ?? false;
  const issues = website?.qa?.issues ?? [];

  const filteredCode = useMemo<SearchResult[]>(() => {
    const query = codeSearch.trim().toLowerCase();

    if (!query) return [];

    return codeLines.reduce<SearchResult[]>(
      (matches, line, index) => {
        if (line.toLowerCase().includes(query)) {
          matches.push({
            line,
            number: index + 1,
          });
        }

        return matches;
      },
      []
    );
  }, [codeLines, codeSearch]);

  const displayedIssues = showAllIssues
    ? issues
    : issues.slice(0, 3);

  // Keep the selected file valid after generation or regeneration.
  useEffect(() => {
    if (!files.length) return;

    const selectionExists = files.some(
      (file) => file.path === selectedFile
    );

    if (!selectionExists) {
      onSelectFile(files[0].path);
    }
  }, [files, selectedFile, onSelectFile]);

  const clearCopyTimer = useCallback(() => {
    if (copyTimerRef.current !== null) {
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    }
  }, []);

  const resetCopyFeedback = useCallback(() => {
    clearCopyTimer();
    setCopied(false);
    setCopyError(false);
  }, [clearCopyTimer]);

  useEffect(() => {
    return () => clearCopyTimer();
  }, [clearCopyTimer]);

  // Reset file-specific UI when the active file changes.
  useEffect(() => {
    setCodeSearch("");
    setShowAllIssues(false);
    resetCopyFeedback();

    if (editorRef.current) {
      editorRef.current.scrollTop = 0;
      editorRef.current.scrollLeft = 0;
    }
  }, [activeFile?.path, resetCopyFeedback]);

  const handleCopy = useCallback(async () => {
    if (!activeFile) return;

    clearCopyTimer();
    setCopied(false);
    setCopyError(false);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(codeContent);
      } else {
        const textarea = document.createElement("textarea");

        textarea.value = codeContent;
        textarea.setAttribute("readonly", "");
        textarea.setAttribute("aria-hidden", "true");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "0";
        textarea.style.opacity = "0";

        document.body.appendChild(textarea);
        textarea.select();

        let successful = false;

        try {
          successful = document.execCommand("copy");
        } finally {
          textarea.remove();
        }

        if (!successful) {
          throw new Error("Clipboard copy failed");
        }
      }

      setCopied(true);

      copyTimerRef.current = setTimeout(() => {
        setCopied(false);
        copyTimerRef.current = null;
      }, COPY_SUCCESS_DURATION);
    } catch {
      setCopyError(true);

      copyTimerRef.current = setTimeout(() => {
        setCopyError(false);
        copyTimerRef.current = null;
      }, COPY_ERROR_DURATION);
    }
  }, [activeFile, codeContent, clearCopyTimer]);

  const openSearch = useCallback(() => {
    if (!activeFile) return;
    setShowSearch(true);
  }, [activeFile]);

  const closeSearch = useCallback(() => {
    setShowSearch(false);
    setCodeSearch("");
  }, []);

  const closeExpanded = useCallback(() => {
    setExpanded(false);
  }, []);

  const toggleSearch = useCallback(() => {
    if (showSearch) {
      closeSearch();
    } else {
      openSearch();
    }
  }, [showSearch, closeSearch, openSearch]);

  // Focus search when it becomes visible.
  useEffect(() => {
    if (!showSearch) return;

    const frame = requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [showSearch]);

  // Keyboard shortcuts and Escape handling.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;

      const isTyping =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      const modifier = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (event.key === "Escape") {
        if (expanded) {
          closeExpanded();
        } else if (showSearch) {
          closeSearch();
        }

        return;
      }

      if (
        modifier &&
        key === "f" &&
        activeFile &&
        !expanded
      ) {
        event.preventDefault();
        openSearch();
        return;
      }

      if (
        modifier &&
        event.shiftKey &&
        key === "c" &&
        activeFile &&
        !isTyping
      ) {
        event.preventDefault();
        void handleCopy();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    activeFile,
    expanded,
    showSearch,
    openSearch,
    closeSearch,
    closeExpanded,
    handleCopy,
  ]);

  // Lock background scrolling while expanded.
  useEffect(() => {
    if (!expanded) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [expanded]);

  // Focus the expanded dialog and restore focus when it closes.
  useEffect(() => {
    if (!expanded) return;

    const previousActiveElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const frame = requestAnimationFrame(() => {
      expandedDialogRef.current?.focus();
    });

    return () => {
      cancelAnimationFrame(frame);
      previousActiveElement?.focus();
    };
  }, [expanded]);

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-line bg-paper">
      {/* Header */}
      <header className="shrink-0 border-b border-line bg-paper">
        <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10">
              <Code2 className="h-5 w-5 text-accent" />

              {files.length > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-paper bg-ink px-1 text-[8px] font-black text-white">
                  {files.length}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-1.5">
                <h2 className="truncate text-sm font-black tracking-tight text-ink">
                  Generated Code
                </h2>

                {activeFile && (
                  <span className="hidden rounded-full bg-accent/10 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider text-accent sm:inline-flex">
                    Read only
                  </span>
                )}
              </div>

              <p className="mt-0.5 truncate text-[10px] text-ink/40">
                {files.length > 0
                  ? `${files.length} ${
                      files.length === 1 ? "file" : "files"
                    } in project`
                  : "No files generated yet"}
              </p>
            </div>
          </div>

          {activeFile && (
            <div className="flex shrink-0 items-center gap-1">
              <ToolbarButton
                onClick={toggleSearch}
                label={showSearch ? "Close code search" : "Search code"}
                title="Search code · Ctrl/Cmd + F"
                active={showSearch}
              >
                <Search className="h-3.5 w-3.5" />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => setExpanded(true)}
                label="Expand code editor"
                title="Expand editor"
                className="hidden lg:inline-flex"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </ToolbarButton>

              <button
                type="button"
                onClick={() => void handleCopy()}
                aria-label={
                  copied
                    ? "Code copied"
                    : copyError
                      ? "Copy failed"
                      : "Copy active file"
                }
                title={
                  copied
                    ? "Copied to clipboard"
                    : copyError
                      ? "Clipboard access failed"
                      : "Copy active file · Ctrl/Cmd + Shift + C"
                }
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${
                  copied
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : copyError
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-line bg-white text-ink/65 shadow-sm hover:bg-ink/[0.04] hover:text-ink"
                }`}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : copyError ? (
                  <AlertCircle className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}

                <span className="hidden sm:inline">
                  {copied
                    ? "Copied"
                    : copyError
                      ? "Failed"
                      : "Copy"}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Search */}
        {showSearch && activeFile && (
          <div className="border-t border-line bg-white/40 px-3 py-2.5 sm:px-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/30" />

              <input
                ref={searchInputRef}
                type="search"
                value={codeSearch}
                onChange={(event) =>
                  setCodeSearch(event.target.value)
                }
                placeholder="Search inside code..."
                aria-label="Search inside active file"
                aria-describedby="code-search-help"
                className="h-9 w-full rounded-lg border border-line bg-white pl-8 pr-9 font-mono text-xs text-ink outline-none transition placeholder:text-ink/30 focus:border-accent/30 focus:ring-2 focus:ring-accent/10"
              />

              {codeSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setCodeSearch("");
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Clear code search"
                  className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-ink/35 transition-colors hover:bg-ink/[0.05] hover:text-ink"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="mt-1.5 flex items-center justify-between gap-2">
              <p
                id="code-search-help"
                className="text-[9px] font-medium text-ink/40"
                aria-live="polite"
              >
                {codeSearch.trim()
                  ? `${filteredCode.length} ${
                      filteredCode.length === 1
                        ? "matching line"
                        : "matching lines"
                    }`
                  : "Search is case-insensitive"}
              </p>

              <kbd className="rounded border border-line bg-white px-1.5 py-0.5 font-mono text-[8px] text-ink/35">
                ESC
              </kbd>
            </div>
          </div>
        )}

        {/* Quality report */}
        {website?.qa && (
          <div className="px-3 pb-3 pt-1 sm:px-4">
            <section
              aria-label="Code quality report"
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
                      qaPassed ? "bg-emerald-100" : "bg-amber-100"
                    }`}
                  >
                    {qaPassed ? (
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-ink/40">
                      Quality Check
                    </p>

                    <p
                      className={`mt-0.5 truncate text-xs font-bold ${
                        qaPassed
                          ? "text-emerald-700"
                          : "text-amber-700"
                      }`}
                    >
                      {qaPassed ? "All checks passed" : "Needs review"}
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

                  <span className="ml-0.5 text-[9px] font-semibold text-ink/35">
                    /100
                  </span>
                </div>
              </div>

              <div className="mt-3">
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-black/5"
                  role="progressbar"
                  aria-label="Quality score"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={qaScore}
                >
                  <div
                    className={`h-full rounded-full transition-[width] duration-500 ${
                      qaPassed
                        ? "bg-emerald-500"
                        : "bg-amber-500"
                    }`}
                    style={{ width: `${qaScore}%` }}
                  />
                </div>

                <div className="mt-1.5 flex justify-between text-[8px] font-medium text-ink/30">
                  <span>0</span>
                  <span>50</span>
                  <span>100</span>
                </div>
              </div>

              {issues.length > 0 ? (
                <div className="mt-3 border-t border-black/5 pt-2.5">
                  <p className="mb-1.5 text-[8px] font-bold uppercase tracking-wider text-ink/40">
                    {issues.length} issue
                    {issues.length === 1 ? "" : "s"} found
                  </p>

                  <div className="space-y-1.5">
                    {displayedIssues.map((issue, index) => (
                      <div
                        key={`${issue.message}-${index}`}
                        className="flex items-start gap-1.5 text-[10px] text-ink/60"
                      >
                        <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />

                        <span className="min-w-0 break-words">
                          {issue.message}
                        </span>
                      </div>
                    ))}
                  </div>

                  {issues.length > 3 && (
                    <button
                      type="button"
                      onClick={() =>
                        setShowAllIssues((previous) => !previous)
                      }
                      aria-expanded={showAllIssues}
                      className="mt-2 text-[9px] font-semibold text-ink/55 transition hover:text-ink focus:outline-none focus-visible:underline"
                    >
                      {showAllIssues
                        ? "Show fewer issues"
                        : `Show ${issues.length - 3} more issues`}
                    </button>
                  )}
                </div>
              ) : qaPassed ? (
                <div className="mt-2.5 flex items-center gap-1.5 border-t border-emerald-900/5 pt-2.5 text-[9px] font-medium text-emerald-700/70">
                  <Check className="h-3 w-3" />
                  No issues detected
                </div>
              ) : (
                <p className="mt-2.5 border-t border-black/5 pt-2.5 text-[9px] text-amber-700/70">
                  Review the generated code before using it.
                </p>
              )}
            </section>
          </div>
        )}
      </header>

      {/* Workspace */}
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,132px)_minmax(0,1fr)] sm:grid-cols-[180px_minmax(0,1fr)]">
        <div className="min-h-0 min-w-0 overflow-hidden border-r border-line">
          <FileExplorer
            files={files}
            selectedFile={activeFile?.path ?? ""}
            onSelectFile={onSelectFile}
          />
        </div>

        {/* Code editor */}
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-[#101214]">
          <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-[#17191c] px-2.5 sm:px-3">
            <div className="flex min-w-0 items-center gap-2">
              {activeFile ? (
                <>
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-teal/10">
                    <FileCode2 className="h-3 w-3 text-teal" />
                  </div>

                  <span
                    className="truncate font-mono text-[10px] font-medium text-white/70"
                    title={activeFile.path}
                  >
                    {getFileName(activeFile.path)}
                  </span>
                </>
              ) : (
                <>
                  <Code2 className="h-3.5 w-3.5 text-white/25" />
                  <span className="font-mono text-[10px] text-white/35">
                    No file selected
                  </span>
                </>
              )}
            </div>

            {activeFile && (
              <span className="shrink-0 rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-[8px] font-semibold uppercase tracking-wide text-white/50">
                {extension}
              </span>
            )}
          </div>

          {activeFile ? (
            <div
              ref={editorRef}
              className="panel-scroll flex min-h-0 flex-1 overflow-auto"
              aria-label={`Source code for ${activeFile.path}`}
            >
              {codeSearch.trim() ? (
                <SearchResults
                  results={filteredCode}
                  query={codeSearch}
                />
              ) : (
                <>
                  <LineNumbers count={codeLines.length} />

                  <pre className="min-w-max flex-1 select-text p-4 font-mono text-[11px] leading-5 text-[#f7f3eb]">
                    <code>{codeContent}</code>
                  </pre>
                </>
              )}
            </div>
          ) : (
            <EmptyCodeState />
          )}

          {activeFile && (
            <footer className="flex h-7 shrink-0 items-center justify-between gap-2 border-t border-white/10 bg-[#17191c] px-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex shrink-0 items-center gap-1 font-mono text-[9px] text-white/35">
                  <Hash className="h-2.5 w-2.5" />
                  {codeLines.length}{" "}
                  {codeLines.length === 1 ? "line" : "lines"}
                </span>

                <span className="hidden truncate font-mono text-[9px] text-white/25 sm:inline">
                  {language}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-1.5 text-[9px] text-white/30">
                <LockKeyhole className="h-2.5 w-2.5" />
                <span>Read only</span>
              </div>
            </footer>
          )}
        </div>
      </div>

      {/* Expanded editor */}
      {expanded && activeFile && (
        <div
          ref={expandedDialogRef}
          className="fixed inset-0 z-[100] flex flex-col bg-[#0b0d0f]/95 p-2 backdrop-blur-md sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Expanded code editor: ${activeFile.path}`}
          tabIndex={-1}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeExpanded();
            }
          }}
        >
          <div className="flex h-12 shrink-0 items-center justify-between gap-2 rounded-t-xl border border-white/10 bg-[#17191c] px-3 sm:px-4">
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

                <p className="text-[8px] uppercase tracking-wider text-white/30">
                  {language} · {codeLines.length} lines · Read only
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => void handleCopy()}
                aria-label={
                  copied
                    ? "Code copied"
                    : copyError
                      ? "Copy failed"
                      : "Copy active file"
                }
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-white/55 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : copyError ? (
                  <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}

                <span className="hidden sm:inline">
                  {copied ? "Copied" : copyError ? "Failed" : "Copy"}
                </span>
              </button>

              <button
                type="button"
                onClick={closeExpanded}
                aria-label="Close expanded editor"
                title="Close editor · Esc"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 overflow-auto border-x border-white/10 bg-[#101214]">
            <LineNumbers count={codeLines.length} expanded />

            <pre className="min-w-max flex-1 select-text p-5 font-mono text-xs leading-5 text-[#f7f3eb]">
              <code>{codeContent}</code>
            </pre>
          </div>

          <div className="flex h-8 shrink-0 items-center justify-between gap-3 rounded-b-xl border-x border-b border-white/10 bg-[#17191c] px-3 text-[9px] text-white/30 sm:px-4">
            <span className="truncate">{activeFile.path}</span>

            <span className="flex shrink-0 items-center gap-1.5">
              <LockKeyhole className="h-2.5 w-2.5" />
              Read only
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}

function ToolbarButton({
  children,
  onClick,
  label,
  title,
  active = false,
  className = "",
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
  title?: string;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={title}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${
        active
          ? "border-accent/20 bg-accent/10 text-accent"
          : "border-transparent text-ink/45 hover:border-line hover:bg-white hover:text-ink"
      } ${className}`}
    >
      {children}
    </button>
  );
}

function LineNumbers({
  count,
  expanded = false,
}: {
  count: number;
  expanded?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={`sticky left-0 z-10 min-h-full shrink-0 select-none border-r border-white/5 bg-[#101214] text-right font-mono leading-5 text-white/25 ${
        expanded ? "px-4 py-5 text-[10px]" : "px-3 py-4 text-[10px]"
      }`}
    >
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="h-5 tabular-nums">
          {index + 1}
        </div>
      ))}
    </div>
  );
}

function EmptyCodeState() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
        <Code2 className="h-6 w-6 text-white/25" />
        <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-teal/70" />
      </div>

      <p className="mt-4 text-sm font-semibold text-white/65">
        No code to display
      </p>

      <p className="mt-1 max-w-xs text-[11px] leading-5 text-white/35">
        Generate a website to explore its source files and inspect
        the generated code.
      </p>
    </div>
  );
}

function SearchResults({
  results,
  query,
}: {
  results: SearchResult[];
  query: string;
}) {
  if (!results.length) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/5 bg-white/[0.03]">
          <FileSearch className="h-5 w-5 text-white/20" />
        </div>

        <p className="mt-3 text-xs font-semibold text-white/50">
          No matches found
        </p>

        <p className="mt-1 max-w-xs break-words text-[10px] leading-5 text-white/30">
          Nothing in this file matches{" "}
          <span className="font-mono text-white/50">{query}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-full p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div
          className="flex items-center gap-2 text-[10px] font-semibold text-white/40"
          aria-live="polite"
        >
          <Search className="h-3 w-3" />
          {results.length} {results.length === 1 ? "match" : "matches"}
        </div>

        <span className="rounded-full border border-white/5 bg-white/[0.03] px-2 py-0.5 text-[8px] text-white/30">
          Search results
        </span>
      </div>

      <div className="w-max min-w-full overflow-hidden rounded-lg border border-white/5 bg-white/[0.02]">
        {results.map(({ line, number }) => (
          <div
            key={number}
            className="flex min-w-max border-b border-white/[0.035] last:border-b-0 hover:bg-white/[0.035]"
          >
            <span className="w-12 shrink-0 select-none border-r border-white/5 px-3 py-1.5 text-right font-mono text-[9px] text-white/30">
              {number}
            </span>

            <pre className="whitespace-pre px-3 py-1.5 font-mono text-[10px] leading-5 text-white/75">
              {highlightMatch(line || " ", query)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}