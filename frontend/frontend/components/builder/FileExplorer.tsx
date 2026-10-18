
"use client";

import {
  useCallback,
  useId,
  useMemo,
  useState,
} from "react";

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
  ChevronDown,
  Folder,
  FolderOpen,
  Check,
  Sparkles,
  Files,
  PanelLeftClose,
  PanelLeftOpen,
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

interface FolderGroup {
  path: string;
  name: string;
  files: NormalizedFile[];
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/");
}

function getFileName(path: string): string {
  return normalizePath(path).split("/").pop() || path;
}

function getFolderPath(path: string): string {
  const normalized = normalizePath(path);
  const lastSlash = normalized.lastIndexOf("/");

  return lastSlash > 0
    ? normalized.slice(0, lastSlash)
    : "";
}

function getFileExtension(path: string): string {
  const name = getFileName(path);
  const dotIndex = name.lastIndexOf(".");

  if (dotIndex <= 0 || dotIndex === name.length - 1) {
    return "";
  }

  return name.slice(dotIndex + 1).toUpperCase();
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
    case "html":
    case "htm":
    case "xml":
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

    case "svg":
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

function getFileIconColor(path: string): string {
  const extension = getFileExtension(path).toLowerCase();

  switch (extension) {
    case "tsx":
    case "jsx":
    case "ts":
    case "js":
      return "text-sky-500";

    case "json":
    case "jsonc":
    case "json5":
      return "text-amber-500";

    case "css":
    case "scss":
    case "sass":
    case "less":
      return "text-violet-500";

    case "html":
    case "htm":
    case "xml":
      return "text-orange-500";

    case "svg":
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
    case "ico":
    case "avif":
      return "text-emerald-500";

    case "md":
    case "mdx":
    case "txt":
      return "text-blue-400";

    default:
      return "text-ink/45";
  }
}

function getFolderCount(files: GeneratedFile[]): number {
  const folders = new Set<string>();

  for (const file of files) {
    const parts = normalizePath(file.path)
      .split("/")
      .filter(Boolean);

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
  const [collapsedFolders, setCollapsedFolders] =
    useState<Set<string>>(() => new Set());

  const searchId = useId();
  const trimmedQuery = searchQuery.trim();
  const hasSearch = trimmedQuery.length > 0;

  const normalizedFiles = useMemo<NormalizedFile[]>(() => {
    return files.map((file, originalIndex) => {
      const normalizedPath = normalizePath(file.path);
      const name = getFileName(normalizedPath);
      const folderPath = getFolderPath(normalizedPath);
      const extension = getFileExtension(normalizedPath);

      return {
        path: file.path,
        name,
        folderPath,
        extension,
        searchText: [
          normalizedPath,
          name,
          folderPath,
          extension,
        ]
          .join(" ")
          .toLowerCase(),
        originalIndex,
      };
    });
  }, [files]);

  const filteredFiles = useMemo(() => {
    if (!hasSearch) return normalizedFiles;

    const query = trimmedQuery.toLowerCase();

    return normalizedFiles.filter((file) =>
      file.searchText.includes(query),
    );
  }, [normalizedFiles, hasSearch, trimmedQuery]);

  const folderGroups = useMemo<FolderGroup[]>(() => {
    const groups = new Map<string, NormalizedFile[]>();

    for (const file of filteredFiles) {
      if (!groups.has(file.folderPath)) {
        groups.set(file.folderPath, []);
      }

      groups.get(file.folderPath)!.push(file);
    }

    return Array.from(groups.entries())
      .map(([path, groupFiles]) => ({
        path,
        name: path
          ? path.split("/").pop() || path
          : "Root",
        files: groupFiles,
      }))
      .sort((a, b) => {
        if (!a.path) return -1;
        if (!b.path) return 1;

        return a.path.localeCompare(b.path);
      });
  }, [filteredFiles]);

  const folderCount = useMemo(
    () => getFolderCount(files),
    [files],
  );

  const selectedExists = useMemo(
    () => files.some((file) => file.path === selectedFile),
    [files, selectedFile],
  );

  const allFolders = useMemo(
    () =>
      folderGroups
        .map((group) => group.path)
        .filter(Boolean),
    [folderGroups],
  );

  const allCollapsed =
    allFolders.length > 0 &&
    allFolders.every((folder) =>
      collapsedFolders.has(folder),
    );

  const toggleFolder = useCallback((folderPath: string) => {
    setCollapsedFolders((previous) => {
      const next = new Set(previous);

      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }

      return next;
    });
  }, []);

  const toggleAllFolders = useCallback(() => {
    setCollapsedFolders((previous) => {
      const everyFolderCollapsed =
        allFolders.length > 0 &&
        allFolders.every((folder) =>
          previous.has(folder),
        );

      return everyFolderCollapsed
        ? new Set<string>()
        : new Set(allFolders);
    });
  }, [allFolders]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  const isFolderCollapsed = useCallback(
    (folderPath: string) =>
      !hasSearch && collapsedFolders.has(folderPath),
    [hasSearch, collapsedFolders],
  );

  if (files.length === 0) {
    return (
      <aside
        aria-label="Project file explorer"
        className="flex h-full min-h-32 w-full flex-col border-r border-line bg-paper"
      >
        <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 text-center">
          <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-ink/[0.025] shadow-sm">
            <FolderOpen
              className="h-7 w-7 text-ink/30"
              aria-hidden="true"
            />

            <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-paper bg-teal">
              <Sparkles
                className="h-3 w-3 text-white"
                aria-hidden="true"
              />
            </span>
          </div>

          <h2 className="text-xs font-bold text-ink/80">
            No project files yet
          </h2>

          <p className="mt-2 max-w-[220px] text-[10px] leading-5 text-ink/45">
            Generate a website to explore its source code,
            folders, configuration files, and assets.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Project file explorer"
      className="flex h-full min-h-0 w-full flex-col overflow-hidden border-r border-line bg-paper"
    >
      {/* Explorer header */}
      <header className="shrink-0 border-b border-line">
        <div className="px-3.5 pb-3 pt-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-teal/10 bg-teal/10">
                <FolderOpen
                  className="h-4 w-4 text-teal"
                  aria-hidden="true"
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-[11px] font-black uppercase tracking-[0.09em] text-ink">
                    Project Explorer
                  </h2>

                  <span className="hidden rounded-full bg-teal/10 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider text-teal sm:inline-flex">
                    Source
                  </span>
                </div>

                <p className="mt-1 text-[9px] font-medium text-ink/45">
                  {files.length}{" "}
                  {files.length === 1 ? "file" : "files"}
                  <span className="mx-1.5 text-ink/20">
                    •
                  </span>
                  {folderCount}{" "}
                  {folderCount === 1 ? "folder" : "folders"}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <span
                title={`${files.length} project files`}
                className="flex h-7 min-w-7 items-center justify-center rounded-lg border border-line bg-ink/[0.025] px-1.5 text-[9px] font-bold tabular-nums text-ink/60"
              >
                {files.length}
              </span>

              <button
                type="button"
                onClick={toggleAllFolders}
                disabled={allFolders.length === 0}
                title={
                  allCollapsed
                    ? "Expand all folders"
                    : "Collapse all folders"
                }
                aria-label={
                  allCollapsed
                    ? "Expand all folders"
                    : "Collapse all folders"
                }
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-ink/45 transition-colors hover:bg-ink/[0.04] hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/30"
              >
                {allCollapsed ? (
                  <PanelLeftOpen
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                ) : (
                  <PanelLeftClose
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                )}
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-3.5">
            <label htmlFor={searchId} className="sr-only">
              Search project files and folders
            </label>

            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/35"
              aria-hidden="true"
            />

            <input
              id={searchId}
              type="search"
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(event.target.value)
              }
              placeholder="Search files, folders, extensions..."
              autoComplete="off"
              spellCheck={false}
              className="h-9 w-full rounded-xl border border-line bg-ink/[0.018] pl-8 pr-8 text-[10px] font-medium text-ink outline-none transition-all placeholder:text-ink/35 hover:border-ink/10 focus:border-teal/40 focus:bg-paper focus:ring-4 focus:ring-teal/5"
            />

            {hasSearch && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear file search"
                title="Clear search"
                className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg text-ink/40 transition-colors hover:bg-ink/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/30"
              >
                <X
                  className="h-3 w-3"
                  aria-hidden="true"
                />
              </button>
            )}
          </div>

          {hasSearch && (
            <div
              aria-live="polite"
              aria-atomic="true"
              className="mt-2 flex items-center justify-between px-0.5"
            >
              <span className="text-[8px] font-medium text-ink/40">
                Search results
              </span>

              <span className="text-[8px] font-bold tabular-nums text-teal">
                {filteredFiles.length}{" "}
                {filteredFiles.length === 1
                  ? "match"
                  : "matches"}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* File list */}
      <div className="panel-scroll min-h-0 flex-1 overflow-auto px-2 py-2.5">
        {filteredFiles.length > 0 ? (
          <div className="space-y-3">
            {folderGroups.map((group) => {
              const isRoot = group.path === "";
              const isCollapsed =
                !isRoot && isFolderCollapsed(group.path);

              return (
                <section
                  key={group.path || "__root__"}
                  aria-label={`${group.name} folder`}
                >
                  {/* Folder heading */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!isRoot) {
                        toggleFolder(group.path);
                      }
                    }}
                    disabled={isRoot}
                    aria-expanded={
                      isRoot ? undefined : !isCollapsed
                    }
                    className={`mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left ${
                      isRoot
                        ? "cursor-default"
                        : "cursor-pointer hover:bg-ink/[0.035]"
                    } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/30`}
                  >
                    {isRoot ? (
                      <Files
                        className="h-3.5 w-3.5 shrink-0 text-ink/40"
                        aria-hidden="true"
                      />
                    ) : isCollapsed ? (
                      <ChevronRight
                        className="h-3 w-3 shrink-0 text-ink/40"
                        aria-hidden="true"
                      />
                    ) : (
                      <ChevronDown
                        className="h-3 w-3 shrink-0 text-ink/40"
                        aria-hidden="true"
                      />
                    )}

                    {isRoot ? (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-ink/45">
                        Root files
                      </span>
                    ) : (
                      <Folder
                        className="h-3.5 w-3.5 shrink-0 text-amber-500/80"
                        aria-hidden="true"
                      />
                    )}

                    <span
                      className="min-w-0 flex-1 truncate text-[9px] font-semibold text-ink/55"
                      title={group.path || "Root"}
                    >
                      {isRoot ? "Project root" : group.name}
                    </span>

                    <span className="shrink-0 rounded-md bg-ink/[0.035] px-1.5 py-0.5 text-[8px] font-medium tabular-nums text-ink/40">
                      {group.files.length}
                    </span>
                  </button>

                  {/* Files in folder */}
                  {!isCollapsed && (
                    <div className="space-y-0.5">
                      {group.files.map((file) => {
                        const isSelected =
                          selectedFile === file.path;

                        const CurrentFileIcon =
                          getFileIcon(file.path);

                        const iconColor =
                          getFileIconColor(file.path);

                        return (
                          <button
                            key={`${file.path}-${file.originalIndex}`}
                            type="button"
                            onClick={() =>
                              onSelectFile(file.path)
                            }
                            title={file.path}
                            aria-current={
                              isSelected ? "page" : undefined
                            }
                            aria-label={`Open ${file.path}${
                              isSelected
                                ? ", currently selected"
                                : ""
                            }`}
                            className={`group relative flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-xl px-2.5 py-2 text-left outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-teal/30 ${
                              isSelected
                                ? "bg-ink text-white shadow-sm"
                                : "text-ink/70 hover:bg-ink/[0.035] hover:text-ink"
                            }`}
                          >
                            <span
                              aria-hidden="true"
                              className={`absolute left-0 top-1/2 h-6 -translate-y-1/2 rounded-r-full bg-teal transition-all ${
                                isSelected ? "w-0.5" : "w-0"
                              }`}
                            />

                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                isSelected
                                  ? "bg-white/10"
                                  : "border border-line/60 bg-ink/[0.025] group-hover:border-teal/15 group-hover:bg-teal/10"
                              }`}
                            >
                              <CurrentFileIcon
                                className={`h-4 w-4 transition-colors ${
                                  isSelected
                                    ? "text-teal"
                                    : `${iconColor} group-hover:text-teal`
                                }`}
                                aria-hidden="true"
                              />
                            </span>

                            <span className="min-w-0 flex-1">
                              <span
                                className={`block truncate font-mono text-[10px] leading-4 ${
                                  isSelected
                                    ? "font-semibold text-white"
                                    : "font-medium text-ink/80 group-hover:text-ink"
                                }`}
                              >
                                {file.name}
                              </span>

                              {hasSearch && (
                                <span
                                  className={`mt-0.5 block truncate font-mono text-[8px] leading-3 ${
                                    isSelected
                                      ? "text-white/50"
                                      : "text-ink/40"
                                  }`}
                                >
                                  {file.folderPath ||
                                    "Project root"}
                                </span>
                              )}
                            </span>

                            {file.extension && (
                              <span
                                className={`hidden shrink-0 rounded-md border px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wide sm:block ${
                                  isSelected
                                    ? "border-white/10 bg-white/5 text-white/55"
                                    : "border-line/60 bg-ink/[0.02] text-ink/40 group-hover:border-teal/15 group-hover:text-teal"
                                }`}
                              >
                                {file.extension}
                              </span>
                            )}

                            {isSelected && (
                              <Check
                                className="h-3.5 w-3.5 shrink-0 text-teal"
                                aria-hidden="true"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-48 flex-col items-center justify-center px-4 py-8 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-ink/[0.025]">
              <Search
                className="h-4 w-4 text-ink/35"
                aria-hidden="true"
              />
            </div>

            <p className="text-[10px] font-bold text-ink/75">
              No matching files
            </p>

            <p className="mt-1 max-w-[210px] break-words text-[9px] leading-4 text-ink/45">
              Nothing matches{" "}
              <span className="font-semibold text-ink/65">
                &quot;{trimmedQuery}&quot;
              </span>
            </p>

            <button
              type="button"
              onClick={clearSearch}
              className="mt-3 rounded-lg border border-line bg-paper px-3 py-1.5 text-[9px] font-bold text-teal transition-colors hover:border-teal/20 hover:bg-teal/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/30"
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
                selectedExists
                  ? "text-ink/50"
                  : "text-ink/35"
              }`}
              title={
                selectedExists
                  ? normalizePath(selectedFile)
                  : undefined
              }
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
                className="h-3 w-3 text-teal/80"
                aria-hidden="true"
              />
              <span className="text-[8px] font-bold text-teal/80">
                Ready
              </span>
            </div>
          )}
        </div>
      </footer>
    </aside>
  );
}
