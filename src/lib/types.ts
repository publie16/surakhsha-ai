export interface Coordinates {
  lat: number;
  lng: number;
}

export interface PlaceResult {
  place_id: number | string;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
  };
}

export interface RoutePoint {
  lat: number;
  lng: number;
  label?: string;
}

export interface RiskFactors {
  lightingScore: number;       // 0-100 (higher = better lit / safer)
  crowdCommerceScore: number;  // 0-100 (higher = more shops/police/people)
  historicalSafetyScore: number;// 0-100 (higher = lower crime / safer)
  communityReportsScore: number;// 0-100 (higher = fewer negative reports)
}

export interface ScoredRoute {
  id: "fastest" | "safest" | string;
  name: string;
  coordinates: [number, number][]; // [lat, lng][]
  distanceMeters: number;
  durationMinutes: number;
  safetyScore: number;             // 0-100 overall composite safety score
  averageRisk: number;             // 0-1 composite risk cost
  factors: RiskFactors;
  explanation: string;
  isRecommended?: boolean;
}

export interface RouteComparisonResponse {
  fastest: ScoredRoute;
  safest: ScoredRoute;
  allRoutes?: ScoredRoute[];
  timeOfDayHour: number;
}
