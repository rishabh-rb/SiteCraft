"use client";

import { useMemo, useState } from "react";
import {
  Search,
  X,
  Folder,
  FileCode2,
  FileText,
  FileJson,
  FileImage,
  FileType,
  File,
  ChevronRight,
  FolderOpen,
  Check,
} from "lucide-react";

import type { GeneratedFile } from "@/lib/api";

interface FileExplorerProps {
  files: GeneratedFile[];
  selectedFile: string;
  onSelectFile: (path: string) => void;
}

/* =========================================================
   HELPERS
========================================================= */

function getFileIcon(path: string) {
  const extension = path.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "tsx":
    case "ts":
    case "jsx":
    case "js":
    case "mjs":
    case "cjs":
      return FileCode2;

    case "json":
      return FileJson;

    case "css":
    case "scss":
    case "sass":
    case "less":
      return FileType;

    case "html":
    case "htm":
      return FileCode2;

    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "svg":
    case "webp":
    case "ico":
      return FileImage;

    case "md":
    case "mdx":
    case "txt":
      return FileText;

    default:
      return File;
  }
}

function getFileExtension(path: string) {
  const fileName = path.split("/").pop() || path;
  const lastDot = fileName.lastIndexOf(".");

  return lastDot > 0
    ? fileName.slice(lastDot + 1).toUpperCase()
    : "";
}

function getFileName(path: string) {
  return path.split("/").pop() || path;
}

function getFolderPath(path: string) {
  const parts = path.split("/");

  return parts.length > 1
    ? parts.slice(0, -1).join("/")
    : "";
}

/* =========================================================
   COMPONENT
========================================================= */

