
"use client";

import { useId, useMemo, useState } from "react";

import {
  Search,
  X,
  FileCode2,
  FileText,
  FileJson,
  FileImage,
  FileType,
  File as FileIcon,
  ChevronRight,
  FolderOpen,
  Check,
  Sparkles,
  Folder,
} from "lucide-react";

import type { GeneratedFile } from "@/lib/api";

interface FileExplorerProps {
  files: GeneratedFile[];
  selectedFile: string;
  onSelectFile: (path: string) => void;
}

interface NormalizedFile {
  path: string;
  name: string;
  folderPath: string;
  extension: string;
  searchText: string;
  originalIndex: number;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/");
}

function getFileName(path: string): string {
  const normalizedPath = normalizePath(path);
  return normalizedPath.split("/").pop() || normalizedPath;
}

function getFolderPath(path: string): string {
  const normalizedPath = normalizePath(path);
  const lastSlash = normalizedPath.lastIndexOf("/");

  return lastSlash > 0
    ? normalizedPath.slice(0, lastSlash)
    : "";
}

function getFileExtension(path: string): string {
  const fileName = getFileName(path);
  const lastDot = fileName.lastIndexOf(".");

  // Hidden files such as .gitignore have no extension.
  if (lastDot <= 0 || lastDot === fileName.length - 1) {
    return "";
  }

  return fileName.slice(lastDot + 1).toUpperCase();
}

function getFileIcon(path: string) {
  const extension = getFileExtension(path).toLowerCase();

  switch (extension) {
    case "tsx":
    case "ts":
    case "jsx":
    case "js":
    case "mjs":
    case "cjs":
    case "vue":
    case "svelte":
    case "py":
    case "java":
    case "c":
    case "cpp":
    case "h":
    case "hpp":
    case "go":
    case "rs":
    case "php":
    case "rb":
    case "sh":
    case "bash":
      return FileCode2;

    case "json":
    case "jsonc":
    case "json5":
      return FileJson;

    case "css":
    case "scss":
    case "sass":
    case "less":
      return FileType;

    case "html":
    case "htm":
    case "xml":
    case "svg":
      return extension === "svg" ? FileImage : FileCode2;

    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
    case "ico":
    case "avif":
    case "bmp":
    case "tif":
    case "tiff":
      return FileImage;

    case "md":
    case "mdx":
    case "txt":
    case "log":
    case "csv":
    case "pdf":
      return FileText;

    default:
      return FileIcon;
  }
}

function getFolderCount(files: GeneratedFile[]): number {
  const folders = new Set<string>();

  for (const file of files) {
    const normalizedPath = normalizePath(file.path);
    const parts = normalizedPath.split("/").filter(Boolean);

    for (let index = 1; index < parts.length; index++) {
      folders.add(parts.slice(0, index).join("/"));
    }
  }

  return folders.size;
}

