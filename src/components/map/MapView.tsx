"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import type { Coordinates, ScoredRoute } from "@/lib/types";

interface MapViewProps {
  origin: Coordinates | null;
  destination: Coordinates | null;
  userLocation: Coordinates | null;
  selectionMode: "origin" | "destination" | null;
  onSelectPoint: (coords: Coordinates, mode: "origin" | "destination") => void;
  fastestRoute?: ScoredRoute | null;
  safestRoute?: ScoredRoute | null;
  activeRouteId?: "fastest" | "safest" | null;
  className?: string;
}

export default function MapView({
  origin,
  destination,
  userLocation,
  selectionMode,
  onSelectPoint,
  fastestRoute,
  safestRoute,
  activeRouteId = "safest",
  className = "",
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);

  const selectionModeRef = useRef(selectionMode);
  const onSelectPointRef = useRef(onSelectPoint);

  useEffect(() => {
    selectionModeRef.current = selectionMode;
  }, [selectionMode]);

  useEffect(() => {
    onSelectPointRef.current = onSelectPoint;
  }, [onSelectPoint]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialCenter: [number, number] = [28.6139, 77.209];
    const initialZoom = 13;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: false,
    });

    L.control.zoom({ position: "topright" }).addTo(map);

    // Standard OpenStreetMap tiles (no API key required)
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Dedicated layers for routes and markers so polylines render below markers
    const routesLayer = L.layerGroup().addTo(map);
    routesLayerRef.current = routesLayer;

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    // Tap on map to set origin or destination
    map.on("click", (e: L.LeafletMouseEvent) => {
      const mode = selectionModeRef.current || "origin";
      onSelectPointRef.current(
        { lat: e.latlng.lat, lng: e.latlng.lng },
        mode
      );
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    const createPinIcon = (colorClass: string, label: string) =>
      L.divIcon({
        className: "custom-div-icon",
        html: `
          <div class="relative flex items-center justify-center">
            <div class="${colorClass} w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
              ${label}
            </div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

    if (userLocation) {
      const userIcon = L.divIcon({
        className: "custom-div-icon",
        html: `<div class="custom-user-dot w-5 h-5 rounded-full"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .bindPopup("<div class='text-xs font-sans text-surface'><b>Your Location</b></div>")
        .addTo(layer);
    }

    if (origin) {
      const originIcon = createPinIcon("custom-pin-origin", "A");
      L.marker([origin.lat, origin.lng], { icon: originIcon })
        .bindPopup("<div class='text-xs font-sans text-surface'><b>Start Point (A)</b></div>")
        .addTo(layer);
    }

    if (destination) {
      const destIcon = createPinIcon("custom-pin-dest", "B");
      L.marker([destination.lat, destination.lng], { icon: destIcon })
        .bindPopup("<div class='text-xs font-sans text-surface'><b>Destination (B)</b></div>")
        .addTo(layer);
    }

    // Auto-fit bounds if no routes are drawn yet
    if (!fastestRoute && !safestRoute) {
      if (origin && destination) {
        const bounds = L.latLngBounds(
          [origin.lat, origin.lng],
          [destination.lat, destination.lng]
        );
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
      } else if (origin) {
        map.setView([origin.lat, origin.lng], Math.max(map.getZoom(), 14));
      } else if (destination) {
        map.setView([destination.lat, destination.lng], Math.max(map.getZoom(), 14));
      } else if (userLocation) {
        map.setView([userLocation.lat, userLocation.lng], 14);
      }
    }
  }, [origin, destination, userLocation, fastestRoute, safestRoute]);

  // Update Route Polylines
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = routesLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    const allRoutePoints: [number, number][] = [];

    // 1. Draw Fastest route (grey / muted red)
    if (fastestRoute && fastestRoute.coordinates.length > 0) {
      const isSelected = activeRouteId === "fastest";
      
      // Halo / glow
      L.polyline(fastestRoute.coordinates, {
        color: isSelected ? "#EF4444" : "#6B7280",
        weight: isSelected ? 8 : 6,
        opacity: isSelected ? 0.4 : 0.25,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(layer);

      // Core line
      const fastestPoly = L.polyline(fastestRoute.coordinates, {
        color: isSelected ? "#F87171" : "#9CA3AF",
        weight: isSelected ? 4 : 3,
        opacity: isSelected ? 0.95 : 0.6,
        dashArray: isSelected ? undefined : "6, 8",
        lineCap: "round",
        lineJoin: "round",
      }).addTo(layer);

      fastestPoly.bindPopup(`
        <div class="text-xs p-1">
          <b class="text-sos">Fastest Walking Route</b><br/>
          <span>Time: ${fastestRoute.durationMinutes} min · Safety: ${fastestRoute.safetyScore}/100</span>
        </div>
      `);

      allRoutePoints.push(...fastestRoute.coordinates);
    }

    // 2. Draw Safest route (safe green #4ADE80 with luminous aura)
    if (safestRoute && safestRoute.coordinates.length > 0) {
      const isSelected = activeRouteId === "safest";

      // Glow halo
      L.polyline(safestRoute.coordinates, {
        color: "#4ADE80",
        weight: isSelected ? 10 : 7,
        opacity: isSelected ? 0.45 : 0.25,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(layer);

      // Core luminous line
      const safestPoly = L.polyline(safestRoute.coordinates, {
        color: "#22C55E",
        weight: isSelected ? 5 : 4,
        opacity: 1,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(layer);

      safestPoly.bindPopup(`
        <div class="text-xs p-1">
          <b class="text-safe">SurakshaAI Recommended Safest Route</b><br/>
          <span>Time: ${safestRoute.durationMinutes} min · Safety Score: ${safestRoute.safetyScore}/100</span>
        </div>
      `);

      allRoutePoints.push(...safestRoute.coordinates);
    }

    // Zoom/fit map neatly around computed routes
    if (allRoutePoints.length > 0) {
      const bounds = L.latLngBounds(allRoutePoints);
      map.fitBounds(bounds, { padding: [70, 70], maxZoom: 16 });
    }
  }, [fastestRoute, safestRoute, activeRouteId]);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
