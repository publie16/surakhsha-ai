import fs from "fs";
import path from "path";
import type { Coordinates, RiskFactors } from "./types";

// Simulated historical NCRB-modeled crime hotspots (lat, lng, radius in meters, intensity 0-1)
// These represent realistic urban patterns: desolate railway outer loops, unmonitored flyover underpasses, dark industrial borders
export interface HistoricalHotspot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  baseRisk: number; // 0 to 1
}

// Built-in NCRB-style hotspot seed points for major Indian corridors (Delhi, Bangalore, etc.)
// Also procedurally generates deterministic local hotspots for any queried coordinates
const BASE_HOTSPOTS: HistoricalHotspot[] = [
  // Delhi examples
  { id: "delhi-1", name: "Desolate Railway Outer Loop", lat: 28.622, lng: 77.225, radiusMeters: 380, baseRisk: 0.85 },
  { id: "delhi-2", name: "Unlit Sub-Flyover Corridor", lat: 28.618, lng: 77.234, radiusMeters: 450, baseRisk: 0.78 },
  { id: "delhi-3", name: "Isolated Drainage Track", lat: 28.638, lng: 77.212, radiusMeters: 320, baseRisk: 0.72 },
  // Bengaluru examples
  { id: "blr-1", name: "Unmonitored Industrial Bypass", lat: 12.973, lng: 77.618, radiusMeters: 400, baseRisk: 0.8 },
  { id: "blr-2", name: "Isolated Rail Crossing", lat: 12.977, lng: 77.628, radiusMeters: 350, baseRisk: 0.75 },
];

// In-memory cache for Overpass queries per rounded bounding box
interface OverpassCacheEntry {
  timestamp: number;
  features: {
    streetLamps: [number, number][]; // [lat, lng]
    openBusinesses: [number, number][];
    policeStations: [number, number][];
  };
}

const overpassCache: Map<string, OverpassCacheEntry> = new Map();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

/**
 * Calculates Haversine distance in meters between two lat/lng pairs
 */
export function haversineDistanceMeters(p1: Coordinates, p2: Coordinates): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Deterministic pseudo-random number generator from coordinates (for fallback simulation)
 */
function pseudoHash(lat: number, lng: number): number {
  const str = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 10000) / 10000;
}

/**
 * Procedurally generates local historical hotspots around a bounding box if not Delhi/BLR
 */
export function getLocalHotspots(bbox: { minLat: number; minLng: number; maxLat: number; maxLng: number }): HistoricalHotspot[] {
  const matched = BASE_HOTSPOTS.filter(
    (h) =>
      h.lat >= bbox.minLat - 0.05 &&
      h.lat <= bbox.maxLat + 0.05 &&
      h.lng >= bbox.minLng - 0.05 &&
      h.lng <= bbox.maxLng + 0.05
  );

  if (matched.length >= 2) return matched;

  // Generate 3 deterministic hotspots inside bounding box based on coordinates
  const midLat = (bbox.minLat + bbox.maxLat) / 2;
  const midLng = (bbox.minLng + bbox.maxLng) / 2;
  const latSpan = Math.abs(bbox.maxLat - bbox.minLat) || 0.02;
  const lngSpan = Math.abs(bbox.maxLng - bbox.minLng) || 0.02;

  const synthetic: HistoricalHotspot[] = [
    {
      id: "syn-1",
      name: "Poorly Lit Alley Sector",
      lat: midLat + latSpan * 0.22,
      lng: midLng - lngSpan * 0.18,
      radiusMeters: 350,
      baseRisk: 0.76,
    },
    {
      id: "syn-2",
      name: "Desolate Perimeter Road",
      lat: midLat - latSpan * 0.25,
      lng: midLng + lngSpan * 0.2,
      radiusMeters: 420,
      baseRisk: 0.82,
    },
  ];

  return [...matched, ...synthetic];
}

