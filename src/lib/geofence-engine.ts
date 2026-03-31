/**
 * Geo-Fence Engine — SURAKSHA Tourist Safety System
 * ──────────────────────────────────────────────────
 * Pure JavaScript/TypeScript geo-fence engine (no external libraries).
 *
 * Features:
 *  - Haversine formula for accurate distance (circle fences)
 *  - Ray-casting algorithm for polygon fences
 *  - State management per fence (tracks previous in/out)
 *  - 30-second cooldown to prevent duplicate alerts
 *  - ENTER / EXIT event detection
 *  - Handles 50+ geo-fences at 2-5 second intervals
 */

// ── Types ───────────────────────────────────────────────────────────────────

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface CircleGeoFence {
  id: string;
  name: string;
  type: "circle";
  center: GeoPoint;
  radius: number; // meters
  zone: "RED" | "ORANGE" | "YELLOW";
  description?: string;
}

export interface PolygonGeoFence {
  id: string;
  name: string;
  type: "polygon";
  vertices: GeoPoint[];
  zone: "RED" | "ORANGE" | "YELLOW";
  description?: string;
}

export type GeoFence = CircleGeoFence | PolygonGeoFence;

export type GeoFenceEventType = "ENTER" | "EXIT";

export interface GeoFenceEvent {
  fenceId: string;
  fenceName: string;
  event: GeoFenceEventType;
  zone: string;
  description?: string;
  location: GeoPoint;
  timestamp: number;
}

// Internal state per fence
interface FenceState {
  inside: boolean;
  lastEventTime: number; // ms timestamp of last alert
}

// ── Haversine Formula ───────────────────────────────────────────────────────
// Returns distance in METERS between two GPS coordinates.
// Uses Earth radius 6371008.8 meters for maximum accuracy.

const EARTH_RADIUS_M = 6_371_008.8;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineDistance(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return EARTH_RADIUS_M * c;
}

// ── Ray-Casting Algorithm ───────────────────────────────────────────────────
// Determines if a point is inside a polygon using the ray-casting method.
// Shoots a ray from the point to the right (+lng direction) and counts
// how many polygon edges it crosses.  Odd count = inside.

export function isPointInPolygon(
  point: GeoPoint,
  vertices: GeoPoint[],
): boolean {
  const n = vertices.length;
  if (n < 3) return false; // Not a valid polygon

  let inside = false;
  const { lat: px, lng: py } = point;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = vertices[i].lat;
    const yi = vertices[i].lng;
    const xj = vertices[j].lat;
    const yj = vertices[j].lng;

    // Check if ray from point crosses this edge
    const intersects =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;

    if (intersects) inside = !inside;
  }

  return inside;
}

// ── Point-in-Circle Detection ───────────────────────────────────────────────

export function isPointInCircle(
  point: GeoPoint,
  center: GeoPoint,
  radiusMeters: number,
): boolean {
  return haversineDistance(point, center) <= radiusMeters;
}

// ── Geo-Fence Check ─────────────────────────────────────────────────────────
// Returns true if a point is inside the given geo-fence

export function isInsideGeoFence(point: GeoPoint, fence: GeoFence): boolean {
  if (fence.type === "circle") {
    return isPointInCircle(point, fence.center, fence.radius);
  }
  // polygon
  return isPointInPolygon(point, fence.vertices);
}

// ── Stateful Geo-Fence Engine (Client-Side) ─────────────────────────────────
// Tracks per-fence state + cooldown.  Designed to run in the browser.

const COOLDOWN_MS = 30_000; // 30 seconds

export class GeoFenceMonitor {
  private states: Map<string, FenceState> = new Map();
  private fences: GeoFence[] = [];

  // Event callbacks
  onEnter: ((event: GeoFenceEvent) => void) | null = null;
  onExit: ((event: GeoFenceEvent) => void) | null = null;

  // ── Load / update fences ───────────────────────────────

  setFences(fences: GeoFence[]): void {
    this.fences = fences;

    // Clean up states for removed fences
    const ids = new Set(fences.map((f) => f.id));
    Array.from(this.states.keys()).forEach((key) => {
      if (!ids.has(key)) this.states.delete(key);
    });
  }

  getFences(): GeoFence[] {
    return this.fences;
  }

  // ── Main update — call this every 2-5 seconds with GPS ─

  update(location: GeoPoint): Record<string, GeoFenceEventType> {
    const now = Date.now();
    const result: Record<string, GeoFenceEventType> = {};

    for (const fence of this.fences) {
      const inside = isInsideGeoFence(location, fence);

      let state = this.states.get(fence.id);
      if (!state) {
        // First check: initialise without firing an event (prevents
        // spurious ENTER when user is already sitting inside a zone)
        state = { inside, lastEventTime: 0 };
        this.states.set(fence.id, state);
        continue;
      }

      // State transition detection
      const wasInside = state.inside;

      if (inside && !wasInside) {
        // ── ENTER ───────────────────────────────────────
        if (now - state.lastEventTime >= COOLDOWN_MS) {
          state.inside = true;
          state.lastEventTime = now;
          result[fence.id] = "ENTER";

          const event: GeoFenceEvent = {
            fenceId: fence.id,
            fenceName: fence.name,
            event: "ENTER",
            zone: fence.zone,
            description: fence.description,
            location,
            timestamp: now,
          };
          this.onEnter?.(event);
        }
      } else if (!inside && wasInside) {
        // ── EXIT ────────────────────────────────────────
        if (now - state.lastEventTime >= COOLDOWN_MS) {
          state.inside = false;
          state.lastEventTime = now;
          result[fence.id] = "EXIT";

          const event: GeoFenceEvent = {
            fenceId: fence.id,
            fenceName: fence.name,
            event: "EXIT",
            zone: fence.zone,
            description: fence.description,
            location,
            timestamp: now,
          };
          this.onExit?.(event);
        }
      }
    }

    return result;
  }

  // ── Get current state for all fences ───────────────────

  getStates(): Record<string, boolean> {
    const out: Record<string, boolean> = {};
    this.states.forEach((state, id) => {
      out[id] = state.inside;
    });
    return out;
  }

  // ── Reset ──────────────────────────────────────────────

  reset(): void {
    this.states.clear();
  }
}

// ── Server-side stateless check ─────────────────────────────────────────────
// For the API route — returns which fences the user is inside/outside of.

export function checkGeoFences(
  location: GeoPoint,
  fences: GeoFence[],
): Record<string, { inside: boolean; fence: GeoFence }> {
  const results: Record<string, { inside: boolean; fence: GeoFence }> = {};

  for (const fence of fences) {
    results[fence.id] = {
      inside: isInsideGeoFence(location, fence),
      fence,
    };
  }

  return results;
}
