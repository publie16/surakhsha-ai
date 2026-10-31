"use client";

import { Shield, Clock, Navigation, CheckCircle2, AlertCircle, Info, Zap } from "lucide-react";
import type { ScoredRoute } from "@/lib/types";

interface RouteComparisonCardProps {
  fastestRoute: ScoredRoute;
  safestRoute: ScoredRoute;
  selectedRouteId: "fastest" | "safest";
  onSelectRoute: (id: "fastest" | "safest") => void;
  timeOfDayHour: number;
}

export default function RouteComparisonCard({
  fastestRoute,
  safestRoute,
  selectedRouteId,
  onSelectRoute,
  timeOfDayHour,
}: RouteComparisonCardProps) {
  const activeRoute = selectedRouteId === "safest" ? safestRoute : fastestRoute;

  // Formatting helpers
  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${meters} m`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-safe bg-safe/20 border-safe/30";
    if (score >= 50) return "text-copper bg-copper/20 border-copper/30";
    return "text-sos bg-sos/20 border-sos/30";
  };

  const getProgressBarColor = (score: number) => {
    if (score >= 75) return "bg-safe";
    if (score >= 50) return "bg-copper";
    return "bg-sos";
  };

  return (
    <div className="space-y-4">
      {/* Route Switcher Pills */}
      <div className="grid grid-cols-2 gap-2.5 p-1 bg-surface-dark/90 rounded-2xl border border-white/10">
        {/* Safest Route Option */}
        <button
          type="button"
          onClick={() => onSelectRoute("safest")}
          className={`flex flex-col text-left p-3 rounded-xl transition-all relative ${
            selectedRouteId === "safest"
              ? "bg-safe/15 border border-safe/40 shadow-sm"
              : "hover:bg-white/5 border border-transparent opacity-80"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-safe flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Safest Route
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${getScoreColor(
                safestRoute.safetyScore
              )}`}
            >
              {safestRoute.safetyScore}/100
            </span>
          </div>

          <div className="flex items-baseline gap-2 text-cream">
            <span className="text-lg font-bold">{safestRoute.durationMinutes} min</span>
            <span className="text-xs text-cream-muted">{formatDistance(safestRoute.distanceMeters)}</span>
          </div>

          <span className="text-[10px] text-safe font-medium mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Recommended
          </span>
        </button>

        {/* Fastest Route Option */}
        <button
          type="button"
          onClick={() => onSelectRoute("fastest")}
          className={`flex flex-col text-left p-3 rounded-xl transition-all relative ${
            selectedRouteId === "fastest"
              ? "bg-white/15 border border-white/30 shadow-sm"
              : "hover:bg-white/5 border border-transparent opacity-70"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-cream-muted flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Fastest Route
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${getScoreColor(
                fastestRoute.safetyScore
              )}`}
            >
              {fastestRoute.safetyScore}/100
            </span>
          </div>

          <div className="flex items-baseline gap-2 text-cream">
            <span className="text-lg font-bold">{fastestRoute.durationMinutes} min</span>
            <span className="text-xs text-cream-muted">{formatDistance(fastestRoute.distanceMeters)}</span>
          </div>

          <span className="text-[10px] text-sos font-medium mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Higher Risk Pockets
          </span>
        </button>
      </div>

      {/* "Why this route" plain-English explanation */}
      <div className="glass-card rounded-2xl p-3.5 border border-white/10 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-copper">
          <Info className="w-3.5 h-3.5" />
          <span>Why this route ({activeRoute.name})</span>
        </div>
        <p className="text-xs text-cream/90 leading-relaxed">
          {activeRoute.explanation}
        </p>
      </div>

      {/* Safety Factor Breakdown */}
      <div className="glass-card rounded-2xl p-4 border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-cream flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-copper" />
            Safety Factor Breakdown
          </span>
          <span className="text-[10px] text-cream-muted">
            Sampling: ~40m intervals
          </span>
        </div>

        <div className="space-y-2.5 text-xs">
          {/* Factor 1: Lighting */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-cream-muted">Street Lighting & Visibility</span>
              <span className="font-semibold text-cream">
                {activeRoute.factors.lightingScore}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(
                  activeRoute.factors.lightingScore
                )}`}
                style={{ width: `${activeRoute.factors.lightingScore}%` }}
              />
            </div>
          </div>

          {/* Factor 2: Crowd & Open Businesses */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-cream-muted">Commercial Corridors & Footfall</span>
              <span className="font-semibold text-cream">
                {activeRoute.factors.crowdCommerceScore}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(
                  activeRoute.factors.crowdCommerceScore
                )}`}
                style={{ width: `${activeRoute.factors.crowdCommerceScore}%` }}
              />
            </div>
          </div>

          {/* Factor 3: Historical NCRB Hotspot Clearance */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-cream-muted">Historical Zone Clearance</span>
              <span className="font-semibold text-cream">
                {activeRoute.factors.historicalSafetyScore}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(
                  activeRoute.factors.historicalSafetyScore
                )}`}
                style={{ width: `${activeRoute.factors.historicalSafetyScore}%` }}
              />
            </div>
          </div>

          {/* Factor 4: Community Reports */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-cream-muted">Community Trust Rating</span>
              <span className="font-semibold text-cream">
                {activeRoute.factors.communityReportsScore}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(
                  activeRoute.factors.communityReportsScore
                )}`}
                style={{ width: `${activeRoute.factors.communityReportsScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
