// Shared contracts for the minimal Node V2 canvas.

export type WorkspaceTab = "canvas" | "plan";

export type NodeV2Type = "initialiser";

export interface Point {
  x: number;
  y: number;
}

export interface View {
  x: number;
  y: number;
  scale: number;
}

export interface NodeV2 {
  id: string;
  type: NodeV2Type;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface NodeDefinitionV2 {
  type: NodeV2Type;
  label: string;
  defaultTitle: string;
  width: number;
  height: number;
  accent: string;
}

export interface WorkspaceStateV2 {
  version: 2;
  nodes: NodeV2[];
  planElements: string;
}

export interface BoardUser {
  id: string;
  name: string;
  color: string;
  cursor: Point | null;
  cursorWorkspace?: WorkspaceTab;
}

export interface InteractionState {
  selectedNodeId: string | null;
  placementPreview: (Point & { type: NodeV2Type }) | null;
}
