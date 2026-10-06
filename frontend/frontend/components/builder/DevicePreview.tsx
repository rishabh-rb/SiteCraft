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

const deviceIcons = {
  desktop: Laptop,
  tablet: Tablet,
  mobile: Smartphone,
};

const deviceLabels = {
  desktop: "Desktop",
  tablet: "Tablet",
  mobile: "Mobile",
};

const deviceDescriptions = {
  desktop: "Preview website on a large screen",
  tablet: "Preview website on a tablet",
  mobile: "Preview website on a mobile phone",
};

const devices: Device[] = ["desktop", "tablet", "mobile"];

export function DevicePreview({
  device,
  setDevice,
}: DevicePreviewProps) {
  return (
    <div
      role="group"
      aria-label="Preview device"
      className="inline-flex items-center rounded-xl border border-line bg-white/90 p-1 shadow-sm backdrop-blur-md"
    >
      {/* Preview Label */}
      <div className="hidden items-center gap-1.5 px-2.5 sm:flex">
        <Monitor className="h-3.5 w-3.5 text-ink/35" />

        <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-ink/40">
          Preview
        </span>
      </div>

      {/* Device Switcher */}
      <div className="flex items-center gap-0.5">
        {devices.map((mode) => {
          const Icon = deviceIcons[mode];
          const isActive = device === mode;

          return (
            <button
              key={mode}
              type="button"
              onClick={() => setDevice(mode)}
              aria-pressed={isActive}
              aria-label={deviceDescriptions[mode]}
              title={deviceDescriptions[mode]}
              className={`group relative inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-1 ${
                isActive
                  ? "bg-ink text-white shadow-sm"
                  : "text-ink/50 hover:bg-ink/[0.05] hover:text-ink"
              }`}
            >
              {/* Active Indicator */}
              <span
                className={`absolute left-1/2 top-0 h-0.5 -translate-x-1/2 rounded-full bg-teal transition-all duration-200 ${
                  isActive ? "w-5 opacity-100" : "w-0 opacity-0"
                }`}
              />

              {/* Device Icon */}
              <Icon
                className={`h-3.5 w-3.5 shrink-0 transition-all duration-200 ${
                  isActive
                    ? "text-teal"
                    : "text-ink/35 group-hover:scale-110 group-hover:text-ink/65"
                }`}
              />

              {/* Desktop Label */}
              <span className="hidden md:inline">
                {deviceLabels[mode]}
              </span>

              {/* Compact Label */}
              <span className="text-[9px] md:hidden">
                {deviceLabels[mode].charAt(0)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Current Device */}
      <div className="ml-1 hidden items-center gap-1.5 border-l border-line pl-2.5 sm:flex">
        <span
          className="h-1.5 w-1.5 rounded-full bg-teal shadow-[0_0_6px_rgba(20,184,166,0.45)]"
          aria-hidden="true"
        />

        <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink/40">
          {deviceLabels[device]}
        </span>

        <Check
          className="h-3 w-3 text-teal/70"
          strokeWidth={2.5}
        />
      </div>
    </div>
  );
}