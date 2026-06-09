import { useEffect, useRef, useState } from "react";
import type { WorkspaceTab } from "../../types/index.js";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  socketRef: React.MutableRefObject<WebSocket | null>;
  workspaceTab: WorkspaceTab;
}

function sendJson(ws: WebSocket | null, msg: unknown) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

export function ChatPanel({ socketRef, workspaceTab }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onChatEvent(e: Event) {
      const msg = (e as CustomEvent<Record<string, unknown>>).detail;
      if (msg.type === "chat:response") {
        setLoading(false);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: (msg.response as string) || "" },
        ]);
      }
      if (msg.type === "chat:error") {
        setLoading(false);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: (msg.message as string) || "Chat failed." },
        ]);
      }
    }

    window.addEventListener("dispatch:chat", onChatEvent);
    return () => window.removeEventListener("dispatch:chat", onChatEvent);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  function send() {
    const content = input.trim();
    if (!content || loading) return;
    setMessages((prev) => [...prev, { role: "user", content }]);
    setInput("");
    setLoading(true);
    sendJson(socketRef.current, { type: "chat:message", content, workspaceTab });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="vsc-chat-panel">
      <div className="vsc-chat-history" ref={scrollRef}>
        {messages.length === 0 && !loading && (
          <div className="vsc-chat-empty">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" />
            </svg>
            <p>Plain chat</p>
            <p className="sub">Messages stay conversational and do not edit the canvas.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`vsc-chat-msg vsc-chat-msg--${msg.role}`}>
            <div className="vsc-chat-bubble">
              <p className="vsc-chat-text">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="vsc-chat-msg vsc-chat-msg--assistant">
            <div className="vsc-chat-bubble vsc-chat-bubble--loading" aria-label="Assistant is responding">
              <span className="vsc-chat-dot" />
              <span className="vsc-chat-dot" />
              <span className="vsc-chat-dot" />
            </div>
          </div>
        )}
      </div>

      <div className="vsc-chat-input-wrap">
        <textarea
          className="vsc-chat-input"
          value={input}
          rows={2}
          placeholder="Ask the assistant..."
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className="vsc-chat-send"
          onClick={send}
          disabled={!input.trim() || loading}
          aria-label="Send message"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M2 2.5 14 8 2 13.5V9l6-1-6-1z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
