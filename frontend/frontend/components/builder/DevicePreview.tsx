"use client";

import {
  Laptop,
  Smartphone,
  Tablet,
  Monitor,
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
  desktop: "Large screen preview",
  tablet: "Tablet preview",
  mobile: "Mobile preview",
};

export function DevicePreview({
  device,
  setDevice,
}: DevicePreviewProps) {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-lg border border-line bg-paper/70 p-1 shadow-sm backdrop-blur-sm"
      role="group"
      aria-label="Preview device"
    >
      {/* Preview Label */}
      <div className="hidden items-center gap-1.5 px-2 sm:flex">
        <Monitor className="h-3.5 w-3.5 text-ink/35" />

        <span className="text-[10px] font-bold uppercase tracking-wider text-ink/40">
          Preview
        </span>
      </div>

      {/* Device Buttons */}
      <div className="flex items-center gap-0.5">
        {(["desktop", "tablet", "mobile"] as Device[]).map(
          (mode) => {
            const Icon = deviceIcons[mode];
            const isActive = device === mode;

            return (
              <button
                key={mode}
                type="button"
                onClick={() => setDevice(mode)}
                aria-pressed={isActive}
                aria-label={`Preview on ${deviceLabels[mode]}`}
                title={`${deviceDescriptions[mode]}`}
                className={`group relative inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-teal/30 ${
                  isActive
                    ? "bg-ink text-white shadow-sm"
                    : "text-ink/55 hover:bg-ink/[0.05] hover:text-ink"
                }`}
              >
                {/* Active Indicator */}
                {isActive && (
                  <span className="absolute bottom-0.5 left-1/2 h-0.5 w-3 -translate-x-1/2 rounded-full bg-teal" />
                )}

                {/* Icon */}
                <Icon
                  className={`h-3.5 w-3.5 shrink-0 transition-transform duration-150 ${
                    isActive
                      ? "text-teal"
                      : "text-ink/40 group-hover:scale-105 group-hover:text-ink/70"
                  }`}
                />

                {/* Label */}
                <span className="hidden md:inline">
                  {deviceLabels[mode]}
                </span>
              </button>
            );
          }
        )}
      </div>

      {/* Current Device */}
      <div className="hidden border-l border-line px-2 sm:block">
        <span className="text-[9px] font-semibold uppercase tracking-wide text-ink/35">
          {deviceLabels[device]}
        </span>
      </div>
    </div>
  );
}
