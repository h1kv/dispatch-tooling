import type { WebSocket } from "ws";
import { broadcast, setPlanExcalidrawData } from "../../state/store.js";

export function handlePlanUpdate(ws: WebSocket, data: Record<string, unknown>): void {
  const elements = typeof data.elements === "string" ? data.elements : "[]";
  setPlanExcalidrawData(elements);
  broadcast({ type: "plan:updated", elements }, ws);
}