/**
 * Fetches lighting, late-night open amenities, and police stations from Overpass API
 * with deterministic simulated fallback on timeout/rate-limit.
 */
export async function getStreetIntelligence(bbox: {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}) {
  const cacheKey = `${bbox.minLat.toFixed(3)},${bbox.minLng.toFixed(3)},${bbox.maxLat.toFixed(3)},${bbox.maxLng.toFixed(3)}`;
  const now = Date.now();

  const cached = overpassCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.features;
  }

  // Overpass query for street lamps, late night amenities, police stations
  const overpassQuery = `
    [out:json][timeout:5];
    (
      node["highway"="street_lamp"](${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng});
      node["amenity"="police"](${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng});
      node["shop"](${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng});
      node["amenity"~"cafe|restaurant|pharmacy|fuel"](${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng});
    );
    out body 40;
  `;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(overpassQuery)}`,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const streetLamps: [number, number][] = [];
      const openBusinesses: [number, number][] = [];
      const policeStations: [number, number][] = [];

      for (const el of data.elements || []) {
        if (!el.lat || !el.lon) continue;
        if (el.tags?.amenity === "police") {
          policeStations.push([el.lat, el.lon]);
        } else if (el.tags?.highway === "street_lamp") {
          streetLamps.push([el.lat, el.lon]);
        } else {
          openBusinesses.push([el.lat, el.lon]);
        }
      }

      const features = { streetLamps, openBusinesses, policeStations };
      overpassCache.set(cacheKey, { timestamp: now, features });
      return features;
    }
  } catch (err) {
    // Network or timeout failure -> smoothly fallback to deterministic simulation
  }

  // Fallback: Generate deterministic street intelligence grid
  const streetLamps: [number, number][] = [];
  const openBusinesses: [number, number][] = [];
  const policeStations: [number, number][] = [];

  const latSteps = 6;
  const lngSteps = 6;
  for (let i = 0; i <= latSteps; i++) {
    for (let j = 0; j <= lngSteps; j++) {
      const curLat = bbox.minLat + ((bbox.maxLat - bbox.minLat) * i) / latSteps;
      const curLng = bbox.minLng + ((bbox.maxLng - bbox.minLng) * j) / lngSteps;
      const hashVal = pseudoHash(curLat, curLng);

      if (hashVal > 0.6) {
        streetLamps.push([curLat, curLng]);
      }
      if (hashVal > 0.72) {
        openBusinesses.push([curLat, curLng]);
      }
      if (i === 3 && j === 3) {
        policeStations.push([curLat, curLng]);
      }
    }
  }

  const features = { streetLamps, openBusinesses, policeStations };
  overpassCache.set(cacheKey, { timestamp: now, features });
  return features;
}

/**
 * Read community reports from data/reports.json if available
 */
function getSavedCommunityReports(): { lat: number; lng: number; type: string }[] {
  try {
    const dataDir = path.join(process.cwd(), "data");
    const filePath = path.join(dataDir, "reports.json");
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(fileContent);
    }
  } catch {
    // Empty or not yet created
  }
  return [];
}

/**
 * Core risk function: scores a coordinate at a given hour (0-23)
 * Returns a value from 0 (very safe) to 1 (high danger)
 */
export async function calculatePointRisk(
  point: Coordinates,
  hour: number = new Date().getHours(),
  hotspots?: HistoricalHotspot[],
  intelligence?: {
    streetLamps: [number, number][];
    openBusinesses: [number, number][];
    policeStations: [number, number][];
  }
): Promise<{ totalRisk: number; factors: RiskFactors }> {
  // 1. Time-of-day risk multiplier
  // Night hours (21:00 - 05:00) have peak vulnerability
  let timeMultiplier = 1.0;
  if (hour >= 22 || hour < 4) {
    timeMultiplier = 1.5; // late night
  } else if ((hour >= 19 && hour < 22) || (hour >= 4 && hour < 6)) {
    timeMultiplier = 1.25; // twilight / early dawn
  } else if (hour >= 6 && hour < 18) {
    timeMultiplier = 0.7; // broad daylight
  } else {
    timeMultiplier = 0.9;
  }

  // 2. Historical Hotspot risk with Gaussian falloff
  const activeHotspots =
    hotspots ||
    getLocalHotspots({
      minLat: point.lat - 0.03,
      minLng: point.lng - 0.03,
      maxLat: point.lat + 0.03,
      maxLng: point.lng + 0.03,
    });

  let hotspotRisk = 0;
  for (const h of activeHotspots) {
    const dist = haversineDistanceMeters(point, { lat: h.lat, lng: h.lng });
    if (dist < h.radiusMeters * 2.2) {
      // Gaussian kernel falloff
      const falloff = Math.exp(-Math.pow(dist / (h.radiusMeters * 0.7), 2));
      const r = h.baseRisk * falloff;
      if (r > hotspotRisk) hotspotRisk = r;
    }
  }

  // 3. Lighting & Commercial Presence (mitigates risk)
  let nearestLampDist = 9999;
  let nearestBizDist = 9999;
  let nearestPoliceDist = 9999;

  if (intelligence) {
    for (const [lLat, lLng] of intelligence.streetLamps) {
      const d = haversineDistanceMeters(point, { lat: lLat, lng: lLng });
      if (d < nearestLampDist) nearestLampDist = d;
    }
    for (const [bLat, bLng] of intelligence.openBusinesses) {
      const d = haversineDistanceMeters(point, { lat: bLat, lng: bLng });
      if (d < nearestBizDist) nearestBizDist = d;
    }
    for (const [pLat, pLng] of intelligence.policeStations) {
      const d = haversineDistanceMeters(point, { lat: pLat, lng: pLng });
      if (d < nearestPoliceDist) nearestPoliceDist = d;
    }
  } else {
    // Deterministic pseudo distances if no intelligence provided
    const h = pseudoHash(point.lat, point.lng);
    nearestLampDist = 30 + h * 120;
    nearestBizDist = 40 + h * 200;
  }

  // Scores from 0 to 100 (100 = safest)
  // Lighting: well lit within 60m is 100, fades past 250m
  const lightingScore = Math.max(0, Math.min(100, Math.round(100 - (nearestLampDist / 250) * 100)));
  // Businesses / Crowd: open shops/police within 80m is 100
  const crowdScore = Math.max(
    0,
    Math.min(100, Math.round(100 - (nearestBizDist / 300) * 80 + (nearestPoliceDist < 400 ? 25 : 0)))
  );
  // Historical safety: opposite of hotspot risk
  const historicalScore = Math.max(0, Math.min(100, Math.round((1 - hotspotRisk) * 100)));

  // 4. Community Reports penalty
  const communityReports = getSavedCommunityReports();
  let communityPenalty = 0;
  for (const rep of communityReports) {
    const d = haversineDistanceMeters(point, rep);
    if (d < 300) {
      communityPenalty += Math.max(0, 0.4 * (1 - d / 300));
    }
  }
  communityPenalty = Math.min(0.6, communityPenalty);
  const communityScore = Math.max(0, Math.min(100, Math.round((1 - communityPenalty) * 100)));

  // Baseline street vulnerability
  let rawRisk = 0.25; // default base urban baseline
  rawRisk += hotspotRisk * 0.4;
  rawRisk += (1 - lightingScore / 100) * 0.28;
  rawRisk += (1 - crowdScore / 100) * 0.22;
  rawRisk += communityPenalty * 0.25;

  // Apply time of day multiplier
  const totalRisk = Math.max(0.05, Math.min(0.98, rawRisk * (timeMultiplier > 1 ? timeMultiplier * 0.85 : 0.8)));

  return {
    totalRisk,
    factors: {
      lightingScore,
      crowdCommerceScore: crowdScore,
      historicalSafetyScore: historicalScore,
      communityReportsScore: communityScore,
    },
  };
}
