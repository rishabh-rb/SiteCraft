
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
        <span key={key++}>{line.slice(cursor)}</span>,
      );
      break;
    }

    if (matchIndex > cursor) {
      parts.push(
        <span key={key++}>
          {line.slice(cursor, matchIndex)}
        </span>,
      );
    }

    parts.push(
      <mark
        key={key++}
        className="rounded-sm bg-amber-300/25 text-amber-200"
      >
        {line.slice(
          matchIndex,
          matchIndex + trimmedQuery.length,
        )}
      </mark>,
    );

    cursor = matchIndex + trimmedQuery.length;
  }

  return parts.length ? parts : line;
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");

  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.setAttribute("aria-hidden", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";

  document.body.appendChild(textarea);
  textarea.select();

  try {
    const successful = document.execCommand("copy");

    if (!successful) {
      throw new Error("Clipboard copy failed");
    }
  } finally {
    textarea.remove();
  }
}

export function CodePanel({
  website,
  selectedFile,
  onSelectFile,
}: CodePanelProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [codeSearch, setCodeSearch] = useState("");
  const [selectedMatchIndex, setSelectedMatchIndex] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showAllIssues, setShowAllIssues] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const expandedDialogRef = useRef<HTMLDivElement>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const files = website?.files ?? [];

  const activeFile = useMemo(
    () =>
      files.find((file) => file.path === selectedFile) ??
      files[0],
    [files, selectedFile],
  );

  const codeContent = activeFile?.content ?? "";

  const codeLines = useMemo(
    () => codeContent.split("\n"),
    [codeContent],
  );

  const language = getLanguageLabel(activeFile);
  const extension = activeFile
    ? getFileExtension(activeFile.path)
    : "FILE";

  const qaScore = Math.min(
    100,
    Math.max(0, website?.qa?.score ?? 0),
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
      [],
    );
  }, [codeLines, codeSearch]);

  const activeSearchMatch =
    filteredCode[selectedMatchIndex] ?? null;

  const displayedIssues = showAllIssues
    ? issues
    : issues.slice(0, 3);

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

  useEffect(() => {
    if (!files.length) return;

    const selectionExists = files.some(
      (file) => file.path === selectedFile,
    );

    if (!selectionExists) {
      onSelectFile(files[0].path);
    }
  }, [files, selectedFile, onSelectFile]);

  useEffect(() => {
    setCodeSearch("");
    setSelectedMatchIndex(0);
    setShowAllIssues(false);
    resetCopyFeedback();

    if (editorRef.current) {
      editorRef.current.scrollTop = 0;
      editorRef.current.scrollLeft = 0;
    }
  }, [activeFile?.path, resetCopyFeedback]);

  useEffect(() => {
    if (!codeSearch.trim()) {
      setSelectedMatchIndex(0);
      return;
    }

    if (selectedMatchIndex >= filteredCode.length) {
      setSelectedMatchIndex(Math.max(filteredCode.length - 1, 0));
    }
  }, [codeSearch, filteredCode, selectedMatchIndex]);

  const handleCopy = useCallback(async () => {
    if (!activeFile) return;

    clearCopyTimer();
    setCopied(false);
    setCopyError(false);

    try {
      await copyText(codeContent);
      setCopied(true);

      copyTimerRef.current = setTimeout(() => {
        setCopied(false);
        copyTimerRef.current = null;
      }, 1800);
    } catch {
      setCopyError(true);

      copyTimerRef.current = setTimeout(() => {
        setCopyError(false);
        copyTimerRef.current = null;
      }, 2500);
    }
  }, [activeFile, codeContent, clearCopyTimer]);

  const openSearch = useCallback(() => {
    if (!activeFile) return;
    setShowSearch(true);
  }, [activeFile]);

  const closeSearch = useCallback(() => {
    setShowSearch(false);
    setCodeSearch("");
    setSelectedMatchIndex(0);
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

  useEffect(() => {
    if (!showSearch) return;

    const frame = requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [showSearch]);

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

  useEffect(() => {
    if (!expanded) return;

    const previousOverflow = document.body.style.overflow;
    const previousActiveElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    document.body.style.overflow = "hidden";

    const frame = requestAnimationFrame(() => {
      expandedDialogRef.current?.focus();
    });

    return () => {
      document.body.style.overflow = previousOverflow;
      cancelAnimationFrame(frame);
      previousActiveElement?.focus();
    };
  }, [expanded]);

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-line bg-paper">
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

              <p className="mt-0.5 truncate text-[10px] text-ink/45">
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
                disabled={!activeFile}
                aria-label={
                  copied
                    ? "Code copied"
                    : copyError
                      ? "Copy failed"
                      : "Copy active file"
                }
                title="Copy active file · Ctrl/Cmd + Shift + C"
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

        {showSearch && activeFile && (
          <div className="border-t border-line bg-white/40 px-3 py-2.5 sm:px-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/35" />

              <input
                ref={searchInputRef}
                type="search"
                value={codeSearch}
                onChange={(event) => setCodeSearch(event.target.value)}
                placeholder="Search inside code..."
                aria-label="Search inside active file"
                aria-describedby="code-search-help"
                className="h-9 w-full rounded-lg border border-line bg-white pl-8 pr-9 font-mono text-xs text-ink outline-none transition placeholder:text-ink/35 focus:border-accent/40 focus:ring-2 focus:ring-accent/10"
              />

              {codeSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setCodeSearch("");
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Clear code search"
                  className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-ink/40 transition-colors hover:bg-ink/[0.05] hover:text-ink"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="mt-1.5 flex items-center justify-between gap-2">
              <p
                id="code-search-help"
                className="text-[9px] font-medium text-ink/45"
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

              <kbd className="rounded border border-line bg-white px-1.5 py-0.5 font-mono text-[8px] text-ink/45">
                ESC
              </kbd>
            </div>
          </div>
        )}

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
                    <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-ink/45">
                      Quality Check
                    </p>

                    <p
                      className={`mt-0.5 truncate text-xs font-bold ${
                        qaPassed ? "text-emerald-700" : "text-amber-700"
                      }`}
                    >
                      {qaPassed ? "All checks passed" : "Needs review"}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span
                    className={`text-lg font-black tracking-tight ${
                      qaPassed ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    {qaScore}
                  </span>
                  <span className="ml-0.5 text-[9px] font-semibold text-ink/40">
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
                      qaPassed ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                    style={{ width: `${qaScore}%` }}
                  />
                </div>

                <div className="mt-1.5 flex justify-between text-[8px] font-medium text-ink/40">
                  <span>0</span>
                  <span>50</span>
                  <span>100</span>
                </div>
              </div>

              {issues.length > 0 ? (
                <div className="mt-3 border-t border-black/5 pt-2.5">
                  <p className="mb-1.5 text-[8px] font-bold uppercase tracking-wider text-ink/45">
                    {issues.length} issue{issues.length === 1 ? "" : "s"} found
                  </p>

                  <div className="space-y-1.5">
                    {displayedIssues.map((issue, index) => (
                      <div
                        key={`${issue.message}-${index}`}
                        className="flex items-start gap-1.5 text-[10px] text-ink/70"
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
                      className="mt-2 text-[9px] font-semibold text-ink/60 transition hover:text-ink focus:outline-none focus-visible:underline"
                    >
                      {showAllIssues
                        ? "Show fewer issues"
                        : `Show ${issues.length - 3} more issues`}
                    </button>
                  )}
                </div>
              ) : qaPassed ? (
                <div className="mt-2.5 flex items-center gap-1.5 border-t border-emerald-900/5 pt-2.5 text-[9px] font-medium text-emerald-700/80">
                  <Check className="h-3 w-3" />
                  No issues detected
                </div>
              ) : (
                <p className="mt-2.5 border-t border-black/5 pt-2.5 text-[9px] text-amber-700/80">
                  Review the generated code before using it.
                </p>
              )}
            </section>
          </div>
        )}
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,132px)_minmax(0,1fr)] sm:grid-cols-[180px_minmax(0,1fr)]">
        <div className="min-h-0 min-w-0 overflow-hidden border-r border-line">
          <FileExplorer
            files={files}
            selectedFile={activeFile?.path ?? ""}
            onSelectFile={onSelectFile}
          />
        </div>

        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-[#101214]">
          <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-[#17191c] px-2.5 sm:px-3">
            <div className="flex min-w-0 items-center gap-2">
              {activeFile ? (
                <>
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-teal/10">
                    <FileCode2 className="h-3 w-3 text-teal" />
                  </div>

                  <span
                    className="truncate font-mono text-[10px] font-medium text-white/75"
                    title={activeFile.path}
                  >
                    {getFileName(activeFile.path)}
                  </span>
                </>
              ) : (
                <>
                  <Code2 className="h-3.5 w-3.5 text-white/30" />
                  <span className="font-mono text-[10px] text-white/40">
                    No file selected
                  </span>
                </>
              )}
            </div>

            {activeFile && (
              <span className="shrink-0 rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-[8px] font-semibold uppercase tracking-wide text-white/55">
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
                  selectedIndex={selectedMatchIndex}
                  onSelectIndex={setSelectedMatchIndex}
                  activeMatch={activeSearchMatch}
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
                <span className="flex shrink-0 items-center gap-1 font-mono text-[9px] text-white/40">
                  <Hash className="h-2.5 w-2.5" />
                  {codeLines.length} {codeLines.length === 1 ? "line" : "lines"}
                </span>

                <span className="hidden truncate font-mono text-[9px] text-white/30 sm:inline">
                  {language}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-1.5 text-[9px] text-white/35">
                <LockKeyhole className="h-2.5 w-2.5" />
                <span>Read only</span>
              </div>
            </footer>
          )}
        </div>
      </div>

      {expanded && activeFile && (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-[#0b0d0f]/95 p-2 backdrop-blur-md sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeExpanded();
            }
          }}
        >
          <div
            ref={expandedDialogRef}
            className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl outline-none"
            role="dialog"
            aria-modal="true"
            aria-label={`Expanded code editor: ${activeFile.path}`}
            tabIndex={-1}
          >
            <div className="flex h-12 shrink-0 items-center justify-between gap-2 border border-white/10 bg-[#17191c] px-3 sm:px-4">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal/10">
                  <FileCode2 className="h-3.5 w-3.5 text-teal" />
                </div>

                <div className="min-w-0">
                  <p
                    className="truncate font-mono text-xs font-semibold text-white/85"
                    title={activeFile.path}
                  >
                    {activeFile.path}
                  </p>

                  <p className="text-[8px] uppercase tracking-wider text-white/40">
                    {language} · {codeLines.length} lines · Read only
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  aria-label="Copy active file"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-white/60 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
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
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/55 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
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

            <div className="flex h-8 shrink-0 items-center justify-between gap-3 border-x border-b border-white/10 bg-[#17191c] px-3 text-[9px] text-white/40 sm:px-4">
              <span className="truncate">{activeFile.path}</span>

              <span className="flex shrink-0 items-center gap-1.5">
                <LockKeyhole className="h-2.5 w-2.5" />
                Read only
              </span>
            </div>
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
          : "border-transparent text-ink/50 hover:border-line hover:bg-white hover:text-ink"
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
      className={`sticky left-0 z-10 min-h-full shrink-0 select-none border-r border-white/5 bg-[#101214] text-right font-mono leading-5 text-white/30 ${
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
        <Code2 className="h-6 w-6 text-white/30" />
        <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-teal/70" />
      </div>

      <p className="mt-4 text-sm font-semibold text-white/70">
        No code to display
      </p>

      <p className="mt-1 max-w-xs text-[11px] leading-5 text-white/40">
        Generate a website to explore its source files and inspect
        the generated code.
      </p>
    </div>
  );
}

function SearchResults({
  results,
  query,
  selectedIndex,
  onSelectIndex,
  activeMatch,
}: {
  results: SearchResult[];
  query: string;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  activeMatch: SearchResult | null;
}) {
  if (!results.length) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/5 bg-white/[0.03]">
          <FileSearch className="h-5 w-5 text-white/25" />
        </div>

        <p className="mt-3 text-xs font-semibold text-white/60">
          No matches found
        </p>

        <p className="mt-1 max-w-xs break-words text-[10px] leading-5 text-white/40">
          Nothing in this file matches{" "}
          <span className="font-mono text-white/60">{query}</span>
        </p>
      </div>
    );
  }

  const canGoBack = selectedIndex > 0;
  const canGoForward = selectedIndex < results.length - 1;

  return (
    <div className="min-w-full p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div
          className="flex items-center gap-2 text-[10px] font-semibold text-white/50"
          aria-live="polite"
        >
          <Search className="h-3 w-3" />
          {results.length} {results.length === 1 ? "match" : "matches"}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelectIndex(Math.max(selectedIndex - 1, 0))}
            disabled={!canGoBack}
            className="rounded border border-white/10 bg-white/[0.02] px-2 py-0.5 text-[8px] font-medium text-white/60 transition hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous match"
          >
            Prev
          </button>

          <button
            type="button"
            onClick={() => onSelectIndex(Math.min(selectedIndex + 1, results.length - 1))}
            disabled={!canGoForward}
            className="rounded border border-white/10 bg-white/[0.02] px-2 py-0.5 text-[8px] font-medium text-white/60 transition hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next match"
          >
            Next
          </button>

          <span className="rounded-full border border-white/5 bg-white/[0.03] px-2 py-0.5 text-[8px] text-white/40">
            {selectedIndex + 1}/{results.length}
          </span>
        </div>
      </div>

      {activeMatch && (
        <div className="mb-3 rounded-lg border border-teal/30 bg-teal/10 px-3 py-2 text-[10px] font-medium text-teal-100/90">
          <span className="font-semibold">Current match:</span> line {activeMatch.number}
        </div>
      )}

      <div className="w-max min-w-full overflow-hidden rounded-lg border border-white/5 bg-white/[0.02]">
        {results.map(({ line, number }, index) => {
          const isSelected = index === selectedIndex;

          return (
            <button
              key={number}
              type="button"
              onClick={() => onSelectIndex(index)}
              className={`flex min-w-max w-full border-b border-white/[0.035] text-left last:border-b-0 transition-colors ${
                isSelected
                  ? "bg-teal/10 hover:bg-teal/15"
                  : "hover:bg-white/[0.035]"
              }`}
              aria-label={`Jump to line ${number}`}
            >
              <span className="w-12 shrink-0 select-none border-r border-white/5 px-3 py-1.5 text-right font-mono text-[9px] text-white/40">
                {number}
              </span>

              <pre className="whitespace-pre px-3 py-1.5 font-mono text-[10px] leading-5 text-white/80">
                {highlightMatch(line || " ", query)}
              </pre>
            </button>
          );
        })}
      </div>
    </div>
  );
}
