import type { WebSocket } from "ws";
import { send } from "../../state/store.js";

function responseFor(content: string): string {
  const text = content.trim();
  if (!text) return "Say something and I will help from this reset canvas.";
  if (/^(hi|hello|hey)\b/i.test(text)) return "Hey. The canvas is in its minimal reset state with only the Initialiser node available.";
  return "The canvas is in its minimal reset state. I can chat here, but I cannot change the canvas yet.";
}

export async function handleChatMessage(
  ws: WebSocket,
  _userId: string,
  data: Record<string, unknown>
): Promise<void> {
  const content = String(data.content ?? "");
  send(ws, { type: "chat:response", response: responseFor(content), responseMode: "done" });
}
