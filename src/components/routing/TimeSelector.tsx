"use client";

import { Sun, Moon, Clock } from "lucide-react";

interface TimeSelectorProps {
  selectedHour: number;
  onChangeHour: (hour: number) => void;
}

export default function TimeSelector({
  selectedHour,
  onChangeHour,
}: TimeSelectorProps) {
  const isNight = selectedHour >= 20 || selectedHour < 6;

  const presets = [
    { label: "Broad Day (14:00)", hour: 14, icon: Sun, color: "text-amber-400" },
    { label: "Twilight (19:00)", hour: 19, icon: Sun, color: "text-copper" },
    { label: "Night Walk (23:00)", hour: 23, icon: Moon, color: "text-indigo-400" },
    { label: "Midnight (02:00)", hour: 2, icon: Moon, color: "text-purple-400" },
  ];

  return (
    <div className="glass-card rounded-2xl p-3 border border-white/10 space-y-2">
      <div className="flex items-center justify-between text-xs font-semibold text-cream">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-copper" />
          <span>Walk Time Simulation</span>
        </span>
        <span
          className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
            isNight
              ? "text-purple-300 bg-purple-950/60 border-purple-500/30"
              : "text-amber-300 bg-amber-950/60 border-amber-500/30"
          }`}
        >
          {selectedHour.toString().padStart(2, "0")}:00 {isNight ? "(Night Mode)" : "(Daylight)"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5 pt-1">
        {presets.map((p) => {
          const Icon = p.icon;
          const isActive = selectedHour === p.hour;
          return (
            <button
              key={p.hour}
              type="button"
              onClick={() => onChangeHour(p.hour)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-left text-[11px] font-medium transition-all ${
                isActive
                  ? "bg-terracotta text-white shadow-sm font-semibold"
                  : "bg-white/5 hover:bg-white/10 text-cream-muted hover:text-cream border border-white/5"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-white" : p.color}`} />
              <span className="truncate">{p.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
