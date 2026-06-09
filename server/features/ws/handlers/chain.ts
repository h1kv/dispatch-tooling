import type { WebSocket } from "ws";
import type { NodeStatus } from "../../../../shared/types.js";
import { broadcast, nodes } from "../../state/store.js";
import { runChain } from "../../execution/engine.js";
import { debug } from "../../../utils/debug.js";

let abortController: AbortController | null = null;

export function handleChainRun(_ws: WebSocket, _userId: string, _message: Record<string, unknown>): void {
  if (abortController) {
    debug("chain:run:already-running");
    return;
  }

  const initialiser = Array.from(nodes.values()).find((n) => n.type === "initialiser");
  const workspacePath = initialiser?.config?.workspacePath ?? "./workspace";

  abortController = new AbortController();
  const { signal } = abortController;

  broadcast({ type: "chain:started" });

  void (async () => {
    try {
      await runChain({
        workspacePath,
        abortSignal: signal,
        onNodeStatus(nodeId: string, status: NodeStatus, output: string | null) {
          broadcast({ type: "node:status", nodeId, status, output });
        },
      });
      broadcast({ type: "chain:complete" });
      debug("chain:complete");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const nodeId = (err as { nodeId?: string }).nodeId;
      broadcast({ type: "chain:error", message, nodeId });
      debug("chain:error", { message });
    } finally {
      abortController = null;
    }
  })();
}

export function handleChainStop(_ws: WebSocket, _userId: string, _message: Record<string, unknown>): void {
  if (abortController) {
    abortController.abort();
    abortController = null;
    broadcast({ type: "chain:stopped" });
    debug("chain:stop");
  }
}
