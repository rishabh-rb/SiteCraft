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
  Globe2,
  Smartphone,
  Check,
  ShieldCheck,
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
    if (!website || refreshing) return;

    setRefreshing(true);
    setRefreshKey((key) => key + 1);

    window.setTimeout(() => {
      setRefreshing(false);
    }, 700);
  };

  const openFullscreen = () => {
    if (!website) return;
    setFullscreen(true);
  };

  const closeFullscreen = () => {
    setFullscreen(false);
  };

  const openInNewTab = () => {
    if (!website) return;

    const previewWindow = window.open("", "_blank");

    if (!previewWindow) return;

    previewWindow.document.open();
    previewWindow.document.write(website.html);
    previewWindow.document.close();
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

  useEffect(() => {
    if (!fullscreen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [fullscreen]);

  return (
    <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#d8d1c5]">
      {/* =====================================================
          TOP TOOLBAR
      ===================================================== */}

      <div className="relative z-20 flex h-14 shrink-0 items-center justify-between border-b border-line bg-white px-3 shadow-sm sm:px-4">
        {/* Project identity */}

        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-accent/10 bg-accent/10 sm:flex">
            <MonitorPlay className="h-4 w-4 text-accent" />
          </div>

          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-sm font-black tracking-tight text-ink">
                {website?.plan?.siteName || "Website Preview"}
              </h2>

              {website && (
                <span className="hidden shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-600 sm:inline-flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.12)]" />
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

        {/* Desktop device controls */}

        <div className="absolute left-1/2 hidden -translate-x-1/2 md:block">
          <DevicePreview
            device={device}
            setDevice={setDevice}
          />
        </div>

        {/* Actions */}

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={!website || refreshing}
            aria-label="Refresh preview"
            title="Refresh preview"
            className={`group inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-ink/50 transition-all duration-200 hover:border-line hover:bg-paper hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 disabled:pointer-events-none disabled:opacity-30 ${
              refreshing ? "bg-paper text-accent" : ""
            }`}
          >
            <RefreshCw
              className={`h-4 w-4 transition-transform ${
                refreshing
                  ? "animate-spin"
                  : "group-hover:rotate-45"
              }`}
            />
          </button>

          <button
            type="button"
            onClick={openFullscreen}
            disabled={!website}
            aria-label="Open fullscreen preview"
            title="Fullscreen preview"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-ink/50 transition-all duration-200 hover:border-line hover:bg-paper hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 disabled:pointer-events-none disabled:opacity-30"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* =====================================================
          MOBILE DEVICE CONTROLS
      ===================================================== */}

      <div className="flex shrink-0 justify-center border-b border-line bg-white px-3 py-2 md:hidden">
        <DevicePreview
          device={device}
          setDevice={setDevice}
        />
      </div>

      {/* =====================================================
          PREVIEW AREA
      ===================================================== */}

      <div className="panel-scroll relative flex min-h-0 flex-1 justify-center overflow-auto p-3 sm:p-5 lg:p-6">
        {website ? (
          <div
            className={`relative flex ${deviceClass[device]} justify-center transition-all duration-300 ease-out`}
          >
            <div
              className={`relative flex w-full flex-col overflow-hidden border bg-white shadow-[0_20px_60px_rgba(0,0,0,0.14)] transition-all duration-300 ${deviceHeight[device]} ${
                device === "mobile"
                  ? "rounded-[30px] border-[5px] border-[#222] shadow-[0_25px_70px_rgba(0,0,0,0.24)]"
                  : device === "tablet"
                  ? "rounded-2xl border-black/15"
                  : "rounded-xl border-black/15"
              }`}
            >
              {/* Mobile notch */}

              {device === "mobile" && (
                <div className="pointer-events-none absolute left-1/2 top-0 z-20 h-5 w-28 -translate-x-1/2 rounded-b-2xl bg-[#222]" />
              )}

              {/* Browser chrome */}

              <div
                className={`flex h-9 shrink-0 items-center border-b border-black/10 bg-[#f5f5f5] px-3 ${
                  device === "mobile" ? "hidden" : ""
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                </div>

                <div className="mx-auto flex max-w-[55%] items-center gap-1.5 truncate rounded-md border border-black/5 bg-white px-3 py-1 text-[8px] text-black/35 shadow-sm">
                  <Globe2 className="h-2.5 w-2.5 shrink-0" />
                  <span className="truncate">preview.local</span>
                </div>

                <div className="w-[42px]" />
              </div>

              {/* Website */}

              <iframe
                key={refreshKey}
                title="Generated website preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                className="min-h-0 w-full flex-1 border-none bg-white"
                srcDoc={website.html}
              />

              {/* Updating overlay */}

              {working && (
                <PreviewLoadingOverlay />
              )}
            </div>
          </div>
        ) : (
          <EmptyPreview working={working} />
        )}
      </div>

      {/* =====================================================
          STATUS BAR
      ===================================================== */}

      {website && (
        <div className="flex h-7 shrink-0 items-center justify-between border-t border-line bg-white px-3 text-[9px]">
          <div className="flex items-center gap-3 text-ink/40">
            <span>
              View:{" "}
              <strong className="font-bold capitalize text-ink/60">
                {device}
              </strong>
            </span>

            <span className="hidden sm:inline">
              Live HTML preview
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-semibold text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.1)]" />
            Ready
          </div>
        </div>
      )}

      {/* =====================================================
          FULLSCREEN
      ===================================================== */}

      {fullscreen && website && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-[#0b0d0f]/95 p-2 backdrop-blur-md sm:p-4">
          {/* Header */}

          <div className="flex h-12 shrink-0 items-center justify-between rounded-t-xl border border-white/10 bg-[#151719] px-3 shadow-2xl sm:px-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/5">
                <MonitorPlay className="h-3.5 w-3.5 text-white/70" />
              </div>

              <div className="min-w-0">
                <h3 className="truncate text-xs font-bold text-white">
                  {website.plan?.siteName || "Website Preview"}
                </h3>

                <p className="hidden text-[9px] text-white/35 sm:block">
                  Fullscreen live preview
                </p>
              </div>

              <span className="hidden shrink-0 items-center gap-1 rounded-full border border-emerald-500/10 bg-emerald-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-emerald-400 sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Live
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                title="Refresh preview"
                aria-label="Refresh fullscreen preview"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/45 transition-all hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 disabled:opacity-40"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    refreshing ? "animate-spin" : ""
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={openInNewTab}
                title="Open preview in new tab"
                aria-label="Open preview in new tab"
                className="hidden h-8 w-8 items-center justify-center rounded-lg text-white/45 transition-all hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 sm:inline-flex"
              >
                <ExternalLink className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={closeFullscreen}
                title="Close fullscreen"
                aria-label="Close fullscreen preview"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/45 transition-all hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Device controls */}

          <div className="flex shrink-0 items-center justify-center border-x border-white/10 bg-[#111315] py-2">
            <DevicePreview
              device={device}
              setDevice={setDevice}
            />
          </div>

          {/* Fullscreen preview */}

          <div className="relative min-h-0 flex-1 overflow-hidden border-x border-white/10 bg-white">
            <iframe
              key={`fullscreen-${refreshKey}`}
              title="Fullscreen website preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              className="h-full w-full border-none bg-white"
              srcDoc={website.html}
            />

            {working && <PreviewLoadingOverlay fullscreen />}
          </div>

          {/* Footer */}

          <div className="flex h-8 shrink-0 items-center justify-between rounded-b-xl border-x border-b border-white/10 bg-[#111315] px-3 text-[9px] text-white/30 sm:px-4">
            <span className="hidden sm:inline">
              Press ESC to exit fullscreen
            </span>

            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_0_2px_rgba(52,211,153,0.1)]" />
              Preview ready
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

/* =============================================================
   LOADING OVERLAY
============================================================= */

function PreviewLoadingOverlay({
  fullscreen = false,
}: {
  fullscreen?: boolean;
}) {
  return (
    <div
      className={`absolute inset-0 z-30 flex items-center justify-center backdrop-blur-[3px] ${
        fullscreen ? "bg-white/70" : "bg-white/72"
      }`}
    >
      <div className="flex items-center gap-2.5 rounded-xl border border-line bg-white px-4 py-3 text-xs font-semibold text-ink shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/10">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
        </span>

        <div>
          <p>Updating preview...</p>
          <p className="mt-0.5 text-[9px] font-medium text-ink/35">
            Applying the latest changes
          </p>
        </div>
      </div>
    </div>
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
        className={`relative w-full overflow-hidden rounded-2xl border border-dashed bg-white/65 p-8 text-center shadow-sm backdrop-blur-sm transition-all duration-500 sm:p-12 ${
          working
            ? "border-accent/30 shadow-[0_0_40px_rgba(0,0,0,0.04)]"
            : "border-ink/20"
        }`}
      >
        {/* Decorative background */}

        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-accent/5 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-teal/5 blur-3xl" />

        <div className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-accent/20 to-transparent" />

        <div className="relative">
          {/* Main icon */}

          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border bg-accent/5 shadow-sm transition-all duration-500 ${
              working
                ? "border-accent/20 shadow-[0_0_30px_rgba(0,0,0,0.05)]"
                : "border-accent/10"
            }`}
          >
            {working ? (
              <Loader2 className="h-7 w-7 animate-spin text-accent" />
            ) : (
              <WandSparkles className="h-7 w-7 text-accent" />
            )}
          </div>

          {/* Heading */}

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

          {/* Feature badges */}

          {!working && (
            <div className="mt-7 flex flex-wrap justify-center gap-2">
              <PreviewHint
                icon={<Globe2 className="h-3 w-3" />}
                text="Live preview"
              />

              <PreviewHint
                icon={<Smartphone className="h-3 w-3" />}
                text="Responsive"
              />

              <PreviewHint
                icon={<ShieldCheck className="h-3 w-3" />}
                text="Sandboxed"
              />

              <PreviewHint
                icon={<Check className="h-3 w-3" />}
                text="Generated code"
              />
            </div>
          )}

          {/* Working state */}

          {working && (
            <div className="mx-auto mt-7 flex max-w-xs items-center justify-center gap-2 rounded-xl border border-accent/10 bg-accent/5 px-3 py-2.5 text-[10px] font-semibold text-accent">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>

              Building your experience
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =============================================================
   PREVIEW FEATURE BADGE
============================================================= */

function PreviewHint({
  text,
  icon,
}: {
  text: string;
  icon?: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/80 px-3 py-1.5 text-[10px] font-semibold text-ink/50 shadow-sm transition-all hover:border-ink/15 hover:bg-white hover:text-ink/70">
      {icon}
      {text}
    </span>
  );
}