export function FileExplorer({
  files,
  selectedFile,
  onSelectFile,
}: FileExplorerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const searchId = useId();

  const trimmedQuery = searchQuery.trim();
  const hasSearch = trimmedQuery.length > 0;

  const normalizedFiles = useMemo<NormalizedFile[]>(() => {
    return files.map((file, originalIndex) => {
      const path = normalizePath(file.path);
      const name = getFileName(path);
      const folderPath = getFolderPath(path);
      const extension = getFileExtension(path);

      return {
        // Preserve the original path for the parent callback.
        path: file.path,
        name,
        folderPath,
        extension,
        searchText:
          `${path} ${name} ${folderPath}`.toLowerCase(),
        originalIndex,
      };
    });
  }, [files]);

  const filteredFiles = useMemo(() => {
    const query = trimmedQuery.toLowerCase();

    if (!query) return normalizedFiles;

    return normalizedFiles.filter((file) =>
      file.searchText.includes(query),
    );
  }, [normalizedFiles, trimmedQuery]);

  const folderCount = useMemo(
    () => getFolderCount(files),
    [files],
  );

  const selectedExists = useMemo(
    () => files.some((file) => file.path === selectedFile),
    [files, selectedFile],
  );

  const clearSearch = () => setSearchQuery("");

  if (files.length === 0) {
    return (
      <aside
        aria-label="Project file explorer"
        className="flex h-full min-h-32 w-full flex-col border-r border-line bg-paper"
      >
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
          <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-ink/[0.025] shadow-sm">
            <FolderOpen
              className="h-6 w-6 text-ink/25"
              aria-hidden="true"
            />

            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-paper bg-accent">
              <Sparkles
                className="h-2.5 w-2.5 text-white"
                aria-hidden="true"
              />
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
    <aside
      aria-label="Project file explorer"
      className="flex h-full min-h-0 w-full flex-col border-r border-line bg-paper"
    >
      {/* Header */}
      <header className="shrink-0 border-b border-line">
        <div className="px-3.5 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-teal/10 bg-teal/10">
                <FolderOpen
                  className="h-4 w-4 text-teal"
                  aria-hidden="true"
                />
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

                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[9px] font-medium text-ink/40">
                  <span>
                    {files.length}{" "}
                    {files.length === 1 ? "file" : "files"}
                  </span>

                  <span aria-hidden="true" className="text-ink/20">
                    •
                  </span>

                  <span>
                    {folderCount}{" "}
                    {folderCount === 1 ? "folder" : "folders"}
                  </span>
                </div>
              </div>
            </div>

            <span
              className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-ink/[0.025] px-1.5 text-[9px] font-black tabular-nums text-ink/50"
              title={`${files.length} project files`}
              aria-label={`${files.length} project files`}
            >
              {files.length}
            </span>
          </div>

          {/* Search */}
          <div className="relative mt-3.5">
            <label htmlFor={searchId} className="sr-only">
              Search project files and folders
            </label>

            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/30"
              aria-hidden="true"
            />

            <input
              id={searchId}
              type="search"
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(event.target.value)
              }
              placeholder="Search files or folders..."
              autoComplete="off"
              spellCheck={false}
              className="h-9 w-full rounded-xl border border-line bg-ink/[0.018] pl-8 pr-9 text-[10px] font-medium text-ink outline-none transition-all duration-200 placeholder:text-ink/30 hover:border-ink/10 focus:border-teal/40 focus:bg-paper focus:ring-4 focus:ring-teal/5"
            />

            {hasSearch && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear file search"
                title="Clear search"
                className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg text-ink/35 transition-colors hover:bg-ink/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/30"
              >
                <X
                  className="h-3 w-3"
                  aria-hidden="true"
                />
              </button>
            )}
          </div>

          {/* Search status */}
          <div
            aria-live="polite"
            aria-atomic="true"
            className={`mt-2 flex items-center justify-between px-0.5 ${
              hasSearch ? "" : "hidden"
            }`}
          >
            <span className="text-[8px] font-medium text-ink/35">
              Matching files
            </span>

            <span className="text-[8px] font-bold tabular-nums text-teal/80">
              {filteredFiles.length}{" "}
              {filteredFiles.length === 1 ? "result" : "results"}
            </span>
          </div>
        </div>
      </header>

      {/* File list */}
      <div className="panel-scroll min-h-0 flex-1 overflow-auto px-2 py-2.5">
        {filteredFiles.length > 0 ? (
          <div className="space-y-0.5">
            {filteredFiles.map((file) => {
              const isSelected = selectedFile === file.path;
              const CurrentFileIcon = getFileIcon(file.path);

              return (
                <button
                  key={`${file.path}-${file.originalIndex}`}
                  type="button"
                  onClick={() => onSelectFile(file.path)}
                  title={file.path}
                  aria-current={isSelected ? "page" : undefined}
                  aria-label={`Open ${file.path}${
                    isSelected ? ", currently selected" : ""
                  }`}
                  className={`group relative flex w-full items-center gap-2.5 overflow-hidden rounded-xl px-2.5 py-2 text-left outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-teal/30 ${
                    isSelected
                      ? "bg-ink text-white shadow-sm"
                      : "text-ink/70 hover:bg-ink/[0.035] hover:text-ink focus-visible:bg-ink/[0.05]"
                  }`}
                >
                  {/* Active indicator */}
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 top-1/2 h-6 -translate-y-1/2 rounded-r-full bg-teal transition-all duration-200 ${
                      isSelected ? "w-0.5" : "w-0"
                    }`}
                  />

                  {/* File icon */}
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-150 ${
                      isSelected
                        ? "bg-white/10"
                        : "border border-line/60 bg-ink/[0.025] group-hover:border-teal/10 group-hover:bg-teal/10"
                    }`}
                  >
                    <CurrentFileIcon
                      className={`h-3.5 w-3.5 transition-colors duration-150 ${
                        isSelected
                          ? "text-teal"
                          : "text-ink/40 group-hover:text-teal"
                      }`}
                      aria-hidden="true"
                    />
                  </span>

                  {/* File information */}
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate font-mono text-[10px] leading-4 ${
                        isSelected
                          ? "font-semibold text-white"
                          : "font-semibold text-ink/75 group-hover:text-ink"
                      }`}
                    >
                      {file.name}
                    </span>

                    {file.folderPath && (
                      <span
                        className={`mt-0.5 block truncate font-mono text-[8px] leading-3 ${
                          isSelected
                            ? "text-white/50"
                            : "text-ink/30 group-hover:text-ink/45"
                        }`}
                      >
                        {file.folderPath}
                      </span>
                    )}
                  </span>

                  {/* Extension badge */}
                  {file.extension && (
                    <span
                      className={`hidden shrink-0 rounded-md border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wide transition-colors sm:block ${
                        isSelected
                          ? "border-white/10 bg-white/5 text-white/50"
                          : "border-line/60 bg-ink/[0.02] text-ink/30 group-hover:border-teal/10 group-hover:text-teal/70"
                      }`}
                    >
                      {file.extension}
                    </span>
                  )}

                  {/* Selection indicator */}
                  {isSelected ? (
                    <Check
                      className="h-3 w-3 shrink-0 text-teal"
                      aria-hidden="true"
                    />
                  ) : (
                    <ChevronRight
                      className="h-3 w-3 shrink-0 -translate-x-0.5 text-transparent transition-all duration-150 group-hover:translate-x-0 group-hover:text-ink/35"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          /* Search empty state */
          <div className="flex min-h-48 flex-col items-center justify-center px-4 py-6 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-ink/[0.025]">
              <Search
                className="h-4 w-4 text-ink/30"
                aria-hidden="true"
              />
            </div>

            <p className="text-[10px] font-black text-ink/70">
              No matching files
            </p>

            <p className="mt-1 break-words text-[9px] leading-4 text-ink/40">
              Nothing matches{" "}
              <span className="font-semibold text-ink/55">
                &quot;{trimmedQuery}&quot;
              </span>
            </p>

            <button
              type="button"
              onClick={clearSearch}
              className="mt-3 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-[9px] font-bold text-teal transition-colors hover:border-teal/20 hover:bg-teal/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/30"
            >
              Clear search
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="shrink-0 border-t border-line bg-paper px-3 py-2.5">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              aria-hidden="true"
              className={`relative flex h-1.5 w-1.5 shrink-0 rounded-full ${
                selectedExists ? "bg-teal" : "bg-ink/20"
              }`}
            >
              {selectedExists && (
                <span className="absolute inset-0 animate-ping rounded-full bg-teal/40" />
              )}
            </span>

            <span
              className={`truncate text-[8px] font-medium ${
                selectedExists ? "text-ink/45" : "text-ink/30"
              }`}
              title={selectedExists ? selectedFile : undefined}
            >
              {selectedExists
                ? normalizePath(selectedFile)
                : "No file selected"}
            </span>
          </div>

          {hasSearch ? (
            <button
              type="button"
              onClick={clearSearch}
              title="Clear search and show all files"
              className="shrink-0 rounded-md px-1.5 py-0.5 text-[8px] font-bold text-teal/80 transition-colors hover:bg-teal/5 hover:text-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/30"
            >
              {filteredFiles.length}/{files.length}
            </button>
          ) : (
            <div className="flex shrink-0 items-center gap-1">
              <Check
                className="h-3 w-3 text-teal/70"
                aria-hidden="true"
              />
              <span className="text-[8px] font-bold text-teal/70">
                Ready
              </span>
            </div>
          )}
        </div>
      </footer>
    </aside>
  );
}