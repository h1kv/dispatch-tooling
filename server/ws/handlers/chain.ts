import type { WebSocket } from "ws";
import { nodes, edges, broadcast } from "../../state/store.js";
import { updateNodeStatus } from "../../state/operations.js";
import { runChain } from "../../execution/engine.js";
import { debug } from "../../utils/debug.js";

// Track running chains and pending review resolvers
const runningChains = new Map<string, boolean>();
const reviewResolvers = new Map<string, (decision: "approved" | "rejected") => void>();

export function handleChainRun(_ws: WebSocket, userId: string): void {
  if (runningChains.get("main")) {
    debug("chain:run:already-running", { userId });
    return;
  }

  runningChains.set("main", true);
  broadcast({ type: "chain:started" });
  debug("chain:run", { userId });

  // Reset all node statuses to idle
  for (const node of nodes.values()) {
    if (node.status !== "idle") {
      const next = updateNodeStatus(node.id, "idle", undefined);
      if (next) broadcast({ type: "node:status", nodeId: node.id, status: "idle", output: null });
    }
  }

  const nodesCopy = new Map(nodes);
  const edgesCopy = new Map(edges);

  runChain(nodesCopy, edgesCopy, {
    onNodeStatus: (nodeId, status, output) => {
      const next = updateNodeStatus(nodeId, status, output);
      if (next) {
        broadcast({ type: "node:status", nodeId, status, output: output ?? null });
        if (output !== undefined) {
          broadcast({ type: "node:output", nodeId, output });
        }
      }
    },
    waitForReview: (nodeId) => {
      return new Promise<"approved" | "rejected">((resolve) => {
        reviewResolvers.set(nodeId, resolve);
      });
    },
  })
    .then(() => {
      runningChains.delete("main");
      broadcast({ type: "chain:complete" });
      debug("chain:complete", { userId });
    })
    .catch((err: Error) => {
      runningChains.delete("main");
      broadcast({ type: "chain:error", message: err.message });
      debug("chain:error", { message: err.message });
    });
}

export function handleReviewApprove(_ws: WebSocket, userId: string, message: Record<string, unknown>): void {
  const nodeId = message.nodeId as string;
  const resolve = reviewResolvers.get(nodeId);
  if (!resolve) {
    debug("review:approve:no-pending", { userId, nodeId });
    return;
  }
  reviewResolvers.delete(nodeId);
  resolve("approved");
  debug("review:approve", { userId, nodeId });
}

export function handleReviewReject(_ws: WebSocket, userId: string, message: Record<string, unknown>): void {
  const nodeId = message.nodeId as string;
  const resolve = reviewResolvers.get(nodeId);
  if (!resolve) {
    debug("review:reject:no-pending", { userId, nodeId });
    return;
  }
  reviewResolvers.delete(nodeId);
  resolve("rejected");
  debug("review:reject", { userId, nodeId });
}

export function handleChainStop(_ws: WebSocket, userId: string): void {
  runningChains.delete("main");
  // Clear any pending review
  for (const [, resolve] of reviewResolvers) resolve("rejected");
  reviewResolvers.clear();
  // Reset running nodes to idle
  for (const node of nodes.values()) {
    if (node.status === "running" || node.status === "paused") {
      updateNodeStatus(node.id, "idle");
      broadcast({ type: "node:status", nodeId: node.id, status: "idle", output: null });
    }
  }
  broadcast({ type: "chain:stopped" });
  debug("chain:stop", { userId });
}
