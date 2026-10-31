import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q || q.trim().length < 2) {
    return NextResponse.json([]);
  }

  try {
    // Nominatim geocoding API with India countrycode filter for relevance
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      q.trim()
    )}&countrycodes=in&addressdetails=1&limit=6`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "SurakshaAI-CollegePrototype/1.0 (safety.routing.demo@suraksha.local)",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Geocoding service unavailable" },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to search places" },
      { status: 500 }
    );
  }
}
