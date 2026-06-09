import type { WebSocket } from "ws";
import { users, broadcast } from "../../state/store.js";
import { safePoint } from "../../utils/validation.js";
import { debug } from "../../utils/debug.js";

export function handleCursorUpdate(_ws: WebSocket, userId: string, message: Record<string, unknown>): void {
  const user = users.get(userId);
  if (!user) return;
  user.cursor = safePoint(message.point);
  broadcast({ type: "cursor:update", userId, point: user.cursor }, _ws);
  debug("cursor:update", { userId });
}
