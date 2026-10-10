
"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  AlertCircle,
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

type PreviewState = "loading" | "ready" | "error";

interface PreviewActionProps {
  children: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  dark?: boolean;
  className?: string;
}

interface PreviewStatusProps {
  working: boolean;
  refreshing: boolean;
  state: PreviewState;
  dark?: boolean;
}

interface PreviewFrameProps {
  html: string;
  title: string;
  device: Device;
  refreshKey: string | number;
  onLoad: () => void;
  onError: () => void;
  fullscreen?: boolean;
}

/* =========================================================
   CONFIGURATION
========================================================= */

const PREVIEW_TIMEOUT = 15000;
const REFRESH_MIN_DURATION = 450;
const BLOB_URL_LIFETIME = 60000;

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

const deviceLabels: Record<Device, string> = {
  desktop: "Desktop",
  tablet: "Tablet",
  mobile: "Mobile",
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

export function PreviewPanel({
  website,
  working,
}: PreviewPanelProps) {
  const [device, setDevice] = useState<Device>("desktop");
  const [refreshKey, setRefreshKey] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [previewState, setPreviewState] =
    useState<PreviewState>("loading");

  const dialogId = useId();

  const refreshTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const timeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshStartedRef = useRef(0);
  const generationRef = useRef(0);

  const blobUrlsRef = useRef<Set<string>>(new Set());

  const blobUrlTimersRef = useRef<
    Map<string, ReturnType<typeof setTimeout>>
  >(new Map());

  const hasWebsite =
    typeof website?.html === "string" &&
    website.html.trim().length > 0;

  const siteName =
    website?.plan?.siteName || "Website Preview";

  const html = website?.html ?? "";

  /* =======================================================
     TIMER UTILITIES
  ======================================================= */

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const clearPreviewTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const clearBlobUrls = useCallback(() => {
    blobUrlTimersRef.current.forEach((timer) => {
      clearTimeout(timer);
    });

    blobUrlTimersRef.current.clear();

    blobUrlsRef.current.forEach((url) => {
      URL.revokeObjectURL(url);
    });

    blobUrlsRef.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      generationRef.current += 1;
      clearRefreshTimer();
      clearPreviewTimeout();
      clearBlobUrls();
    };
  }, [
    clearRefreshTimer,
    clearPreviewTimeout,
    clearBlobUrls,
  ]);

  /* =======================================================
     PREVIEW LOADING LIFECYCLE
  ======================================================= */

  const beginLoading = useCallback(() => {
    clearPreviewTimeout();

    const currentGeneration = ++generationRef.current;

    setPreviewState("loading");

    timeoutRef.current = setTimeout(() => {
      if (generationRef.current !== currentGeneration) {
        return;
      }

      setPreviewState((current) =>
        current === "loading" ? "error" : current,
      );

      timeoutRef.current = null;
    }, PREVIEW_TIMEOUT);
  }, [clearPreviewTimeout]);

  useEffect(() => {
    if (!hasWebsite) {
      generationRef.current += 1;

      clearPreviewTimeout();
      clearRefreshTimer();

      setPreviewState("loading");
      setRefreshing(false);
      setFullscreen(false);

      return;
    }

    beginLoading();

    return () => {
      generationRef.current += 1;
      clearPreviewTimeout();
    };
  }, [
    html,
    hasWebsite,
    beginLoading,
    clearPreviewTimeout,
    clearRefreshTimer,
  ]);

  const handlePreviewLoad = useCallback(() => {
    clearPreviewTimeout();

    setPreviewState("ready");

    const elapsed =
      Date.now() - refreshStartedRef.current;

    const remaining = Math.max(
      0,
      REFRESH_MIN_DURATION - elapsed,
    );

    clearRefreshTimer();

    refreshTimerRef.current = setTimeout(() => {
      setRefreshing(false);
      refreshTimerRef.current = null;
    }, remaining);
  }, [clearPreviewTimeout, clearRefreshTimer]);

  const handlePreviewError = useCallback(() => {
    clearPreviewTimeout();
    clearRefreshTimer();

    setPreviewState("error");
    setRefreshing(false);
  }, [clearPreviewTimeout, clearRefreshTimer]);

  /* =======================================================
     REFRESH
  ======================================================= */

  const handleRefresh = useCallback(() => {
    if (!hasWebsite || refreshing) return;

    clearRefreshTimer();

    refreshStartedRef.current = Date.now();

    setRefreshing(true);
    beginLoading();
    setRefreshKey((current) => current + 1);

    refreshTimerRef.current = setTimeout(() => {
      setRefreshing(false);
      refreshTimerRef.current = null;
    }, PREVIEW_TIMEOUT + REFRESH_MIN_DURATION);
  }, [
    hasWebsite,
    refreshing,
    clearRefreshTimer,
    beginLoading,
  ]);

  /* =======================================================
     FULLSCREEN
  ======================================================= */

  const openFullscreen = useCallback(() => {
    if (!hasWebsite) return;
    setFullscreen(true);
  }, [hasWebsite]);

  const closeFullscreen = useCallback(() => {
    setFullscreen(false);
  }, []);

  useEffect(() => {
    if (!fullscreen) return;

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [fullscreen, closeFullscreen]);

  /* =======================================================
     OPEN IN NEW TAB
  ======================================================= */

  const openInNewTab = useCallback(() => {
    if (!hasWebsite) return;

    let previewWindow: Window | null = null;
    let blobUrl: string | null = null;

    try {
      // Open synchronously to reduce popup-blocker issues.
      previewWindow = window.open("", "_blank");

      if (!previewWindow) return;

      const blob = new Blob([html], {
        type: "text/html;charset=utf-8",
      });

      blobUrl = URL.createObjectURL(blob);

      blobUrlsRef.current.add(blobUrl);

      try {
        previewWindow.opener = null;
      } catch {
        // Some browser configurations restrict this assignment.
      }

      previewWindow.location.replace(blobUrl);

      const urlToRevoke = blobUrl;

      const timer = setTimeout(() => {
        URL.revokeObjectURL(urlToRevoke);

        blobUrlsRef.current.delete(urlToRevoke);
        blobUrlTimersRef.current.delete(urlToRevoke);
      }, BLOB_URL_LIFETIME);

      blobUrlTimersRef.current.set(blobUrl, timer);
    } catch {
      if (blobUrl) {
        const timer = blobUrlTimersRef.current.get(blobUrl);

        if (timer !== undefined) {
          clearTimeout(timer);
          blobUrlTimersRef.current.delete(blobUrl);
        }

        URL.revokeObjectURL(blobUrl);
        blobUrlsRef.current.delete(blobUrl);
      }

      if (previewWindow && !previewWindow.closed) {
        previewWindow.close();
      }
    }
  }, [hasWebsite, html]);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <section
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#d8d1c5]"
      aria-label="Website preview"
    >
      {/* Main toolbar */}
      <header className="relative z-20 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-line bg-white px-3 shadow-sm sm:px-4">
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
                hasWebsite ? "text-accent" : "text-ink/30"
              }`}
              aria-hidden="true"
            />
          </div>

          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-sm font-black tracking-tight text-ink">
                {siteName}
              </h2>

              {hasWebsite && (
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

            <p className="hidden truncate text-[10px] text-ink/45 sm:block">
              {hasWebsite
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

        {/* Toolbar actions */}
        <div className="flex shrink-0 items-center gap-1">
          <PreviewAction
            label="Refresh preview"
            onClick={handleRefresh}
            disabled={!hasWebsite || refreshing}
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

          <PreviewAction
            label="Open fullscreen preview"
            onClick={openFullscreen}
            disabled={!hasWebsite}
          >
            <Maximize2 className="h-4 w-4 transition-transform group-hover:scale-105" />
          </PreviewAction>
        </div>
      </header>

      {/* Mobile device controls */}
      <div className="flex shrink-0 justify-center border-b border-line bg-white px-3 py-2 md:hidden">
        <DevicePreview
          device={device}
          setDevice={setDevice}
        />
      </div>

      {/* Preview viewport */}
      <main className="panel-scroll relative flex min-h-0 flex-1 justify-center overflow-auto p-3 sm:p-5 lg:p-6">
        {hasWebsite ? (
          <div
            className={`relative flex ${deviceClass[device]} justify-center transition-[width] duration-300 ease-out`}
          >
            <div
              className={`relative flex w-full flex-col overflow-hidden border bg-white transition-[border-radius,box-shadow] duration-300 ${
                device === "mobile"
                  ? "rounded-[30px] border-[5px] border-[#222] shadow-[0_25px_70px_rgba(0,0,0,0.24)]"
                  : device === "tablet"
                    ? "rounded-2xl border-black/15 shadow-[0_20px_60px_rgba(0,0,0,0.14)]"
                    : "rounded-xl border-black/15 shadow-[0_20px_60px_rgba(0,0,0,0.14)]"
              } ${deviceHeight[device]}`}
            >
              <PreviewFrame
                html={html}
                title={`${siteName} preview`}
                device={device}
                refreshKey={refreshKey}
                onLoad={handlePreviewLoad}
                onError={handlePreviewError}
              />

              {(working || previewState === "loading") && (
                <PreviewLoadingOverlay />
              )}

              {previewState === "error" && !working && (
                <PreviewErrorOverlay onRetry={handleRefresh} />
              )}
            </div>
          </div>
        ) : (
          <EmptyPreview working={working} />
        )}
      </main>

      {/* Status bar */}
      {hasWebsite && (
        <footer className="flex h-7 shrink-0 items-center justify-between border-t border-line bg-white px-3 text-[9px]">
          <div className="flex min-w-0 items-center gap-3 text-ink/45">
            <span className="shrink-0">
              View:{" "}
              <strong className="font-bold text-ink/65">
                {deviceLabels[device]}
              </strong>
            </span>

            <span className="hidden truncate sm:inline">
              Live HTML preview
            </span>
          </div>

          <PreviewStatus
            working={working}
            refreshing={refreshing}
            state={previewState}
          />
        </footer>
      )}

      {/* Fullscreen dialog */}
      {fullscreen && hasWebsite && (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-[#0b0d0f]/95 p-2 backdrop-blur-md sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${dialogId}-title`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeFullscreen();
            }
          }}
        >
          <header className="flex h-12 shrink-0 items-center justify-between gap-2 rounded-t-xl border border-white/10 bg-[#151719] px-3 shadow-2xl sm:px-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/5">
                <MonitorPlay className="h-3.5 w-3.5 text-white/70" />
              </div>

              <div className="min-w-0">
                <h3
                  id={`${dialogId}-title`}
                  className="truncate text-xs font-bold text-white"
                >
                  {siteName}
                </h3>

                <p className="hidden text-[9px] text-white/40 sm:block">
                  Fullscreen live preview
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <PreviewAction
                label="Refresh fullscreen preview"
                onClick={handleRefresh}
                disabled={refreshing}
                dark
                active={refreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    refreshing ? "animate-spin" : ""
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

          <div className="flex shrink-0 items-center justify-center border-x border-white/10 bg-[#111315] py-2">
            <DevicePreview
              device={device}
              setDevice={setDevice}
            />
          </div>

          <div
            className={`relative flex min-h-0 flex-1 justify-center overflow-auto border-x border-white/10 bg-[#d8d1c5] p-3 sm:p-5 ${
              device === "mobile" ? "items-start" : ""
            }`}
          >
            <div
              className={`relative flex ${deviceClass[device]} shrink-0 flex-col overflow-hidden bg-white ${
                device === "mobile"
                  ? "rounded-[30px] border-[5px] border-[#222] shadow-2xl"
                  : device === "tablet"
                    ? "rounded-2xl border border-black/15 shadow-2xl"
                    : "rounded-xl border border-black/15 shadow-2xl"
              } ${deviceHeight[device]}`}
            >
              <PreviewFrame
                html={html}
                title={`${siteName} fullscreen preview`}
                device={device}
                refreshKey={`fullscreen-${refreshKey}`}
                onLoad={handlePreviewLoad}
                onError={handlePreviewError}
                fullscreen
              />

              {(working || previewState === "loading") && (
                <PreviewLoadingOverlay fullscreen />
              )}

              {previewState === "error" && !working && (
                <PreviewErrorOverlay onRetry={handleRefresh} />
              )}
            </div>
          </div>

          <footer className="flex h-8 shrink-0 items-center justify-between rounded-b-xl border-x border-b border-white/10 bg-[#111315] px-3 text-[9px] text-white/40 sm:px-4">
            <span className="hidden sm:inline">
              Press ESC to exit fullscreen
            </span>

            <PreviewStatus
              working={working}
              refreshing={refreshing}
              state={previewState}
              dark
            />
          </footer>
        </div>
      )}
    </section>
  );
}

