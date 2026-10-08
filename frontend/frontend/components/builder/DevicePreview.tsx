"use client";

import {
  Laptop,
  Smartphone,
  Tablet,
  Monitor,
  Check,
} from "lucide-react";

export type Device = "desktop" | "tablet" | "mobile";

interface DevicePreviewProps {
  device: Device;
  setDevice: (device: Device) => void;
}

/* =========================================================
   CONSTANTS
========================================================= */

const deviceIcons = {
  desktop: Laptop,
  tablet: Tablet,
  mobile: Smartphone,
} as const;

const deviceLabels = {
  desktop: "Desktop",
  tablet: "Tablet",
  mobile: "Mobile",
} as const;

const deviceDescriptions = {
  desktop: "Preview website on a large screen",
  tablet: "Preview website on a tablet",
  mobile: "Preview website on a mobile phone",
} as const;

const devices: Device[] = [
  "desktop",
  "tablet",
  "mobile",
];

/* =========================================================
   COMPONENT
========================================================= */

export function DevicePreview({
  device,
  setDevice,
}: DevicePreviewProps) {
  return (
    <div
      role="group"
      aria-label="Preview device selector"
      className="inline-flex max-w-full items-center gap-1 rounded-2xl border border-line bg-white/95 p-1 shadow-sm backdrop-blur-xl"
    >
      {/* ==================================================
          PREVIEW INFO
      ================================================== */}

      <div className="hidden shrink-0 items-center gap-1.5 px-2 sm:flex">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink/[0.04]">
          <Monitor
            className="h-3.5 w-3.5 text-ink/40"
            aria-hidden="true"
          />
        </div>

        <div className="leading-none">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-ink/40">
            Preview
          </p>

          <p className="mt-1 text-[8px] font-medium text-ink/25">
            Responsive
          </p>
        </div>
      </div>

      {/* ==================================================
          DEVICE SWITCHER
      ================================================== */}

      <div
        className="flex items-center gap-0.5 rounded-xl bg-ink/[0.035] p-0.5"
        role="group"
        aria-label="Device options"
      >
        {devices.map((mode) => {
          const Icon = deviceIcons[mode];
          const isActive = device === mode;

          return (
            <button
              key={mode}
              type="button"
              onClick={() => setDevice(mode)}
              disabled={isActive}
              aria-pressed={isActive}
              aria-label={`Switch to ${deviceLabels[mode]} preview`}
              title={deviceDescriptions[mode]}
              className={`group relative inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold outline-none transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-1 ${
                isActive
                  ? "w-[78px] cursor-default bg-ink text-white shadow-md"
                  : "w-9 text-ink/45 hover:bg-white hover:text-ink hover:shadow-sm sm:w-[68px]"
              }`}
            >
              {/* ==================================================
                  ACTIVE BACKGROUND
              ================================================== */}

              {isActive && (
                <span
                  className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg"
                  aria-hidden="true"
                >
                  <span className="absolute -left-1/2 top-0 h-full w-1/2 -skew-x-12 bg-white/[0.06] transition-transform duration-500 group-hover:translate-x-[280%]" />
                </span>
              )}

              {/* ==================================================
                  ACTIVE TOP INDICATOR
              ================================================== */}

              <span
                className={`absolute left-1/2 top-0 h-0.5 -translate-x-1/2 rounded-full bg-teal transition-all duration-200 ${
                  isActive
                    ? "w-5 opacity-100"
                    : "w-0 opacity-0"
                }`}
                aria-hidden="true"
              />

              {/* ==================================================
                  ICON
              ================================================== */}

              <Icon
                className={`relative z-10 h-3.5 w-3.5 shrink-0 transition-all duration-200 ${
                  isActive
                    ? "text-teal"
                    : "text-ink/35 group-hover:scale-110 group-hover:text-ink/70"
                }`}
                strokeWidth={isActive ? 2.2 : 2}
                aria-hidden="true"
              />

              {/* ==================================================
                  DESKTOP LABEL
              ================================================== */}

              <span
                className={`relative z-10 hidden sm:inline ${
                  isActive
                    ? "text-white"
                    : "text-ink/50 group-hover:text-ink/80"
                }`}
              >
                {deviceLabels[mode]}
              </span>

              {/* ==================================================
                  MOBILE LABEL
              ================================================== */}

              <span
                className={`relative z-10 text-[9px] sm:hidden ${
                  isActive
                    ? "text-white"
                    : "text-ink/50"
                }`}
              >
                {deviceLabels[mode].charAt(0)}
              </span>
            </button>
          );
        })}
      </div>

      {/* ==================================================
          CURRENT DEVICE
      ================================================== */}

      <div className="ml-1 hidden shrink-0 items-center gap-1.5 border-l border-line pl-2.5 sm:flex">
        {/* Status */}

        <span
          className="relative flex h-2 w-2 items-center justify-center"
          aria-hidden="true"
        >
          <span className="absolute h-2 w-2 animate-ping rounded-full bg-teal/25" />

          <span className="relative h-1.5 w-1.5 rounded-full bg-teal" />
        </span>

        {/* Device Name */}

        <div className="leading-none">
          <p className="text-[8px] font-medium uppercase tracking-wider text-ink/25">
            Viewing
          </p>

          <p className="mt-1 text-[9px] font-bold text-ink/55">
            {deviceLabels[device]}
          </p>
        </div>

        <Check
          className="ml-0.5 h-3 w-3 text-teal/70"
          strokeWidth={2.5}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}