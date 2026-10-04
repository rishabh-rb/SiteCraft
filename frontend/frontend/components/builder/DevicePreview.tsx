
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

const deviceShortLabels = {
  desktop: "Desktop",
  tablet: "Tablet",
  mobile: "Mobile",
};

const deviceDescriptions = {
  desktop: "Preview website on a large screen",
  tablet: "Preview website on a tablet",
  mobile: "Preview website on a mobile phone",
};

export function DevicePreview({
  device,
  setDevice,
}: DevicePreviewProps) {
  return (
    <div
      role="group"
      aria-label="Preview device"
      className="inline-flex items-center rounded-lg border border-line bg-white/80 p-1 shadow-sm backdrop-blur-sm"
    >
      {/* =====================================================
          PREVIEW LABEL
      ===================================================== */}
      <div className="hidden items-center gap-1.5 px-2 sm:flex">
        <Monitor className="h-3.5 w-3.5 text-ink/35" />

        <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-ink/40">
          Preview
        </span>
      </div>

      {/* =====================================================
          DEVICE SWITCHER
      ===================================================== */}
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
                aria-label={deviceDescriptions[mode]}
                title={deviceDescriptions[mode]}
                className={`group relative inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-1 ${
                  isActive
                    ? "bg-ink text-white shadow-sm"
                    : "text-ink/50 hover:bg-ink/[0.05] hover:text-ink"
                }`}
              >
                {/* Active Top Indicator */}
                {isActive && (
                  <span className="absolute left-1/2 top-0 h-0.5 w-5 -translate-x-1/2 rounded-full bg-teal" />
                )}

                {/* Device Icon */}
                <Icon
                  className={`h-3.5 w-3.5 shrink-0 transition-all duration-150 ${
                    isActive
                      ? "text-teal"
                      : "text-ink/35 group-hover:scale-105 group-hover:text-ink/65"
                  }`}
                />

                {/* Device Label */}
                <span className="hidden md:inline">
                  {deviceLabels[mode]}
                </span>

                {/* Mobile: short visual label */}
                <span className="md:hidden text-[9px]">
                  {deviceShortLabels[mode].slice(0, 1)}
                </span>
              </button>
            );
          }
        )}
      </div>

      {/* =====================================================
          CURRENT DEVICE
      ===================================================== */}
      <div className="ml-1 hidden items-center gap-1.5 border-l border-line pl-2 sm:flex">
        <span className="h-1.5 w-1.5 rounded-full bg-teal" />

        <span className="text-[9px] font-bold uppercase tracking-wide text-ink/40">
          {deviceLabels[device]}
        </span>

        <Check className="h-3 w-3 text-teal/70" />
      </div>
    </div>
  );
}
```

### What makes this version better

* **Cleaner toolbar appearance** — less visual weight.
* **Active device is immediately obvious** with dark background + teal indicator.
* **Better accessibility** with `aria-pressed`, descriptive labels, and keyboard focus.
* **Responsive behavior** — full device names on larger screens and compact labels on smaller screens.
* **Better hover animation** on inactive device icons.
* **Current device indicator** on the right.
* Uses `focus-visible` so focus styling doesn't appear unnecessarily during normal mouse clicks.
* Keeps the exact same public API:

  ```tsx
  <DevicePreview
    device={device}
    setDevice={setDevice}
  />