/* =========================================================
   REUSABLE PREVIEW FRAME
========================================================= */

function PreviewFrame({
  html,
  title,
  device,
  refreshKey,
  onLoad,
  onError,
  fullscreen = false,
}: PreviewFrameProps) {
  return (
    <>
      {/* Browser chrome */}
      {device !== "mobile" && (
        <div className="flex h-9 shrink-0 items-center border-b border-black/10 bg-[#f5f5f5] px-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </div>

          <div className="mx-auto flex max-w-[55%] items-center gap-1.5 truncate rounded-md border border-black/5 bg-white px-3 py-1 text-[8px] text-black/40 shadow-sm">
            <Globe2 className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">preview.local</span>
          </div>

          <div className="w-[42px] shrink-0" />
        </div>
      )}

      {/* Mobile notch */}
      {device === "mobile" && (
        <div
          className="pointer-events-none absolute left-1/2 top-0 z-20 h-5 w-28 -translate-x-1/2 rounded-b-2xl bg-[#222]"
          aria-hidden="true"
        />
      )}

      {/* Sandboxed generated website */}
      <iframe
        key={refreshKey}
        title={title}
        sandbox="allow-scripts allow-forms allow-popups allow-modals"
        referrerPolicy="no-referrer"
        loading="eager"
        onLoad={onLoad}
        onError={onError}
        className={`min-h-0 w-full flex-1 border-none bg-white ${
          fullscreen && device !== "mobile"
            ? deviceHeight[device]
            : ""
        }`}
        srcDoc={html}
      />
    </>
  );
}

