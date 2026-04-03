import { NextResponse } from "next/server";
import { offsetByMeters } from "@/lib/threat-engine";

// Severity → zone color mapping
const SEVERITY_ZONE: Record<string, string> = {
  high: "RED",
  medium: "ORANGE",
  low: "YELLOW",
};

// Severity → radius in meters for the map circle
const SEVERITY_RADIUS: Record<string, number> = {
  high: 1200,
  medium: 800,
  low: 500,
};

// Human-readable labels per type
const TYPE_LABELS: Record<string, string> = {
  landslide: "Landslide Zone",
  flood: "Flood Risk Area",
  earthquake: "Earthquake-Prone Zone",
  wildfire: "Wildfire Risk Area",
  congestion: "Traffic Congestion",
  restricted_area: "Restricted Road Area",
  accident_zone: "Accident-Prone Zone",
  theft_risk: "Theft Hotspot",
  assault_risk: "Assault Risk Area",
  unsafe_area: "Unsafe Neighborhood",
};

interface AIThreatItem {
  type: string;
  distance_km: string | number;
  severity: string;
  reason: string;
  location_name: string;
}

interface AIResponse {
  user_coordinates: { lat: number; lng: number };
  hazard: AIThreatItem[];
  traffic: AIThreatItem[];
  risk: AIThreatItem[];
  summary: string;
}

// GET /api/geofence-ai?lat=X&lng=Y&category=hazard|traffic|risk
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const category = searchParams.get("category") ?? "hazard";

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json(
      { error: "lat and lng required" },
      { status: 400 }
    );
  }

  if (!["all", "hazard", "traffic", "risk"].includes(category)) {
    return NextResponse.json(
      { error: "category must be all, hazard, traffic, or risk" },
      { status: 400 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 500 }
    );
  }

  // Build the GPT prompt
  const threatPrompt = `
You are a geospatial threat-analysis assistant for an app called SURAKSHA.

INPUT:
User coordinates:
latitude: ${lat}
longitude: ${lng}

TASK:
Analyze the location and detect all threats within a 10–20 km radius.
Return results ONLY inside the required JSON structure.

Threat categories:

1. Hazard (Natural hazards)
   - Landslides
   - Flood zone / river overflow
   - Earthquake-prone zone
   - Wildfire or forest fire risk

2. Traffic (Traffic geofencing)
   - Congestion zones
   - Restricted roads / no-entry areas
   - Accident-prone / hazard zones

3. Risk (Crime & safety risk)
   - Theft hotspots
   - Assault-risk areas
   - Unsafe neighborhoods

RULES:
- You are a Real-Time Intelligence Engine.
- DO NOT invent fake places. Lookup the coordinates (${lat}, ${lng}) and identify the ACTUAL neighborhoods, roads, or geographical features (rivers, hills, highways) within 20km.
- Base hazards on REAL topography (e.g., if there's a river, name the river for flood risks. If it's a hilly city, name the hill/mountain passages for landslides).
- Base traffic on REAL major roads or intersections near these coordinates.
- Base risks on REAL commercial or secluded areas nearby.
- ALWAYS return exactly 2 hazard, 2 traffic, and 2 risk items to ensure the map is well-populated.
- Output ONLY JSON. No extra text.

OUTPUT FORMAT:
{
  "user_coordinates": {
    "lat": ${lat},
    "lng": ${lng}
  },
  "hazard": [
    {
      "type": "<landslide | flood | earthquake | wildfire>",
      "location_name": "<real nearby place/area/village name where this threat exists>",
      "distance_km": "<numeric>",
      "severity": "<low | medium | high>",
      "reason": "<short scientific/geographical explanation>"
    }
  ],
  "traffic": [
    {
      "type": "<congestion | restricted_area | accident_zone>",
      "location_name": "<real nearby place/road/area name where this threat exists>",
      "distance_km": "<numeric>",
      "severity": "<low | medium | high>",
      "reason": "<why this is a traffic hazard>"
    }
  ],
  "risk": [
    {
      "type": "<theft_risk | assault_risk | unsafe_area>",
      "location_name": "<real nearby locality/neighborhood name where this risk exists>",
      "distance_km": "<numeric>",
      "severity": "<low | medium | high>",
      "reason": "<short reason based on crime pattern>"
    }
  ],
  "summary": "<one-line human friendly summary>"
}
`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are SURAKSHA, a geospatial safety assistant. Reply with valid JSON only.",
          },
          { role: "user", content: threatPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.35,
        max_tokens: 1200,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[geofence-ai] OpenAI error:", res.status, errText);
      return NextResponse.json(
        { error: "OpenAI API error", detail: errText },
        { status: 502 }
      );
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { error: "Empty OpenAI response" },
        { status: 502 }
      );
    }

    const parsed: AIResponse = JSON.parse(raw);

    // Convert ALL categories into fence objects (client will cache and filter)
    const allFences: Record<string, Array<{
      id: string; type: "circle"; centerLat: number; centerLng: number;
      radius: number; zone: string; name: string; active: boolean; description: string;
    }>> = {};

    for (const cat of ["hazard", "traffic", "risk"] as const) {
      const items: AIThreatItem[] = parsed[cat] ?? [];
      const fencesForCat = items.map((item, index) => {
        const distKm = parseFloat(String(item.distance_km)) || 5;
        const severity = (item.severity || "low").toLowerCase();

        // Calculate bearing from index to spread items around the user
        const bearingDeg = (index * 137.5 + (cat === "traffic" ? 45 : cat === "risk" ? 90 : 0)) % 360;
        const distM = distKm * 1000;

        // Get center position offset from user
        const center = offsetByMeters(lat, lng, bearingDeg, Math.min(distM, 18000));

        // Specific colors based on category
        let zoneColor = "BROWN"; // default risk
        if (cat === "hazard") zoneColor = "PURPLE";
        if (cat === "traffic") zoneColor = "BLUE";

        return {
          id: `ai-${cat}-${index}`,
          type: "circle" as const,
          centerLat: center.lat,
          centerLng: center.lng,
          radius: SEVERITY_RADIUS[severity] || 600,
          zone: zoneColor,
          name: item.location_name
            ? `${TYPE_LABELS[item.type] || item.type.replace(/_/g, " ")} — ${item.location_name}`
            : TYPE_LABELS[item.type] || item.type.replace(/_/g, " "),
          active: true,
          description: item.reason,
        };
      });
      allFences[cat] = fencesForCat;
    }

    return NextResponse.json({
      fences: allFences,
      summary: parsed.summary || "AI threat analysis complete.",
    });
  } catch (err: any) {
    console.error("[geofence-ai] Error:", err);
    return NextResponse.json(
      { error: "Failed to analyze geofence threats" },
      { status: 500 }
    );
  }
}
