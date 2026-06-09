import { getStroke } from "perfect-freehand";
import { clamp, worldToScreen } from "./geometry.js";

function getSvgPathFromStroke(points) {
  if (!points.length) return "";

  const first = points[0];
  const path = [`M ${first[0].toFixed(2)} ${first[1].toFixed(2)} Q`];

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const nextPoint = points[(index + 1) % points.length];
    const midPoint = [
      (point[0] + nextPoint[0]) / 2,
      (point[1] + nextPoint[1]) / 2
    ];

    path.push(
      `${point[0].toFixed(2)} ${point[1].toFixed(2)} ${midPoint[0].toFixed(2)} ${midPoint[1].toFixed(2)}`
    );
  }

  path.push("Z");
  return path.join(" ");
}

function drawDots(ctx, width, height, view) {
  const worldSpacing = 32;
  const dotRadius = clamp(view.scale * 1.1, 0.55, 1.25);
  const minWorldX = (0 - view.x) / view.scale;
  const minWorldY = (0 - view.y) / view.scale;
  const maxWorldX = (width - view.x) / view.scale;
  const maxWorldY = (height - view.y) / view.scale;
  const startX = Math.floor(minWorldX / worldSpacing) * worldSpacing;
  const startY = Math.floor(minWorldY / worldSpacing) * worldSpacing;

  ctx.fillStyle = "#d5d5d0";

  for (let worldX = startX; worldX <= maxWorldX; worldX += worldSpacing) {
    for (let worldY = startY; worldY <= maxWorldY; worldY += worldSpacing) {
      const screenX = worldX * view.scale + view.x;
      const screenY = worldY * view.scale + view.y;

      ctx.beginPath();
      ctx.arc(screenX, screenY, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawStroke(ctx, stroke) {
  if (!stroke.points.length) return;

  ctx.fillStyle = stroke.color;

  if (stroke.points.length === 1) {
    const point = stroke.points[0];
    ctx.beginPath();
    ctx.arc(point.x, point.y, stroke.size / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const outline = getStroke(
    stroke.points.map((point) => [point.x, point.y, 0.5]),
    {
      size: stroke.size,
      thinning: 0,
      smoothing: 0.35,
      streamline: 0.25,
      simulatePressure: false,
      start: { cap: true, taper: 0 },
      end: { cap: true, taper: 0 }
    }
  );

  const path = getSvgPathFromStroke(outline);

  if (path) {
    ctx.fill(new Path2D(path));
  }
}

function drawCursor(ctx, user, view) {
  if (!user.cursor) return;

  const point = worldToScreen(user.cursor, view);
  const label = user.name || "Guest";
  const fontSize = 12;
  const paddingX = 7;
  const labelHeight = 22;
  const labelX = point.x + 10;
  const labelY = point.y + 10;

  ctx.save();
  ctx.font = `${fontSize}px Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const labelWidth = Math.ceil(ctx.measureText(label).width) + paddingX * 2;

  ctx.fillStyle = user.color || "#2d2d2d";
  ctx.beginPath();
  ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 6);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(label, labelX + paddingX, labelY + 15);
  ctx.restore();
}

export function renderBoard(ctx, canvas, view, strokes, users, selfId) {
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  drawDots(ctx, width, height, view);

  ctx.save();
  ctx.translate(view.x, view.y);
  ctx.scale(view.scale, view.scale);

  for (const stroke of strokes.values()) {
    drawStroke(ctx, stroke);
  }

  ctx.restore();

  for (const user of users.values()) {
    if (user.id !== selfId) {
      drawCursor(ctx, user, view);
    }
  }
}
