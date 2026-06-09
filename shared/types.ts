// Shared contracts for the Node V2 canvas.

export type WorkspaceTab = "canvas" | "plan";

export type NodeV2Type =
  | "initialiser"
  | "investigate"
  | "plan"
  | "design"
  | "create"
  | "evaluate"
  | "doc"
  | "materialize"
  | "context";

export type EdgeV2Kind = "flow" | "midput";
export type NodeStatus = "idle" | "running" | "done" | "error";

export interface Point { x: number; y: number; }
export interface View { x: number; y: number; scale: number; }

export interface NodeV2Config {
  workspacePath?: string; // initialiser
  taskPrompt?: string;    // SDLC nodes
  content?: string;       // context node
}

export interface NodeV2 {
  id: string;
  type: NodeV2Type;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  config: NodeV2Config;
  status: NodeStatus;
  output: string | null;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface EdgeV2 {
  id: string;
  sourceId: string;
  targetId: string;
  kind: EdgeV2Kind;
  createdBy: string;
  createdAt: number;
}

export interface NodeDefinitionV2 {
  type: NodeV2Type;
  label: string;
  defaultTitle: string;
  width: number;
  height: number;
  accent: string;
  hasFlowIn: boolean;
  hasFlowOut: boolean;
  hasMidputIn: boolean;
  hasMidputOut: boolean;
  isSDLC: boolean;
  defaultConfig: NodeV2Config;
}

export interface WorkspaceStateV2 {
  version: 2;
  nodes: NodeV2[];
  edges: EdgeV2[];
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
  pendingConnectionSourceId: string | null;
  pendingConnectionKind: EdgeV2Kind | null;
  connectionDraftTarget: Point | null;
}
