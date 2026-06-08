export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function createId(prefix) {
  if (window.crypto?.randomUUID) {
    return `${prefix}_${window.crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function screenToWorld(point, view) {
  return {
    x: (point.x - view.x) / view.scale,
    y: (point.y - view.y) / view.scale
  };
}

export function worldToScreen(point, view) {
  return {
    x: point.x * view.scale + view.x,
    y: point.y * view.scale + view.y
  };
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function distanceToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return distance(point, start);
  }

  const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
  return distance(point, {
    x: start.x + t * dx,
    y: start.y + t * dy
  });
}

export function findStrokeAtPoint(strokes, point, threshold) {
  const orderedStrokes = Array.from(strokes.values()).reverse();

  for (const stroke of orderedStrokes) {
    if (!stroke.points.length) continue;

    if (stroke.points.length === 1) {
      if (distance(point, stroke.points[0]) <= stroke.size / 2 + threshold) {
        return stroke.id;
      }
      continue;
    }

    for (let index = 1; index < stroke.points.length; index += 1) {
      const start = stroke.points[index - 1];
      const end = stroke.points[index];

      if (distanceToSegment(point, start, end) <= stroke.size / 2 + threshold) {
        return stroke.id;
      }
    }
  }

  return null;
}
