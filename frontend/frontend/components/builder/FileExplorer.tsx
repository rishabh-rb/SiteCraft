"use client";

import { FileCode2, Folder } from "lucide-react";
import type { GeneratedFile } from "@/lib/api";

interface FileExplorerProps {
  files: GeneratedFile[];
  selectedFile: string;
  onSelectFile: (path: string) => void;
}

export function FileExplorer({ files, selectedFile, onSelectFile }: FileExplorerProps) {
  if (!files.length) {
    return (
      <div className="p-3 text-xs text-ink/50 italic">
        No files generated yet.
      </div>
    );
  }

  return (
    <div className="panel-scroll min-h-0 overflow-auto border-r border-line bg-paper p-2 space-y-1">
      <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold uppercase text-ink/50 tracking-wider">
        <Folder className="h-3.5 w-3.5" /> Project Explorer
      </div>
      {files.map((file) => {
        const isSelected = selectedFile === file.path;
        return (
          <button
            key={file.path}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-mono transition-all ${
              isSelected ? "bg-ink text-white font-semibold" : "text-ink/75 hover:bg-white hover:text-ink"
            }`}
            onClick={() => onSelectFile(file.path)}
            title={file.path}
          >
            <FileCode2 className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-accent" : "text-ink/40"}`} />
            <span className="truncate">{file.path}</span>
          </button>
        );
      })}
    </div>
  );
}
