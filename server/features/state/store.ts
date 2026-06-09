import type { WebSocket } from "ws";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { BoardUser, NodeV2, WorkspaceStateV2, WorkspaceTab } from "../../../shared/types.js";

export interface ServerUser extends BoardUser {}

export const clients = new Map<WebSocket, string>();
export const users = new Map<string, ServerUser>();
export const nodes = new Map<string, NodeV2>();
export let planExcalidrawData = "[]";

const WORKSPACE_STATE_DIR = path.join(process.cwd(), ".dispatch");
const WORKSPACE_STATE_FILE = path.join(WORKSPACE_STATE_DIR, "workspace-state.json");

export const userColors = ["#2d2d2d", "#7c3f3f", "#4f6b45", "#7a612e", "#6a4f76", "#7a4f5b"];
export let colorIndex = 0;
export function incrementColorIndex(): void { colorIndex++; }

export function serializeUsers(): ServerUser[] { return Array.from(users.values()); }
export function serializeNodes(): NodeV2[] { return Array.from(nodes.values()); }

export function setPlanExcalidrawData(data: string): void {
  planExcalidrawData = data;
  persistWorkspaceState();
}

export function workspaceStateSnapshot(): WorkspaceStateV2 {
  return {
    version: 2,
    nodes: serializeNodes(),
    planElements: planExcalidrawData,
  };
}

function isNodeV2(value: unknown): value is NodeV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const node = value as Partial<NodeV2>;
  return (
    typeof node.id === "string" &&
    node.type === "initialiser" &&
    typeof node.title === "string" &&
    Number.isFinite(node.x) &&
    Number.isFinite(node.y) &&
    Number.isFinite(node.width) &&
    Number.isFinite(node.height) &&
    typeof node.createdBy === "string" &&
    Number.isFinite(node.createdAt) &&
    Number.isFinite(node.updatedAt)
  );
}

function hydrateWorkspaceState(): void {
  if (!existsSync(WORKSPACE_STATE_FILE)) return;
  try {
    const parsed = JSON.parse(readFileSync(WORKSPACE_STATE_FILE, "utf-8")) as Partial<WorkspaceStateV2>;
    if (parsed.version !== 2) return;
    nodes.clear();
    for (const node of parsed.nodes ?? []) {
      if (isNodeV2(node) && node.type === "initialiser" && !Array.from(nodes.values()).some((n) => n.type === "initialiser")) {
        nodes.set(node.id, node);
      }
    }
    if (typeof parsed.planElements === "string") planExcalidrawData = parsed.planElements;
  } catch (err) {
    console.warn("[workspace-state] failed to load", err);
  }
}

export function persistWorkspaceState(): void {
  try {
    mkdirSync(WORKSPACE_STATE_DIR, { recursive: true });
    const tmp = `${WORKSPACE_STATE_FILE}.tmp`;
    writeFileSync(tmp, JSON.stringify(workspaceStateSnapshot(), null, 2), "utf-8");
    renameSync(tmp, WORKSPACE_STATE_FILE);
  } catch (err) {
    console.warn("[workspace-state] failed to save", err);
  }
}

export function resetWorkspaceForTests(): void {
  nodes.clear();
  planExcalidrawData = "[]";
}

export function send(ws: WebSocket, message: unknown): void {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(message));
}

export function broadcast(message: unknown, exceptWs: WebSocket | null = null): void {
  const encoded = JSON.stringify(message);
  for (const ws of clients.keys()) {
    if (ws !== exceptWs && ws.readyState === ws.OPEN) ws.send(encoded);
  }
}

export function safeWorkspaceTab(value: unknown): WorkspaceTab {
  return value === "plan" ? "plan" : "canvas";
}

hydrateWorkspaceState();
