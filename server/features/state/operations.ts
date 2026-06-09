import { getNodeDefinition, GRID_SIZE, INITIALISER_NODE_TYPE } from "../../../shared/nodeRegistry.js";
import type { NodeV2, NodeV2Type, Point } from "../../../shared/types.js";
import { createId } from "../../utils/id.js";
import { safeLabel, safeText, snapPoint } from "../../utils/validation.js";
import { nodes, persistWorkspaceState } from "./store.js";

export interface CreateNodeV2Params {
  nodeId?: string;
  type: unknown;
  position: Point | null;
  title?: unknown;
  userId: string;
}

export interface UpdateNodeV2Patch {
  position?: Point | null;
  title?: unknown;
}

function hasInitialiser(): boolean {
  return Array.from(nodes.values()).some((node) => node.type === INITIALISER_NODE_TYPE);
}

function safeNodeType(value: unknown): NodeV2Type | null {
  return typeof value === "string" && getNodeDefinition(value) ? value as NodeV2Type : null;
}

export function createNodeFromPayload(params: CreateNodeV2Params): NodeV2 | null {
  const type = safeNodeType(params.type);
  const definition = type ? getNodeDefinition(type) : null;
  if (!type || !definition || !params.position) return null;
  if (type === INITIALISER_NODE_TYPE && hasInitialiser()) return null;

  const snapped = snapPoint(params.position, GRID_SIZE);
  const now = Date.now();
  const node: NodeV2 = {
    id: safeText(params.nodeId, createId("node")),
    type,
    title: safeLabel(params.title, definition.defaultTitle),
    x: snapped.x,
    y: snapped.y,
    width: definition.width,
    height: definition.height,
    createdBy: params.userId,
    createdAt: now,
    updatedAt: now,
  };
  nodes.set(node.id, node);
  persistWorkspaceState();
  return node;
}

export function updateNode(nodeId: string, patch: UpdateNodeV2Patch): NodeV2 | null {
  const node = nodes.get(nodeId);
  if (!node) return null;

  const next: NodeV2 = { ...node, updatedAt: Date.now() };
  if (patch.position) {
    const snapped = snapPoint(patch.position, GRID_SIZE);
    next.x = snapped.x;
    next.y = snapped.y;
  }
  if (typeof patch.title === "string") {
    next.title = safeLabel(patch.title, node.title);
  }

  nodes.set(nodeId, next);
  persistWorkspaceState();
  return next;
}

export function deleteNode(nodeId: string): boolean {
  const deleted = nodes.delete(nodeId);
  if (deleted) persistWorkspaceState();
  return deleted;
}
