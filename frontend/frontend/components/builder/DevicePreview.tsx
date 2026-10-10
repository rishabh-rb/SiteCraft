
"use client";

import {
  Check,
  Laptop,
  Monitor,
  Smartphone,
  Tablet,
} from "lucide-react";

export type Device = "desktop" | "tablet" | "mobile";

interface DevicePreviewProps {
  device: Device;
  setDevice: (device: Device) => void;
}

/* =========================================================
   TYPES & CONFIGURATION
========================================================= */

interface DeviceConfig {
  label: string;
  description: string;
  dimensions: string;
  width: number;
  height: number;
  icon: typeof Laptop;
}

const DEVICE_CONFIG: Record<Device, DeviceConfig> = {
  desktop: {
    label: "Desktop",
    description: "Large desktop viewport",
    dimensions: "1440 × 900",
    width: 1440,
    height: 900,
    icon: Laptop,
  },
  tablet: {
    label: "Tablet",
    description: "Tablet viewport",
    dimensions: "768 × 1024",
    width: 768,
    height: 1024,
    icon: Tablet,
  },
  mobile: {
    label: "Mobile",
    description: "Mobile phone viewport",
    dimensions: "390 × 844",
    width: 390,
    height: 844,
    icon: Smartphone,
  },
};

const DEVICES: Device[] = ["desktop", "tablet", "mobile"];

/* =========================================================
   COMPONENT
========================================================= */

export function DevicePreview({
  device,
  setDevice,
}: DevicePreviewProps) {
  const activeDevice = DEVICE_CONFIG[device];
  const ActiveIcon = activeDevice.icon;

  return (
    <section
      className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-line bg-white/95 p-1.5 shadow-sm backdrop-blur-xl transition-shadow duration-300 hover:shadow-md"
      aria-label="Website preview settings"
    >
      {/* PREVIEW IDENTITY */}

      <div className="hidden shrink-0 items-center gap-2 pl-1.5 sm:flex">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-ink/[0.035]">
          <Monitor
            className="h-4 w-4 text-ink/60"
            strokeWidth={1.8}
            aria-hidden="true"
          />
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink/70">
            Preview
          </p>
          <p className="mt-1 text-[9px] text-ink/40">
            Responsive mode
          </p>
        </div>
      </div>

      <div
        className="hidden h-8 w-px shrink-0 bg-line sm:block"
        aria-hidden="true"
      />

      {/* DEVICE SELECTOR */}

      <div
        className="flex min-w-0 items-center gap-1 rounded-xl bg-ink/[0.035] p-1"
        role="group"
        aria-label="Select preview device"
      >
        {DEVICES.map((mode) => {
          const config = DEVICE_CONFIG[mode];
          const Icon = config.icon;
          const isActive = device === mode;

          return (
            <button
              key={mode}
              type="button"
              onClick={() => {
                if (!isActive) setDevice(mode);
              }}
              aria-pressed={isActive}
              aria-label={`${config.label}: ${config.dimensions} pixels`}
              title={`${config.description} (${config.dimensions})`}
              className={`group relative inline-flex h-9 shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-lg px-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/50 focus-visible:ring-offset-1 sm:gap-2 sm:px-3 ${
                isActive
                  ? "bg-ink text-white shadow-sm"
                  : "text-ink/50 hover:bg-white hover:text-ink/80 hover:shadow-sm"
              }`}
            >
              {/* ACTIVE ACCENT */}

              {isActive && (
                <span
                  className="absolute inset-x-0 top-0 h-0.5 bg-teal"
                  aria-hidden="true"
                />
              )}

              {/* DEVICE ICON */}

              <Icon
                className={`relative h-4 w-4 shrink-0 transition-transform duration-200 ${
                  isActive
                    ? "text-teal"
                    : "group-hover:scale-110"
                }`}
                strokeWidth={isActive ? 2.2 : 1.8}
                aria-hidden="true"
              />

              {/* DEVICE LABEL */}

              <span
                className={`relative text-[10px] font-bold sm:text-[11px] ${
                  isActive ? "text-white" : "text-current"
                }`}
              >
                {config.label}
              </span>

              {/* SELECTED INDICATOR */}

              {isActive && (
                <Check
                  className="relative hidden h-3.5 w-3.5 text-teal sm:block"
                  strokeWidth={2.5}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* VIEWPORT DETAILS */}

      <div className="hidden min-w-0 items-center gap-2 border-l border-line pl-3 pr-1 md:flex">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal/[0.08]">
          <ActiveIcon
            className="h-4 w-4 text-teal"
            strokeWidth={1.8}
            aria-hidden="true"
          />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
              aria-hidden="true"
            />
            <p className="whitespace-nowrap text-[9px] font-medium text-ink/45">
              Active viewport
            </p>
          </div>

          <p className="mt-1 whitespace-nowrap text-[11px] font-bold text-ink/80">
            {activeDevice.dimensions}
          </p>
        </div>
      </div>

      {/* COMPACT VIEWPORT INDICATOR */}

      <div className="flex shrink-0 items-center gap-1.5 px-1 md:hidden">
        <span
          className="h-1.5 w-1.5 rounded-full bg-emerald-500"
          aria-hidden="true"
        />

        <span className="text-[9px] font-semibold tabular-nums text-ink/50">
          {activeDevice.width}
          <span className="mx-0.5 text-ink/25">×</span>
          {activeDevice.height}
        </span>
      </div>
    </section>
  );
}