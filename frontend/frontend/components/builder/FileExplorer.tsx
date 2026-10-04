
"use client";

import {
  FileCode2,
  Folder,
  FileText,
  FileJson,
  FileImage,
  FileType,
  File,
} from "lucide-react";
import type { GeneratedFile } from "@/lib/api";

interface FileExplorerProps {
  files: GeneratedFile[];
  selectedFile: string;
  onSelectFile: (path: string) => void;
}

/* ---------------------------------------------
   Get file icon based on extension
--------------------------------------------- */
function getFileIcon(path: string) {
  const extension = path.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "tsx":
    case "ts":
    case "jsx":
    case "js":
      return FileCode2;

    case "json":
      return FileJson;

    case "css":
    case "scss":
    case "sass":
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
      return FileImage;

    case "md":
    case "txt":
      return FileText;

    default:
      return File;
  }
}

/* ---------------------------------------------
   Get file extension label
--------------------------------------------- */
function getFileExtension(path: string) {
  const extension = path.split(".").pop()?.toUpperCase();

  if (!extension || extension === path.toUpperCase()) {
    return "";
  }

  return extension;
}

export function FileExplorer({
  files,
  selectedFile,
  onSelectFile,
}: FileExplorerProps) {
  /* ---------------------------------------------
     Empty State
  --------------------------------------------- */
  if (!files.length) {
    return (
      <div className="flex h-full min-h-32 flex-col items-center justify-center border-r border-line bg-paper px-4 text-center">
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-ink/5">
          <Folder className="h-5 w-5 text-ink/35" />
        </div>

        <p className="text-xs font-semibold text-ink/65">
          No files yet
        </p>

        <p className="mt-1 max-w-[180px] text-[10px] leading-4 text-ink/40">
          Generate your website to see the project files here.
        </p>
      </div>
    );
  }

  return (
    <aside className="flex min-h-0 h-full w-full flex-col border-r border-line bg-paper">

      {/* ---------------------------------------------
          Explorer Header
      --------------------------------------------- */}
      <div className="shrink-0 border-b border-line px-3 py-3">

        <div className="flex items-center justify-between">

          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-teal/10">
              <Folder className="h-4 w-4 text-teal" />
            </div>

            <div>
              <h2 className="text-[11px] font-black uppercase tracking-wider text-ink">
                Project Explorer
              </h2>

              <p className="mt-0.5 text-[9px] text-ink/40">
                Generated files
              </p>
            </div>
          </div>

          {/* File Count */}
          <span className="rounded-full bg-ink/5 px-2 py-1 text-[9px] font-bold text-ink/50">
            {files.length} {files.length === 1 ? "file" : "files"}
          </span>
        </div>
      </div>

      {/* ---------------------------------------------
          File List
      --------------------------------------------- */}
      <div className="panel-scroll min-h-0 flex-1 overflow-auto p-2">

        <div className="space-y-0.5">

          {files.map((file) => {
            const isSelected = selectedFile === file.path;
            const FileIcon = getFileIcon(file.path);
            const extension = getFileExtension(file.path);

            return (
              <button
                key={file.path}
                type="button"
                onClick={() => onSelectFile(file.path)}
                title={file.path}
                className={`group relative flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-all duration-150 ${
                  isSelected
                    ? "bg-ink text-white shadow-sm"
                    : "text-ink/70 hover:bg-ink/[0.04] hover:text-ink"
                }`}
              >

                {/* Selected Indicator */}
                {isSelected && (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-teal" />
                )}

                {/* File Icon */}
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                    isSelected
                      ? "bg-white/10"
                      : "bg-ink/[0.04] group-hover:bg-ink/[0.07]"
                  }`}
                >
                  <FileIcon
                    className={`h-3.5 w-3.5 ${
                      isSelected
                        ? "text-teal"
                        : "text-ink/40 group-hover:text-teal"
                    }`}
                  />
                </div>

                {/* File Name */}
                <div className="min-w-0 flex-1">

                  <p
                    className={`truncate font-mono text-[11px] leading-4 ${
                      isSelected
                        ? "font-semibold text-white"
                        : "text-ink/75 group-hover:text-ink"
                    }`}
                  >
                    {file.path.split("/").pop() || file.path}
                  </p>

                  {/* Folder Path */}
                  {file.path.includes("/") && (
                    <p
                      className={`truncate font-mono text-[8px] leading-3 ${
                        isSelected
                          ? "text-white/40"
                          : "text-ink/30"
                      }`}
                    >
                      {file.path
                        .split("/")
                        .slice(0, -1)
                        .join("/")}
                    </p>
                  )}
                </div>

                {/* Extension */}
                {extension && (
                  <span
                    className={`hidden shrink-0 text-[8px] font-bold uppercase tracking-wide sm:block ${
                      isSelected
                        ? "text-white/35"
                        : "text-ink/25"
                    }`}
                  >
                    {extension}
                  </span>
                )}
              </button>
            );
          })}

        </div>
      </div>

      {/* ---------------------------------------------
          Footer
      --------------------------------------------- */}
      <div className="shrink-0 border-t border-line px-3 py-2">

        <div className="flex items-center justify-between">
          <span className="text-[9px] font-medium text-ink/35">
            {selectedFile
              ? `Selected: ${selectedFile.split("/").pop()}`
              : "Select a file"}
          </span>

          <span className="text-[9px] text-ink/25">
            {files.length}
          </span>
        </div>

      </div>
    </aside>
  );
}
