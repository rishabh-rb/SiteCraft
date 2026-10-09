
"use client";

import {
  Laptop,
  Smartphone,
  Tablet,
  Monitor,
  Check,
  ChevronDown,
} from "lucide-react";

export type Device = "desktop" | "tablet" | "mobile";

interface DevicePreviewProps {
  device: Device;
  setDevice: (device: Device) => void;
}

/* =========================================================
   TYPES & CONFIGURATION
========================================================= */

const deviceConfig = {
  desktop: {
    label: "Desktop",
    shortLabel: "Desktop",
    description: "Preview your website on a desktop screen",
    dimensions: "1440 × 900",
    icon: Laptop,
  },
  tablet: {
    label: "Tablet",
    shortLabel: "Tablet",
    description: "Preview your website on a tablet screen",
    dimensions: "768 × 1024",
    icon: Tablet,
  },
  mobile: {
    label: "Mobile",
    shortLabel: "Mobile",
    description: "Preview your website on a mobile phone",
    dimensions: "390 × 844",
    icon: Smartphone,
  },
} as const;

const devices: Device[] = ["desktop", "tablet", "mobile"];

/* =========================================================
   COMPONENT
========================================================= */

export function DevicePreview({
  device,
  setDevice,
}: DevicePreviewProps) {
  const activeDevice = deviceConfig[device];

  return (
    <div
      className="inline-flex max-w-full items-center gap-1.5 rounded-2xl border border-line bg-white/95 p-1.5 shadow-sm backdrop-blur-xl transition-shadow duration-200 hover:shadow-md"
      role="group"
      aria-label="Website preview device selector"
    >
      {/* ==================================================
          PREVIEW IDENTITY
      ================================================== */}

      <div className="hidden shrink-0 items-center gap-2 px-2 sm:flex">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-line bg-ink/[0.035]">
          <Monitor
            className="h-4 w-4 text-ink/55"
            strokeWidth={1.8}
            aria-hidden="true"
          />
        </div>

        <div className="leading-none">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-ink/65">
            Preview
          </p>

          <p className="mt-1.5 text-[9px] font-medium text-ink/35">
            Device mode
          </p>
        </div>
      </div>

      {/* DIVIDER */}

      <div
        className="hidden h-7 w-px bg-line sm:block"
        aria-hidden="true"
      />

      {/* ==================================================
          DEVICE SWITCHER
      ================================================== */}

      <div
        className="flex items-center gap-1 rounded-xl bg-ink/[0.035] p-1"
        role="group"
        aria-label="Available preview devices"
      >
        {devices.map((mode) => {
          const config = deviceConfig[mode];
          const Icon = config.icon;
          const isActive = device === mode;

          return (
            <button
              key={mode}
              type="button"
              onClick={() => {
                if (!isActive) {
                  setDevice(mode);
                }
              }}
              aria-pressed={isActive}
              aria-label={`${config.description}${isActive ? ", currently selected" : ""}`}
              title={config.description}
              className={`group relative inline-flex h-9 items-center justify-center gap-2 overflow-hidden rounded-lg px-2.5 outline-none transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1 sm:px-3 ${
                isActive
                  ? "bg-ink text-white shadow-sm"
                  : "text-ink/45 hover:bg-white hover:text-ink/80 hover:shadow-sm"
              }`}
            >
              {/* ACTIVE BACKGROUND ACCENT */}

              {isActive && (
                <span
                  className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-teal"
                  aria-hidden="true"
                />
              )}

              {/* DEVICE ICON */}

              <Icon
                className={`relative z-10 h-4 w-4 shrink-0 transition-transform duration-200 ${
                  isActive
                    ? "text-teal"
                    : "group-hover:scale-110"
                }`}
                strokeWidth={isActive ? 2.2 : 1.8}
                aria-hidden="true"
              />

              {/* DEVICE LABEL */}

              <span
                className={`relative z-10 text-[10px] font-bold sm:text-[11px] ${
                  isActive ? "text-white" : "text-current"
                }`}
              >
                {config.shortLabel}
              </span>

              {/* SELECTED CHECK */}

              {isActive && (
                <Check
                  className="relative z-10 hidden h-3 w-3 text-teal sm:block"
                  strokeWidth={2.5}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ==================================================
          CURRENT DEVICE DETAILS
      ================================================== */}

      <div className="relative ml-0.5 hidden items-center gap-2 border-l border-line pl-3 pr-1 md:flex">
        {/* STATUS INDICATOR */}

        <span
          className="relative flex h-2 w-2 shrink-0 items-center justify-center"
          aria-hidden="true"
        >
          <span className="absolute h-2 w-2 animate-ping rounded-full bg-emerald-500/30" />

          <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </span>

        {/* CURRENT DEVICE INFO */}

        <div className="min-w-0 leading-none">
          <p className="text-[9px] font-medium text-ink/40">
            Active viewport
          </p>

          <p className="mt-1.5 whitespace-nowrap text-[10px] font-bold text-ink/75">
            {activeDevice.label}
          </p>
        </div>

        <div className="ml-1 rounded-lg border border-line bg-ink/[0.025] px-2 py-1.5">
          <p className="whitespace-nowrap text-[9px] font-semibold tabular-nums text-ink/50">
            {activeDevice.dimensions}
          </p>
        </div>
      </div>

      {/* ==================================================
          COMPACT VIEWPORT INDICATOR
      ================================================== */}

      <div className="flex items-center gap-1 px-1 md:hidden">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

        <span className="text-[9px] font-semibold text-ink/45">
          {activeDevice.label}
        </span>
      </div>
    </div>
  );
}