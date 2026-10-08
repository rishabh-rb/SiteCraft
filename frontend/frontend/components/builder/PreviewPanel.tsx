"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  Check,
  ExternalLink,
  Globe2,
  Loader2,
  Maximize2,
  MonitorPlay,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  WandSparkles,
  X,
} from "lucide-react";

import { DevicePreview, type Device } from "./DevicePreview";
import type { GeneratedWebsite } from "@/lib/api";

/* =========================================================
   TYPES
========================================================= */

interface PreviewPanelProps {
  website?: GeneratedWebsite;
  working: boolean;
}

type PreviewState = "loading" | "ready";

/* =========================================================
   DEVICE CONFIG
========================================================= */

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

/* =========================================================
   COMPONENT
========================================================= */

export function PreviewPanel({
  website,
  working,
}: PreviewPanelProps) {
  const [device, setDevice] =
    useState<Device>("desktop");

  const [refreshKey, setRefreshKey] = useState(0);

  const [fullscreen, setFullscreen] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const [previewState, setPreviewState] =
    useState<PreviewState>("loading");

  const refreshTimeoutRef =
    useRef<number | null>(null);

  /* =======================================================
     RESET PREVIEW STATE WHEN WEBSITE CHANGES
  ======================================================= */

  useEffect(() => {
    if (!website) {
      setPreviewState("loading");
      return;
    }

    setPreviewState("loading");
  }, [website?.html]);

  /* =======================================================
     CLEANUP
  ======================================================= */

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current !== null) {
        window.clearTimeout(
          refreshTimeoutRef.current
        );
      }
    };
  }, []);

  /* =======================================================
     REFRESH PREVIEW
  ======================================================= */

  const handleRefresh = useCallback(() => {
    if (!website || refreshing) return;

    setRefreshing(true);
    setPreviewState("loading");

    setRefreshKey((key) => key + 1);

    if (refreshTimeoutRef.current !== null) {
      window.clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = window.setTimeout(() => {
      setRefreshing(false);
    }, 650);
  }, [website, refreshing]);

  /* =======================================================
     IFRAME LOADED
  ======================================================= */

  const handlePreviewLoad = () => {
    setPreviewState("ready");

    if (refreshing) {
      if (refreshTimeoutRef.current !== null) {
        window.clearTimeout(
          refreshTimeoutRef.current
        );
      }

      setRefreshing(false);
    }
  };

  /* =======================================================
     FULLSCREEN
  ======================================================= */

  const openFullscreen = () => {
    if (!website) return;

    setFullscreen(true);
  };

  const closeFullscreen = useCallback(() => {
    setFullscreen(false);
  }, []);

  /* =======================================================
     ESC TO CLOSE FULLSCREEN
  ======================================================= */

  useEffect(() => {
    if (!fullscreen) return;

    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (event.key === "Escape") {
        closeFullscreen();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [fullscreen, closeFullscreen]);

  /* =======================================================
     LOCK BODY SCROLL
  ======================================================= */

  useEffect(() => {
    if (!fullscreen) return;

    const originalOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        originalOverflow;
    };
  }, [fullscreen]);

  /* =======================================================
     OPEN IN NEW TAB
  ======================================================= */

  const openInNewTab = () => {
    if (!website) return;

    try {
      const blob = new Blob(
        [website.html],
        {
          type: "text/html",
        }
      );

      const url =
        URL.createObjectURL(blob);

      const previewWindow = window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );

      if (!previewWindow) {
        URL.revokeObjectURL(url);
        return;
      }

      /*
       * Keep the URL alive long enough for
       * the new tab to load the document.
       */
      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 10000);
    } catch {
      /*
       * Fallback for browsers that block
       * Blob-based previews.
       */
      const previewWindow = window.open(
        "",
        "_blank"
      );

      if (!previewWindow) return;

      previewWindow.document.open();
      previewWindow.document.write(
        website.html
      );
      previewWindow.document.close();
    }
  };

  /* =======================================================
     NO WEBSITE
  ======================================================= */

  const hasWebsite = Boolean(website);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <section
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#d8d1c5]"
      aria-label="Website preview"
    >
      {/* ==================================================
          TOP TOOLBAR
      ================================================== */}

      <header className="relative z-20 flex h-14 shrink-0 items-center justify-between border-b border-line bg-white px-3 shadow-sm sm:px-4">
        {/* Project Identity */}

        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <div
            className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border sm:flex ${
              hasWebsite
                ? "border-accent/10 bg-accent/10"
                : "border-line bg-paper"
            }`}
          >
            <MonitorPlay
              className={`h-4 w-4 ${
                hasWebsite
                  ? "text-accent"
                  : "text-ink/30"
              }`}
            />
          </div>

          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-sm font-black tracking-tight text-ink">
                {website?.plan?.siteName ||
                  "Website Preview"}
              </h2>

              {website && (
                <span className="hidden shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-600 sm:inline-flex">
                  <span
                    className="relative flex h-1.5 w-1.5"
                    aria-hidden="true"
                  >
                    <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/50" />

                    <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>

                  Live
                </span>
              )}
            </div>

            <p className="hidden truncate text-[10px] text-ink/40 sm:block">
              {website
                ? "Interactive generated website"
                : "Your generated website will appear here"}
            </p>
          </div>
        </div>

        {/* Desktop Device Controls */}

        <div className="absolute left-1/2 hidden -translate-x-1/2 md:block">
          <DevicePreview
            device={device}
            setDevice={setDevice}
          />
        </div>

        {/* Actions */}

        <div className="flex items-center gap-1">
          {/* Refresh */}

          <PreviewAction
            label="Refresh preview"
            onClick={handleRefresh}
            disabled={!website || refreshing}
            active={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 transition-transform duration-300 ${
                refreshing
                  ? "animate-spin"
                  : "group-hover:rotate-45"
              }`}
            />
          </PreviewAction>

          {/* Fullscreen */}

          <PreviewAction
            label="Open fullscreen preview"
            onClick={openFullscreen}
            disabled={!website}
          >
            <Maximize2 className="h-4 w-4 transition-transform duration-200 group-hover:scale-105" />
          </PreviewAction>
        </div>
      </header>

      {/* ==================================================
          MOBILE DEVICE CONTROLS
      ================================================== */}

      <div className="flex shrink-0 justify-center border-b border-line bg-white px-3 py-2 md:hidden">
        <DevicePreview
          device={device}
          setDevice={setDevice}
        />
      </div>

      {/* ==================================================
          PREVIEW AREA
      ================================================== */}

      <main className="panel-scroll relative flex min-h-0 flex-1 justify-center overflow-auto p-3 sm:p-5 lg:p-6">
        {website ? (
          <div
            className={`relative flex ${deviceClass[device]} justify-center transition-all duration-300 ease-out`}
          >
            <div
              className={`relative flex w-full flex-col overflow-hidden border bg-white transition-all duration-300 ${
                device === "mobile"
                  ? "rounded-[30px] border-[5px] border-[#222] shadow-[0_25px_70px_rgba(0,0,0,0.24)]"
                  : device === "tablet"
                    ? "rounded-2xl border-black/15 shadow-[0_20px_60px_rgba(0,0,0,0.14)]"
                    : "rounded-xl border-black/15 shadow-[0_20px_60px_rgba(0,0,0,0.14)]"
              } ${deviceHeight[device]}`}
            >
              {/* Mobile Notch */}

              {device === "mobile" && (
                <div
                  className="pointer-events-none absolute left-1/2 top-0 z-20 h-5 w-28 -translate-x-1/2 rounded-b-2xl bg-[#222]"
                  aria-hidden="true"
                />
              )}

              {/* Browser Chrome */}

              {device !== "mobile" && (
                <div className="flex h-9 shrink-0 items-center border-b border-black/10 bg-[#f5f5f5] px-3">
                  {/* Traffic Lights */}

                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]"
                      aria-hidden="true"
                    />

                    <span
                      className="h-2.5 w-2.5 rounded-full bg-[#febc2e]"
                      aria-hidden="true"
                    />

                    <span
                      className="h-2.5 w-2.5 rounded-full bg-[#28c840]"
                      aria-hidden="true"
                    />
                  </div>

                  {/* Address Bar */}

                  <div className="mx-auto flex max-w-[55%] items-center gap-1.5 truncate rounded-md border border-black/5 bg-white px-3 py-1 text-[8px] text-black/35 shadow-sm">
                    <Globe2 className="h-2.5 w-2.5 shrink-0" />

                    <span className="truncate">
                      preview.local
                    </span>
                  </div>

                  <div className="w-[42px]" />
                </div>
              )}

              {/* Website */}

              <iframe
                key={refreshKey}
                title="Generated website preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                loading="eager"
                onLoad={handlePreviewLoad}
                className="min-h-0 w-full flex-1 border-none bg-white"
                srcDoc={website.html}
              />

              {/* Loading Overlay */}

              {(working ||
                previewState === "loading") && (
                <PreviewLoadingOverlay />
              )}
            </div>
          </div>
        ) : (
          <EmptyPreview working={working} />
        )}
      </main>

      {/* ==================================================
          STATUS BAR
      ================================================== */}

      {website && (
        <footer className="flex h-7 shrink-0 items-center justify-between border-t border-line bg-white px-3 text-[9px]">
          <div className="flex min-w-0 items-center gap-3 text-ink/40">
            <span className="shrink-0">
              View:{" "}
              <strong className="font-bold capitalize text-ink/60">
                {device}
              </strong>
            </span>

            <span className="hidden truncate sm:inline">
              Live HTML preview
            </span>
          </div>

          <div
            className={`flex shrink-0 items-center gap-1.5 font-semibold ${
              previewState === "ready" &&
              !working
                ? "text-emerald-600"
                : "text-accent"
            }`}
          >
            <span className="relative flex h-1.5 w-1.5">
              {(previewState === "ready" &&
                !working) && (
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/40" />
              )}

              <span
                className={`relative h-1.5 w-1.5 rounded-full ${
                  previewState === "ready" &&
                  !working
                    ? "bg-emerald-500"
                    : "bg-accent"
                }`}
              />
            </span>

            {working
              ? "Updating"
              : previewState === "loading"
                ? "Loading"
                : "Ready"}
          </div>
        </footer>
      )}

      {/* ==================================================
          FULLSCREEN
      ================================================== */}

      {fullscreen && website && (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-[#0b0d0f]/95 p-2 backdrop-blur-md sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen website preview"
        >
          {/* Fullscreen Header */}

          <header className="flex h-12 shrink-0 items-center justify-between rounded-t-xl border border-white/10 bg-[#151719] px-3 shadow-2xl sm:px-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/5">
                <MonitorPlay className="h-3.5 w-3.5 text-white/70" />
              </div>

              <div className="min-w-0">
                <h3 className="truncate text-xs font-bold text-white">
                  {website.plan?.siteName ||
                    "Website Preview"}
                </h3>

                <p className="hidden text-[9px] text-white/35 sm:block">
                  Fullscreen live preview
                </p>
              </div>

              <span className="hidden shrink-0 items-center gap-1 rounded-full border border-emerald-500/10 bg-emerald-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-emerald-400 sm:inline-flex">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/40" />

                  <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>

                Live
              </span>
            </div>

            {/* Fullscreen Actions */}

            <div className="flex items-center gap-1">
              <PreviewAction
                label="Refresh fullscreen preview"
                onClick={handleRefresh}
                disabled={refreshing}
                dark
                active={refreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    refreshing
                      ? "animate-spin"
                      : ""
                  }`}
                />
              </PreviewAction>

              <PreviewAction
                label="Open preview in new tab"
                onClick={openInNewTab}
                dark
                className="hidden sm:inline-flex"
              >
                <ExternalLink className="h-4 w-4" />
              </PreviewAction>

              <PreviewAction
                label="Close fullscreen"
                onClick={closeFullscreen}
                dark
              >
                <X className="h-4 w-4" />
              </PreviewAction>
            </div>
          </header>

          {/* Fullscreen Device Controls */}

          <div className="flex shrink-0 items-center justify-center border-x border-white/10 bg-[#111315] py-2">
            <DevicePreview
              device={device}
              setDevice={setDevice}
            />
          </div>

          {/* Fullscreen Website */}

          <div className="relative min-h-0 flex-1 overflow-hidden border-x border-white/10 bg-white">
            <iframe
              key={`fullscreen-${refreshKey}`}
              title="Fullscreen website preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              loading="eager"
              onLoad={handlePreviewLoad}
              className="h-full w-full border-none bg-white"
              srcDoc={website.html}
            />

            {(working ||
              previewState === "loading") && (
              <PreviewLoadingOverlay fullscreen />
            )}
          </div>

          {/* Fullscreen Footer */}

          <footer className="flex h-8 shrink-0 items-center justify-between rounded-b-xl border-x border-b border-white/10 bg-[#111315] px-3 text-[9px] text-white/30 sm:px-4">
            <span className="hidden sm:inline">
              Press ESC to exit fullscreen
            </span>

            <span className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                {previewState === "ready" &&
                  !working && (
                    <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30" />
                  )}

                <span
                  className={`relative h-1.5 w-1.5 rounded-full ${
                    previewState === "ready" &&
                    !working
                      ? "bg-emerald-400"
                      : "bg-accent"
                  }`}
                />
              </span>

              {working
                ? "Updating preview"
                : previewState === "loading"
                  ? "Loading preview"
                  : "Preview ready"}
            </span>
          </footer>
        </div>
      )}
    </section>
  );
}

/* =========================================================
   PREVIEW ACTION BUTTON
========================================================= */

function PreviewAction({
  children,
  label,
  onClick,
  disabled = false,
  active = false,
  dark = false,
  className = "",
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  dark?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`group inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-200 focus:outline-none focus-visible:ring-2 ${
        dark
          ? "border-transparent text-white/45 hover:border-white/10 hover:bg-white/10 hover:text-white focus-visible:ring-white/20"
          : "border-transparent text-ink/50 hover:border-line hover:bg-paper hover:text-ink focus-visible:ring-accent/25"
      } ${
        active
          ? dark
            ? "bg-white/10 text-white"
            : "bg-paper text-accent"
          : ""
      } ${
        disabled
          ? "pointer-events-none cursor-not-allowed opacity-30"
          : "active:scale-95"
      } ${className}`}
    >
      {children}
    </button>
  );
}

/* =========================================================
   LOADING OVERLAY
========================================================= */

function PreviewLoadingOverlay({
  fullscreen = false,
}: {
  fullscreen?: boolean;
}) {
  return (
    <div
      className={`absolute inset-0 z-30 flex items-center justify-center backdrop-blur-[3px] ${
        fullscreen
          ? "bg-white/70"
          : "bg-white/72"
      }`}
      aria-live="polite"
      aria-label="Loading website preview"
    >
      <div className="flex min-w-[220px] items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-[0_16px_50px_rgba(0,0,0,0.12)]">
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10">
          <span className="absolute inset-0 animate-ping rounded-lg bg-accent/5" />

          <Loader2 className="relative h-4 w-4 animate-spin text-accent" />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-bold text-ink">
            Updating preview...
          </p>

          <p className="mt-0.5 text-[9px] font-medium text-ink/35">
            Applying the latest changes
          </p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   EMPTY PREVIEW
========================================================= */

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
        {/* Decorative Background */}

        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-accent/5 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-teal/5 blur-3xl" />

        <div className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-accent/20 to-transparent" />

        <div className="relative">
          {/* Main Icon */}

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

          {/* Feature Badges */}

          {!working && (
            <div className="mt-7 flex flex-wrap justify-center gap-2">
              <PreviewHint
                icon={
                  <Globe2 className="h-3 w-3" />
                }
                text="Live preview"
              />

              <PreviewHint
                icon={
                  <Smartphone className="h-3 w-3" />
                }
                text="Responsive"
              />

              <PreviewHint
                icon={
                  <ShieldCheck className="h-3 w-3" />
                }
                text="Sandboxed"
              />

              <PreviewHint
                icon={
                  <Check className="h-3 w-3" />
                }
                text="Generated code"
              />
            </div>
          )}

          {/* Working State */}

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

/* =========================================================
   PREVIEW FEATURE BADGE
========================================================= */

function PreviewHint({
  text,
  icon,
}: {
  text: string;
  icon?: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/80 px-3 py-1.5 text-[10px] font-semibold text-ink/50 shadow-sm transition-all duration-200 hover:border-ink/15 hover:bg-white hover:text-ink/70">
      {icon}
      {text}
    </span>
  );
}