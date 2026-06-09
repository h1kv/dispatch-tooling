import type { NodeDefinitionV2, NodeV2Type } from "./types.js";

export const GRID_SIZE = 32;
export const INITIALISER_NODE_TYPE: NodeV2Type = "initialiser";

export const NODE_REGISTRY: Record<NodeV2Type, NodeDefinitionV2> = {
  initialiser: {
    type: "initialiser",
    label: "Initialiser",
    defaultTitle: "Initialiser",
    width: 240,
    height: 88,
    accent: "#16825d",
  },
};

export function getNodeDefinition(type: string): NodeDefinitionV2 | null {
  return type === INITIALISER_NODE_TYPE ? NODE_REGISTRY.initialiser : null;
}