/* =========================================================
   ACTION BUTTON
========================================================= */

function PreviewAction({
  children,
  label,
  onClick,
  disabled = false,
  active = false,
  dark = false,
  className = "",
}: PreviewActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`group inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all duration-200 focus:outline-none focus-visible:ring-2 ${
        dark
          ? "border-transparent text-white/50 hover:border-white/10 hover:bg-white/10 hover:text-white focus-visible:ring-white/25"
          : "border-transparent text-ink/55 hover:border-line hover:bg-paper hover:text-ink focus-visible:ring-accent/30"
      } ${
        active
          ? dark
            ? "bg-white/10 text-white"
            : "bg-paper text-accent"
          : ""
      } ${
        disabled
          ? "cursor-not-allowed opacity-30"
          : "active:scale-95"
      } ${className}`}
    >
      {children}
    </button>
  );
}

/* =========================================================
   STATUS INDICATOR
========================================================= */

function PreviewStatus({
  working,
  refreshing,
  state,
  dark = false,
}: PreviewStatusProps) {
  const loading =
    working || refreshing || state === "loading";

  const error = state === "error" && !working;

  const ready =
    state === "ready" && !working && !refreshing;

  const color = error
    ? dark
      ? "text-rose-400"
      : "text-rose-600"
    : ready
      ? dark
        ? "text-emerald-400"
        : "text-emerald-600"
      : dark
        ? "text-white/65"
        : "text-accent";

  const label = working
    ? "Updating"
    : refreshing
      ? "Refreshing"
      : state === "loading"
        ? "Loading"
        : error
          ? "Preview unavailable"
          : "Ready";

  return (
    <div
      className={`flex shrink-0 items-center gap-1.5 font-semibold ${color}`}
      aria-live="polite"
      aria-atomic="true"
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : error ? (
        <AlertCircle className="h-3 w-3" />
      ) : (
        <Check className="h-3 w-3" />
      )}

      <span>{label}</span>
    </div>
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
        fullscreen ? "bg-white/70" : "bg-white/75"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex min-w-[220px] items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-[0_16px_50px_rgba(0,0,0,0.12)]">
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10">
          <span className="absolute inset-0 animate-pulse rounded-lg bg-accent/5" />

          <Loader2 className="relative h-4 w-4 animate-spin text-accent" />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-bold text-ink">
            Updating preview...
          </p>

          <p className="mt-0.5 text-[9px] font-medium text-ink/45">
            Rendering your latest website
          </p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   ERROR OVERLAY
========================================================= */

function PreviewErrorOverlay({
  onRetry,
}: {
  onRetry: () => void;
}) {
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-white/90 p-5 backdrop-blur-sm"
      role="alert"
    >
      <div className="max-w-xs text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-rose-200 bg-rose-50">
          <AlertCircle className="h-5 w-5 text-rose-500" />
        </div>

        <h3 className="mt-3 text-sm font-bold text-ink">
          Preview could not load
        </h3>

        <p className="mt-1 text-[11px] leading-5 text-ink/55">
          The preview did not finish loading. Try refreshing it.
        </p>

        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-white transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry preview
        </button>
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
    <div className="flex min-h-[420px] w-full max-w-3xl items-center justify-center">
      <div
        className={`relative w-full overflow-hidden rounded-2xl border border-dashed bg-white/65 p-8 text-center shadow-sm backdrop-blur-sm transition-all duration-500 sm:p-12 ${
          working
            ? "border-accent/30"
            : "border-ink/20"
        }`}
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-accent/5 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-teal/5 blur-3xl" />

        <div className="relative">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border bg-accent/5 shadow-sm ${
              working
                ? "border-accent/20"
                : "border-accent/10"
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
                ? "Your generation pipeline is building the layout, content, styling, and components."
                : "Describe your website and start generation to see the live preview here."}
            </p>
          </div>

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

          {working && (
            <div className="mx-auto mt-7 flex max-w-xs items-center justify-center gap-2 rounded-xl border border-accent/10 bg-accent/5 px-3 py-2.5 text-[10px] font-semibold text-accent">
              <Loader2 className="h-3 w-3 animate-spin" />
              Building your experience
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   FEATURE BADGE
========================================================= */

function PreviewHint({
  text,
  icon,
}: {
  text: string;
  icon?: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/80 px-3 py-1.5 text-[10px] font-semibold text-ink/55 shadow-sm transition-colors hover:border-ink/15 hover:bg-white hover:text-ink/75">
      {icon}
      {text}
    </span>
  );
}