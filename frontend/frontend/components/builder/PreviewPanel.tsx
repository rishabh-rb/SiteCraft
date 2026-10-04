
"use client";

import { useEffect, useState } from "react";
import {
  Maximize2,
  RefreshCw,
  WandSparkles,
  X,
  MonitorPlay,
  ExternalLink,
  Loader2,
} from "lucide-react";

import { DevicePreview, type Device } from "./DevicePreview";
import type { GeneratedWebsite } from "@/lib/api";

interface PreviewPanelProps {
  website?: GeneratedWebsite;
  working: boolean;
}

const deviceClass: Record<Device, string> = {
  desktop: "w-full max-w-[1400px]",
  tablet: "w-[780px] max-w-full",
  mobile: "w-[390px] max-w-full",
};

const deviceHeight: Record<Device, string> = {
  desktop: "min-h-full",
  tablet: "min-h-[760px]",
  mobile: "min-h-[780px]",
};

export function PreviewPanel({
  website,
  working,
}: PreviewPanelProps) {
  const [device, setDevice] = useState<Device>("desktop");
  const [refreshKey, setRefreshKey] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setRefreshKey((key) => key + 1);

    window.setTimeout(() => {
      setRefreshing(false);
    }, 600);
  };

  const closeFullscreen = () => {
    setFullscreen(false);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && fullscreen) {
        closeFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [fullscreen]);

  return (
    <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#d8d1c5]">
      {/* =========================================================
          TOP TOOLBAR
      ========================================================= */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-white px-4 shadow-sm">
        {/* Left side */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden h-8 w-8 items-center justify-center rounded-lg bg-accent/10 sm:flex">
            <MonitorPlay className="h-4 w-4 text-accent" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-sm font-black text-ink">
                {website?.plan?.siteName || "Website Preview"}
              </h2>

              {website && (
                <span className="hidden items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-600 sm:inline-flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Live
                </span>
              )}
            </div>

            <p className="hidden text-[10px] text-ink/40 sm:block">
              {website
                ? "Interactive generated website"
                : "Your generated website will appear here"}
            </p>
          </div>
        </div>

        {/* Center - Device Preview */}
        <div className="absolute left-1/2 hidden -translate-x-1/2 md:block">
          <DevicePreview
            device={device}
            setDevice={setDevice}
          />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={!website || refreshing}
            aria-label="Refresh preview"
            title="Refresh preview"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-ink/55 transition-all duration-150 hover:border-line hover:bg-paper hover:text-ink focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-35 ${
              refreshing ? "bg-paper" : ""
            }`}
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing ? "animate-spin" : ""
              }`}
            />
          </button>

          <button
            type="button"
            onClick={() => setFullscreen(true)}
            disabled={!website}
            aria-label="Open fullscreen preview"
            title="Fullscreen preview"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-ink/55 transition-all duration-150 hover:border-line hover:bg-paper hover:text-ink focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile device controls */}
      <div className="flex shrink-0 justify-center border-b border-line bg-white px-3 py-2 md:hidden">
        <DevicePreview
          device={device}
          setDevice={setDevice}
        />
      </div>

      {/* =========================================================
          MAIN PREVIEW AREA
      ========================================================= */}
      <div className="panel-scroll relative flex min-h-0 flex-1 justify-center overflow-auto p-4 sm:p-5 lg:p-6">
        {website ? (
          <div
            className={`relative flex ${deviceClass[device]} justify-center transition-all duration-300`}
          >
            {/* Device frame */}
            <div
              className={`relative flex w-full flex-col overflow-hidden rounded-xl border border-black/15 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.15)] ${deviceHeight[device]} ${
                device === "mobile"
                  ? "rounded-[28px] border-[5px] border-[#252525]"
                  : device === "tablet"
                  ? "rounded-2xl"
                  : "rounded-lg"
              }`}
            >
              {/* Browser/device chrome */}
              <div
                className={`flex h-8 shrink-0 items-center border-b border-black/10 bg-[#f4f4f4] px-3 ${
                  device === "mobile"
                    ? "hidden"
                    : ""
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                </div>

                <div className="mx-auto hidden max-w-[50%] truncate rounded-md border border-black/5 bg-white px-4 py-1 text-[8px] text-black/35 sm:block">
                  preview.local
                </div>
              </div>

              {/* Website iframe */}
              <iframe
                key={refreshKey}
                title="Generated website preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                className="min-h-0 w-full flex-1 border-none bg-white"
                srcDoc={website.html}
              />

              {/* Loading overlay */}
              {working && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/75 backdrop-blur-[2px]">
                  <div className="flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2.5 text-xs font-semibold text-ink shadow-lg">
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                    Updating preview...
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <EmptyPreview working={working} />
        )}
      </div>

      {/* =========================================================
          BOTTOM STATUS BAR
      ========================================================= */}
      {website && (
        <div className="flex h-7 shrink-0 items-center justify-between border-t border-line bg-white px-3 text-[9px]">
          <div className="flex items-center gap-3 text-ink/40">
            <span>
              View:{" "}
              <strong className="font-bold text-ink/55">
                {device}
              </strong>
            </span>

            <span className="hidden sm:inline">
              Live HTML preview
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Ready
          </div>
        </div>
      )}

      {/* =========================================================
          FULLSCREEN PREVIEW
      ========================================================= */}
      {fullscreen && website && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0d0f10]/95 p-2 backdrop-blur-md sm:p-4">
          {/* Fullscreen toolbar */}
          <div className="flex h-12 shrink-0 items-center justify-between rounded-t-xl border border-white/10 bg-[#17191c] px-3 sm:px-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-teal/10">
                <MonitorPlay className="h-3.5 w-3.5 text-teal" />
              </div>

              <div className="min-w-0">
                <h3 className="truncate text-xs font-bold text-white">
                  {website.plan?.siteName || "Website Preview"}
                </h3>

                <p className="hidden text-[9px] text-white/35 sm:block">
                  Fullscreen live preview
                </p>
              </div>

              <span className="hidden items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-emerald-400 sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Live
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleRefresh}
                title="Refresh preview"
                aria-label="Refresh fullscreen preview"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/50 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    refreshing ? "animate-spin" : ""
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={() => window.open(
                  "about:blank",
                  "_blank"
                )}
                title="Open preview in new tab"
                aria-label="Open preview in new tab"
                className="hidden h-8 w-8 items-center justify-center rounded-md text-white/50 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/20 sm:inline-flex"
              >
                <ExternalLink className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={closeFullscreen}
                title="Close fullscreen"
                aria-label="Close fullscreen preview"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/50 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Fullscreen iframe */}
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-b-xl border-x border-b border-white/10 bg-white">
            <iframe
              key={`fullscreen-${refreshKey}`}
              title="Fullscreen website preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              className="h-full w-full border-none bg-white"
              srcDoc={website.html}
            />

            {working && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                <div className="flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2.5 text-xs font-semibold text-ink shadow-xl">
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  Updating preview...
                </div>
              </div>
            )}
          </div>

          {/* Fullscreen footer */}
          <div className="flex h-7 shrink-0 items-center justify-between px-2 text-[9px] text-white/30">
            <span>Press ESC to exit fullscreen</span>

            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Preview ready
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

/* =============================================================
   EMPTY PREVIEW
============================================================= */

function EmptyPreview({
  working,
}: {
  working: boolean;
}) {
  return (
    <div className="flex h-full min-h-[420px] w-full max-w-3xl items-center justify-center">
      <div
        className={`relative w-full overflow-hidden rounded-2xl border border-dashed border-ink/20 bg-white/65 p-8 text-center shadow-sm backdrop-blur-sm transition-all duration-300 sm:p-12 ${
          working ? "border-accent/30" : ""
        }`}
      >
        {/* Decorative background */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-accent/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-teal/5 blur-3xl" />

        <div className="relative">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/10 bg-accent/5 ${
              working ? "animate-pulse" : ""
            }`}
          >
            {working ? (
              <Loader2 className="h-7 w-7 animate-spin text-accent" />
            ) : (
              <WandSparkles className="h-7 w-7 text-accent" />
            )}
          </div>

          <div className="mx-auto mt-5 max-w-md">
            <h2 className="text-xl font-black tracking-tight text-ink sm:text-2xl">
              {working
                ? "Generating your website..."
                : "Your preview will appear here"}
            </h2>

            <p className="mt-2 text-sm leading-6 text-ink/55">
              {working
                ? "Our multi-agent system is building the site structure, design tokens, content, and components."
                : "Describe the website you want to create, then run the generation pipeline to see your live website here."}
            </p>
          </div>

          {!working && (
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <PreviewHint text="Live preview" />
              <PreviewHint text="Responsive design" />
              <PreviewHint text="Generated code" />
            </div>
          )}

          {working && (
            <div className="mx-auto mt-6 flex max-w-xs items-center justify-center gap-2 rounded-lg border border-accent/10 bg-accent/5 px-3 py-2 text-[10px] font-semibold text-accent">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
              Building your experience
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =============================================================
   SMALL PREVIEW FEATURE BADGE
============================================================= */

function PreviewHint({
  text,
}: {
  text: string;
}) {
  return (
    <span className="rounded-full border border-line bg-white/80 px-3 py-1.5 text-[10px] font-semibold text-ink/45 shadow-sm">
      {text}
    </span>
  );
}
