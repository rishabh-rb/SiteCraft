"use client";

import { useState } from "react";
import { Maximize2, RefreshCw, WandSparkles, X } from "lucide-react";
import { DevicePreview, type Device } from "./DevicePreview";
import type { GeneratedWebsite } from "@/lib/api";

interface PreviewPanelProps {
  website?: GeneratedWebsite;
  working: boolean;
}

const deviceClass: Record<Device, string> = {
  desktop: "w-full max-w-full",
  tablet: "w-[780px] max-w-full",
  mobile: "w-[390px] max-w-full"
};

export function PreviewPanel({ website, working }: PreviewPanelProps) {
  const [device, setDevice] = useState<Device>("desktop");
  const [key, setKey] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const handleRefresh = () => setKey((k) => k + 1);

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#d8d1c5]">
      {/* Top Toolbar */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-line bg-white px-4">
        <DevicePreview device={device} setDevice={setDevice} />

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink/70 hover:bg-black/5 hover:text-ink transition-all"
            title="Refresh preview"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <button
            onClick={() => setFullscreen(true)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink/70 hover:bg-black/5 hover:text-ink transition-all"
            title="Full screen preview"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="panel-scroll flex min-h-0 flex-1 justify-center overflow-auto p-5">
        {website ? (
          <iframe
            key={key}
            title="Generated website preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            className={`${deviceClass[device]} min-h-full rounded-lg border border-black/15 bg-white shadow-md transition-all`}
            srcDoc={website.html}
          />
        ) : (
          <EmptyPreview working={working} />
        )}
      </div>

      {/* Fullscreen Modal View */}
      {fullscreen && website && (
        <div className="fixed inset-0 z-50 flex flex-col bg-ink/90 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between bg-white px-4 py-2 rounded-t-lg border-b border-line">
            <h3 className="font-extrabold text-sm text-ink">{website.plan.siteName} — Fullscreen Live Preview</h3>
            <button
              onClick={() => setFullscreen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-black/5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <iframe
            title="Fullscreen website preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            className="flex-1 w-full bg-white rounded-b-lg border-none"
            srcDoc={website.html}
          />
        </div>
      )}
    </section>
  );
}

function EmptyPreview({ working }: { working: boolean }) {
  return (
    <div className="flex h-full min-h-[420px] w-full max-w-2xl items-center justify-center rounded-lg border border-dashed border-ink/22 bg-white/60 p-8 text-center">
      <div>
        <WandSparkles className={`mx-auto h-10 w-10 text-accent ${working ? "animate-pulse" : ""}`} />
        <h2 className="mt-4 text-2xl font-black tracking-normal text-ink">
          {working ? "Generating your website..." : "No preview yet"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink/62">
          {working
            ? "Multi-agent system is generating site plan, design tokens, content sections, and React components."
            : "Enter a prompt on the left and run the generation pipeline to render the website here."}
        </p>
      </div>
    </div>
  );
}
