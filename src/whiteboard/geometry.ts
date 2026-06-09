import type { Point, View, BoardNode } from "../types/index.js";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function screenToWorld(point: Point, view: View): Point {
  return {
    x: (point.x - view.x) / view.scale,
    y: (point.y - view.y) / view.scale,
  };
}

export function worldToScreen(point: Point, view: View): Point {
  return {
    x: point.x * view.scale + view.x,
    y: point.y * view.scale + view.y,
  };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function snapToGrid(point: Point, step = 32): Point {
  return {
    x: Math.round(point.x / step) * step,
    y: Math.round(point.y / step) * step,
  };
}

export function getNodeCenter(node: BoardNode): Point {
  return {
    x: node.x + node.width / 2,
    y: node.y + node.height / 2,
  };
}

export function getNodeRect(node: BoardNode): { left: number; top: number; right: number; bottom: number } {
  return {
    left: node.x,
    top: node.y,
    right: node.x + node.width,
    bottom: node.y + node.height,
  };
}

export function pointInNode(point: Point, node: BoardNode): boolean {
  return (
    point.x >= node.x &&
    point.x <= node.x + node.width &&
    point.y >= node.y &&
    point.y <= node.y + node.height
  );
}

export function findNodeAtPoint(point: Point, nodes: Map<string, BoardNode>): BoardNode | null {
  const arr = Array.from(nodes.values());
  for (let i = arr.length - 1; i >= 0; i--) {
    if (pointInNode(point, arr[i])) return arr[i];
  }
  return null;
}
