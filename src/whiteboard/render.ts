import { NODE_REGISTRY } from "../../shared/nodeRegistry.js";
import type { BoardUser, InteractionState, NodeV2, Point, View } from "../types/index.js";
import { clamp, worldToScreen } from "./geometry.js";

function drawDots(ctx: CanvasRenderingContext2D, width: number, height: number, view: View): void {
  const worldSpacing = 32;
  const dotRadius = clamp(view.scale * 1.1, 0.55, 1.25);
  const minWorldX = (0 - view.x) / view.scale;
  const minWorldY = (0 - view.y) / view.scale;
  const maxWorldX = (width - view.x) / view.scale;
  const maxWorldY = (height - view.y) / view.scale;
  const startX = Math.floor(minWorldX / worldSpacing) * worldSpacing;
  const startY = Math.floor(minWorldY / worldSpacing) * worldSpacing;

  ctx.fillStyle = "#d0d0cb";
  for (let wx = startX; wx <= maxWorldX; wx += worldSpacing) {
    for (let wy = startY; wy <= maxWorldY; wy += worldSpacing) {
      ctx.beginPath();
      ctx.arc(wx * view.scale + view.x, wy * view.scale + view.y, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawCursor(ctx: CanvasRenderingContext2D, user: BoardUser, view: View): void {
  if (!user.cursor) return;
  const point = worldToScreen(user.cursor, view);
  const label = user.name || "Guest";
  const paddingX = 7;
  const labelX = point.x + 10;
  const labelY = point.y + 10;

  ctx.save();
  ctx.font = `12px Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const labelWidth = Math.ceil(ctx.measureText(label).width) + paddingX * 2;

  ctx.fillStyle = user.color || "#2d2d2d";
  ctx.beginPath();
  ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.roundRect(labelX, labelY, labelWidth, 22, 6);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(label, labelX + paddingX, labelY + 15);
  ctx.restore();
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  const ellipsis = "...";
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    if (ctx.measureText(text.slice(0, mid) + ellipsis).width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, lo) + ellipsis;
}

function drawNode(ctx: CanvasRenderingContext2D, node: NodeV2, selected: boolean): void {
  const definition = NODE_REGISTRY[node.type];
  const accent = definition.accent;

  ctx.save();
  ctx.shadowColor = selected ? `${accent}44` : "rgba(0,0,0,0.08)";
  ctx.shadowBlur = selected ? 12 : 5;
  ctx.shadowOffsetY = 2;

  ctx.beginPath();
  ctx.roundRect(node.x, node.y, node.width, node.height, 4);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.beginPath();
  ctx.roundRect(node.x, node.y, node.width, node.height, 4);
  ctx.strokeStyle = selected ? accent : `${accent}88`;
  ctx.lineWidth = selected ? 2 : 1.5;
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(node.x, node.y, node.width, node.height, 4);
  ctx.clip();
  ctx.fillStyle = accent;
  ctx.fillRect(node.x, node.y, node.width, 28);
  ctx.restore();

  ctx.fillStyle = "#ffffff";
  ctx.font = `600 10px Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(definition.label.toUpperCase(), node.x + 10, node.y + 14);

  ctx.fillStyle = "#333333";
  ctx.font = `600 14px Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.textBaseline = "top";
  ctx.fillText(truncateText(ctx, node.title || definition.defaultTitle, node.width - 20), node.x + 10, node.y + 42);

  ctx.fillStyle = "#777777";
  ctx.font = `11px Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillText("No runtime behavior", node.x + 10, node.y + 64);

  ctx.restore();
}

function drawPlacementPreview(
  ctx: CanvasRenderingContext2D,
  preview: (Point & { type: "initialiser" }) | null
): void {
  if (!preview) return;
  const definition = NODE_REGISTRY[preview.type];
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.roundRect(preview.x, preview.y, definition.width, definition.height, 4);
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = definition.accent;
  ctx.lineWidth = 1.5;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export interface GraphState {
  nodes: Map<string, NodeV2>;
}

export function renderBoard(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  view: View,
  users: Map<string, BoardUser>,
  selfId: string | null,
  graphState: GraphState,
  interactionState: InteractionState
): void {
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const nodes = graphState.nodes ?? new Map<string, NodeV2>();

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  drawDots(ctx, width, height, view);

  ctx.save();
  ctx.translate(view.x, view.y);
  ctx.scale(view.scale, view.scale);

  for (const node of nodes.values()) {
    drawNode(ctx, node, interactionState.selectedNodeId === node.id);
  }
  drawPlacementPreview(ctx, interactionState.placementPreview);

  ctx.restore();

  for (const user of users.values()) {
    if (user.id !== selfId && (!user.cursorWorkspace || user.cursorWorkspace === "canvas")) {
      drawCursor(ctx, user, view);
    }
  }
}
