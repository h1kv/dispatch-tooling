export interface Point { x: number; y: number; }

export function safeText(value: unknown, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, 80) || fallback;
}

export function safePoint(point: unknown): Point | null {
  if (!point || typeof point !== "object") return null;
  const p = point as Record<string, unknown>;
  const x = Number(p.x);
  const y = Number(p.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

export function safeLabel(value: unknown, fallback: string): string {
  return safeText(value, fallback).slice(0, 80);
}

export function snapPoint(point: Point, gridSize: number): Point {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}
