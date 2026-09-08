"use client";

import { Laptop, Smartphone, Tablet } from "lucide-react";

export type Device = "desktop" | "tablet" | "mobile";

interface DevicePreviewProps {
  device: Device;
  setDevice: (device: Device) => void;
}

const deviceIcons = {
  desktop: Laptop,
  tablet: Tablet,
  mobile: Smartphone
};

export function DevicePreview({ device, setDevice }: DevicePreviewProps) {
  return (
    <div className="flex gap-1 bg-paper/60 p-1 rounded-md border border-line">
      {(["desktop", "tablet", "mobile"] as Device[]).map((mode) => {
        const Icon = deviceIcons[mode];
        const isActive = device === mode;
        return (
          <button
            key={mode}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              isActive ? "bg-ink text-white shadow-sm" : "text-ink/65 hover:bg-black/5 hover:text-ink"
            }`}
            onClick={() => setDevice(mode)}
            title={`Preview on ${mode}`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="capitalize">{mode}</span>
          </button>
        );
      })}
    </div>
  );
}
