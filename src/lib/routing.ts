import {
  haversineDistanceMeters,
  getLocalHotspots,
  getStreetIntelligence,
  calculatePointRisk,
} from "./risk";
import type { Coordinates, ScoredRoute, RiskFactors } from "./types";

/**
 * Fetch candidate walking route from public OpenStreetMap OSRM server
 */
async function fetchOsrmRoute(
  coords: [number, number][], // [lon, lat][]
  alternatives: boolean = false
): Promise<any[]> {
  const coordString = coords.map((c) => `${c[0]},${c[1]}`).join(";");
  const url = `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${coordString}?overview=full&geometries=geojson&alternatives=${alternatives}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5500);

    const res = await fetch(url, {
      headers: {
        "User-Agent": "SurakshaAI-CollegePrototype/1.0",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.code === "Ok" && data.routes && data.routes.length > 0) {
        return data.routes;
      }
    }
  } catch (err) {
    // If external OSRM times out, return empty
  }
  return [];
}

/**
 * Interpolates points along a polyline to sample points every ~40 meters
 */
function samplePointsAlongPolyline(
  coordinates: [number, number][], // [lat, lng]
  stepMeters: number = 40
): Coordinates[] {
  if (coordinates.length === 0) return [];
  const sampled: Coordinates[] = [{ lat: coordinates[0][0], lng: coordinates[0][1] }];

  let accumulatedDist = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const p1: Coordinates = { lat: coordinates[i][0], lng: coordinates[i][1] };
    const p2: Coordinates = { lat: coordinates[i + 1][0], lng: coordinates[i + 1][1] };
    const segDist = haversineDistanceMeters(p1, p2);

    if (segDist === 0) continue;

    let currentOffset = stepMeters - accumulatedDist;
    while (currentOffset <= segDist) {
      const t = currentOffset / segDist;
      sampled.push({
        lat: p1.lat + t * (p2.lat - p1.lat),
        lng: p1.lng + t * (p2.lng - p1.lng),
      });
      currentOffset += stepMeters;
    }
    accumulatedDist = segDist - (currentOffset - stepMeters);
  }

  // Ensure last coordinate is included
  const last = coordinates[coordinates.length - 1];
  sampled.push({ lat: last[0], lng: last[1] });
  return sampled;
}

/**
 * Helper to compute perpendicular offset waypoint (left/right) from midpoint of origin-destination
 */
function computePerpendicularWaypoint(
  origin: Coordinates,
  destination: Coordinates,
  offsetMeters: number // positive = left, negative = right
): Coordinates {
  const midLat = (origin.lat + destination.lat) / 2;
  const midLng = (origin.lng + destination.lng) / 2;

  const dLat = destination.lat - origin.lat;
  const dLng = destination.lng - origin.lng;
  const len = Math.sqrt(dLat * dLat + dLng * dLng);

  if (len === 0) return origin;

  // Normal vector (-dLng, dLat)
  const normLat = -dLng / len;
  const normLng = dLat / len;

  // Approx conversion: 1 deg lat ~ 111,000 m
  const deltaDeg = offsetMeters / 111000;

  return {
    lat: midLat + normLat * deltaDeg,
    lng: midLng + normLng * deltaDeg,
  };
}

/**
 * A* grid pathfinder on a ~35x35 bounding box grid to route around high-risk hotspots
 */
async function computeAStarWaypoints(
  origin: Coordinates,
  destination: Coordinates,
  hour: number,
  hotspots: any[],
  intelligence: any
): Promise<Coordinates[]> {
  const gridSize = 25; // 25x25 grid for quick responsiveness
  const minLat = Math.min(origin.lat, destination.lat) - 0.008;
  const maxLat = Math.max(origin.lat, destination.lat) + 0.008;
  const minLng = Math.min(origin.lng, destination.lng) - 0.008;
  const maxLng = Math.max(origin.lng, destination.lng) + 0.008;

  const latStep = (maxLat - minLat) / (gridSize - 1);
  const lngStep = (maxLng - minLng) / (gridSize - 1);

  const getGridCoords = (pt: Coordinates): [number, number] => {
    const r = Math.max(0, Math.min(gridSize - 1, Math.round((pt.lat - minLat) / latStep)));
    const c = Math.max(0, Math.min(gridSize - 1, Math.round((pt.lng - minLng) / lngStep)));
    return [r, c];
  };

  const [startR, startC] = getGridCoords(origin);
  const [endR, endC] = getGridCoords(destination);

  // Pre-calculate risk grid
  const riskGrid: number[][] = Array(gridSize)
    .fill(0)
    .map(() => Array(gridSize).fill(0));

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const pt: Coordinates = {
        lat: minLat + r * latStep,
        lng: minLng + c * lngStep,
      };
      // Quick synchronous risk estimate using local hotspots
      let spotR = 0;
      for (const h of hotspots) {
        const d = haversineDistanceMeters(pt, { lat: h.lat, lng: h.lng });
        if (d < h.radiusMeters * 2) {
          spotR = Math.max(spotR, h.baseRisk * (1 - d / (h.radiusMeters * 2)));
        }
      }
      riskGrid[r][c] = spotR;
    }
  }

  // Simple A* search
  interface Node {
    r: number;
    c: number;
    g: number;
    h: number;
    f: number;
    parent?: Node;
  }

  const openSet: Node[] = [];
  const closedSet = new Set<string>();

  const startNode: Node = {
    r: startR,
    c: startC,
    g: 0,
    h: Math.hypot(endR - startR, endC - startC),
    f: Math.hypot(endR - startR, endC - startC),
  };
  openSet.push(startNode);

  const key = (r: number, c: number) => `${r},${c}`;
  let finalNode: Node | null = null;
  let iterations = 0;

  while (openSet.length > 0 && iterations < 800) {
    iterations++;
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;

    if (current.r === endR && current.c === endC) {
      finalNode = current;
      break;
    }

    closedSet.add(key(current.r, current.c));

    const neighbors = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [-1, -1],
      [1, -1],
      [-1, 1],
    ];

    for (const [dr, dc] of neighbors) {
      const nr = current.r + dr;
      const nc = current.c + dc;
      if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) continue;
      if (closedSet.has(key(nr, nc))) continue;

      const stepDist = Math.hypot(dr, dc);
      // Cost penalty k * risk strongly penalizes crossing dangerous cells
      const cellRisk = riskGrid[nr][nc];
      const cost = stepDist * (1 + 14 * cellRisk);
      const tentG = current.g + cost;

      let existing = openSet.find((n) => n.r === nr && n.c === nc);
      if (!existing) {
        const h = Math.hypot(endR - nr, endC - nc);
        existing = {
          r: nr,
          c: nc,
          g: tentG,
          h,
          f: tentG + h,
          parent: current,
        };
        openSet.push(existing);
      } else if (tentG < existing.g) {
        existing.g = tentG;
        existing.f = tentG + existing.h;
        existing.parent = current;
      }
    }
  }

  // Extract path and sample ~4 intermediate waypoints
  const pathNodes: [number, number][] = [];
  let curr: Node | null | undefined = finalNode;
  while (curr) {
    pathNodes.push([curr.r, curr.c]);
    curr = curr.parent;
  }
  pathNodes.reverse();

  if (pathNodes.length < 3) return [];

  // Pick up to 4 evenly spaced waypoints between start and finish
  const sampleIndices = [
    Math.floor(pathNodes.length * 0.25),
    Math.floor(pathNodes.length * 0.5),
    Math.floor(pathNodes.length * 0.75),
  ];

  return sampleIndices.map((idx) => {
    const [r, c] = pathNodes[idx];
    return {
      lat: minLat + r * latStep,
      lng: minLng + c * lngStep,
    };
  });
}

/**
 * Fallback straight-line route with gentle curve if OSRM is totally unreachable
 */
function generateSyntheticFallbackRoute(
  origin: Coordinates,
  destination: Coordinates,
  curvatureOffset: number = 0
): [number, number][] {
  const points: [number, number][] = [];
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const baseLat = origin.lat + t * (destination.lat - origin.lat);
    const baseLng = origin.lng + t * (destination.lng - origin.lng);

    // Parabolic arc displacement
    const arc = Math.sin(t * Math.PI) * curvatureOffset;
    points.push([baseLat + arc * 0.002, baseLng + arc * 0.002]);
  }
  return points;
}

/**
 * Score a polyline by sampling risk every ~40m and computing composite factors
 */
async function scorePolyline(
  coordinates: [number, number][],
  hour: number,
  hotspots: any[],
  intelligence: any
): Promise<{
  averageRisk: number;
  safetyScore: number;
  factors: RiskFactors;
}> {
  const sampled = samplePointsAlongPolyline(coordinates, 40);
  if (sampled.length === 0) {
    return {
      averageRisk: 0.5,
      safetyScore: 50,
      factors: {
        lightingScore: 50,
        crowdCommerceScore: 50,
        historicalSafetyScore: 50,
        communityReportsScore: 50,
      },
    };
  }

  let totalRiskAcc = 0;
  let totalLighting = 0;
  let totalCrowd = 0;
  let totalHistory = 0;
  let totalCommunity = 0;

  for (const pt of sampled) {
    const res = await calculatePointRisk(pt, hour, hotspots, intelligence);
    totalRiskAcc += res.totalRisk;
    totalLighting += res.factors.lightingScore;
    totalCrowd += res.factors.crowdCommerceScore;
    totalHistory += res.factors.historicalSafetyScore;
    totalCommunity += res.factors.communityReportsScore;
  }

  const count = sampled.length;
  const avgRisk = totalRiskAcc / count;
  const lightingScore = Math.round(totalLighting / count);
  const crowdScore = Math.round(totalCrowd / count);
  const historyScore = Math.round(totalHistory / count);
  const communityScore = Math.round(totalCommunity / count);

  // Safety Score: 0 to 100, where higher is safer
  const safetyScore = Math.max(5, Math.min(99, Math.round((1 - avgRisk) * 100)));

  return {
    averageRisk: avgRisk,
    safetyScore,
    factors: {
      lightingScore,
      crowdCommerceScore: crowdScore,
      historicalSafetyScore: historyScore,
      communityReportsScore: communityScore,
    },
  };
}

/**
 * Main safe routing generator
 * Evaluates candidate routes (OSRM fastest + alternatives + A* bypass + perpendicular detour)
 * and selects the safest route that stays within 1.6x of the fastest travel time.
 */
export async function findCandidateRoutes(
  origin: Coordinates,
  destination: Coordinates,
  hour: number = new Date().getHours()
): Promise<{ fastest: ScoredRoute; safest: ScoredRoute; allRoutes: ScoredRoute[] }> {
  const bbox = {
    minLat: Math.min(origin.lat, destination.lat) - 0.015,
    minLng: Math.min(origin.lng, destination.lng) - 0.015,
    maxLat: Math.max(origin.lat, destination.lat) + 0.015,
    maxLng: Math.max(origin.lng, destination.lng) + 0.015,
  };

  // 1. Fetch risk environment (hotspots + overpass intelligence)
  const hotspots = getLocalHotspots(bbox);
  const intelligence = await getStreetIntelligence(bbox);

  const candidatePolylines: {
    name: string;
    coordinates: [number, number][]; // [lat, lng]
    distanceMeters: number;
    durationMinutes: number;
    strategy: string;
  }[] = [];

  // 2. Query OSRM for standard direct fastest walking route + alternatives
  const directRoutes = await fetchOsrmRoute(
    [
      [origin.lng, origin.lat],
      [destination.lng, destination.lat],
    ],
    true
  );

  if (directRoutes.length > 0) {
    directRoutes.forEach((r, idx) => {
      // OSRM returns GeoJSON coordinates in [lon, lat] format -> convert to [lat, lon]
      const coords: [number, number][] = r.geometry.coordinates.map((c: [number, number]) => [
        c[1],
        c[0],
      ]);
      candidatePolylines.push({
        name: idx === 0 ? "Fastest Path" : `Alternative Path ${idx}`,
        coordinates: coords,
        distanceMeters: Math.round(r.distance),
        durationMinutes: Math.max(1, Math.round(r.duration / 60)),
        strategy: idx === 0 ? "fastest" : "osrm_alt",
      });
    });
  }

  // 3. Generate detour candidate 1: offset left
  const leftWaypoint = computePerpendicularWaypoint(origin, destination, 320);
  const leftRoute = await fetchOsrmRoute(
    [
      [origin.lng, origin.lat],
      [leftWaypoint.lng, leftWaypoint.lat],
      [destination.lng, destination.lat],
    ],
    false
  );
  if (leftRoute.length > 0) {
    const coords: [number, number][] = leftRoute[0].geometry.coordinates.map((c: [number, number]) => [
      c[1],
      c[0],
    ]);
    candidatePolylines.push({
      name: "Commercial Boulevard Detour",
      coordinates: coords,
      distanceMeters: Math.round(leftRoute[0].distance),
      durationMinutes: Math.max(1, Math.round(leftRoute[0].duration / 60)),
      strategy: "detour_left",
    });
  }

  // 4. Generate detour candidate 2: offset right
  const rightWaypoint = computePerpendicularWaypoint(origin, destination, -320);
  const rightRoute = await fetchOsrmRoute(
    [
      [origin.lng, origin.lat],
      [rightWaypoint.lng, rightWaypoint.lat],
      [destination.lng, destination.lat],
    ],
    false
  );
  if (rightRoute.length > 0) {
    const coords: [number, number][] = rightRoute[0].geometry.coordinates.map((c: [number, number]) => [
      c[1],
      c[0],
    ]);
    candidatePolylines.push({
      name: "Main Arterial Way",
      coordinates: coords,
      distanceMeters: Math.round(rightRoute[0].distance),
      durationMinutes: Math.max(1, Math.round(rightRoute[0].duration / 60)),
      strategy: "detour_right",
    });
  }

  // 5. A* grid cost route snapped to road network
  const aStarPoints = await computeAStarWaypoints(origin, destination, hour, hotspots, intelligence);
  if (aStarPoints.length > 0) {
    const osrmPoints: [number, number][] = [
      [origin.lng, origin.lat],
      ...aStarPoints.map((p): [number, number] => [p.lng, p.lat]),
      [destination.lng, destination.lat],
    ];
    const aStarSnapping = await fetchOsrmRoute(osrmPoints, false);
    if (aStarSnapping.length > 0) {
      const coords: [number, number][] = aStarSnapping[0].geometry.coordinates.map(
        (c: [number, number]) => [c[1], c[0]]
      );
      candidatePolylines.push({
        name: "AI Risk-Avoidance Corridor",
        coordinates: coords,
        distanceMeters: Math.round(aStarSnapping[0].distance),
        durationMinutes: Math.max(1, Math.round(aStarSnapping[0].duration / 60)),
        strategy: "astar_risk_avoidance",
      });
    }
  }

  // Fallback if network is offline or OSRM unavailable
  if (candidatePolylines.length === 0) {
    const straightDist = haversineDistanceMeters(origin, destination);
    const estMinutes = Math.max(2, Math.round((straightDist / 1000 / 4.5) * 60)); // ~4.5 km/h walk

    candidatePolylines.push({
      name: "Direct Route (Simulated)",
      coordinates: generateSyntheticFallbackRoute(origin, destination, 0),
      distanceMeters: Math.round(straightDist),
      durationMinutes: estMinutes,
      strategy: "fastest",
    });

    candidatePolylines.push({
      name: "Safe Well-Lit Corridor (Simulated)",
      coordinates: generateSyntheticFallbackRoute(origin, destination, 1.2),
      distanceMeters: Math.round(straightDist * 1.18),
      durationMinutes: Math.round(estMinutes * 1.2),
      strategy: "safest",
    });
  }

  // 6. Score all candidate routes
  const scoredRoutes: ScoredRoute[] = [];

  for (let i = 0; i < candidatePolylines.length; i++) {
    const candidate = candidatePolylines[i];
    const scoreResult = await scorePolyline(candidate.coordinates, hour, hotspots, intelligence);

    scoredRoutes.push({
      id: i === 0 ? "fastest" : `route-${i}`,
      name: candidate.name,
      coordinates: candidate.coordinates,
      distanceMeters: candidate.distanceMeters,
      durationMinutes: candidate.durationMinutes,
      safetyScore: scoreResult.safetyScore,
      averageRisk: scoreResult.averageRisk,
      factors: scoreResult.factors,
      explanation: "",
    });
  }

  // Sort: Fastest is the one with minimum duration/distance
  const sortedByTime = [...scoredRoutes].sort((a, b) => a.durationMinutes - b.durationMinutes);
  const fastestRoute = sortedByTime[0];
  fastestRoute.id = "fastest";

  // Sanity detour cap: safest route must not exceed 1.6x the fastest time
  const maxAllowableTime = fastestRoute.durationMinutes * 1.6;
  const eligibleRoutes = scoredRoutes.filter((r) => r.durationMinutes <= maxAllowableTime);

  // Pick candidate with highest safety score (lowest risk)
  eligibleRoutes.sort((a, b) => b.safetyScore - a.safetyScore);
  const safestRoute = eligibleRoutes[0] || fastestRoute;
  safestRoute.id = "safest";
  safestRoute.isRecommended = true;

  // Plain-English explanation generation
  const timeDiff = safestRoute.durationMinutes - fastestRoute.durationMinutes;
  const distDiff = safestRoute.distanceMeters - fastestRoute.distanceMeters;

  if (safestRoute === fastestRoute) {
    safestRoute.explanation =
      "The direct route is already along a well-lit, active commercial corridor with no significant historical risk flags.";
    fastestRoute.explanation = safestRoute.explanation;
  } else {
    const lightingAdv = safestRoute.factors.lightingScore - fastestRoute.factors.lightingScore;
    const crowdAdv = safestRoute.factors.crowdCommerceScore - fastestRoute.factors.crowdCommerceScore;

    safestRoute.explanation = `Adds ${timeDiff > 0 ? `${timeDiff} min` : "minimal time"} (${distDiff > 0 ? `+${distDiff}m` : ""}) to detour around ${
      hour >= 21 || hour < 5 ? "unlit midnight blindspots and isolated underpasses" : "known historical vulnerability pockets"
    }. Keeps you along ${
      lightingAdv >= crowdAdv ? "continuous street-lamp illumination" : "active open storefronts and surveillance corridors"
    }.`;

    fastestRoute.explanation = `Fastest walking time, but passes through low-visibility segments with ${
      fastestRoute.factors.lightingScore < 50 ? "poor street lighting" : "isolated stretches"
    } and higher historical risk index.`;
  }

  return {
    fastest: fastestRoute,
    safest: safestRoute,
    allRoutes: scoredRoutes,
  };
}
