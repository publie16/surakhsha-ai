import { NextRequest, NextResponse } from "next/server";
import { findCandidateRoutes } from "@/lib/routing";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { origin, destination, hour } = body;

    if (
      !origin ||
      typeof origin.lat !== "number" ||
      typeof origin.lng !== "number" ||
      !destination ||
      typeof destination.lat !== "number" ||
      typeof destination.lng !== "number"
    ) {
      return NextResponse.json(
        { error: "Invalid origin or destination coordinates" },
        { status: 400 }
      );
    }

    const currentHour = typeof hour === "number" ? hour : new Date().getHours();

    const result = await findCandidateRoutes(origin, destination, currentHour);

    return NextResponse.json({
      fastest: result.fastest,
      safest: result.safest,
      allRoutes: result.allRoutes,
      timeOfDayHour: currentHour,
    });
  } catch (error: any) {
    console.error("Route calculation error:", error);
    return NextResponse.json(
      { error: "Failed to compute routes: " + (error?.message || "Unknown error") },
      { status: 500 }
    );
  }
}
