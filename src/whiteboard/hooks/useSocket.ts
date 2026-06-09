import { useEffect, useRef, useState } from "react";
import type { BoardUser, NodeV2 } from "../../types/index.js";

function getSocketUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

function sendJson(socketRef: React.MutableRefObject<WebSocket | null>, message: unknown): void {
  if (socketRef.current?.readyState === WebSocket.OPEN) {
    socketRef.current.send(JSON.stringify(message));
  }
}

export interface UseSocketResult {
  status: string;
  users: Map<string, BoardUser>;
  nodesRef: React.MutableRefObject<Map<string, NodeV2>>;
  selfIdRef: React.MutableRefObject<string | null>;
  socketRef: React.MutableRefObject<WebSocket | null>;
  graphVersion: number;
  sendWs: (msg: unknown) => void;
  planElements: string;
  sendPlanUpdate: (elements: string) => void;
}

export function useSocket(username: string): UseSocketResult {
  const socketRef = useRef<WebSocket | null>(null);
  const selfIdRef = useRef<string | null>(null);
  const nodesRef = useRef<Map<string, NodeV2>>(new Map());
  const usersRef = useRef<Map<string, BoardUser>>(new Map());

  const [status, setStatus] = useState("connecting");
  const [users, setUsers] = useState<Map<string, BoardUser>>(new Map());
  const [graphVersion, setGraphVersion] = useState(0);
  const [planElements, setPlanElements] = useState("[]");

  useEffect(() => {
    const socket = new WebSocket(getSocketUrl());
    socketRef.current = socket;
    setStatus("connecting");

    socket.addEventListener("open", () => {
      setStatus("connected");
      sendJson(socketRef, { type: "join", name: username });
    });

    socket.addEventListener("message", (event: MessageEvent) => {
      let message: Record<string, unknown>;
      try {
        message = JSON.parse(event.data as string) as Record<string, unknown>;
      } catch {
        return;
      }

      if (message.type === "init") {
        selfIdRef.current = message.selfId as string;
        usersRef.current = new Map(((message.users as BoardUser[]) || []).map((user) => [user.id, user]));
        nodesRef.current = new Map(((message.nodes as NodeV2[]) || []).map((node) => [node.id, node]));
        setPlanElements(typeof message.planElements === "string" ? message.planElements : "[]");
        setUsers(new Map(usersRef.current));
        setGraphVersion((value) => value + 1);
        return;
      }

      if (message.type === "user:joined") {
        const user = message.user as BoardUser;
        usersRef.current.set(user.id, user);
        setUsers(new Map(usersRef.current));
        return;
      }

      if (message.type === "user:left") {
        usersRef.current.delete(message.userId as string);
        setUsers(new Map(usersRef.current));
        setGraphVersion((value) => value + 1);
        return;
      }

      if (message.type === "cursor:update") {
        const user = usersRef.current.get(message.userId as string);
        if (!user) return;
        usersRef.current.set(message.userId as string, {
          ...user,
          cursor: message.point as { x: number; y: number },
          cursorWorkspace: message.workspaceTab === "plan" ? "plan" : "canvas",
        });
        setUsers(new Map(usersRef.current));
        setGraphVersion((value) => value + 1);
        return;
      }

      if (message.type === "node:created" || message.type === "node:updated") {
        const node = message.node as NodeV2;
        nodesRef.current.set(node.id, node);
        setGraphVersion((value) => value + 1);
        return;
      }

      if (message.type === "node:deleted") {
        nodesRef.current.delete(message.nodeId as string);
        setGraphVersion((value) => value + 1);
        return;
      }

      if (message.type === "plan:updated") {
        setPlanElements(typeof message.elements === "string" ? message.elements : "[]");
        return;
      }

      if (message.type === "chat:response" || message.type === "chat:error") {
        window.dispatchEvent(new CustomEvent("dispatch:chat", { detail: message }));
      }
    });

    socket.addEventListener("close", () => setStatus("disconnected"));
    socket.addEventListener("error", () => setStatus("disconnected"));

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [username]);

  return {
    status,
    users,
    nodesRef,
    selfIdRef,
    socketRef,
    graphVersion,
    sendWs: (msg: unknown) => sendJson(socketRef, msg),
    planElements,
    sendPlanUpdate: (elements: string) => sendJson(socketRef, { type: "plan:update", elements }),
  };
}