export function FileExplorer({
  files,
  selectedFile,
  onSelectFile,
}: FileExplorerProps) {
  const [searchQuery, setSearchQuery] = useState("");

  /* =======================================================
     FILTER FILES
  ======================================================= */

  const filteredFiles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return files;
    }

    return files.filter((file) => {
      const path = file.path.toLowerCase();
      const name = getFileName(file.path).toLowerCase();

      return path.includes(query) || name.includes(query);
    });
  }, [files, searchQuery]);

  /* =======================================================
     FOLDER COUNT
  ======================================================= */

  const folderCount = useMemo(() => {
    const folders = new Set<string>();

    for (const file of files) {
      const parts = file.path.split("/");

      for (let index = 1; index < parts.length; index++) {
        folders.add(parts.slice(0, index).join("/"));
      }
    }

    return folders.size;
  }, [files]);

  /* =======================================================
     SELECTED FILE
  ======================================================= */

  const selectedExists = useMemo(
    () => files.some((file) => file.path === selectedFile),
    [files, selectedFile]
  );

  const hasSearch = searchQuery.trim().length > 0;

  /* =======================================================
     EMPTY PROJECT
  ======================================================= */

  if (!files.length) {
    return (
      <aside className="flex h-full min-h-32 w-full flex-col border-r border-line bg-paper">
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-ink/[0.025] shadow-sm">
            <FolderOpen className="h-6 w-6 text-ink/25" />

            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-paper bg-accent">
              <SparklesIcon />
            </span>
          </div>

          <p className="text-xs font-black text-ink/70">
            No project files
          </p>

          <p className="mt-1.5 max-w-[210px] text-[10px] leading-4 text-ink/40">
            Generate a website to explore its source files,
            folders, and assets here.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-r border-line bg-paper">
      {/* ==================================================
          HEADER
      ================================================== */}

      <header className="shrink-0 border-b border-line">
        <div className="px-3.5 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-teal/10 bg-teal/10">
                <FolderOpen className="h-4 w-4 text-teal" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-[11px] font-black uppercase tracking-[0.11em] text-ink">
                    Project Explorer
                  </h2>

                  <span className="hidden rounded-full bg-teal/10 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-teal sm:inline-flex">
                    Source
                  </span>
                </div>

                <div className="mt-1 flex items-center gap-1.5 text-[9px] font-medium text-ink/35">
                  <span>
                    {files.length}{" "}
                    {files.length === 1 ? "file" : "files"}
                  </span>

                  <span className="text-ink/15">•</span>

                  <span>
                    {folderCount}{" "}
                    {folderCount === 1 ? "folder" : "folders"}
                  </span>
                </div>
              </div>
            </div>

            <div
              className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-ink/[0.025] px-1.5 text-[9px] font-black tabular-nums text-ink/45"
              title={`${files.length} project files`}
            >
              {files.length}
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-3.5">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/25" />

            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search files or folders..."
              aria-label="Search project files"
              className="h-9 w-full rounded-xl border border-line bg-ink/[0.018] pl-8 pr-9 text-[10px] font-medium text-ink outline-none transition-all duration-200 placeholder:text-ink/25 hover:border-ink/10 focus:border-teal/40 focus:bg-paper focus:ring-4 focus:ring-teal/5"
            />

            {hasSearch && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear file search"
                className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg text-ink/30 transition-all hover:bg-ink/[0.06] hover:text-ink focus:outline-none focus:ring-2 focus:ring-teal/20"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Search result status */}
          {hasSearch && (
            <div className="mt-2 flex items-center justify-between px-0.5">
              <span className="text-[8px] font-medium text-ink/30">
                Showing matching files
              </span>

              <span className="text-[8px] font-bold tabular-nums text-teal/70">
                {filteredFiles.length} result
                {filteredFiles.length === 1 ? "" : "s"}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* ==================================================
          FILE LIST
      ================================================== */}

      <div className="panel-scroll min-h-0 flex-1 overflow-auto px-2 py-2.5">
        {filteredFiles.length > 0 ? (
          <div className="space-y-0.5">
            {filteredFiles.map((file) => {
              const isSelected = selectedFile === file.path;
              const FileIcon = getFileIcon(file.path);
              const extension = getFileExtension(file.path);
              const fileName = getFileName(file.path);
              const folderPath = getFolderPath(file.path);

              return (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => onSelectFile(file.path)}
                  title={file.path}
                  aria-current={isSelected ? "page" : undefined}
                  className={`group relative flex w-full items-center gap-2.5 overflow-hidden rounded-xl px-2.5 py-2 outline-none transition-all duration-150 ${
                    isSelected
                      ? "bg-ink text-white shadow-sm"
                      : "text-ink/70 hover:bg-ink/[0.035] hover:text-ink focus-visible:bg-ink/[0.05] focus-visible:ring-2 focus-visible:ring-teal/10"
                  }`}
                >
                  {/* Active indicator */}
                  <span
                    className={`absolute left-0 top-1/2 h-6 -translate-y-1/2 rounded-r-full bg-teal transition-all duration-200 ${
                      isSelected ? "w-0.5" : "w-0"
                    }`}
                  />

                  {/* File icon */}
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-150 ${
                      isSelected
                        ? "bg-white/10"
                        : "border border-line/60 bg-ink/[0.025] group-hover:border-teal/10 group-hover:bg-teal/10"
                    }`}
                  >
                    <FileIcon
                      className={`h-3.5 w-3.5 transition-all duration-150 ${
                        isSelected
                          ? "text-teal"
                          : "text-ink/35 group-hover:scale-105 group-hover:text-teal"
                      }`}
                    />
                  </span>

                  {/* File information */}
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate font-mono text-[10px] leading-4 ${
                        isSelected
                          ? "font-semibold text-white"
                          : "font-semibold text-ink/70 group-hover:text-ink"
                      }`}
                    >
                      {fileName}
                    </span>

                    {folderPath && (
                      <span
                        className={`mt-0.5 block truncate font-mono text-[8px] leading-3 ${
                          isSelected
                            ? "text-white/35"
                            : "text-ink/25 group-hover:text-ink/35"
                        }`}
                      >
                        {folderPath}
                      </span>
                    )}
                  </span>

                  {/* Extension */}
                  {extension && (
                    <span
                      className={`hidden shrink-0 rounded-md border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wide transition-colors sm:block ${
                        isSelected
                          ? "border-white/5 bg-white/5 text-white/35"
                          : "border-line/50 bg-ink/[0.02] text-ink/25 group-hover:border-teal/10 group-hover:text-teal/50"
                      }`}
                    >
                      {extension}
                    </span>
                  )}

                  {/* Arrow */}
                  <ChevronRight
                    className={`h-3 w-3 shrink-0 transition-all duration-150 ${
                      isSelected
                        ? "translate-x-0 text-white/35"
                        : "translate-x-[-3px] text-transparent group-hover:translate-x-0 group-hover:text-ink/20"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        ) : (
          /* ==================================================
             SEARCH EMPTY STATE
          ================================================== */

          <div className="flex h-48 flex-col items-center justify-center px-4 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-ink/[0.025]">
              <Search className="h-4 w-4 text-ink/25" />
            </div>

            <p className="text-[10px] font-black text-ink/65">
              No matching files
            </p>

            <p className="mt-1 max-w-[180px] text-[9px] leading-4 text-ink/35">
              No files match{" "}
              <span className="font-semibold text-ink/45">
                "{searchQuery}"
              </span>
            </p>

            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mt-3 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-[9px] font-bold text-teal transition-all hover:border-teal/20 hover:bg-teal/5 focus:outline-none focus:ring-2 focus:ring-teal/10"
            >
              Clear search
            </button>
          </div>
        )}
      </div>

      {/* ==================================================
          FOOTER
      ================================================== */}

      <footer className="shrink-0 border-t border-line bg-paper px-3 py-2.5">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              className={`relative flex h-1.5 w-1.5 shrink-0 rounded-full ${
                selectedExists ? "bg-teal" : "bg-ink/15"
              }`}
            >
              {selectedExists && (
                <span className="absolute inset-0 animate-ping rounded-full bg-teal/40" />
              )}
            </span>

            <span
              className={`truncate text-[8px] font-medium ${
                selectedExists ? "text-ink/40" : "text-ink/25"
              }`}
              title={selectedFile}
            >
              {selectedExists
                ? selectedFile
                : "No file selected"}
            </span>
          </div>

          {hasSearch ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="shrink-0 rounded-md px-1.5 py-0.5 text-[8px] font-bold text-teal/70 transition-colors hover:bg-teal/5 hover:text-teal"
            >
              {filteredFiles.length}/{files.length}
            </button>
          ) : (
            <div className="flex shrink-0 items-center gap-1">
              <Check className="h-3 w-3 text-teal/60" />

              <span className="text-[8px] font-bold text-teal/60">
                Ready
              </span>
            </div>
          )}
        </div>
      </footer>
    </aside>
  );
}

/* =========================================================
   DECORATIVE SPARKLES ICON
========================================================= */

function SparklesIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-2.5 w-2.5 text-white"
      aria-hidden="true"
    >
      <path d="m12 3-1.2 3.8L7 8l3.8 1.2L12 13l1.2-3.8L17 8l-3.8-1.2L12 3Z" />
      <path d="m19 13-.7 2.3L16 16l2.3.7L19 19l.7-2.3L22 16l-2.3-.7L19 13Z" />
    </svg>
  );
}