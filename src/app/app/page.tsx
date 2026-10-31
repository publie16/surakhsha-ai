"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Shield,
  Locate,
  ArrowLeft,
  Navigation,
  Compass,
  Layers,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import PlaceSearch from "@/components/routing/PlaceSearch";
import RouteComparisonCard from "@/components/routing/RouteComparisonCard";
import TimeSelector from "@/components/routing/TimeSelector";
import type { Coordinates, ScoredRoute, RouteComparisonResponse } from "@/lib/types";

// Dynamic import for Leaflet Map to ensure no SSR / window undefined errors
const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-surface-dark text-cream-muted gap-3">
      <div className="w-10 h-10 border-4 border-terracotta border-t-transparent rounded-full animate-spin" />
      <span className="text-sm font-medium">Initializing OpenStreetMap...</span>
    </div>
  ),
});

export default function AppPage() {
  const [origin, setOrigin] = useState<Coordinates | null>(null);
  const [originName, setOriginName] = useState<string>("");
  const [destination, setDestination] = useState<Coordinates | null>(null);
  const [destinationName, setDestinationName] = useState<string>("");
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);

  // Active point picking mode when tapping map
  const [activeSelectionMode, setActiveSelectionMode] = useState<"origin" | "destination">("origin");
  const [isLocating, setIsLocating] = useState(false);
  const [mobilePanelExpanded, setMobilePanelExpanded] = useState(true);

  // Milestone 2 Routing State
  const [selectedHour, setSelectedHour] = useState<number>(22); // Default to night (22:00) to showcase safety algorithm
  const [isCalculatingRoute, setIsCalculatingRoute] = useState<boolean>(false);
  const [fastestRoute, setFastestRoute] = useState<ScoredRoute | null>(null);
  const [safestRoute, setSafestRoute] = useState<ScoredRoute | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<"fastest" | "safest">("safest");
  const [routeError, setRouteError] = useState<string | null>(null);

  // Handle geolocation
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserLocation(coords);
        setOrigin(coords);
        setOriginName("My Current Location");
        setActiveSelectionMode("destination");
        setIsLocating(false);
      },
      (err) => {
        console.warn("Geolocation denied or failed:", err);
        setIsLocating(false);
        // Fallback default Delhi city center for demonstration if user denies
        const fallback = { lat: 28.6139, lng: 77.209 };
        setUserLocation(fallback);
        setOrigin(fallback);
        setOriginName("Connaught Place, New Delhi (Simulated)");
        setActiveSelectionMode("destination");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Map click handler to set points
  const handleMapSelectPoint = useCallback(
    async (coords: Coordinates, mode: "origin" | "destination") => {
      const coordName = `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
      if (mode === "origin") {
        setOrigin(coords);
        setOriginName(coordName);
        setActiveSelectionMode("destination");
      } else {
        setDestination(coords);
        setDestinationName(coordName);
      }
    },
    []
  );

  // Calculate Safe Route via /api/routes
  const handleCalculateRoute = async (hourOverride?: number) => {
    if (!origin || !destination) return;

    setIsCalculatingRoute(true);
    setRouteError(null);

    try {
      const res = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin,
          destination,
          hour: typeof hourOverride === "number" ? hourOverride : selectedHour,
        }),
      });

      if (!res.ok) {
        throw new Error("Unable to compute route corridor.");
      }

      const data: RouteComparisonResponse = await res.json();
      setFastestRoute(data.fastest);
      setSafestRoute(data.safest);
      setSelectedRouteId("safest");
    } catch (err: any) {
      console.error("Routing error:", err);
      setRouteError("Could not fetch route right now. Please re-check points.");
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  // When hour changes and we already have routes calculated, auto recalculate to demonstrate dynamic risk changes!
  const handleHourChange = (newHour: number) => {
    setSelectedHour(newHour);
    if (origin && destination && (fastestRoute || safestRoute)) {
      handleCalculateRoute(newHour);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col md:flex-row bg-surface-dark">
      {/* Top Floating App Bar */}
      <header className="absolute top-4 left-4 right-4 z-[400] pointer-events-none flex items-center justify-between">
        <div className="flex items-center gap-3 pointer-events-auto">
          <Link
            href="/"
            className="w-10 h-10 rounded-2xl glass-panel flex items-center justify-center text-cream hover:text-white hover:bg-white/10 transition-colors shadow-lg"
            title="Back to Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="px-3.5 py-2 glass-panel rounded-2xl flex items-center gap-2 shadow-lg">
            <Shield className="w-4 h-4 text-safe" />
            <span className="font-serif font-bold text-sm text-cream">SurakshaAI</span>
            <span className="text-[10px] text-copper px-1.5 py-0.5 rounded-md bg-white/5 font-semibold">
              Live Map
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <Link
            href="/dashboard"
            className="hidden sm:flex text-xs font-medium px-3.5 py-2 glass-panel rounded-2xl text-cream-muted hover:text-white shadow-lg hover:bg-white/10 transition-colors items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-copper" />
            <span>Dashboard</span>
          </Link>
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={isLocating}
            className="px-3.5 py-2 glass-panel rounded-2xl text-xs font-semibold text-safe hover:text-white hover:bg-safe/20 transition-all flex items-center gap-2 shadow-lg"
            title="Use current GPS location"
          >
            <Locate className={`w-4 h-4 ${isLocating ? "animate-spin text-terracotta" : "text-safe"}`} />
            <span className="hidden sm:inline">Use My Location</span>
          </button>
        </div>
      </header>

      {/* Main Map View (full screen on mobile, left on desktop) */}
      <div className="w-full h-full relative z-0">
        <MapView
          origin={origin}
          destination={destination}
          userLocation={userLocation}
          selectionMode={activeSelectionMode}
          onSelectPoint={handleMapSelectPoint}
          fastestRoute={fastestRoute}
          safestRoute={safestRoute}
          activeRouteId={selectedRouteId}
          className="w-full h-full"
        />

        {/* Prototype notice pill over map */}
        <div className="absolute top-20 left-4 z-[400] pointer-events-none hidden sm:block">
          <div className="glass-panel px-3 py-1.5 rounded-xl text-[11px] text-copper/90 flex items-center gap-1.5 shadow-md border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-copper animate-pulse" />
            <span>Prototype: risk data simulated from historical NCRB-style statistics.</span>
          </div>
        </div>

        {/* Selection mode indicator badge over map */}
        <div className="absolute bottom-28 md:bottom-6 left-4 z-[400] pointer-events-none">
          <div className="glass-panel px-3.5 py-2 rounded-xl text-xs text-cream flex items-center gap-2 shadow-lg pointer-events-auto">
            <span className="w-2 h-2 rounded-full bg-safe animate-ping" />
            <span>
              Tap map to set:{" "}
              <button
                type="button"
                onClick={() =>
                  setActiveSelectionMode(
                    activeSelectionMode === "origin" ? "destination" : "origin"
                  )
                }
                className="underline font-bold text-copper ml-1 cursor-pointer"
              >
                {activeSelectionMode === "origin" ? "Origin (A)" : "Destination (B)"}
              </button>
            </span>
          </div>
        </div>
      </div>

      {/* Control Panel: Side panel on desktop (right), Bottom sheet on mobile */}
      <aside
        className={`z-[450] flex flex-col justify-between transition-all duration-300 md:relative md:w-[440px] md:h-full md:border-l md:border-white/10 md:bg-surface/95 md:backdrop-blur-xl md:p-6 absolute bottom-0 left-0 right-0 max-h-[85vh] rounded-t-3xl md:rounded-none bg-surface/95 backdrop-blur-2xl border-t border-white/10 shadow-2xl p-5 ${
          mobilePanelExpanded ? "translate-y-0" : "translate-y-[calc(100%-64px)] md:translate-y-0"
        }`}
      >
        {/* Mobile drag handle toggle */}
        <div
          className="md:hidden flex items-center justify-between pb-2 cursor-pointer -mt-1"
          onClick={() => setMobilePanelExpanded(!mobilePanelExpanded)}
        >
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-copper" />
            <span className="text-xs font-semibold text-cream">
              {fastestRoute && safestRoute ? "Route Comparison & Safety Factors" : "Route Planning"}
            </span>
          </div>
          <button
            type="button"
            className="text-cream-muted p-1"
            aria-label="Toggle panel"
          >
            {mobilePanelExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* Section header on desktop */}
          <div className="hidden md:flex items-center justify-between pt-16">
            <div>
              <h2 className="font-serif text-xl font-bold text-cream flex items-center gap-2">
                <Navigation className="w-5 h-5 text-copper" />
                <span>Safe Walking Navigator</span>
              </h2>
              <p className="text-xs text-cream-muted mt-1">
                A* safety pathfinder prioritizing light & commerce
              </p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-terracotta/20 border border-terracotta/40 flex items-center justify-center text-copper">
              <Shield className="w-4 h-4 text-safe" />
            </div>
          </div>

          {/* Place Search Inputs */}
          <div className="space-y-3 pt-1 md:pt-2">
            <PlaceSearch
              label="Starting Point (Origin)"
              placeholder="Search origin or tap map..."
              iconColor="text-safe"
              value={originName}
              isActive={activeSelectionMode === "origin"}
              onFocus={() => setActiveSelectionMode("origin")}
              onSelect={(coords, name) => {
                setOrigin(coords);
                setOriginName(name);
                setActiveSelectionMode("destination");
                setFastestRoute(null);
                setSafestRoute(null);
              }}
              onClear={() => {
                setOrigin(null);
                setOriginName("");
                setFastestRoute(null);
                setSafestRoute(null);
              }}
            />

            <PlaceSearch
              label="Destination"
              placeholder="Search destination or tap map..."
              iconColor="text-sos"
              value={destinationName}
              isActive={activeSelectionMode === "destination"}
              onFocus={() => setActiveSelectionMode("destination")}
              onSelect={(coords, name) => {
                setDestination(coords);
                setDestinationName(name);
                setFastestRoute(null);
                setSafestRoute(null);
              }}
              onClear={() => {
                setDestination(null);
                setDestinationName("");
                setFastestRoute(null);
                setSafestRoute(null);
              }}
            />
          </div>

          {/* Walk Time Simulation */}
          <TimeSelector
            selectedHour={selectedHour}
            onChangeHour={handleHourChange}
          />

          {/* Error Message */}
          {routeError && (
            <div className="p-3 rounded-xl bg-sos/20 border border-sos/30 text-xs text-cream flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-sos shrink-0" />
              <span>{routeError}</span>
            </div>
          )}

          {/* Route Comparison Display if routes calculated */}
          {fastestRoute && safestRoute ? (
            <RouteComparisonCard
              fastestRoute={fastestRoute}
              safestRoute={safestRoute}
              selectedRouteId={selectedRouteId}
              onSelectRoute={setSelectedRouteId}
              timeOfDayHour={selectedHour}
            />
          ) : (
            /* Quick Preset Locations */
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-cream-muted uppercase tracking-wider">
                Quick Test Locations (India)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const connaught = { lat: 28.6315, lng: 77.2167 };
                    const indiaGate = { lat: 28.6129, lng: 77.2295 };
                    setOrigin(connaught);
                    setOriginName("Connaught Place, New Delhi");
                    setDestination(indiaGate);
                    setDestinationName("India Gate, New Delhi");
                    setFastestRoute(null);
                    setSafestRoute(null);
                  }}
                  className="text-left text-xs p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 text-cream transition-all flex flex-col gap-0.5"
                >
                  <span className="font-semibold text-copper">Delhi Hub</span>
                  <span className="text-[10px] text-cream-muted truncate">
                    Connaught Pl → India Gate
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const mgRoad = { lat: 12.9753, lng: 77.6067 };
                    const indiranagar = { lat: 12.9784, lng: 77.6408 };
                    setOrigin(mgRoad);
                    setOriginName("MG Road, Bengaluru");
                    setDestination(indiranagar);
                    setDestinationName("Indiranagar, Bengaluru");
                    setFastestRoute(null);
                    setSafestRoute(null);
                  }}
                  className="text-left text-xs p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 text-cream transition-all flex flex-col gap-0.5"
                >
                  <span className="font-semibold text-copper">Bengaluru Metro</span>
                  <span className="text-[10px] text-cream-muted truncate">
                    MG Road → Indiranagar
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Button footer */}
        <div className="pt-3 border-t border-white/10 space-y-2">
          <button
            type="button"
            onClick={() => handleCalculateRoute()}
            disabled={!origin || !destination || isCalculatingRoute}
            className={`w-full py-3.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
              origin && destination && !isCalculatingRoute
                ? "bg-terracotta hover:bg-terracotta-hover text-white shadow-terracotta/25 cursor-pointer active:scale-[0.99]"
                : "bg-white/10 text-cream-muted/50 cursor-not-allowed"
            }`}
          >
            {isCalculatingRoute ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Evaluating street lighting & risk...</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4 text-cream" />
                <span>
                  {fastestRoute && safestRoute
                    ? "Recalculate Routes"
                    : origin && destination
                    ? "Calculate Safest Route"
                    : "Select Origin & Destination"}
                </span>
              </>
            )}
          </button>

          <p className="text-[10px] text-center text-cream-muted/60">
            Prototype: risk data is simulated from historical NCRB-style statistics.
          </p>
        </div>
      </aside>
    </div>
  );
}
