import type { WebSocket } from "ws";
import { debug } from "../../utils/debug.js";
import { users } from "../state/store.js";
import { handleCursorUpdate } from "./handlers/cursor.js";
import { handleJoin } from "./handlers/join.js";
import { handleNodeCreate, handleNodeDelete, handleNodeUpdate } from "./handlers/node.js";
import { handlePlanUpdate } from "./handlers/plan.js";
import { handleChatMessage } from "./handlers/chat.js";

export function dispatchMessage(ws: WebSocket, userId: string, raw: Buffer): void {
  let message: Record<string, unknown>;
  try {
    message = JSON.parse(raw.toString()) as Record<string, unknown>;
  } catch {
    debug("invalid-json", { userId });
    return;
  }

  if (!message || typeof message.type !== "string") {
    debug("invalid-message", { userId });
    return;
  }

  const user = users.get(userId);
  const fallbackName = user?.name ?? "Guest";

  switch (message.type) {
    case "join":          return handleJoin(ws, userId, message, fallbackName);
    case "cursor:update": return handleCursorUpdate(ws, userId, message);
    case "node:create":   return handleNodeCreate(ws, userId, message);
    case "node:update":   return handleNodeUpdate(ws, userId, message);
    case "node:delete":   return handleNodeDelete(ws, userId, message);
    case "plan:update":   return handlePlanUpdate(ws, message);
    case "chat:message":  void handleChatMessage(ws, userId, message); return;
    default:
      debug("unknown-message", { userId, type: message.type });
  }
}
