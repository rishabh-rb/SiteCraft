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
} from "lucide-react";

import type { GeneratedFile } from "@/lib/api";

interface FileExplorerProps {
  files: GeneratedFile[];
  selectedFile: string;
  onSelectFile: (path: string) => void;
}

/* -------------------------------------------------
   Get file icon based on extension
------------------------------------------------- */
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
    case "txt":
    case "mdx":
      return FileText;

    default:
      return File;
  }
}

/* -------------------------------------------------
   Get file extension
------------------------------------------------- */
function getFileExtension(path: string) {
  const fileName = path.split("/").pop() || path;

  if (!fileName.includes(".")) {
    return "";
  }

  const extension = fileName.split(".").pop()?.toUpperCase();

  return extension || "";
}

/* -------------------------------------------------
   Get filename
------------------------------------------------- */
function getFileName(path: string) {
  return path.split("/").pop() || path;
}

/* -------------------------------------------------
   Get folder path
------------------------------------------------- */
function getFolderPath(path: string) {
  if (!path.includes("/")) {
    return "";
  }

  return path.split("/").slice(0, -1).join("/");
}

export function FileExplorer({
  files,
  selectedFile,
  onSelectFile,
}: FileExplorerProps) {
  const [searchQuery, setSearchQuery] = useState("");

  /* -------------------------------------------------
     Filter files
  ------------------------------------------------- */
  const filteredFiles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return files;
    }

    return files.filter((file) =>
      file.path.toLowerCase().includes(query)
    );
  }, [files, searchQuery]);

  /* -------------------------------------------------
     Count folders
  ------------------------------------------------- */
  const folderCount = useMemo(() => {
    const folders = new Set<string>();

    files.forEach((file) => {
      const parts = file.path.split("/");

      if (parts.length > 1) {
        for (let i = 1; i < parts.length; i++) {
          folders.add(parts.slice(0, i).join("/"));
        }
      }
    });

    return folders.size;
  }, [files]);

  /* -------------------------------------------------
     Empty state
  ------------------------------------------------- */
  if (!files.length) {
    return (
      <aside className="flex h-full min-h-32 w-full flex-col border-r border-line bg-paper">
        <div className="flex flex-1 flex-col items-center justify-center px-5 text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-ink/[0.03]">
            <Folder className="h-5 w-5 text-ink/30" />
          </div>

          <p className="text-xs font-semibold text-ink/70">
            No files yet
          </p>

          <p className="mt-1.5 max-w-[190px] text-[10px] leading-4 text-ink/40">
            Generate your website to see the project files here.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-r border-line bg-paper">
      {/* -------------------------------------------------
          Header
      ------------------------------------------------- */}
      <div className="shrink-0 border-b border-line px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Title */}
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal/10">
              <Folder className="h-4 w-4 text-teal" />
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-[11px] font-black uppercase tracking-wider text-ink">
                Project Explorer
              </h2>

              <p className="mt-0.5 text-[9px] text-ink/40">
                {files.length} {files.length === 1 ? "file" : "files"}
                {folderCount > 0 && (
                  <>
                    {" "}
                    · {folderCount}{" "}
                    {folderCount === 1 ? "folder" : "folders"}
                  </>
                )}
              </p>
            </div>
          </div>

          {/* File count */}
          <span className="shrink-0 rounded-full border border-line bg-ink/[0.03] px-2 py-1 text-[9px] font-bold text-ink/45">
            {files.length}
          </span>
        </div>

        {/* -------------------------------------------------
            Search
        ------------------------------------------------- */}
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/30" />

          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search files..."
            aria-label="Search project files"
            className="h-8 w-full rounded-lg border border-line bg-ink/[0.02] pl-8 pr-8 text-[10px] text-ink outline-none transition-all placeholder:text-ink/30 focus:border-teal/40 focus:bg-paper focus:ring-2 focus:ring-teal/10"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-md text-ink/30 transition-colors hover:bg-ink/5 hover:text-ink"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* -------------------------------------------------
          File List
      ------------------------------------------------- */}
      <div className="panel-scroll min-h-0 flex-1 overflow-auto p-2">
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
                  aria-current={isSelected ? "true" : undefined}
                  className={`group relative flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left outline-none transition-all duration-150 ${
                    isSelected
                      ? "bg-ink text-white shadow-sm"
                      : "text-ink/70 hover:bg-ink/[0.04] hover:text-ink focus-visible:bg-ink/[0.05]"
                  }`}
                >
                  {/* Selected indicator */}
                  <span
                    className={`absolute left-0 top-1/2 h-5 -translate-y-1/2 rounded-r-full transition-all ${
                      isSelected
                        ? "w-0.5 bg-teal"
                        : "w-0 bg-transparent"
                    }`}
                  />

                  {/* File icon */}
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-all ${
                      isSelected
                        ? "bg-white/10"
                        : "bg-ink/[0.04] group-hover:bg-teal/10"
                    }`}
                  >
                    <FileIcon
                      className={`h-3.5 w-3.5 transition-colors ${
                        isSelected
                          ? "text-teal"
                          : "text-ink/40 group-hover:text-teal"
                      }`}
                    />
                  </div>

                  {/* File information */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate font-mono text-[11px] leading-4 ${
                        isSelected
                          ? "font-semibold text-white"
                          : "text-ink/75 group-hover:text-ink"
                      }`}
                    >
                      {fileName}
                    </p>

                    {folderPath && (
                      <p
                        className={`mt-0.5 truncate font-mono text-[8px] leading-3 ${
                          isSelected
                            ? "text-white/40"
                            : "text-ink/30 group-hover:text-ink/40"
                        }`}
                      >
                        {folderPath}
                      </p>
                    )}
                  </div>

                  {/* Extension */}
                  {extension && (
                    <span
                      className={`hidden shrink-0 rounded px-1 py-0.5 text-[7px] font-bold uppercase tracking-wide sm:block ${
                        isSelected
                          ? "bg-white/5 text-white/35"
                          : "bg-ink/[0.03] text-ink/25"
                      }`}
                    >
                      {extension}
                    </span>
                  )}

                  {/* Arrow on selected / hover */}
                  <ChevronRight
                    className={`h-3 w-3 shrink-0 transition-all ${
                      isSelected
                        ? "translate-x-0 text-white/35"
                        : "translate-x-[-2px] text-ink/0 group-hover:translate-x-0 group-hover:text-ink/20"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        ) : (
          /* -------------------------------------------------
             Search Empty State
          ------------------------------------------------- */
          <div className="flex h-40 flex-col items-center justify-center px-4 text-center">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-ink/[0.04]">
              <Search className="h-4 w-4 text-ink/30" />
            </div>

            <p className="text-[10px] font-semibold text-ink/60">
              No matching files
            </p>

            <p className="mt-1 max-w-[160px] text-[9px] leading-4 text-ink/35">
              Try searching for a different file name or extension.
            </p>
          </div>
        )}
      </div>

      {/* -------------------------------------------------
          Footer
      ------------------------------------------------- */}
      <div className="shrink-0 border-t border-line px-3 py-2">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />

            <span className="truncate text-[9px] font-medium text-ink/35">
              {selectedFile
                ? selectedFile
                : "Select a file to view"}
            </span>
          </div>

          {searchQuery ? (
            <span className="shrink-0 text-[9px] text-ink/25">
              {filteredFiles.length}/{files.length}
            </span>
          ) : (
            <span className="shrink-0 text-[9px] text-ink/25">
              Ready
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
